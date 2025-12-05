const express = require('express');
const router = express.Router();
const { User, Broker, UserBrokerAccess } = require('../models');
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
router.get('/create', async (req, res) => {
    try {
        // Fetch all active brokers for the associate selection
        const brokers = await Broker.findAll({
            where: { isDeleted: false },
            order: [['brokerNo', 'ASC']]
        });

        res.render('user/create', {
            userName: req.session.userName,
            userEmail: req.session.userEmail,
            userRole: req.session.userRole,
            brokers,
            errorMessage: null
        });
    } catch (error) {
        console.error('Error loading create user form:', error);
        res.redirect('/user?error=Error loading form');
    }
});

// Create new user
router.post('/create', async (req, res) => {
    try {
        const { name, email, password, role, brokerIds } = req.body;

        // Validate required fields
        if (!name || !email || !password || !role) {
            const brokers = await Broker.findAll({
                where: { isDeleted: false },
                order: [['brokerNo', 'ASC']]
            });
            return res.render('user/create', {
                userName: req.session.userName,
                userEmail: req.session.userEmail,
                userRole: req.session.userRole,
                brokers,
                errorMessage: 'All fields are required'
            });
        }

        // Validate broker selection for associate role
        if (role === 'associate') {
            if (!brokerIds || (Array.isArray(brokerIds) && brokerIds.length === 0)) {
                const brokers = await Broker.findAll({
                    where: { isDeleted: false },
                    order: [['brokerNo', 'ASC']]
                });
                return res.render('user/create', {
                    userName: req.session.userName,
                    userEmail: req.session.userEmail,
                    userRole: req.session.userRole,
                    brokers,
                    errorMessage: 'Please select at least one associate for the associate login role'
                });
            }
        }

        // Check if email already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            const brokers = await Broker.findAll({
                where: { isDeleted: false },
                order: [['brokerNo', 'ASC']]
            });
            return res.render('user/create', {
                userName: req.session.userName,
                userEmail: req.session.userEmail,
                userRole: req.session.userRole,
                brokers,
                errorMessage: 'Email already exists'
            });
        }

        // Create user (password will be hashed by the model's beforeCreate hook)
        const user = await User.create({
            name,
            email,
            password,  // Plain password - will be hashed by model hook
            role
        });

        // If role is associate, create broker access records
        if (role === 'associate' && brokerIds) {
            const brokerIdArray = Array.isArray(brokerIds) ? brokerIds : [brokerIds];
            const accessRecords = brokerIdArray.map(brokerId => ({
                userId: user.id,
                brokerId: parseInt(brokerId)
            }));
            await UserBrokerAccess.bulkCreate(accessRecords);
        }

        res.redirect('/user?success=User created successfully');
    } catch (error) {
        console.error('Error creating user:', error);
        const brokers = await Broker.findAll({
            where: { isDeleted: false },
            order: [['brokerNo', 'ASC']]
        });
        res.render('user/create', {
            userName: req.session.userName,
            userEmail: req.session.userEmail,
            userRole: req.session.userRole,
            brokers,
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

        // Fetch all active brokers for the associate selection
        const brokers = await Broker.findAll({
            where: { isDeleted: false },
            order: [['brokerNo', 'ASC']]
        });

        // Fetch current broker assignments if user is an associate
        let userBrokerIds = [];
        if (user.role === 'associate') {
            const userBrokerAccess = await UserBrokerAccess.findAll({
                where: { userId: user.id }
            });
            userBrokerIds = userBrokerAccess.map(access => access.brokerId);
        }

        res.render('user/edit', {
            userName: req.session.userName,
            userEmail: req.session.userEmail,
            userRole: req.session.userRole,
            user,
            brokers,
            userBrokerIds,
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
        const { name, email, role, brokerIds } = req.body;
        const userId = req.params.id;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.redirect('/user?error=User not found');
        }

        // Validate broker selection for associate role
        if (role === 'associate') {
            if (!brokerIds || (Array.isArray(brokerIds) && brokerIds.length === 0)) {
                const brokers = await Broker.findAll({
                    where: { isDeleted: false },
                    order: [['brokerNo', 'ASC']]
                });
                const userBrokerAccess = await UserBrokerAccess.findAll({
                    where: { userId: userId }
                });
                const userBrokerIds = userBrokerAccess.map(access => access.brokerId);
                
                const userForRender = await User.findByPk(userId, {
                    attributes: { exclude: ['password'] }
                });
                return res.render('user/edit', {
                    userName: req.session.userName,
                    userEmail: req.session.userEmail,
                    userRole: req.session.userRole,
                    user: userForRender,
                    brokers,
                    userBrokerIds,
                    errorMessage: 'Please select at least one associate for the associate login role'
                });
            }
        }

        // Check if email already exists (excluding current user)
        const existingUser = await User.findOne({ 
            where: { 
                email,
                id: { [require('sequelize').Op.ne]: userId }
            } 
        });
        
        if (existingUser) {
            const brokers = await Broker.findAll({
                where: { isDeleted: false },
                order: [['brokerNo', 'ASC']]
            });
            const userBrokerAccess = await UserBrokerAccess.findAll({
                where: { userId: userId }
            });
            const userBrokerIds = userBrokerAccess.map(access => access.brokerId);
            
            const userForRender = await User.findByPk(userId, {
                attributes: { exclude: ['password'] }
            });
            return res.render('user/edit', {
                userName: req.session.userName,
                userEmail: req.session.userEmail,
                userRole: req.session.userRole,
                user: userForRender,
                brokers,
                userBrokerIds,
                errorMessage: 'Email already exists'
            });
        }

        // Update user
        await user.update({ name, email, role });

        // Update broker access if role is associate
        if (role === 'associate') {
            // Delete existing broker access
            await UserBrokerAccess.destroy({ where: { userId: user.id } });
            
            // Create new broker access records
            if (brokerIds) {
                const brokerIdArray = Array.isArray(brokerIds) ? brokerIds : [brokerIds];
                const accessRecords = brokerIdArray.map(brokerId => ({
                    userId: user.id,
                    brokerId: parseInt(brokerId)
                }));
                await UserBrokerAccess.bulkCreate(accessRecords);
            }
        } else {
            // If role changed from associate to something else, remove all broker access
            await UserBrokerAccess.destroy({ where: { userId: user.id } });
        }

        res.redirect('/user?success=User updated successfully');
    } catch (error) {
        console.error('Error updating user:', error);
        const brokers = await Broker.findAll({
            where: { isDeleted: false },
            order: [['brokerNo', 'ASC']]
        });
        const userBrokerAccess = await UserBrokerAccess.findAll({
            where: { userId: req.params.id }
        });
        const userBrokerIds = userBrokerAccess.map(access => access.brokerId);
        
        const user = await User.findByPk(req.params.id, {
            attributes: { exclude: ['password'] }
        });
        res.render('user/edit', {
            userName: req.session.userName,
            userEmail: req.session.userEmail,
            userRole: req.session.userRole,
            user,
            brokers,
            userBrokerIds,
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

        // Update password (will be hashed by the model's beforeUpdate hook)
        await user.update({ password: newPassword });

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

