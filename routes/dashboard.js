const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const { Project, Booking, Customer, Payment } = require('../models');
const { Sequelize } = require('sequelize');

// Dashboard route - protected by authentication
router.get('/', isAuthenticated, async (req, res) => {
    try {
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
            attributes: ['id']
        });
        
        const registeredBookingIds = registeredBookings.map(b => b.id);
        
        // Calculate total revenue only from registered properties (booking value)
        const totalRevenue = registeredBookingIds.length > 0 
            ? await Booking.sum('totalAmount', {
                where: { 
                    id: registeredBookingIds,
                    isDeleted: false 
                }
            }) || 0
            : 0;
        
        // Calculate total revenue from ALL bookings (registered + non-registered)
        // This represents the total booking value from all properties
        const totalRevenueAllBookings = await Booking.sum('totalAmount', {
            where: { 
                isDeleted: false,
                status: 'Active'
            }
        }) || 0;
        
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

        res.render('dashboard', {
            userName: req.session.userName,
            userEmail: req.session.userEmail,
            userRole: req.session.userRole,
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

