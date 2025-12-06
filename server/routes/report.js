const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const { Op, fn, col } = require('sequelize');
const sequelize = require('../config/database');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Broker = require('../models/Broker');
const Project = require('../models/Project');
const User = require('../models/User');
const { authenticate, checkPermission } = require('../middleware/auth');

// Dashboard statistics
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const totalBookings = await Booking.count();
    const activeBookings = await Booking.count({ where: { status: { [Op.ne]: 'cancelled' } } });
    const completedBookings = await Booking.count({ where: { status: 'completed' } });
    
    const totalCollection = await Payment.sum('paymentAmount') || 0;
    
    // Calculate pending amount (totalAmount - totalPaid for all non-cancelled bookings)
    const activeBookingsForPending = await Booking.findAll({ 
      where: { status: { [Op.ne]: 'cancelled' } },
      attributes: ['totalAmount', 'totalPaid']
    });
    const pendingAmount = activeBookingsForPending.reduce((sum, b) => {
      return sum + (parseFloat(b.totalAmount) - parseFloat(b.totalPaid || 0));
    }, 0);
    
    const totalProjects = await Project.count({ where: { isActive: true } });
    
    // Count available plots from JSON field
    const projects = await Project.findAll({ where: { isActive: true } });
    let availablePlots = 0;
    projects.forEach(p => {
      const plots = p.plots || [];
      availablePlots += plots.filter(plot => plot.status === 'available').length;
    });
    
    const activeBrokers = await Broker.count({ where: { isActive: true } });
    const pendingCommissions = await Broker.sum('remainingCommission') || 0;
    
    // Recent bookings
    const recentBookings = await Booking.findAll({
      include: [{ model: Project, as: 'project', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    // This month collection
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthCollection = await Payment.sum('paymentAmount', {
      where: { receiptDate: { [Op.gte]: startOfMonth } }
    }) || 0;
    
    res.json({
      success: true,
      stats: {
        bookings: {
          total: totalBookings,
          active: activeBookings,
          completed: completedBookings
        },
        collection: {
          total: parseFloat(totalCollection),
          thisMonth: parseFloat(monthCollection),
          pending: parseFloat(pendingAmount)
        },
        projects: {
          total: totalProjects,
          availablePlots: availablePlots
        },
        brokers: {
          active: activeBrokers,
          pendingCommissions: parseFloat(pendingCommissions)
        }
      },
      recentBookings
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard statistics' });
  }
});

// Booking report
router.get('/bookings', authenticate, checkPermission('canViewReports'), async (req, res) => {
  try {
    const { startDate, endDate, project, status } = req.query;
    const where = {};
    
    if (startDate && endDate) {
      where.bookingDate = {
        [Op.gte]: new Date(startDate),
        [Op.lte]: new Date(endDate)
      };
    }
    
    if (project) where.projectId = project;
    if (status) where.status = status;
    
    const bookings = await Booking.findAll({
      where,
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name', 'location'] },
        { model: Broker, as: 'broker', attributes: ['id', 'name'] }
      ],
      order: [['bookingDate', 'DESC']]
    });
    
    const summary = {
      totalBookings: bookings.length,
      totalAmount: bookings.reduce((sum, b) => sum + parseFloat(b.totalAmount), 0),
      totalPaid: bookings.reduce((sum, b) => sum + parseFloat(b.totalPaid), 0),
      totalRemaining: bookings.reduce((sum, b) => sum + (parseFloat(b.totalAmount) - parseFloat(b.totalPaid || 0)), 0)
    };
    
    res.json({
      success: true,
      bookings,
      summary
    });
  } catch (error) {
    console.error('Booking report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate booking report' });
  }
});

// Payment collection report
router.get('/collections', authenticate, checkPermission('canViewReports'), async (req, res) => {
  try {
    const { startDate, endDate, paymentMode } = req.query;
    const where = {};
    
    if (startDate && endDate) {
      where.receiptDate = {
        [Op.gte]: new Date(startDate),
        [Op.lte]: new Date(endDate)
      };
    }
    
    if (paymentMode) where.paymentMode = paymentMode;
    
    const payments = await Payment.findAll({
      where,
      include: [
        { model: Booking, as: 'booking', attributes: ['id', 'bookingNo', 'applicantName'] },
        { model: User, as: 'collector', attributes: ['id', 'name'] }
      ],
      order: [['receiptDate', 'DESC']]
    });
    
    const summary = {
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + parseFloat(p.paymentAmount), 0),
      byPaymentMode: {}
    };
    
    // Group by payment mode
    payments.forEach(p => {
      if (!summary.byPaymentMode[p.paymentMode]) {
        summary.byPaymentMode[p.paymentMode] = { count: 0, amount: 0 };
      }
      summary.byPaymentMode[p.paymentMode].count++;
      summary.byPaymentMode[p.paymentMode].amount += parseFloat(p.paymentAmount);
    });
    
    res.json({
      success: true,
      payments,
      summary
    });
  } catch (error) {
    console.error('Collection report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate collection report' });
  }
});

