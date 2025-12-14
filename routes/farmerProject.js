const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { isAuthenticated, blockAssociateAccess } = require('../middleware/auth');
const { FarmerProject, FarmerPayment, FarmerRegistry } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../models/sequelize');

// Project List Page
router.get('/', isAuthenticated, async (req, res) => {
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
router.get('/create', isAuthenticated, blockAssociateAccess, (req, res) => {
    res.render('farmer/project/create', {
        project: {},
        errors: {},
        userName: req.session.userName,
        userRole: req.session.userRole,
        error: null
    });
});

// Create Project POST
router.post('/create', isAuthenticated, blockAssociateAccess, [
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
router.get('/:id', isAuthenticated, async (req, res) => {
    try {
        const project = await FarmerProject.findByPk(req.params.id);
        
        if (!project) {
            return res.status(404).send('Farmer project not found');
        }

        // Get payments count and total
        const paymentsStats = await FarmerPayment.findOne({
            where: { 
                projectId: project.id,
                isDeleted: false 
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

        // Calculate due payment (Registry Total - Payment Total)
        const registriesTotal = parseFloat(registriesStats?.total || 0);
        const paymentsTotal = parseFloat(paymentsStats?.total || 0);
        const duePayment = registriesTotal - paymentsTotal;

        res.render('farmer/project/view', {
            project,
            paymentsCount: paymentsStats?.count || 0,
            paymentsTotal: paymentsTotal,
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
router.get('/:id/edit', isAuthenticated, blockAssociateAccess, async (req, res) => {
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
router.post('/:id/edit', isAuthenticated, blockAssociateAccess, [
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
router.post('/:id/delete', isAuthenticated, blockAssociateAccess, async (req, res) => {
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
router.post('/:id/restore', isAuthenticated, blockAssociateAccess, async (req, res) => {
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
router.post('/:id/toggle-quicklink', isAuthenticated, blockAssociateAccess, async (req, res) => {
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
