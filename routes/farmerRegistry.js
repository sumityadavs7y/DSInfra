const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { isAuthenticated, blockAssociateAccess } = require('../middleware/auth');
const { FarmerProject, FarmerRegistry } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../models/sequelize');

// Registry List Page
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const { search, projectId, startDate, endDate, showDeleted } = req.query;
        let whereClause = {};

        // By default, hide deleted registries
        if (showDeleted !== 'true') {
            whereClause.isDeleted = false;
        }

        // Filter by project
        if (projectId) {
            whereClause.projectId = projectId;
        }

        // Search in registryDoneBy
        if (search) {
            whereClause.registryDoneBy = { [Op.like]: `%${search}%` };
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

        const registries = await FarmerRegistry.findAll({
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

        // Get all projects for filter dropdown
        const projects = await FarmerProject.findAll({
            where: { isDeleted: false },
            order: [['name', 'ASC']]
        });

        // Calculate totals
        const totals = {
            area: 0,
            total: 0
        };

        registries.forEach(registry => {
            totals.area += parseFloat(registry.area);
            totals.total += parseFloat(registry.rate) * parseFloat(registry.area);
        });

        res.render('farmer/registry/list', {
            registries,
            projects,
            search,
            projectId: projectId || '',
            startDate: startDate || '',
            endDate: endDate || '',
            showDeleted: showDeleted === 'true',
            totals,
            userName: req.session.userName,
            userRole: req.session.userRole
        });
    } catch (error) {
        console.error('Error fetching farmer registries:', error);
        res.status(500).send('Error loading farmer registries');
    }
});

// Create Registry GET
router.get('/create', isAuthenticated, blockAssociateAccess, async (req, res) => {
    try {
        const projects = await FarmerProject.findAll({
            where: { isDeleted: false },
            order: [['name', 'ASC']]
        });

        const preSelectedProject = req.query.projectId || '';

        res.render('farmer/registry/create', {
            registry: { projectId: preSelectedProject },
            projects,
            errors: {},
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: null
        });
    } catch (error) {
        console.error('Error loading registry create page:', error);
        res.status(500).send('Error loading page');
    }
});

// Create Registry POST
router.post('/create', isAuthenticated, blockAssociateAccess, [
    body('projectId').notEmpty().withMessage('Project is required'),
    body('registryDoneBy').notEmpty().withMessage('Registry done by is required'),
    body('date').notEmpty().withMessage('Date is required'),
    body('rate').isFloat({ min: 0.01 }).withMessage('Rate must be greater than 0'),
    body('area').isFloat({ min: 0.01 }).withMessage('Area must be greater than 0')
], async (req, res) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const projects = await FarmerProject.findAll({
            where: { isDeleted: false },
            order: [['name', 'ASC']]
        });

        return res.render('farmer/registry/create', {
            registry: req.body,
            projects,
            errors: errors.mapped(),
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: errors.array()[0].msg
        });
    }

    try {
        const { projectId, registryDoneBy, date, rate, area } = req.body;

        // Verify project exists
        const project = await FarmerProject.findByPk(projectId);
        if (!project) {
            const projects = await FarmerProject.findAll({
                where: { isDeleted: false },
                order: [['name', 'ASC']]
            });

            return res.render('farmer/registry/create', {
                registry: req.body,
                projects,
                errors: {},
                userName: req.session.userName,
                userRole: req.session.userRole,
                error: 'Selected project not found'
            });
        }

        // Get the next serial number for this project
        const lastRegistry = await FarmerRegistry.findOne({
            where: { projectId },
            order: [['serialNo', 'DESC']],
            limit: 1
        });

        const serialNo = lastRegistry ? lastRegistry.serialNo + 1 : 1;

        await FarmerRegistry.create({
            serialNo,
            projectId,
            registryDoneBy,
            date,
            rate,
            area
        });

        res.redirect('/farmer/registries?projectId=' + projectId);
    } catch (error) {
        console.error('Error creating farmer registry:', error);
        const projects = await FarmerProject.findAll({
            where: { isDeleted: false },
            order: [['name', 'ASC']]
        });

        res.render('farmer/registry/create', {
            registry: req.body,
            projects,
            errors: {},
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: 'Error creating registry. Please try again.'
        });
    }
});

