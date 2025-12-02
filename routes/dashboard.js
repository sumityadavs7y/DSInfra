const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');

// Dashboard route - protected by authentication
router.get('/', isAuthenticated, (req, res) => {
    res.render('dashboard', {
        userName: req.session.userName,
        userEmail: req.session.userEmail,
        userRole: req.session.userRole
    });
});

module.exports = router;