// Remaining payment report
router.get('/remaining-payments', authenticate, checkPermission('canViewReports'), async (req, res) => {
  try {
    const allBookings = await Booking.findAll({ 
      where: { 
        status: { [Op.ne]: 'cancelled' }
      },
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name'] },
        { model: Broker, as: 'broker', attributes: ['id', 'name'] }
      ],
      attributes: ['id', 'bookingNo', 'bookingDate', 'applicantName', 'totalAmount', 'totalPaid', 'projectId', 'brokerId']
    });
    
    // Filter bookings with remaining amount > 0 and sort by remaining amount
    const bookings = allBookings
      .map(b => {
        b.remainingAmount = parseFloat(b.totalAmount) - parseFloat(b.totalPaid || 0);
        return b;
      })
      .filter(b => b.remainingAmount > 0)
      .sort((a, b) => b.remainingAmount - a.remainingAmount);
    
    const summary = {
      totalBookings: bookings.length,
      totalRemaining: bookings.reduce((sum, b) => sum + b.remainingAmount, 0)
    };
    
    res.json({
      success: true,
      bookings,
      summary
    });
  } catch (error) {
    console.error('Remaining payment report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate remaining payment report' });
  }
});

// Broker commission report
router.get('/broker-commissions', authenticate, checkPermission('canViewReports'), async (req, res) => {
  try {
    const { brokerId } = req.query;
    const where = { isActive: true };
    
    if (brokerId) where.id = brokerId;
    
    const brokers = await Broker.findAll({ where });
    
    const summary = {
      totalBrokers: brokers.length,
      totalCommissionEarned: brokers.reduce((sum, b) => sum + parseFloat(b.totalCommissionEarned || 0), 0),
      totalCommissionPaid: brokers.reduce((sum, b) => sum + parseFloat(b.totalCommissionPaid || 0), 0),
      totalPending: brokers.reduce((sum, b) => sum + parseFloat(b.remainingCommission || 0), 0)
    };
    
    res.json({
      success: true,
      brokers,
      summary
    });
  } catch (error) {
    console.error('Broker commission report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate broker commission report' });
  }
});

// Plot availability report
router.get('/plot-availability', authenticate, checkPermission('canViewReports'), async (req, res) => {
  try {
    const { projectId } = req.query;
    const where = { isActive: true };
    
    if (projectId) where.id = projectId;
    
    const projects = await Project.findAll({ where });
    
    const report = projects.map(project => {
      const plots = project.plots || [];
      const available = plots.filter(p => p.status === 'available').length;
      const booked = plots.filter(p => p.status === 'booked').length;
      const sold = plots.filter(p => p.status === 'sold').length;
      
      return {
        projectId: project.id,
        projectName: project.name,
        location: project.location,
        totalPlots: project.totalPlots,
        available,
        booked,
        sold,
        availabilityPercentage: ((available / project.totalPlots) * 100).toFixed(2)
      };
    });
    
    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Plot availability report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate plot availability report' });
  }
});

