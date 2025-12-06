const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Project = require('../models/Project');
const Settings = require('../models/Settings');
const { authenticate, checkPermission } = require('../middleware/auth');
const { generatePaymentReceipt } = require('../utils/pdfGenerator');

// Get all payments
router.get('/', authenticate, async (req, res) => {
  try {
    const { booking, startDate, endDate, page = 1, limit = 10 } = req.query;
    const where = {};
    
    if (booking) {
      where.bookingId = booking;
    }
    
    if (startDate && endDate) {
      where.receiptDate = {
        [Op.gte]: new Date(startDate),
        [Op.lte]: new Date(endDate)
      };
    }
    
    const offset = (page - 1) * limit;
    
    const { count, rows: payments } = await Payment.findAndCountAll({
      where,
      include: [
        { model: Booking, as: 'booking', attributes: ['id', 'bookingNo', 'applicantName', 'plotNo'] },
        { model: require('../models/User'), as: 'collector', attributes: ['id', 'name', 'email'] }
      ],
      order: [['receiptDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      payments
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payments' });
  }
});

// Get single payment
router.get('/:id', authenticate, async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id, {
      include: [
        { model: Booking, as: 'booking' },
        { model: require('../models/User'), as: 'collector', attributes: ['id', 'name', 'email'] }
      ]
    });
    
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    
    res.json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payment' });
  }
});

// Get payment history for a booking
router.get('/booking/:bookingId', authenticate, async (req, res) => {
  try {
    const payments = await Payment.findAll({
      where: { bookingId: req.params.bookingId },
      include: [
        { model: require('../models/User'), as: 'collector', attributes: ['id', 'name', 'email'] }
      ],
      order: [['receiptDate', 'DESC']]
    });
    
    res.json({
      success: true,
      count: payments.length,
      payments
    });
  } catch (error) {
    console.error('Get booking payments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payment history' });
  }
});

// Create new payment
router.post('/', authenticate, checkPermission('canManagePayments'), async (req, res) => {
  try {
    const { booking: bookingId, paymentAmount, paymentMode, transactionNo, remarks, emiDetails } = req.body;
    
    // Get booking details
    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: Project, as: 'project' }]
    });
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    // Create payment record
    const payment = await Payment.create({
      bookingId: bookingId,
      customerName: booking.applicantName,
      projectName: booking.project.name,
      plotNo: booking.plotNo,
      paymentAmount,
      paymentMode,
      transactionNo,
      remarks,
      previousPaid: booking.totalPaid,
      totalAmount: booking.totalAmount,
      emiDetails,
      collectedBy: req.user.id
    });
    
    // Reload payment with associations
    await payment.reload({
      include: [{ model: Booking, as: 'booking' }]
    });
    
    // Generate PDF receipt
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    const pdfFileName = await generatePaymentReceipt(payment, booking, settings);
    
    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      payment,
      pdfUrl: `/uploads/${pdfFileName}`
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to record payment', error: error.message });
  }
});

// Download payment receipt
router.get('/:id/download-receipt', authenticate, async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id, {
      include: [{ model: Booking, as: 'booking' }]
    });
    
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    
    const booking = await Booking.findByPk(payment.bookingId, {
      include: [{ model: Project, as: 'project' }]
    });
    
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    const pdfFileName = await generatePaymentReceipt(payment, booking, settings);
    
    res.json({
      success: true,
      pdfUrl: `/uploads/${pdfFileName}`
    });
  } catch (error) {
    console.error('Download receipt error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate receipt' });
  }
});

// Get payment statistics
router.get('/stats/summary', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    
    if (startDate && endDate) {
      where.receiptDate = {
        [Op.gte]: new Date(startDate),
        [Op.lte]: new Date(endDate)
      };
    }
    
    // Total collection
    const totalCollection = await Payment.sum('paymentAmount', { where }) || 0;
    
    // Payment mode wise
    const paymentModeWise = await Payment.findAll({
      where,
      attributes: [
        'paymentMode',
        [sequelize.fn('SUM', sequelize.col('paymentAmount')), 'total'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['paymentMode']
    });
    
    res.json({
      success: true,
      totalCollection,
      paymentModeWise: paymentModeWise.map(pm => ({
        _id: pm.paymentMode,
        total: parseFloat(pm.dataValues.total),
        count: parseInt(pm.dataValues.count)
      }))
    });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payment statistics' });
  }
});

module.exports = router;
