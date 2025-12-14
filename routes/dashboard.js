const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const { Project, Booking, Customer, Payment, FarmerProject } = require('../models');
const { Sequelize } = require('sequelize');

// Dashboard route - protected by authentication
router.get('/', isAuthenticated, async (req, res) => {
    try {
        // Redirect farmers to their specific dashboard
        if (req.session.userRole === 'farmer') {
            return res.redirect('/farmer');
        }

        // Get statistics
        const totalProjects = await Project.count();
        
        const activeBookings = await Booking.count({
            where: { status: 'Active' }
        });
        
        // Get all bookings with registry completed
        const registeredBookings = await Booking.findAll({
            where: { 
                registryCompleted: true,
                isDeleted: false
            },
            attributes: ['id', 'area', 'effectiveRate', 'plc']
        });
        
        // Calculate total revenue only from registered properties (booking value)
        // totalAmount is now calculated at runtime, so we sum it manually
        const totalRevenue = registeredBookings.reduce((sum, booking) => {
            return sum + parseFloat(booking.totalAmount || 0);
        }, 0);
        
        // Calculate total revenue from ALL bookings (registered + non-registered)
        // This represents the total booking value from all properties
        const allActiveBookings = await Booking.findAll({
            where: { 
                isDeleted: false,
                status: 'Active'
            },
            attributes: ['id', 'area', 'effectiveRate', 'plc']
        });
        
        const totalRevenueAllBookings = allActiveBookings.reduce((sum, booking) => {
            return sum + parseFloat(booking.totalAmount || 0);
        }, 0);
        
        // Calculate total payments actually received (cash collected)
        // This is the sum of all payment transactions
        const totalPaymentsReceived = await Payment.sum('paymentAmount', {
            where: { isDeleted: false }
        }) || 0;
        
        // Calculate pending revenue: total revenue from all bookings minus all payments received
        const pendingRevenue = totalRevenueAllBookings - totalPaymentsReceived;
        
        const activeCustomers = await Customer.count({
            where: { isActive: true }
        });

        // Get quick-linked farmer projects
        const farmerQuickLinks = await FarmerProject.findAll({
            where: { 
                isQuickLink: true,
                isDeleted: false 
            },
            order: [['name', 'ASC']],
            limit: 6 // Limit to 6 quick links
        });

        res.render('dashboard', {
            userName: req.session.userName,
            userEmail: req.session.userEmail,
            userRole: req.session.userRole,
            farmerQuickLinks,
            stats: {
                totalProjects,
                activeBookings,
                totalRevenue,
                totalRevenueAllBookings,
                totalPaymentsReceived,
                pendingRevenue,
                activeCustomers
            }
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.render('dashboard', {
            userName: req.session.userName,
            userEmail: req.session.userEmail,
            userRole: req.session.userRole,
            farmerQuickLinks: [],
            stats: {
                totalProjects: 0,
                activeBookings: 0,
                totalRevenue: 0,
                totalRevenueAllBookings: 0,
                totalPaymentsReceived: 0,
                pendingRevenue: 0,
                activeCustomers: 0
            }
        });
    }
});

module.exports = router;

