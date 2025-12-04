const express = require('express');
const router = express.Router();
const { Team, TeamAssociate, Broker, Booking, BrokerPayment, Project, Customer, User } = require('../models');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');

// List all teams
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const { search, showDeleted } = req.query;
        const whereClause = {};

        // By default, hide deleted teams
        if (showDeleted !== 'true') {
            whereClause.isDeleted = false;
        }

        if (search) {
            whereClause[Op.or] = [
                { teamNo: { [Op.like]: `%${search}%` } },
                { name: { [Op.like]: `%${search}%` } }
            ];
        }

        const teams = await Team.findAll({
            where: whereClause,
            include: [
                {
                    model: Broker,
                    as: 'associates',
                    through: { 
                        attributes: ['role', 'joinedDate', 'isActive'],
                        where: { isActive: true }
                    },
                    where: { isDeleted: false },
                    required: false
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'name', 'email']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        // Calculate statistics for each team
        for (const team of teams) {
            const associateIds = team.associates.map(a => a.id);
            
            if (associateIds.length > 0) {
                // Get all bookings by team associates
                const bookings = await Booking.findAll({
                    where: {
                        brokerId: { [Op.in]: associateIds },
                        isDeleted: false
                    }
                });

                team.dataValues.totalBookings = bookings.length;
                team.dataValues.registeredBookings = bookings.filter(b => b.registryCompleted).length;
                team.dataValues.unregisteredBookings = bookings.filter(b => !b.registryCompleted).length;
                team.dataValues.totalCommission = bookings.reduce((sum, b) => sum + parseFloat(b.brokerCommission || 0), 0);
            } else {
                team.dataValues.totalBookings = 0;
                team.dataValues.registeredBookings = 0;
                team.dataValues.unregisteredBookings = 0;
                team.dataValues.totalCommission = 0;
            }
        }

        res.render('team/list', {
            teams,
            search: search || '',
            showDeleted: showDeleted === 'true',
            user: req.session
        });
    } catch (error) {
        console.error('Error listing teams:', error);
        res.status(500).send('Error loading teams');
    }
});

// Create team form
router.get('/create', isAuthenticated, async (req, res) => {
    try {
        // Get all active brokers
        const brokers = await Broker.findAll({
            where: { isDeleted: false, isActive: true },
            order: [['name', 'ASC']]
        });

        res.render('team/create', {
            brokers,
            user: req.session
        });
    } catch (error) {
        console.error('Error loading create team form:', error);
        res.status(500).send('Error loading form');
    }
});

// Create team
router.post('/create', isAuthenticated, async (req, res) => {
    try {
        const { name, description } = req.body;
        // Handle both associateIds and associateIds[] from form submission
        const associateIds = req.body.associateIds || req.body['associateIds[]'];

        // Create team
        const team = await Team.create({
            name,
            description,
            createdBy: req.session.userId
        });

        // Add associates to team
        // Handle both single value and array
        if (associateIds) {
            const ids = Array.isArray(associateIds) ? associateIds : [associateIds];
            for (const brokerId of ids) {
                await TeamAssociate.create({
                    teamId: team.id,
                    brokerId: parseInt(brokerId),
                    role: 'Member',
                    isActive: true
                });
            }
        }

        res.redirect('/team');
    } catch (error) {
        console.error('Error creating team:', error);
        res.status(500).send('Error creating team');
    }
});

// Edit team form
router.get('/edit/:id', isAuthenticated, async (req, res) => {
    try {
        const team = await Team.findByPk(req.params.id, {
            include: [
                {
                    model: Broker,
                    as: 'associates',
                    through: { 
                        attributes: ['role', 'joinedDate', 'isActive', 'id']
                    }
                }
            ]
        });

        if (!team) {
            return res.status(404).send('Team not found');
        }

        // Get all active brokers
        const allBrokers = await Broker.findAll({
            where: { isDeleted: false, isActive: true },
            order: [['name', 'ASC']]
        });

        res.render('team/edit', {
            team,
            allBrokers,
            user: req.session
        });
    } catch (error) {
        console.error('Error loading edit team form:', error);
        res.status(500).send('Error loading form');
    }
});

// Update team
router.post('/edit/:id', isAuthenticated, async (req, res) => {
    try {
        const { name, description } = req.body;
        // Handle both associateIds and associateIds[] from form submission
        const associateIds = req.body.associateIds || req.body['associateIds[]'];
        
        const team = await Team.findByPk(req.params.id);
        if (!team) {
            return res.status(404).send('Team not found');
        }

        // Update team details
        await team.update({ name, description });

        // Update team associates
        // Remove all existing associations
        await TeamAssociate.destroy({ where: { teamId: team.id } });

        // Add new associations
        // Handle both single value and array
        if (associateIds) {
            const ids = Array.isArray(associateIds) ? associateIds : [associateIds];
            for (const brokerId of ids) {
                await TeamAssociate.create({
                    teamId: team.id,
                    brokerId: parseInt(brokerId),
                    role: 'Member',
                    isActive: true
                });
            }
        }

        res.redirect(`/team/view/${team.id}`);
    } catch (error) {
        console.error('Error updating team:', error);
        res.status(500).send('Error updating team');
    }
});

