const express = require('express');
const router = express.Router();
const { isAuthenticated, getAccessibleFarmerProjectIds } = require('../middleware/auth');
const { FarmerProject, FarmerPayment, FarmerRegistry } = require('../models');
const { Op } = require('sequelize');

// Farmer dashboard - main page
router.get('/', isAuthenticated, getAccessibleFarmerProjectIds, async (req, res) => {
    try {
        // Build where clause for accessible projects
        let whereClause = { isDeleted: false };
        if (req.accessibleFarmerProjectIds !== null) {
            whereClause.id = { [Op.in]: req.accessibleFarmerProjectIds };
        }

        // Get accessible projects
        const projects = await FarmerProject.findAll({
            where: whereClause,
            order: [['name', 'ASC']]
        });

        // Calculate stats based on accessible projects
        const projectIds = projects.map(p => p.id);
        
        let totalPayments = 0;
        let totalRegistries = 0;
        
        if (projectIds.length > 0) {
            const payments = await FarmerPayment.findAll({
                where: {
                    projectId: { [Op.in]: projectIds },
                    isDeleted: false
                }
            });
            totalPayments = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

            const registries = await FarmerRegistry.findAll({
                where: {
                    projectId: { [Op.in]: projectIds },
                    isDeleted: false
                }
            });
            totalRegistries = registries.reduce((sum, r) => sum + (parseFloat(r.rate || 0) * parseFloat(r.area || 0)), 0);
        }

        const stats = {
            totalProjects: projects.length,
            totalPayments: totalPayments,
            totalRegistries: totalRegistries,
            duePayment: totalRegistries - totalPayments
        };

        res.render('farmer/index', {
            stats,
            projects,
            userName: req.session.userName,
            userRole: req.session.userRole
        });
    } catch (error) {
        console.error('Error loading farmer dashboard:', error);
        res.status(500).send('Error loading farmer dashboard');
    }
});

module.exports = router;

