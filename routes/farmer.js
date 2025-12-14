const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');

// Farmer dashboard - main page
router.get('/', isAuthenticated, async (req, res) => {
    try {
        // Placeholder stats - will be implemented later
        const stats = {
            totalFarmers: 0,
            activeFarms: 0,
            totalRevenue: 0,
            pendingOrders: 0
        };

        res.render('farmer/index', {
            stats,
            userName: req.session.userName,
            userRole: req.session.userRole
        });
    } catch (error) {
        console.error('Error loading farmer dashboard:', error);
        res.status(500).send('Error loading farmer dashboard');
    }
});

module.exports = router;