// Export bookings to Excel
router.get('/export/bookings', authenticate, checkPermission('canViewReports'), async (req, res) => {
  try {
    const { startDate, endDate, project } = req.query;
    const where = {};
    
    if (startDate && endDate) {
      where.bookingDate = {
        [Op.gte]: new Date(startDate),
        [Op.lte]: new Date(endDate)
      };
    }
    
    if (project) where.projectId = project;
    
    const bookings = await Booking.findAll({
      where,
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name'] },
        { model: Broker, as: 'broker', attributes: ['id', 'name'] }
      ],
      order: [['bookingDate', 'DESC']]
    });
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Bookings Report');
    
    // Define columns
    worksheet.columns = [
      { header: 'Booking No', key: 'bookingNo', width: 15 },
      { header: 'Date', key: 'bookingDate', width: 12 },
      { header: 'Customer Name', key: 'applicantName', width: 25 },
      { header: 'Mobile', key: 'mobileNo', width: 15 },
      { header: 'Project', key: 'project', width: 20 },
      { header: 'Plot No', key: 'plotNo', width: 12 },
      { header: 'Area', key: 'area', width: 10 },
      { header: 'Total Amount', key: 'totalAmount', width: 15 },
      { header: 'Paid', key: 'totalPaid', width: 15 },
      { header: 'Remaining', key: 'remainingAmount', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Broker', key: 'broker', width: 20 }
    ];
    
    // Add rows
    bookings.forEach(booking => {
      worksheet.addRow({
        bookingNo: booking.bookingNo,
        bookingDate: new Date(booking.bookingDate).toLocaleDateString('en-IN'),
        applicantName: booking.applicantName,
        mobileNo: booking.mobileNo,
        project: booking.project?.name || '',
        plotNo: booking.plotNo,
        area: `${booking.area} ${booking.areaUnit}`,
        totalAmount: parseFloat(booking.totalAmount),
        totalPaid: parseFloat(booking.totalPaid),
        remainingAmount: parseFloat(booking.totalAmount) - parseFloat(booking.totalPaid || 0),
        status: booking.status,
        broker: booking.broker?.name || 'N/A'
      });
    });
    
    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=bookings_report.xlsx');
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export bookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to export bookings' });
  }
});

// Export payments to Excel
router.get('/export/payments', authenticate, checkPermission('canViewReports'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    
    if (startDate && endDate) {
      where.receiptDate = {
        [Op.gte]: new Date(startDate),
        [Op.lte]: new Date(endDate)
      };
    }
    
    const payments = await Payment.findAll({
      where,
      include: [
        { model: Booking, as: 'booking', attributes: ['id', 'bookingNo', 'applicantName'] }
      ],
      order: [['receiptDate', 'DESC']]
    });
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Payments Report');
    
    worksheet.columns = [
      { header: 'Receipt No', key: 'receiptNo', width: 15 },
      { header: 'Date', key: 'receiptDate', width: 12 },
      { header: 'Booking No', key: 'bookingNo', width: 15 },
      { header: 'Customer', key: 'customerName', width: 25 },
      { header: 'Project', key: 'projectName', width: 20 },
      { header: 'Plot No', key: 'plotNo', width: 12 },
      { header: 'Amount', key: 'paymentAmount', width: 15 },
      { header: 'Mode', key: 'paymentMode', width: 15 },
      { header: 'Transaction No', key: 'transactionNo', width: 20 },
      { header: 'Remarks', key: 'remarks', width: 30 }
    ];
    
    payments.forEach(payment => {
      worksheet.addRow({
        receiptNo: payment.receiptNo,
        receiptDate: new Date(payment.receiptDate).toLocaleDateString('en-IN'),
        bookingNo: payment.booking?.bookingNo || '',
        customerName: payment.customerName,
        projectName: payment.projectName,
        plotNo: payment.plotNo,
        paymentAmount: parseFloat(payment.paymentAmount),
        paymentMode: payment.paymentMode,
        transactionNo: payment.transactionNo || '',
        remarks: payment.remarks || ''
      });
    });
    
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=payments_report.xlsx');
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export payments error:', error);
    res.status(500).json({ success: false, message: 'Failed to export payments' });
  }
});

module.exports = router;
