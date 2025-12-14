const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { isAuthenticated, blockAssociateAccess, blockFarmerAccess, getAccessibleFarmerProjectIds, canAccessFarmerProject } = require('../middleware/auth');
const { FarmerProject, FarmerPayment, FarmerRegistry } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../models/sequelize');

// Project List Page
router.get('/', isAuthenticated, getAccessibleFarmerProjectIds, async (req, res) => {
    try {
        const { search, showDeleted } = req.query;
        let whereClause = {};

        // By default, hide deleted projects
        if (showDeleted !== 'true') {
            whereClause.isDeleted = false;
        }

        if (search) {
            whereClause.name = { [Op.like]: `%${search}%` };
        }

        // If user is a farmer, filter by accessible projects
        if (req.accessibleFarmerProjectIds !== null) {
            whereClause.id = { [Op.in]: req.accessibleFarmerProjectIds };
        }

        const projects = await FarmerProject.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']]
        });

        res.render('farmer/project/list', {
            projects,
            search,
            showDeleted: showDeleted === 'true',
            userName: req.session.userName,
            userRole: req.session.userRole
        });
    } catch (error) {
        console.error('Error fetching farmer projects:', error);
        res.status(500).send('Error loading farmer projects');
    }
});

// Create Project GET
router.get('/create', isAuthenticated, blockAssociateAccess, blockFarmerAccess, (req, res) => {
    res.render('farmer/project/create', {
        project: {},
        errors: {},
        userName: req.session.userName,
        userRole: req.session.userRole,
        error: null
    });
});

// Create Project POST
router.post('/create', isAuthenticated, blockAssociateAccess, blockFarmerAccess, [
    body('name').notEmpty().withMessage('Project name is required')
], async (req, res) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.render('farmer/project/create', {
            project: req.body,
            errors: errors.mapped(),
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: errors.array()[0].msg
        });
    }

    try {
        const { name } = req.body;

        // Check if project name already exists
        const existingProject = await FarmerProject.findOne({ 
            where: { 
                name,
                isDeleted: false
            } 
        });
        
        if (existingProject) {
            return res.render('farmer/project/create', {
                project: req.body,
                errors: {},
                userName: req.session.userName,
                userRole: req.session.userRole,
                error: 'A project with this name already exists'
            });
        }

        await FarmerProject.create({ name });

        res.redirect('/farmer/projects');
    } catch (error) {
        console.error('Error creating farmer project:', error);
        res.render('farmer/project/create', {
            project: req.body,
            errors: {},
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: 'Error creating project. Please try again.'
        });
    }
});

// View Project
router.get('/:id', isAuthenticated, canAccessFarmerProject, async (req, res) => {
    try {
        const project = await FarmerProject.findByPk(req.params.id);
        
        if (!project) {
            return res.status(404).send('Farmer project not found');
        }

        // Get payments count and total (excluding PDC)
        const paymentsStats = await FarmerPayment.findOne({
            where: { 
                projectId: project.id,
                isDeleted: false,
                mode: { [Op.ne]: 'PDC' }  // Exclude PDC mode payments
            },
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                [sequelize.fn('SUM', sequelize.col('amount')), 'total']
            ],
            raw: true
        });

        // Get PDC payments count and total separately
        const pdcPaymentsStats = await FarmerPayment.findOne({
            where: { 
                projectId: project.id,
                isDeleted: false,
                mode: 'PDC'  // Only PDC mode payments
            },
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                [sequelize.fn('SUM', sequelize.col('amount')), 'total']
            ],
            raw: true
        });

        // Get registries count and total
        const registriesStats = await FarmerRegistry.findOne({
            where: { 
                projectId: project.id,
                isDeleted: false 
            },
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                [sequelize.fn('SUM', sequelize.literal('rate * area')), 'total']
            ],
            raw: true
        });

        // Calculate amounts
        const registriesTotal = parseFloat(registriesStats?.total || 0);
        const paymentsTotal = parseFloat(paymentsStats?.total || 0);
        const pdcTotal = parseFloat(pdcPaymentsStats?.total || 0);
        const duePayment = registriesTotal - paymentsTotal;  // Due = Registry Total - Payment Total (excluding PDC)

        res.render('farmer/project/view', {
            project,
            paymentsCount: paymentsStats?.count || 0,
            paymentsTotal: paymentsTotal,
            pdcPaymentsCount: pdcPaymentsStats?.count || 0,
            pdcTotal: pdcTotal,
            registriesCount: registriesStats?.count || 0,
            registriesTotal: registriesTotal,
            duePayment: duePayment,
            userName: req.session.userName,
            userRole: req.session.userRole
        });
    } catch (error) {
        console.error('Error viewing farmer project:', error);
        res.status(500).send('Error loading project details');
    }
});