// View Registry
router.get('/:id', isAuthenticated, async (req, res) => {
    try {
        const registry = await FarmerRegistry.findByPk(req.params.id, {
            include: [
                {
                    model: FarmerProject,
                    as: 'project',
                    attributes: ['id', 'name']
                }
            ]
        });
        
        if (!registry) {
            return res.status(404).send('Farmer registry not found');
        }

        // Calculate total
        const total = parseFloat(registry.rate) * parseFloat(registry.area);

        res.render('farmer/registry/view', {
            registry,
            total,
            userName: req.session.userName,
            userRole: req.session.userRole
        });
    } catch (error) {
        console.error('Error viewing farmer registry:', error);
        res.status(500).send('Error loading registry details');
    }
});

// Edit Registry GET
router.get('/:id/edit', isAuthenticated, blockAssociateAccess, async (req, res) => {
    try {
        const registry = await FarmerRegistry.findByPk(req.params.id);
        
        if (!registry) {
            return res.status(404).send('Farmer registry not found');
        }

        const projects = await FarmerProject.findAll({
            where: { isDeleted: false },
            order: [['name', 'ASC']]
        });

        res.render('farmer/registry/edit', {
            registry,
            projects,
            errors: {},
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: null
        });
    } catch (error) {
        console.error('Error loading farmer registry for edit:', error);
        res.status(500).send('Error loading registry');
    }
});

// Edit Registry POST
router.post('/:id/edit', isAuthenticated, blockAssociateAccess, [
    body('projectId').notEmpty().withMessage('Project is required'),
    body('registryDoneBy').notEmpty().withMessage('Registry done by is required'),
    body('date').notEmpty().withMessage('Date is required'),
    body('rate').isFloat({ min: 0.01 }).withMessage('Rate must be greater than 0'),
    body('area').isFloat({ min: 0.01 }).withMessage('Area must be greater than 0')
], async (req, res) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const projects = await FarmerProject.findAll({
            where: { isDeleted: false },
            order: [['name', 'ASC']]
        });

        return res.render('farmer/registry/edit', {
            registry: { id: req.params.id, ...req.body },
            projects,
            errors: errors.mapped(),
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: errors.array()[0].msg
        });
    }

    try {
        const registry = await FarmerRegistry.findByPk(req.params.id);
        
        if (!registry) {
            return res.status(404).send('Farmer registry not found');
        }

        const { projectId, registryDoneBy, date, rate, area } = req.body;

        // Verify project exists
        const project = await FarmerProject.findByPk(projectId);
        if (!project) {
            const projects = await FarmerProject.findAll({
                where: { isDeleted: false },
                order: [['name', 'ASC']]
            });

            return res.render('farmer/registry/edit', {
                registry: { id: req.params.id, ...req.body },
                projects,
                errors: {},
                userName: req.session.userName,
                userRole: req.session.userRole,
                error: 'Selected project not found'
            });
        }

        // If project changed, recalculate serial number
        let serialNo = registry.serialNo;
        if (registry.projectId !== parseInt(projectId)) {
            const lastRegistry = await FarmerRegistry.findOne({
                where: { projectId },
                order: [['serialNo', 'DESC']],
                limit: 1
            });
            serialNo = lastRegistry ? lastRegistry.serialNo + 1 : 1;
        }

        await registry.update({
            serialNo,
            projectId,
            registryDoneBy,
            date,
            rate,
            area
        });

        res.redirect(`/farmer/registries/${registry.id}`);
    } catch (error) {
        console.error('Error updating farmer registry:', error);
        const projects = await FarmerProject.findAll({
            where: { isDeleted: false },
            order: [['name', 'ASC']]
        });

        res.render('farmer/registry/edit', {
            registry: { id: req.params.id, ...req.body },
            projects,
            errors: {},
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: 'Error updating registry. Please try again.'
        });
    }
});

// Delete Registry (soft delete)
router.post('/:id/delete', isAuthenticated, blockAssociateAccess, async (req, res) => {
    try {
        const registry = await FarmerRegistry.findByPk(req.params.id);
        
        if (!registry) {
            return res.status(404).send('Farmer registry not found');
        }

        await registry.update({ isDeleted: true });

        res.redirect('/farmer/registries');
    } catch (error) {
        console.error('Error deleting farmer registry:', error);
        res.status(500).send('Error deleting registry');
    }
});

// Restore Registry
router.post('/:id/restore', isAuthenticated, blockAssociateAccess, async (req, res) => {
    try {
        const registry = await FarmerRegistry.findByPk(req.params.id);
        
        if (!registry) {
            return res.status(404).send('Farmer registry not found');
        }

        await registry.update({ isDeleted: false });

        res.redirect(`/farmer/registries/${registry.id}`);
    } catch (error) {
        console.error('Error restoring farmer registry:', error);
        res.status(500).send('Error restoring registry');
    }
});

module.exports = router;
