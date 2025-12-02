const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { Project, Booking } = require('../models');
const { Op } = require('sequelize');

// Project List Page
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const { search, status, showDeleted } = req.query;
        let whereClause = {};

        // By default, hide deleted projects
        if (showDeleted !== 'true') {
            whereClause.isDeleted = false;
        }

        if (search) {
            whereClause[Op.or] = [
                { projectName: { [Op.like]: `%${search}%` } },
                { location: { [Op.like]: `%${search}%` } }
            ];
        }

        if (status) {
            whereClause.isActive = status === 'active';
        }

        const projects = await Project.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']]
        });

        res.render('project/list', {
            projects,
            search,
            status,
            showDeleted: showDeleted === 'true',
            userName: req.session.userName,
            userRole: req.session.userRole
        });
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).send('Error loading projects');
    }
});

// Create Project GET
router.get('/create', isAuthenticated, isAdmin, (req, res) => {
    res.render('project/create', {
        project: {},
        errors: {},
        userName: req.session.userName,
        userRole: req.session.userRole,
        error: null
    });
});

// Create Project POST
router.post('/create', isAuthenticated, isAdmin, [
    body('projectName').notEmpty().withMessage('Project name is required'),
    body('location').notEmpty().withMessage('Location is required'),
    body('totalPlots').isInt({ min: 1 }).withMessage('Total plots must be at least 1'),
    body('availablePlots').isInt({ min: 0 }).withMessage('Available plots must be 0 or more'),
    body('availablePlots').custom((value, { req }) => {
        if (parseInt(value) > parseInt(req.body.totalPlots)) {
            throw new Error('Available plots cannot exceed total plots');
        }
        return true;
    })
], async (req, res) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.render('project/create', {
            project: req.body,
            errors: errors.mapped(),
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: errors.array()[0].msg
        });
    }

    try {
        const { projectName, location, description, legalDetails, totalPlots, availablePlots } = req.body;

        // Check if project name already exists
        const existingProject = await Project.findOne({ where: { projectName } });
        if (existingProject) {
            return res.render('project/create', {
                project: req.body,
                errors: {},
                userName: req.session.userName,
                userRole: req.session.userRole,
                error: 'A project with this name already exists'
            });
        }

        const newProject = await Project.create({
            projectName,
            location,
            description,
            legalDetails,
            totalPlots: parseInt(totalPlots),
            availablePlots: parseInt(availablePlots),
            isActive: true
        });

        res.redirect(`/project/${newProject.id}`);
    } catch (error) {
        console.error('Error creating project:', error);
        res.render('project/create', {
            project: req.body,
            errors: {},
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: 'Error creating project: ' + error.message
        });
    }
});

// View Project Details
router.get('/:id', isAuthenticated, async (req, res) => {
    try {
        const project = await Project.findByPk(req.params.id);
        
        if (!project) {
            return res.status(404).send('Project not found');
        }

        // Get all bookings for this project
        const bookings = await Booking.findAll({
            where: { projectId: project.id },
            include: [
                { model: require('../models').Customer, as: 'customer' }
            ],
            order: [['bookingDate', 'DESC']]
        });

        // Calculate statistics
        const totalBookings = bookings.length;
        const activeBookings = bookings.filter(b => b.status === 'Active').length;
        const completedBookings = bookings.filter(b => b.status === 'Completed').length;
        const totalRevenue = bookings.reduce((sum, b) => sum + parseFloat(b.totalAmount), 0);
        const collectedAmount = bookings.reduce((sum, b) => sum + parseFloat(b.bookingAmount), 0);

        res.render('project/view', {
            project,
            bookings,
            stats: {
                totalBookings,
                activeBookings,
                completedBookings,
                totalRevenue,
                collectedAmount
            },
            userName: req.session.userName,
            userRole: req.session.userRole
        });
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).send('Error loading project details');
    }
});

// Edit Project GET
router.get('/:id/edit', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const project = await Project.findByPk(req.params.id);
        
        if (!project) {
            return res.status(404).send('Project not found');
        }

        res.render('project/edit', {
            project,
            errors: {},
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: null
        });
    } catch (error) {
        console.error('Error loading project edit form:', error);
        res.status(500).send('Error loading project edit form');
    }
});

// Edit Project POST
router.post('/:id/edit', isAuthenticated, isAdmin, [
    body('projectName').notEmpty().withMessage('Project name is required'),
    body('location').notEmpty().withMessage('Location is required'),
    body('totalPlots').isInt({ min: 1 }).withMessage('Total plots must be at least 1'),
    body('availablePlots').isInt({ min: 0 }).withMessage('Available plots must be 0 or more'),
    body('availablePlots').custom((value, { req }) => {
        if (parseInt(value) > parseInt(req.body.totalPlots)) {
            throw new Error('Available plots cannot exceed total plots');
        }
        return true;
    })
], async (req, res) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const project = await Project.findByPk(req.params.id);
        return res.render('project/edit', {
            project: { ...project.toJSON(), ...req.body },
            errors: errors.mapped(),
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: errors.array()[0].msg
        });
    }

    try {
        const project = await Project.findByPk(req.params.id);
        
        if (!project) {
            return res.status(404).send('Project not found');
        }

        const { projectName, location, description, legalDetails, totalPlots, availablePlots, isActive } = req.body;

        // Check if project name already exists (excluding current project)
        const existingProject = await Project.findOne({
            where: {
                projectName,
                id: { [Op.ne]: project.id }
            }
        });

        if (existingProject) {
            return res.render('project/edit', {
                project: { ...project.toJSON(), ...req.body },
                errors: {},
                userName: req.session.userName,
                userRole: req.session.userRole,
                error: 'A project with this name already exists'
            });
        }

        await project.update({
            projectName,
            location,
            description,
            legalDetails,
            totalPlots: parseInt(totalPlots),
            availablePlots: parseInt(availablePlots),
            isActive: isActive === 'on' || isActive === true || isActive === 'true'
        });

        res.redirect(`/project/${project.id}`);
    } catch (error) {
        console.error('Error updating project:', error);
        const project = await Project.findByPk(req.params.id);
        res.render('project/edit', {
            project: { ...project.toJSON(), ...req.body },
            errors: {},
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: 'Error updating project: ' + error.message
        });
    }
});

// Delete Project (Soft Delete with Cascade)
router.post('/:id/delete', isAuthenticated, isAdmin, async (req, res) => {
    const transaction = await require('../models').sequelize.transaction();
    
    try {
        const project = await Project.findByPk(req.params.id);
        
        if (!project) {
            await transaction.rollback();
            return res.status(404).send('Project not found');
        }

        // Soft delete project
        await project.update({ isDeleted: true }, { transaction });

        // Cascade soft delete: Get all bookings for this project
        const bookings = await Booking.findAll({
            where: { projectId: project.id }
        });

        // Soft delete all related bookings
        for (const booking of bookings) {
            await booking.update({ isDeleted: true }, { transaction });

            // Cascade soft delete all payments for each booking
            await require('../models').Payment.update(
                { isDeleted: true },
                {
                    where: { bookingId: booking.id },
                    transaction
                }
            );
        }

        await transaction.commit();
        res.redirect('/project?message=deleted');
    } catch (error) {
        await transaction.rollback();
        console.error('Error deleting project:', error);
        res.status(500).send('Error deleting project: ' + error.message);
    }
});

module.exports = router;

