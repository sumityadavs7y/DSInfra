const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Broker = require('../models/Broker');
const Booking = require('../models/Booking');
const Project = require('../models/Project');
const { authenticate, checkPermission } = require('../middleware/auth');

// Get all brokers
router.get('/', authenticate, async (req, res) => {
  try {
    const { isActive, search } = req.query;
    const where = {};
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { mobileNo: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const brokers = await Broker.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      count: brokers.length,
      brokers
    });
  } catch (error) {
    console.error('Get brokers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch brokers' });
  }
});

// Get single broker
router.get('/:id', authenticate, async (req, res) => {
  try {
    const broker = await Broker.findByPk(req.params.id);
    
    if (!broker) {
      return res.status(404).json({ success: false, message: 'Broker not found' });
    }
    
    // Get bookings associated with this broker
    const bookings = await Booking.findAll({
      where: { brokerId: broker.id },
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name'] }
      ],
      attributes: ['id', 'bookingNo', 'applicantName', 'plotNo', 'totalAmount', 'status']
    });
    
    res.json({
      success: true,
      broker,
      bookings
    });
  } catch (error) {
    console.error('Get broker error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch broker' });
  }
});

// Create new broker
router.post('/', authenticate, checkPermission('canManageBrokers'), async (req, res) => {
  try {
    const brokerData = { ...req.body, createdBy: req.user.id };
    const broker = await Broker.create(brokerData);
    
    res.status(201).json({
      success: true,
      message: 'Broker created successfully',
      broker
    });
  } catch (error) {
    console.error('Create broker error:', error);
    res.status(500).json({ success: false, message: 'Failed to create broker', error: error.message });
  }
});

// Update broker
router.put('/:id', authenticate, checkPermission('canManageBrokers'), async (req, res) => {
  try {
    const broker = await Broker.findByPk(req.params.id);
    
    if (!broker) {
      return res.status(404).json({ success: false, message: 'Broker not found' });
    }
    
    await broker.update(req.body);
    
    res.json({
      success: true,
      message: 'Broker updated successfully',
      broker
    });
  } catch (error) {
    console.error('Update broker error:', error);
    res.status(500).json({ success: false, message: 'Failed to update broker' });
  }
});

// Pay commission to broker
router.post('/:id/pay-commission', authenticate, checkPermission('canManageBrokers'), async (req, res) => {
  try {
    const { amount, commissionIds, remarks } = req.body;
    const broker = await Broker.findByPk(req.params.id);
    
    if (!broker) {
      return res.status(404).json({ success: false, message: 'Broker not found' });
    }
    
    // Update commission status
    const history = broker.commissionHistory || [];
    if (commissionIds && commissionIds.length > 0) {
      commissionIds.forEach(id => {
        const commissionIndex = history.findIndex(h => h.booking === id && h.status === 'pending');
        if (commissionIndex !== -1) {
          history[commissionIndex].status = 'paid';
          history[commissionIndex].paidDate = new Date();
          history[commissionIndex].remarks = remarks;
        }
      });
      broker.commissionHistory = history;
    }
    
    // Update totals
    broker.totalCommissionPaid = parseFloat(broker.totalCommissionPaid || 0) + parseFloat(amount);
    broker.calculateRemainingCommission();
    
    await broker.save();
    
    res.json({
      success: true,
      message: 'Commission payment recorded successfully',
      broker
    });
  } catch (error) {
    console.error('Pay commission error:', error);
    res.status(500).json({ success: false, message: 'Failed to record commission payment' });
  }
});

// Get broker statistics
router.get('/:id/stats', authenticate, async (req, res) => {
  try {
    const broker = await Broker.findByPk(req.params.id);
    
    if (!broker) {
      return res.status(404).json({ success: false, message: 'Broker not found' });
    }
    
    const totalBookings = await Booking.count({ where: { brokerId: broker.id } });
    const completedBookings = await Booking.count({ 
      where: { 
        brokerId: broker.id, 
        status: 'completed' 
      }
    });
    
    const history = broker.commissionHistory || [];
    const pendingCommission = history
      .filter(c => c.status === 'pending')
      .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
    
    res.json({
      success: true,
      stats: {
        totalBookings,
        completedBookings,
        totalCommissionEarned: parseFloat(broker.totalCommissionEarned || 0),
        totalCommissionPaid: parseFloat(broker.totalCommissionPaid || 0),
        pendingCommission,
        remainingCommission: parseFloat(broker.remainingCommission || 0)
      }
    });
  } catch (error) {
    console.error('Get broker stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch broker statistics' });
  }
});

module.exports = router;
