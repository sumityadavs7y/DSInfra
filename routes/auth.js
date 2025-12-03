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

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔐 Login Attempt');
        console.log(`Email: ${email}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Validate input
        if (!email || !password) {
            console.log('❌ Missing email or password');
            return res.render('login', { error: 'Please provide email and password' });
        }

        // Find user by email (case-insensitive)
        const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });

        if (!user) {
            console.log('❌ User not found');
            return res.render('login', { error: 'Invalid email or password' });
        }

        console.log(`✅ User found: ${user.name} (${user.email})`);

        // Check if user is active
        if (!user.isActive) {
            console.log('❌ User is inactive');
            return res.render('login', { error: 'Your account has been deactivated' });
        }

        console.log('✅ User is active');

        // Compare password
        console.log('🔄 Comparing password...');
        const isMatch = await user.comparePassword(password);
        console.log(`Password match: ${isMatch ? '✅ YES' : '❌ NO'}`);

        if (!isMatch) {
            console.log('❌ Password does not match');
            return res.render('login', { error: 'Invalid email or password' });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        console.log('✅ Updating session...');

        // Set session
        req.session.userId = user.id;
        req.session.userName = user.name;
        req.session.userEmail = user.email;
        req.session.userRole = user.role;

        console.log('✅ Login successful! Redirecting to dashboard...');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Redirect to dashboard
        res.redirect('/dashboard');

    } catch (error) {
        console.error('❌ Login error:', error);
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

