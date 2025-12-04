const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Broker, BrokerDocument, Booking, Customer, Project, User, BrokerPayment } = require('../models');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');

// Configure multer for file uploads (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit per file
    },
    fileFilter: (req, file, cb) => {
        // Accept images and PDFs
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only images and PDF files are allowed'));
        }
    }
});

// List all brokers
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const { 
            search, 
            showDeleted, 
            paymentDateFrom = '', 
            paymentDateTo = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;
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

        // Determine sort column
        let orderColumn = 'createdAt';
        let orderDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';
        
        switch(sortBy) {
            case 'brokerNo':
                orderColumn = 'brokerNo';
                break;
            case 'name':
                orderColumn = 'name';
                break;
            case 'mobile':
                orderColumn = 'mobileNo';
                break;
            case 'email':
                orderColumn = 'email';
                break;
            // For payments, we'll sort in memory after calculating totals
            default:
                orderColumn = 'createdAt';
        }

        const brokers = await Broker.findAll({
            where: whereClause,
            order: sortBy !== 'payments' ? [[orderColumn, orderDirection]] : [['createdAt', 'DESC']]
        });

        // Calculate cumulative statistics for all brokers
        // Get all bookings
        const allBookings = await Booking.findAll({
            where: { isDeleted: false },
            include: [
                { model: Broker, as: 'broker', where: whereClause }
            ]
        });

        // Separate bookings by registry status
        const registeredBookings = allBookings.filter(b => b.registryCompleted === true);
        const nonRegisteredBookings = allBookings.filter(b => b.registryCompleted !== true);

        // Calculate total commission
        const totalCommission = allBookings.reduce((sum, b) => {
            return sum + (parseFloat(b.brokerCommission) || 0);
        }, 0);

        const totalCommissionRegistered = registeredBookings.reduce((sum, b) => {
            return sum + (parseFloat(b.brokerCommission) || 0);
        }, 0);

        const totalCommissionNonRegistered = nonRegisteredBookings.reduce((sum, b) => {
            return sum + (parseFloat(b.brokerCommission) || 0);
        }, 0);

        // Get all broker payments (unfiltered)
        const allBrokerPayments = await BrokerPayment.findAll({
            where: { isDeleted: false },
            include: [
                {
                    model: Broker,
                    as: 'broker',
                    where: whereClause
                }
            ]
        });

        // Calculate total payments made to brokers (unfiltered)
        const totalCommissionPaid = allBrokerPayments.reduce((sum, p) => {
            return sum + parseFloat(p.paymentAmount);
        }, 0);

        // Build where clause for filtered broker payments
        const paymentWhereClause = { isDeleted: false };
        
        // Apply date filters if provided
        if (paymentDateFrom || paymentDateTo) {
            paymentWhereClause.paymentDate = {};
            if (paymentDateFrom) {
                paymentWhereClause.paymentDate[Op.gte] = new Date(paymentDateFrom);
            }
            if (paymentDateTo) {
                const endDate = new Date(paymentDateTo);
                endDate.setDate(endDate.getDate() + 1);
                paymentWhereClause.paymentDate[Op.lt] = endDate;
            }
        }

        // Get filtered broker payments
        const filteredBrokerPayments = await BrokerPayment.findAll({
            where: paymentWhereClause,
            include: [
                {
                    model: Broker,
                    as: 'broker',
                    where: whereClause
                }
            ]
        });

        // Calculate filtered payment total
        const filteredPaymentTotal = filteredBrokerPayments.reduce((sum, p) => {
            return sum + parseFloat(p.paymentAmount);
        }, 0);

        // Calculate payments per broker (filtered)
        const brokerPaymentsMap = {};
        filteredBrokerPayments.forEach(payment => {
            const brokerId = payment.brokerId;
            if (!brokerPaymentsMap[brokerId]) {
                brokerPaymentsMap[brokerId] = 0;
            }
            brokerPaymentsMap[brokerId] += parseFloat(payment.paymentAmount);
        });

        // Add payment totals to each broker
        brokers.forEach(broker => {
            broker.totalPayments = brokerPaymentsMap[broker.id] || 0;
        });

        // Sort by payments if requested
        if (sortBy === 'payments') {
            brokers.sort((a, b) => {
                if (sortOrder === 'asc') {
                    return a.totalPayments - b.totalPayments;
                } else {
                    return b.totalPayments - a.totalPayments;
                }
            });
        }

        const commissionRemaining = totalCommission - totalCommissionPaid;
        const commissionRemainingRegistered = totalCommissionRegistered - totalCommissionPaid;

        // Calculate cumulative stats
        const cumulativeStats = {
            totalBrokers: brokers.length,
            totalBookings: allBookings.length,
            registeredBookingsCount: registeredBookings.length,
            nonRegisteredBookingsCount: nonRegisteredBookings.length,
            totalCommission,
            totalCommissionRegistered,
            totalCommissionNonRegistered,
            totalCommissionPaid,
            filteredPaymentTotal,
            commissionRemaining,
            commissionRemainingRegistered
        };

        res.render('broker/list', {
            brokers,
            stats: cumulativeStats,
            search,
            showDeleted: showDeleted === 'true',
            paymentDateFrom: paymentDateFrom,
            paymentDateTo: paymentDateTo,
            sortBy: sortBy,
            sortOrder: sortOrder,
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
router.post('/create', isAuthenticated, upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'documents', maxCount: 10 }
]), async (req, res) => {
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

        // Handle photo upload
        let photoData = null;
        if (req.files && req.files.photo && req.files.photo[0]) {
            const photo = req.files.photo[0];
            photoData = `data:${photo.mimetype};base64,${photo.buffer.toString('base64')}`;
            console.log(`📸 Photo uploaded: ${photo.originalname} (${(photo.size / 1024).toFixed(1)} KB)`);
        }

        const broker = await Broker.create({
            name,
            mobileNo,
            email: email || null,
            address,
            aadhaarNo: aadhaarNo || null,
            panNo: panNo || null,
            photo: photoData,
            createdBy: req.session.userId
        });

        // Handle documents upload to separate table
        if (req.files && req.files.documents && req.files.documents.length > 0) {
            const documentsToCreate = req.files.documents.map(doc => ({
                brokerId: broker.id,
                fileName: doc.originalname,
                fileType: doc.mimetype,
                fileSize: doc.size,
                fileData: `data:${doc.mimetype};base64,${doc.buffer.toString('base64')}`,
                uploadedAt: new Date(),
                uploadedBy: req.session.userId
            }));
            
            await BrokerDocument.bulkCreate(documentsToCreate);
            console.log(`📄 Documents uploaded: ${documentsToCreate.length} files`);
            documentsToCreate.forEach(doc => {
                console.log(`  - ${doc.fileName} (${(doc.fileSize / 1024).toFixed(1)} KB)`);
            });
        }

        console.log(`✅ Broker created with ID: ${broker.id}, Photo: ${broker.photo ? 'Yes' : 'No'}`);

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
                },
                {
                    model: BrokerDocument,
                    as: 'brokerDocuments',
                    order: [['uploadedAt', 'DESC']]
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

        // Separate bookings by registry completion status
        const registeredBookings = bookings.filter(b => b.registryCompleted === true);
        const nonRegisteredBookings = bookings.filter(b => b.registryCompleted !== true);

        // Calculate total commission due (all bookings)
        const totalCommission = bookings.reduce((sum, b) => {
            return sum + (parseFloat(b.brokerCommission) || 0);
        }, 0);

        // Calculate commission for registered bookings
        const totalCommissionRegistered = registeredBookings.reduce((sum, b) => {
            return sum + (parseFloat(b.brokerCommission) || 0);
        }, 0);

        // Calculate commission for non-registered bookings
        const totalCommissionNonRegistered = nonRegisteredBookings.reduce((sum, b) => {
            return sum + (parseFloat(b.brokerCommission) || 0);
        }, 0);

        // Get payment date filters and tab from query
        const { paymentDateFrom = '', paymentDateTo = '', tab = '' } = req.query;
        
        // First, get ALL broker payments (unfiltered) for accurate total commission paid calculation
        const allBrokerPayments = await BrokerPayment.findAll({
            where: { brokerId: broker.id, isDeleted: false },
            order: [['paymentDate', 'DESC']]
        });

        // Calculate actual total commission paid (unfiltered)
        const totalCommissionPaid = allBrokerPayments.reduce((sum, p) => {
            return sum + parseFloat(p.paymentAmount);
        }, 0);

        // Build where clause for filtered broker payments (for display)
        const brokerPaymentWhere = { brokerId: broker.id, isDeleted: false };
        
        // Apply date filters if provided
        if (paymentDateFrom || paymentDateTo) {
            brokerPaymentWhere.paymentDate = {};
            if (paymentDateFrom) {
                brokerPaymentWhere.paymentDate[Op.gte] = new Date(paymentDateFrom);
            }
            if (paymentDateTo) {
                // Add one day to include the entire end date
                const endDate = new Date(paymentDateTo);
                endDate.setDate(endDate.getDate() + 1);
                brokerPaymentWhere.paymentDate[Op.lt] = endDate;
            }
        }

        // Get filtered broker payments (for display in table)
        const brokerPayments = await BrokerPayment.findAll({
            where: brokerPaymentWhere,
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['name']
                }
            ],
            order: [['paymentDate', 'DESC']]
        });

        // Calculate filtered payment total (for display only)
        const filteredPaymentTotal = brokerPayments.reduce((sum, p) => {
            return sum + parseFloat(p.paymentAmount);
        }, 0);

        const commissionRemaining = totalCommission - totalCommissionPaid;
        const commissionRemainingRegistered = totalCommissionRegistered - totalCommissionPaid;

        // Calculate statistics
        const totalBookings = bookings.length;
        const activeBookings = bookings.filter(b => b.status === 'Active').length;
        const cancelledBookings = bookings.filter(b => b.status === 'Cancelled').length;
        const registeredBookingsCount = registeredBookings.length;
        const nonRegisteredBookingsCount = nonRegisteredBookings.length;

        res.render('broker/view', {
            broker,
            bookings,
            brokerPayments,
            stats: {
                totalBookings,
                activeBookings,
                cancelledBookings,
                registeredBookingsCount,
                nonRegisteredBookingsCount,
                totalCommission,
                totalCommissionRegistered,
                totalCommissionNonRegistered,
                totalCommissionPaid,
                filteredPaymentTotal,
                commissionRemaining,
                commissionRemainingRegistered
            },
            paymentDateFrom: paymentDateFrom,
            paymentDateTo: paymentDateTo,
            tab: tab,
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
        const broker = await Broker.findByPk(req.params.id, {
            include: [
                {
                    model: BrokerDocument,
                    as: 'brokerDocuments',
                    order: [['uploadedAt', 'DESC']]
                }
            ]
        });

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
router.post('/:id/edit', isAuthenticated, upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'documents', maxCount: 10 }
]), async (req, res) => {
    try {
        const broker = await Broker.findByPk(req.params.id);

        if (!broker) {
            return res.status(404).send('Broker not found');
        }

        const { name, mobileNo, email, address, aadhaarNo, panNo, isActive, deletePhoto, deleteDocuments } = req.body;

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

        // Prepare update data
        const updateData = {
            name,
            mobileNo,
            email: email || null,
            address,
            aadhaarNo: aadhaarNo || null,
            panNo: panNo || null,
            isActive: isActive === 'true' || isActive === true || isActive === 'on'
        };

        // Handle photo update/delete
        if (deletePhoto === 'true') {
            updateData.photo = null;
            console.log('🗑️ Deleting photo');
        } else if (req.files && req.files.photo && req.files.photo[0]) {
            const photo = req.files.photo[0];
            updateData.photo = `data:${photo.mimetype};base64,${photo.buffer.toString('base64')}`;
            console.log(`📸 Photo updated: ${photo.originalname} (${(photo.size / 1024).toFixed(1)} KB)`);
        }

        // Handle documents deletion from BrokerDocument table
        if (deleteDocuments) {
            const deleteIds = Array.isArray(deleteDocuments) ? deleteDocuments : [deleteDocuments];
            const deleteCount = await BrokerDocument.destroy({
                where: {
                    id: deleteIds,
                    brokerId: broker.id
                }
            });
            console.log(`🗑️ Deleted ${deleteCount} documents (IDs: ${deleteIds.join(', ')})`);
        }
        
        // Add new documents to BrokerDocument table
        if (req.files && req.files.documents && req.files.documents.length > 0) {
            const documentsToCreate = req.files.documents.map(doc => ({
                brokerId: broker.id,
                fileName: doc.originalname,
                fileType: doc.mimetype,
                fileSize: doc.size,
                fileData: `data:${doc.mimetype};base64,${doc.buffer.toString('base64')}`,
                uploadedAt: new Date(),
                uploadedBy: req.session.userId
            }));
            
            await BrokerDocument.bulkCreate(documentsToCreate);
            console.log(`📄 Added new documents: ${documentsToCreate.length} files`);
            documentsToCreate.forEach(doc => {
                console.log(`  - ${doc.fileName} (${(doc.fileSize / 1024).toFixed(1)} KB)`);
            });
        }

        await broker.update(updateData);

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

