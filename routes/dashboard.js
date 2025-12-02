const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const { Project, Booking, Customer } = require('../models');
const { Sequelize } = require('sequelize');

// Dashboard route - protected by authentication
router.get('/', isAuthenticated, async (req, res) => {
    try {
        // Get statistics
        const totalProjects = await Project.count();
        
        const activeBookings = await Booking.count({
            where: { status: 'Active' }
        });
        
        const totalRevenue = await Booking.sum('bookingAmount') || 0;
        
        const activeCustomers = await Customer.count({
            where: { isActive: true }
        });

        res.render('dashboard', {
            userName: req.session.userName,
            userEmail: req.session.userEmail,
            userRole: req.session.userRole,
            stats: {
                totalProjects,
                activeBookings,
                totalRevenue,
                activeCustomers
            }
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.render('dashboard', {
            userName: req.session.userName,
            userEmail: req.session.userEmail,
            userRole: req.session.userRole,
            stats: {
                totalProjects: 0,
                activeBookings: 0,
                totalRevenue: 0,
                activeCustomers: 0
            }
        });
    }
});

module.exports = router;

