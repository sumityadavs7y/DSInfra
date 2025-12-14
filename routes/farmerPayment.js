const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { isAuthenticated, blockAssociateAccess, blockFarmerAccess, getAccessibleFarmerProjectIds } = require('../middleware/auth');
const { FarmerProject, FarmerPayment } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../models/sequelize');

// Payment List Page
router.get('/', isAuthenticated, getAccessibleFarmerProjectIds, async (req, res) => {
    try {
        const { search, projectId, startDate, endDate, showDeleted } = req.query;
        let whereClause = {};

        // By default, hide deleted payments
        if (showDeleted !== 'true') {
            whereClause.isDeleted = false;
        }

        // Filter by accessible projects for farmers
        if (req.accessibleFarmerProjectIds !== null) {
            whereClause.projectId = { [Op.in]: req.accessibleFarmerProjectIds };
        }

        // Filter by specific project
        if (projectId) {
            if (req.accessibleFarmerProjectIds !== null && !req.accessibleFarmerProjectIds.includes(parseInt(projectId))) {
                // Farmer trying to access unauthorized project
                return res.status(403).send('Access denied. You do not have permission to view this project.');
            }
            whereClause.projectId = projectId;
        }

        // Search in givenBy or receivedTo
        if (search) {
            whereClause[Op.or] = [
                { givenBy: { [Op.like]: `%${search}%` } },
                { receivedTo: { [Op.like]: `%${search}%` } }
            ];
        }

        // Date range filter
        if (startDate && endDate) {
            whereClause.date = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        } else if (startDate) {
            whereClause.date = {
                [Op.gte]: new Date(startDate)
            };
        } else if (endDate) {
            whereClause.date = {
                [Op.lte]: new Date(endDate)
            };
        }

        const payments = await FarmerPayment.findAll({
            where: whereClause,
            include: [
                {
                    model: FarmerProject,
                    as: 'project',
                    attributes: ['id', 'name']
                }
            ],
            order: [['date', 'DESC'], ['serialNo', 'DESC']]
        });

        // Get all projects for filter dropdown (filtered for farmers)
        let projectsWhereClause = { isDeleted: false };
        if (req.accessibleFarmerProjectIds !== null) {
            projectsWhereClause.id = { [Op.in]: req.accessibleFarmerProjectIds };
        }
        const projects = await FarmerProject.findAll({
            where: projectsWhereClause,
            order: [['name', 'ASC']]
        });

        // Calculate total
        const total = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

        res.render('farmer/payment/list', {
            payments,
            projects,
            search,
            projectId: projectId || '',
            startDate: startDate || '',
            endDate: endDate || '',
            showDeleted: showDeleted === 'true',
            total,
            userName: req.session.userName,
            userRole: req.session.userRole
        });
    } catch (error) {
        console.error('Error fetching farmer payments:', error);
        res.status(500).send('Error loading farmer payments');
    }
});

// Create Payment GET
router.get('/create', isAuthenticated, blockAssociateAccess, blockFarmerAccess, async (req, res) => {
    try {
        const projects = await FarmerProject.findAll({
            where: { isDeleted: false },
            order: [['name', 'ASC']]
        });

        const preSelectedProject = req.query.projectId || '';

        res.render('farmer/payment/create', {
            payment: { projectId: preSelectedProject },
            projects,
            errors: {},
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: null
        });
    } catch (error) {
        console.error('Error loading payment create page:', error);
        res.status(500).send('Error loading page');
    }
});

// Create Payment POST
router.post('/create', isAuthenticated, blockAssociateAccess, blockFarmerAccess, [
    body('projectId').notEmpty().withMessage('Project is required'),
    body('date').notEmpty().withMessage('Date is required'),
    body('givenBy').notEmpty().withMessage('Given by is required'),
    body('receivedTo').notEmpty().withMessage('Received to is required'),
    body('mode').notEmpty().withMessage('Mode is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0')
], async (req, res) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const projects = await FarmerProject.findAll({
            where: { isDeleted: false },
            order: [['name', 'ASC']]
        });

        return res.render('farmer/payment/create', {
            payment: req.body,
            projects,
            errors: errors.mapped(),
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: errors.array()[0].msg
        });
    }

    try {
        const { projectId, date, givenBy, receivedTo, mode, amount, remarks } = req.body;

        // Verify project exists
        const project = await FarmerProject.findByPk(projectId);
        if (!project) {
            const projects = await FarmerProject.findAll({
                where: { isDeleted: false },
                order: [['name', 'ASC']]
            });

            return res.render('farmer/payment/create', {
                payment: req.body,
                projects,
                errors: {},
                userName: req.session.userName,
                userRole: req.session.userRole,
                error: 'Selected project not found'
            });
        }

        // Get the next serial number for this project
        const lastPayment = await FarmerPayment.findOne({
            where: { projectId },
            order: [['serialNo', 'DESC']],
            limit: 1
        });

        const serialNo = lastPayment ? lastPayment.serialNo + 1 : 1;

        await FarmerPayment.create({
            serialNo,
            projectId,
            date,
            givenBy,
            receivedTo,
            mode,
            amount,
            remarks: remarks || null
        });

        res.redirect('/farmer/payments?projectId=' + projectId);
    } catch (error) {
        console.error('Error creating farmer payment:', error);
        const projects = await FarmerProject.findAll({
            where: { isDeleted: false },
            order: [['name', 'ASC']]
        });

        res.render('farmer/payment/create', {
            payment: req.body,
            projects,
            errors: {},
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: 'Error creating payment. Please try again.'
        });
    }
});

