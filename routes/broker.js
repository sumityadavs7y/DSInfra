const express = require('express');
const router = express.Router();
const { Broker, Booking, Customer, Project, User, BrokerPayment } = require('../models');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');

// List all brokers
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const { search, showDeleted } = req.query;
        const whereClause = {};

        // By default, hide deleted brokers
        if (showDeleted !== 'true') {
            whereClause.isDeleted = false;
        }

        if (search) {
            whereClause[Op.or] = [
                { brokerNo: { [Op.like]: `%${search}%` } },
                { name: { [Op.like]: `%${search}%` } },
                { mobileNo: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } }
            ];
        }

        const brokers = await Broker.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']]
        });

        res.render('broker/list', {
            brokers,
            search,
            showDeleted: showDeleted === 'true',
            userName: req.session.userName,
            userRole: req.session.userRole
        });
    } catch (error) {
        console.error('Error fetching brokers:', error);
        res.status(500).send('Error loading brokers');
    }
});

// Show create broker form
router.get('/create', isAuthenticated, (req, res) => {
    res.render('broker/create', {
        userName: req.session.userName,
        userRole: req.session.userRole,
        error: null
    });
});

// Create new broker
router.post('/create', isAuthenticated, async (req, res) => {
    try {
        const { name, mobileNo, email, address, aadhaarNo, panNo } = req.body;

        // Check if Aadhaar already exists (if provided)
        if (aadhaarNo) {
            const existingBroker = await Broker.findOne({ where: { aadhaarNo } });
            if (existingBroker) {
                return res.render('broker/create', {
                    userName: req.session.userName,
                    userRole: req.session.userRole,
                    error: 'Broker with this Aadhaar number already exists'
                });
            }
        }

        // Check if PAN already exists (if provided)
        if (panNo) {
            const existingBroker = await Broker.findOne({ where: { panNo } });
            if (existingBroker) {
                return res.render('broker/create', {
                    userName: req.session.userName,
                    userRole: req.session.userRole,
                    error: 'Broker with this PAN number already exists'
                });
            }
        }

        const broker = await Broker.create({
            name,
            mobileNo,
            email: email || null,
            address,
            aadhaarNo: aadhaarNo || null,
            panNo: panNo || null,
            createdBy: req.session.userId
        });

        res.redirect(`/broker/${broker.id}`);
    } catch (error) {
        console.error('Error creating broker:', error);
        res.render('broker/create', {
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: 'Error creating broker: ' + error.message
        });
    }
});

// View broker details
router.get('/:id', isAuthenticated, async (req, res) => {
    try {
        const broker = await Broker.findByPk(req.params.id, {
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['name']
                }
            ]
        });

        if (!broker) {
            return res.status(404).send('Broker not found');
        }

        // Get all bookings for this broker (exclude deleted)
        const bookings = await Booking.findAll({
            where: { brokerId: broker.id, isDeleted: false },
            include: [
                { model: Customer, as: 'customer' },
                { model: Project, as: 'project' }
            ],
            order: [['bookingDate', 'DESC']]
        });

        // Calculate total commission due
        const totalCommission = bookings.reduce((sum, b) => {
            return sum + (parseFloat(b.brokerCommission) || 0);
        }, 0);

        // Get all broker payments (non-deleted)
        const brokerPayments = await BrokerPayment.findAll({
            where: { brokerId: broker.id, isDeleted: false },
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['name']
                }
            ],
            order: [['paymentDate', 'DESC']]
        });

        // Calculate total commission paid
        const totalCommissionPaid = brokerPayments.reduce((sum, p) => {
            return sum + parseFloat(p.paymentAmount);
        }, 0);

        const commissionRemaining = totalCommission - totalCommissionPaid;

        // Calculate statistics
        const totalBookings = bookings.length;
        const activeBookings = bookings.filter(b => b.status === 'Active').length;
        const cancelledBookings = bookings.filter(b => b.status === 'Cancelled').length;

        res.render('broker/view', {
            broker,
            bookings,
            brokerPayments,
            stats: {
                totalBookings,
                activeBookings,
                cancelledBookings,
                totalCommission,
                totalCommissionPaid,
                commissionRemaining
            },
            userName: req.session.userName,
            userRole: req.session.userRole
        });
    } catch (error) {
        console.error('Error fetching broker:', error);
        res.status(500).send('Error loading broker details');
    }
});

// Show edit broker form
router.get('/:id/edit', isAuthenticated, async (req, res) => {
    try {
        const broker = await Broker.findByPk(req.params.id);

        if (!broker) {
            return res.status(404).send('Broker not found');
        }

        res.render('broker/edit', {
            broker,
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: null
        });
    } catch (error) {
        console.error('Error loading edit form:', error);
        res.status(500).send('Error loading broker edit form');
    }
});

// Update broker
router.post('/:id/edit', isAuthenticated, async (req, res) => {
    try {
        const broker = await Broker.findByPk(req.params.id);

        if (!broker) {
            return res.status(404).send('Broker not found');
        }

        const { name, mobileNo, email, address, aadhaarNo, panNo, isActive } = req.body;

        // Check if Aadhaar is being changed and already exists
        if (aadhaarNo && aadhaarNo !== broker.aadhaarNo) {
            const existingBroker = await Broker.findOne({
                where: {
                    aadhaarNo,
                    id: { [Op.ne]: broker.id }
                }
            });

            if (existingBroker) {
                return res.render('broker/edit', {
                    broker,
                    userName: req.session.userName,
                    userRole: req.session.userRole,
                    error: 'Broker with this Aadhaar number already exists'
                });
            }
        }

        // Check if PAN is being changed and already exists
        if (panNo && panNo !== broker.panNo) {
            const existingBroker = await Broker.findOne({
                where: {
                    panNo,
                    id: { [Op.ne]: broker.id }
                }
            });

            if (existingBroker) {
                return res.render('broker/edit', {
                    broker,
                    userName: req.session.userName,
                    userRole: req.session.userRole,
                    error: 'Broker with this PAN number already exists'
                });
            }
        }

        await broker.update({
            name,
            mobileNo,
            email: email || null,
            address,
            aadhaarNo: aadhaarNo || null,
            panNo: panNo || null,
            isActive: isActive === 'true' || isActive === true || isActive === 'on'
        });

        res.redirect(`/broker/${broker.id}`);
    } catch (error) {
        console.error('Error updating broker:', error);
        res.render('broker/edit', {
            broker: req.body,
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: 'Error updating broker: ' + error.message
        });
    }
});

// Soft delete broker
router.post('/:id/delete', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const broker = await Broker.findByPk(req.params.id);

        if (!broker) {
            return res.status(404).send('Broker not found');
        }

        // Soft delete broker (bookings remain intact)
        await broker.update({ isDeleted: true });

        res.redirect('/broker');
    } catch (error) {
        console.error('Error deleting broker:', error);
        res.status(500).send('Error deleting broker');
    }
});

module.exports = router;

