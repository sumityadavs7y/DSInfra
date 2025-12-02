const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Settings = require('../models/Settings');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const { authenticate, isAdmin, checkPermission } = require('../middleware/auth');

// Get all users (admin only)
router.get('/users', authenticate, isAdmin, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// Get single user
router.get('/users/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
});

// Update user
router.put('/users/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { password, ...updateData } = req.body;
    
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Update fields
    Object.keys(updateData).forEach(key => {
      user[key] = updateData[key];
    });
    
    // Update password if provided
    if (password) {
      user.password = password;
    }
    
    await user.save();
    
    res.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
});

// Delete user
router.delete('/users/:id', authenticate, isAdmin, async (req, res) => {
  try {
    // Prevent deleting own account
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }
    
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    await user.destroy();
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

// Toggle user active status
router.patch('/users/:id/toggle-status', authenticate, isAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    user.isActive = !user.isActive;
    await user.save();
    
    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user.id,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user status' });
  }
});

// Get settings
router.get('/settings', authenticate, async (req, res) => {
  try {
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = await Settings.create({});
    }
    
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
});

// Update settings
router.put('/settings', authenticate, checkPermission('canEditSettings'), async (req, res) => {
  try {
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = await Settings.create(req.body);
    } else {
      await settings.update(req.body);
    }
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
});

// System logs (simplified version)
router.get('/logs', authenticate, isAdmin, async (req, res) => {
  try {
    const recentUsers = await User.findAll({
      attributes: ['id', 'name', 'email', 'lastLogin'],
      order: [['lastLogin', 'DESC']],
      limit: 10
    });
    
    const recentBookings = await Booking.findAll({
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name'] }
      ],
      attributes: ['id', 'bookingNo', 'applicantName', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 10
    });
    
    const recentPayments = await Payment.findAll({
      include: [
        { model: User, as: 'collector', attributes: ['id', 'name'] }
      ],
      attributes: ['id', 'receiptNo', 'customerName', 'paymentAmount', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 10
    });
    
    res.json({
      success: true,
      logs: {
        recentLogins: recentUsers,
        recentBookings,
        recentPayments
      }
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch logs' });
  }
});

// Backup database (simplified - in production use proper backup tools)
router.post('/backup', authenticate, isAdmin, async (req, res) => {
  try {
    // In production, implement proper backup mechanism
    // For SQLite, you can copy the database.sqlite file
    // For MySQL/PostgreSQL, use proper database backup tools
    res.json({
      success: true,
      message: 'Backup initiated. Please use proper database backup tools for production.'
    });
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ success: false, message: 'Failed to create backup' });
  }
});

module.exports = router;