// View Payment
router.get('/:id', isAuthenticated, async (req, res) => {
    try {
        const payment = await FarmerPayment.findByPk(req.params.id, {
            include: [
                {
                    model: FarmerProject,
                    as: 'project',
                    attributes: ['id', 'name']
                }
            ]
        });
        
        if (!payment) {
            return res.status(404).send('Farmer payment not found');
        }

        res.render('farmer/payment/view', {
            payment,
            userName: req.session.userName,
            userRole: req.session.userRole
        });
    } catch (error) {
        console.error('Error viewing farmer payment:', error);
        res.status(500).send('Error loading payment details');
    }
});

// Edit Payment GET
router.get('/:id/edit', isAuthenticated, blockAssociateAccess, blockFarmerAccess, async (req, res) => {
    try {
        const payment = await FarmerPayment.findByPk(req.params.id);
        
        if (!payment) {
            return res.status(404).send('Farmer payment not found');
        }

        const projects = await FarmerProject.findAll({
            where: { isDeleted: false },
            order: [['name', 'ASC']]
        });

        res.render('farmer/payment/edit', {
            payment,
            projects,
            errors: {},
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: null
        });
    } catch (error) {
        console.error('Error loading farmer payment for edit:', error);
        res.status(500).send('Error loading payment');
    }
});

// Edit Payment POST
router.post('/:id/edit', isAuthenticated, blockAssociateAccess, blockFarmerAccess, [
    body('projectId').notEmpty().withMessage('Project is required'),
    body('date').notEmpty().withMessage('Date is required'),
    body('givenBy').notEmpty().withMessage('Given by is required'),
    body('receivedTo').notEmpty().withMessage('Received to is required'),
    body('mode').notEmpty().withMessage('Mode is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0')
], async (req, res) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const projects = await FarmerProject.findAll({
            where: { isDeleted: false },
            order: [['name', 'ASC']]
        });

        return res.render('farmer/payment/edit', {
            payment: { id: req.params.id, ...req.body },
            projects,
            errors: errors.mapped(),
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: errors.array()[0].msg
        });
    }

    try {
        const payment = await FarmerPayment.findByPk(req.params.id);
        
        if (!payment) {
            return res.status(404).send('Farmer payment not found');
        }

        const { projectId, date, givenBy, receivedTo, mode, amount, remarks } = req.body;

        // Verify project exists
        const project = await FarmerProject.findByPk(projectId);
        if (!project) {
            const projects = await FarmerProject.findAll({
                where: { isDeleted: false },
                order: [['name', 'ASC']]
            });

            return res.render('farmer/payment/edit', {
                payment: { id: req.params.id, ...req.body },
                projects,
                errors: {},
                userName: req.session.userName,
                userRole: req.session.userRole,
                error: 'Selected project not found'
            });
        }

        // If project changed, recalculate serial number
        let serialNo = payment.serialNo;
        if (payment.projectId !== parseInt(projectId)) {
            const lastPayment = await FarmerPayment.findOne({
                where: { projectId },
                order: [['serialNo', 'DESC']],
                limit: 1
            });
            serialNo = lastPayment ? lastPayment.serialNo + 1 : 1;
        }

        await payment.update({
            serialNo,
            projectId,
            date,
            givenBy,
            receivedTo,
            mode,
            amount,
            remarks: remarks || null
        });

        res.redirect(`/farmer/payments/${payment.id}`);
    } catch (error) {
        console.error('Error updating farmer payment:', error);
        const projects = await FarmerProject.findAll({
            where: { isDeleted: false },
            order: [['name', 'ASC']]
        });

        res.render('farmer/payment/edit', {
            payment: { id: req.params.id, ...req.body },
            projects,
            errors: {},
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: 'Error updating payment. Please try again.'
        });
    }
});

// Delete Payment (soft delete)
router.post('/:id/delete', isAuthenticated, blockAssociateAccess, blockFarmerAccess, async (req, res) => {
    try {
        const payment = await FarmerPayment.findByPk(req.params.id);
        
        if (!payment) {
            return res.status(404).send('Farmer payment not found');
        }

        await payment.update({ isDeleted: true });

        res.redirect('/farmer/payments');
    } catch (error) {
        console.error('Error deleting farmer payment:', error);
        res.status(500).send('Error deleting payment');
    }
});

// Restore Payment
router.post('/:id/restore', isAuthenticated, blockAssociateAccess, blockFarmerAccess, async (req, res) => {
    try {
        const payment = await FarmerPayment.findByPk(req.params.id);
        
        if (!payment) {
            return res.status(404).send('Farmer payment not found');
        }

        await payment.update({ isDeleted: false });

        res.redirect(`/farmer/payments/${payment.id}`);
    } catch (error) {
        console.error('Error restoring farmer payment:', error);
        res.status(500).send('Error restoring payment');
    }
});

module.exports = router;