// View team details with statistics
router.get('/view/:id', isAuthenticated, async (req, res) => {
    try {
        const team = await Team.findByPk(req.params.id, {
            include: [
                {
                    model: Broker,
                    as: 'associates',
                    through: { 
                        attributes: ['role', 'joinedDate', 'isActive', 'id']
                    }
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'name', 'email']
                }
            ]
        });

        if (!team) {
            return res.status(404).send('Team not found');
        }

        const associateIds = team.associates.map(a => a.id);
        
        // Initialize statistics
        let stats = {
            totalBookings: 0,
            registeredBookings: 0,
            unregisteredBookings: 0,
            totalBookingAmount: 0,
            totalCommission: 0,
            totalCommissionRegistered: 0,
            totalCommissionUnregistered: 0,
            totalPaymentsMade: 0,
            pendingCommission: 0
        };

        let bookingsList = [];
        let associateStats = [];

        if (associateIds.length > 0) {
            // Get all bookings by team associates
            bookingsList = await Booking.findAll({
                where: {
                    brokerId: { [Op.in]: associateIds },
                    isDeleted: false
                },
                include: [
                {
                    model: Project,
                    as: 'project',
                    attributes: ['id', 'projectName']
                },
                {
                    model: Customer,
                    as: 'customer',
                    attributes: ['id', 'applicantName', 'mobileNo']
                },
                {
                    model: Broker,
                    as: 'broker',
                    attributes: ['id', 'name', 'brokerNo']
                }
                ],
                order: [['bookingDate', 'DESC']]
            });

            // Calculate overall statistics
            const registeredBookings = bookingsList.filter(b => b.registryCompleted);
            const unregisteredBookings = bookingsList.filter(b => !b.registryCompleted);

            stats.totalBookings = bookingsList.length;
            stats.registeredBookings = registeredBookings.length;
            stats.unregisteredBookings = unregisteredBookings.length;
            stats.totalBookingAmount = bookingsList.reduce((sum, b) => sum + parseFloat(b.totalAmount || 0), 0);
            stats.totalCommission = bookingsList.reduce((sum, b) => sum + parseFloat(b.brokerCommission || 0), 0);
            stats.totalCommissionRegistered = registeredBookings.reduce((sum, b) => sum + parseFloat(b.brokerCommission || 0), 0);
            stats.totalCommissionUnregistered = unregisteredBookings.reduce((sum, b) => sum + parseFloat(b.brokerCommission || 0), 0);

            // Get all broker payments for team associates
            const brokerPayments = await BrokerPayment.findAll({
                where: {
                    brokerId: { [Op.in]: associateIds },
                    isDeleted: false
                },
                include: [
                    {
                        model: Broker,
                        as: 'broker',
                        attributes: ['id', 'name', 'brokerNo']
                    }
                ],
                order: [['paymentDate', 'DESC']]
            });

            stats.totalPaymentsMade = brokerPayments.reduce((sum, p) => sum + parseFloat(p.paymentAmount || 0), 0);
            stats.pendingCommission = stats.totalCommission - stats.totalPaymentsMade;

            // Calculate per-associate statistics
            for (const associate of team.associates) {
                const associateBookings = bookingsList.filter(b => b.brokerId === associate.id);
                const associatePayments = brokerPayments.filter(p => p.brokerId === associate.id);
                
                const registeredCount = associateBookings.filter(b => b.registryCompleted).length;
                const unregisteredCount = associateBookings.filter(b => !b.registryCompleted).length;
                const totalCommission = associateBookings.reduce((sum, b) => sum + parseFloat(b.brokerCommission || 0), 0);
                const totalPaid = associatePayments.reduce((sum, p) => sum + parseFloat(p.paymentAmount || 0), 0);

                associateStats.push({
                    associate,
                    totalBookings: associateBookings.length,
                    registeredBookings: registeredCount,
                    unregisteredBookings: unregisteredCount,
                    totalCommission: totalCommission,
                    totalPaid: totalPaid,
                    pendingCommission: totalCommission - totalPaid
                });
            }
        }

        res.render('team/view', {
            team,
            stats,
            bookingsList,
            associateStats,
            user: req.session
        });
    } catch (error) {
        console.error('Error viewing team:', error);
        res.status(500).send('Error loading team details');
    }
});

// Delete team (soft delete)
router.post('/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const team = await Team.findByPk(req.params.id);
        if (!team) {
            return res.status(404).send('Team not found');
        }

        await team.update({ isDeleted: true });
        res.redirect('/team');
    } catch (error) {
        console.error('Error deleting team:', error);
        res.status(500).send('Error deleting team');
    }
});

// Restore team
router.post('/restore/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const team = await Team.findByPk(req.params.id);
        if (!team) {
            return res.status(404).send('Team not found');
        }

        await team.update({ isDeleted: false });
        res.redirect('/team');
    } catch (error) {
        console.error('Error restoring team:', error);
        res.status(500).send('Error restoring team');
    }
});

module.exports = router;
