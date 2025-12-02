const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { redirectIfAuthenticated } = require('../middleware/auth');

// GET login page
router.get('/login', redirectIfAuthenticated, (req, res) => {
    res.render('login', { error: null });
});

// POST login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.render('login', { error: 'Please provide email and password' });
        }

        // Find user by email
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.render('login', { error: 'Invalid email or password' });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.render('login', { error: 'Your account has been deactivated' });
        }

        // Compare password
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.render('login', { error: 'Invalid email or password' });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Set session
        req.session.userId = user.id;
        req.session.userName = user.name;
        req.session.userEmail = user.email;
        req.session.userRole = user.role;

        // Redirect to dashboard
        res.redirect('/dashboard');

    } catch (error) {
        console.error('Login error:', error);
        res.render('login', { error: 'An error occurred during login. Please try again.' });
    }
});

// GET logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/auth/login');
    });
});

module.exports = router;