// Edit Project GET
router.get('/:id/edit', isAuthenticated, blockAssociateAccess, blockFarmerAccess, canAccessFarmerProject, async (req, res) => {
    try {
        const project = await FarmerProject.findByPk(req.params.id);
        
        if (!project) {
            return res.status(404).send('Farmer project not found');
        }

        res.render('farmer/project/edit', {
            project,
            errors: {},
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: null
        });
    } catch (error) {
        console.error('Error loading farmer project for edit:', error);
        res.status(500).send('Error loading project');
    }
});

// Edit Project POST
router.post('/:id/edit', isAuthenticated, blockAssociateAccess, blockFarmerAccess, canAccessFarmerProject, [
    body('name').notEmpty().withMessage('Project name is required')
], async (req, res) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.render('farmer/project/edit', {
            project: { id: req.params.id, ...req.body },
            errors: errors.mapped(),
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: errors.array()[0].msg
        });
    }

    try {
        const project = await FarmerProject.findByPk(req.params.id);
        
        if (!project) {
            return res.status(404).send('Farmer project not found');
        }

        const { name } = req.body;

        // Check if project name already exists (excluding current project)
        const existingProject = await FarmerProject.findOne({ 
            where: { 
                name,
                isDeleted: false,
                id: { [Op.ne]: project.id }
            } 
        });
        
        if (existingProject) {
            return res.render('farmer/project/edit', {
                project: { id: req.params.id, ...req.body },
                errors: {},
                userName: req.session.userName,
                userRole: req.session.userRole,
                error: 'A project with this name already exists'
            });
        }

        await project.update({ name });

        res.redirect(`/farmer/projects/${project.id}`);
    } catch (error) {
        console.error('Error updating farmer project:', error);
        res.render('farmer/project/edit', {
            project: { id: req.params.id, ...req.body },
            errors: {},
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: 'Error updating project. Please try again.'
        });
    }
});

// Delete Project (soft delete)
router.post('/:id/delete', isAuthenticated, blockAssociateAccess, blockFarmerAccess, canAccessFarmerProject, async (req, res) => {
    try {
        const project = await FarmerProject.findByPk(req.params.id);
        
        if (!project) {
            return res.status(404).send('Farmer project not found');
        }

        await project.update({ isDeleted: true });

        res.redirect('/farmer/projects');
    } catch (error) {
        console.error('Error deleting farmer project:', error);
        res.status(500).send('Error deleting project');
    }
});

// Restore Project
router.post('/:id/restore', isAuthenticated, blockAssociateAccess, blockFarmerAccess, canAccessFarmerProject, async (req, res) => {
    try {
        const project = await FarmerProject.findByPk(req.params.id);
        
        if (!project) {
            return res.status(404).send('Farmer project not found');
        }

        await project.update({ isDeleted: false });

        res.redirect(`/farmer/projects/${project.id}`);
    } catch (error) {
        console.error('Error restoring farmer project:', error);
        res.status(500).send('Error restoring project');
    }
});

// Toggle Quick Link
router.post('/:id/toggle-quicklink', isAuthenticated, blockAssociateAccess, blockFarmerAccess, canAccessFarmerProject, async (req, res) => {
    try {
        const project = await FarmerProject.findByPk(req.params.id);
        
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        await project.update({ isQuickLink: !project.isQuickLink });

        res.json({ success: true, isQuickLink: project.isQuickLink });
    } catch (error) {
        console.error('Error toggling quick link:', error);
        res.status(500).json({ success: false, message: 'Error toggling quick link' });
    }
});

module.exports = router;
