const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { User } = require('../models');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Middleware to ensure only admins can access user management
router.use(isAuthenticated);
router.use(isAdmin);

// List all users
router.get('/', async (req, res) => {
    try {
        const users = await User.findAll({
            order: [['createdAt', 'DESC']],
            attributes: { exclude: ['password'] }
        });

        res.render('user/list', {
            userName: req.session.userName,
            userEmail: req.session.userEmail,
            userRole: req.session.userRole,
            users,
            successMessage: req.query.success,
            errorMessage: req.query.error
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.redirect('/dashboard?error=Error loading users');
    }
});

// Show create user form
router.get('/create', (req, res) => {
    res.render('user/create', {
        userName: req.session.userName,
        userEmail: req.session.userEmail,
        userRole: req.session.userRole,
        errorMessage: null
    });
});

// Create new user
router.post('/create', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Validate required fields
        if (!name || !email || !password || !role) {
            return res.render('user/create', {
                userName: req.session.userName,
                userEmail: req.session.userEmail,
                userRole: req.session.userRole,
                errorMessage: 'All fields are required'
            });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.render('user/create', {
                userName: req.session.userName,
                userEmail: req.session.userEmail,
                userRole: req.session.userRole,
                errorMessage: 'Email already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        await User.create({
            name,
            email,
            password: hashedPassword,
            role
        });

        res.redirect('/user?success=User created successfully');
    } catch (error) {
        console.error('Error creating user:', error);
        res.render('user/create', {
            userName: req.session.userName,
            userEmail: req.session.userEmail,
            userRole: req.session.userRole,
            errorMessage: 'Error creating user: ' + error.message
        });
    }
});

// Show edit user form
router.get('/:id/edit', async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, {
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            return res.redirect('/user?error=User not found');
        }

        res.render('user/edit', {
            userName: req.session.userName,
            userEmail: req.session.userEmail,
            userRole: req.session.userRole,
            user,
            errorMessage: null
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.redirect('/user?error=Error loading user');
    }
});

// Update user
router.post('/:id/edit', async (req, res) => {
    try {
        const { name, email, role } = req.body;
        const userId = req.params.id;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.redirect('/user?error=User not found');
        }

        // Check if email already exists (excluding current user)
        const existingUser = await User.findOne({ 
            where: { 
                email,
                id: { [require('sequelize').Op.ne]: userId }
            } 
        });
        
        if (existingUser) {
            const userForRender = await User.findByPk(userId, {
                attributes: { exclude: ['password'] }
            });
            return res.render('user/edit', {
                userName: req.session.userName,
                userEmail: req.session.userEmail,
                userRole: req.session.userRole,
                user: userForRender,
                errorMessage: 'Email already exists'
            });
        }

        // Update user
        await user.update({ name, email, role });

        res.redirect('/user?success=User updated successfully');
    } catch (error) {
        console.error('Error updating user:', error);
        const user = await User.findByPk(req.params.id, {
            attributes: { exclude: ['password'] }
        });
        res.render('user/edit', {
            userName: req.session.userName,
            userEmail: req.session.userEmail,
            userRole: req.session.userRole,
            user,
            errorMessage: 'Error updating user: ' + error.message
        });
    }
});

// Show reset password form
router.get('/:id/reset-password', async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, {
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            return res.redirect('/user?error=User not found');
        }

        res.render('user/reset-password', {
            userName: req.session.userName,
            userEmail: req.session.userEmail,
            userRole: req.session.userRole,
            user,
            errorMessage: null
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.redirect('/user?error=Error loading user');
    }
});

// Reset password
router.post('/:id/reset-password', async (req, res) => {
    try {
        const { newPassword, confirmPassword } = req.body;
        const userId = req.params.id;

        // Validate passwords
        if (!newPassword || !confirmPassword) {
            const user = await User.findByPk(userId, {
                attributes: { exclude: ['password'] }
            });
            return res.render('user/reset-password', {
                userName: req.session.userName,
                userEmail: req.session.userEmail,
                userRole: req.session.userRole,
                user,
                errorMessage: 'Both password fields are required'
            });
        }

        if (newPassword !== confirmPassword) {
            const user = await User.findByPk(userId, {
                attributes: { exclude: ['password'] }
            });
            return res.render('user/reset-password', {
                userName: req.session.userName,
                userEmail: req.session.userEmail,
                userRole: req.session.userRole,
                user,
                errorMessage: 'Passwords do not match'
            });
        }

        if (newPassword.length < 6) {
            const user = await User.findByPk(userId, {
                attributes: { exclude: ['password'] }
            });
            return res.render('user/reset-password', {
                userName: req.session.userName,
                userEmail: req.session.userEmail,
                userRole: req.session.userRole,
                user,
                errorMessage: 'Password must be at least 6 characters long'
            });
        }

        // Find user
        const user = await User.findByPk(userId);
        if (!user) {
            return res.redirect('/user?error=User not found');
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await user.update({ password: hashedPassword });

        res.redirect('/user?success=Password reset successfully');
    } catch (error) {
        console.error('Error resetting password:', error);
        const user = await User.findByPk(req.params.id, {
            attributes: { exclude: ['password'] }
        });
        res.render('user/reset-password', {
            userName: req.session.userName,
            userEmail: req.session.userEmail,
            userRole: req.session.userRole,
            user,
            errorMessage: 'Error resetting password: ' + error.message
        });
    }
});

// Delete user
router.post('/:id/delete', async (req, res) => {
    try {
        const userId = req.params.id;

        // Prevent self-deletion
        if (parseInt(userId) === req.session.userId) {
            return res.redirect('/user?error=Cannot delete your own account');
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.redirect('/user?error=User not found');
        }

        await user.destroy();

        res.redirect('/user?success=User deleted successfully');
    } catch (error) {
        console.error('Error deleting user:', error);
        res.redirect('/user?error=Error deleting user');
    }
});

module.exports = router;

