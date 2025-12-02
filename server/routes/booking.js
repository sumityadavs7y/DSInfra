const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Booking = require('../models/Booking');
const Project = require('../models/Project');
const Broker = require('../models/Broker');
const Settings = require('../models/Settings');
const { authenticate, checkPermission } = require('../middleware/auth');
const { generateBookingSlip } = require('../utils/pdfGenerator');

// Get all bookings
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, project, search, page = 1, limit = 10 } = req.query;
    const where = {};
    
    if (status) {
      where.status = status;
    }
    
    if (project) {
      where.projectId = project;
    }
    
    if (search) {
      where[Op.or] = [
        { bookingNo: { [Op.like]: `%${search}%` } },
        { applicantName: { [Op.like]: `%${search}%` } },
        { mobileNo: { [Op.like]: `%${search}%` } },
        { plotNo: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const offset = (page - 1) * limit;
    
    const { count, rows: bookings } = await Booking.findAndCountAll({
      where,
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name', 'location'] },
        { model: Broker, as: 'broker', attributes: ['id', 'name', 'mobileNo'] },
        { model: require('../models/User'), as: 'creator', attributes: ['id', 'name', 'email'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      bookings
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
  }
});

// Get single booking
router.get('/:id', authenticate, async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        { model: Project, as: 'project' },
        { model: Broker, as: 'broker' },
        { model: require('../models/User'), as: 'creator', attributes: ['id', 'name', 'email'] }
      ]
    });
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    res.json({
      success: true,
      booking
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch booking' });
  }
});

// Create new booking
router.post('/', authenticate, checkPermission('canManageBookings'), async (req, res) => {
  try {
    const bookingData = { ...req.body, createdBy: req.user.id };
    
    // Check if plot is available
    const project = await Project.findByPk(bookingData.projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    const plots = project.plots || [];
    const plot = plots.find(p => p.plotNo === bookingData.plotNo);
    if (!plot) {
      return res.status(404).json({ success: false, message: 'Plot not found' });
    }
    
    if (plot.status !== 'available') {
      return res.status(400).json({ success: false, message: 'Plot is not available for booking' });
    }
    
    // Create booking
    const booking = await Booking.create(bookingData);
    
    // Update plot status
    plot.status = 'booked';
    plot.bookedBy = booking.id;
    project.plots = plots;
    await project.save();
    
    // Update broker commission if broker is assigned
    if (booking.brokerId) {
      const broker = await Broker.findByPk(booking.brokerId);
      if (broker) {
        let commissionAmount = 0;
        if (broker.commissionType === 'percentage') {
          commissionAmount = (parseFloat(booking.totalAmount) * parseFloat(broker.commissionValue)) / 100;
        } else {
          commissionAmount = parseFloat(broker.commissionValue);
        }
        
        broker.totalCommissionEarned = parseFloat(broker.totalCommissionEarned || 0) + commissionAmount;
        const history = broker.commissionHistory || [];
        history.push({
          booking: booking.id,
          amount: commissionAmount,
          status: 'pending',
          createdAt: new Date()
        });
        broker.commissionHistory = history;
        broker.calculateRemainingCommission();
        await broker.save();
        
        booking.commissionAmount = commissionAmount;
        await booking.save();
      }
    }
    
    // Reload booking with associations
    await booking.reload({
      include: [
        { model: Project, as: 'project' },
        { model: Broker, as: 'broker' }
      ]
    });
    
    // Generate PDF
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    const pdfFileName = await generateBookingSlip(booking, settings);
    
    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking,
      pdfUrl: `/uploads/${pdfFileName}`
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ success: false, message: 'Failed to create booking', error: error.message });
  }
});

// Update booking
router.put('/:id', authenticate, checkPermission('canManageBookings'), async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    await booking.update(req.body);
    
    // Reload with associations
    await booking.reload({
      include: [
        { model: Project, as: 'project' },
        { model: Broker, as: 'broker' }
      ]
    });
    
    res.json({
      success: true,
      message: 'Booking updated successfully',
      booking
    });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ success: false, message: 'Failed to update booking' });
  }
});

// Download booking slip
router.get('/:id/download-slip', authenticate, async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        { model: Project, as: 'project' },
        { model: Broker, as: 'broker' }
      ]
    });
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    const pdfFileName = await generateBookingSlip(booking, settings);
    
    res.json({
      success: true,
      pdfUrl: `/uploads/${pdfFileName}`
    });
  } catch (error) {
    console.error('Download booking slip error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate booking slip' });
  }
});

// Cancel booking
router.post('/:id/cancel', authenticate, checkPermission('canManageBookings'), async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    // Update booking status
    booking.status = 'cancelled';
    await booking.save();
    
    // Make plot available again
    const project = await Project.findByPk(booking.projectId);
    if (project) {
      const plots = project.plots || [];
      const plot = plots.find(p => p.plotNo === booking.plotNo);
      if (plot) {
        plot.status = 'available';
        plot.bookedBy = null;
        project.plots = plots;
        await project.save();
      }
    }
    
    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel booking' });
  }
});

module.exports = router;
