const express = require('express');
const router = express.Router();
const { Booking, Project, User, Customer, Broker, Payment, BrokerPayment, sequelize } = require('../models');
const { isAuthenticated } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const { numberToWords } = require('../utils/helpers');
const { Op } = require('sequelize');

// List all bookings
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const { 
            showDeleted, 
            registryStatus = 'all',
            bookingDateFrom = '',
            bookingDateTo = '',
            registryDateFrom = '',
            registryDateTo = ''
        } = req.query;
        const whereClause = {};

        // By default, hide deleted bookings
        if (showDeleted !== 'true') {
            whereClause.isDeleted = false;
        }

        // Filter by registry status
        if (registryStatus === 'completed') {
            whereClause.registryCompleted = true;
        } else if (registryStatus === 'pending') {
            whereClause.registryCompleted = false;
        }
        // 'all' means no filter on registryCompleted

        // Filter by booking date range
        if (bookingDateFrom || bookingDateTo) {
            whereClause.bookingDate = {};
            if (bookingDateFrom) {
                whereClause.bookingDate[Op.gte] = new Date(bookingDateFrom);
            }
            if (bookingDateTo) {
                // Add one day to include the entire end date
                const endDate = new Date(bookingDateTo);
                endDate.setDate(endDate.getDate() + 1);
                whereClause.bookingDate[Op.lt] = endDate;
            }
        }

        // Filter by registry date range
        if (registryDateFrom || registryDateTo) {
            whereClause.registryDate = {};
            if (registryDateFrom) {
                whereClause.registryDate[Op.gte] = new Date(registryDateFrom);
            }
            if (registryDateTo) {
                // Add one day to include the entire end date
                const endDate = new Date(registryDateTo);
                endDate.setDate(endDate.getDate() + 1);
                whereClause.registryDate[Op.lt] = endDate;
            }
        }

        const bookings = await Booking.findAll({
            where: whereClause,
            include: [
                {
                    model: Customer,
                    as: 'customer',
                    attributes: ['customerNo', 'applicantName', 'mobileNo']
                },
                {
                    model: Project,
                    as: 'project',
                    attributes: ['projectName', 'location']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['name']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.render('booking/list', {
            bookings,
            showDeleted: showDeleted === 'true',
            registryStatus: registryStatus,
            bookingDateFrom: bookingDateFrom,
            bookingDateTo: bookingDateTo,
            registryDateFrom: registryDateFrom,
            registryDateTo: registryDateTo,
            userName: req.session.userName,
            userRole: req.session.userRole
        });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).send('Error loading bookings');
    }
});

// Show create booking form
router.get('/create', isAuthenticated, async (req, res) => {
    try {
        const customers = await Customer.findAll({
            where: { isActive: true, isDeleted: false },
            order: [['applicantName', 'ASC']]
        });
        
        const projects = await Project.findAll({
            where: { isActive: true, isDeleted: false }
        });

        const brokers = await Broker.findAll({
            where: { isActive: true, isDeleted: false },
            order: [['name', 'ASC']]
        });

        res.render('booking/create', {
            customers,
            projects,
            brokers,
            currentDate: new Date().toISOString().split('T')[0],
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: null
        });
    } catch (error) {
        console.error('Error loading form:', error);
        res.status(500).send('Error loading booking form');
    }
});

// Create new booking
router.post('/create', isAuthenticated, async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const {
            customerId,
            projectId,
            plotNo,
            area,
            plc,
            legalDetails,
            rate,
            associateRate,
            discount,
            brokerId,
            bookingAmount,
            paymentMode,
            transactionNo,
            paymentRemarks,
            bookingDate,
            receiptDate
        } = req.body;

        // Calculate effective rate and total amount
        const effectiveRate = parseFloat(rate) - (parseFloat(discount) || 0);
        const totalAmount = (parseFloat(area) * effectiveRate) + (parseFloat(plc) || 0);
        const bookingAmountVal = parseFloat(bookingAmount);
        
        // Validate booking amount
        if (bookingAmountVal <= 0) {
            await transaction.rollback();
            const customers = await Customer.findAll({ where: { isActive: true, isDeleted: false }, order: [['applicantName', 'ASC']] });
            const projects = await Project.findAll({ where: { isActive: true, isDeleted: false } });
            const brokers = await Broker.findAll({ where: { isActive: true, isDeleted: false }, order: [['name', 'ASC']] });
            return res.render('booking/create', {
                customers,
                projects,
                brokers,
                currentDate: new Date().toISOString().split('T')[0],
                userName: req.session.userName,
                userRole: req.session.userRole,
                error: 'Booking amount must be greater than 0'
            });
        }
        
        if (bookingAmountVal > totalAmount) {
            await transaction.rollback();
            const customers = await Customer.findAll({ where: { isActive: true, isDeleted: false }, order: [['applicantName', 'ASC']] });
            const projects = await Project.findAll({ where: { isActive: true, isDeleted: false } });
            const brokers = await Broker.findAll({ where: { isActive: true, isDeleted: false }, order: [['name', 'ASC']] });
            return res.render('booking/create', {
                customers,
                projects,
                brokers,
                currentDate: new Date().toISOString().split('T')[0],
                userName: req.session.userName,
                userRole: req.session.userRole,
                error: `Booking amount cannot exceed total amount of ₹${totalAmount.toLocaleString('en-IN')}`
            });
        }
        
        // Auto-calculate broker commission: (rate - associateRate) * area
        const areaVal = parseFloat(area) || 0;
        const rateVal = parseFloat(rate) || 0;
        const associateRateVal = parseFloat(associateRate) || 0;
        const brokerCommission = brokerId && associateRateVal > 0 
            ? Math.max(0, (rateVal - associateRateVal) * areaVal) 
            : 0;

        // Generate booking number
        const bookingCount = await Booking.count({ paranoid: false });
        const bookingNo = `BK${new Date().getFullYear()}${String(bookingCount + 1).padStart(5, '0')}`;

        // Create booking (with initial remainingAmount = totalAmount)
        const booking = await Booking.create({
            bookingNo,
            bookingDate: bookingDate || new Date(),
            customerId,
            projectId,
            plotNo,
            area,
            plc: plc || 0,
            legalDetails,
            rate,
            associateRate: associateRate || 0,
            discount: discount || 0,
            effectiveRate,
            totalAmount,
            brokerId: brokerId || null,
            brokerCommission,
            remainingAmount: totalAmount, // Initially full amount
            status: 'Active',
            createdBy: req.session.userId
        }, { transaction });

        // Generate payment/receipt number
        const paymentCount = await Payment.count({ paranoid: false });
        const receiptNo = `RCP${new Date().getFullYear()}${String(paymentCount + 1).padStart(5, '0')}`;

        // Create first payment for booking amount
        await Payment.create({
            receiptNo,
            receiptDate: receiptDate || bookingDate || new Date(),
            bookingId: booking.id,
            paymentAmount: bookingAmountVal,
            paymentMode,
            transactionNo,
            remarks: paymentRemarks || 'Initial booking payment',
            paymentType: 'Booking',
            isRecurring: false,
            installmentNumber: null,
            balanceBeforePayment: totalAmount,
            balanceAfterPayment: totalAmount - bookingAmountVal,
            createdBy: req.session.userId
        }, { transaction });

        // Update booking's remaining amount
        await booking.update({
            remainingAmount: totalAmount - bookingAmountVal
        }, { transaction });

        await transaction.commit();
        res.redirect(`/booking/${booking.id}`);
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating booking:', error);
        
        const customers = await Customer.findAll({ where: { isActive: true, isDeleted: false }, order: [['applicantName', 'ASC']] });
        const projects = await Project.findAll({ where: { isActive: true, isDeleted: false } });
        const brokers = await Broker.findAll({ where: { isActive: true, isDeleted: false }, order: [['name', 'ASC']] });
        res.render('booking/create', {
            customers,
            projects,
            brokers,
            currentDate: new Date().toISOString().split('T')[0],
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: 'Error creating booking: ' + error.message
        });
    }
});

// View booking details
router.get('/:id', isAuthenticated, async (req, res) => {
    try {
        const booking = await Booking.findByPk(req.params.id, {
            include: [
                {
                    model: Customer,
                    as: 'customer'
                },
                {
                    model: Project,
                    as: 'project'
                },
                {
                    model: Broker,
                    as: 'broker'
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['name']
                }
            ]
        });

        if (!booking) {
            return res.status(404).send('Booking not found');
        }

        // Get all payments for this booking
        const payments = await Payment.findAll({
            where: { bookingId: booking.id, isDeleted: false },
            order: [['receiptDate', 'ASC']]
        });

        // Calculate total paid from all payments
        const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.paymentAmount), 0);

        // Note: Broker payments are now independent and managed from the broker's page
        // No longer tied to specific bookings

        res.render('booking/view', {
            booking,
            payments,
            totalPaid,
            userName: req.session.userName,
            userRole: req.session.userRole
        });
    } catch (error) {
        console.error('Error fetching booking:', error);
        res.status(500).send('Error loading booking details');
    }
});

// Show edit booking form
router.get('/:id/edit', isAuthenticated, async (req, res) => {
    try {
        const booking = await Booking.findByPk(req.params.id, {
            include: [
                {
                    model: Customer,
                    as: 'customer'
                },
                {
                    model: Project,
                    as: 'project'
                }
            ]
        });

        if (!booking) {
            return res.status(404).send('Booking not found');
        }

        const customers = await Customer.findAll({
            where: { isActive: true, isDeleted: false },
            order: [['applicantName', 'ASC']]
        });

        const projects = await Project.findAll({
            where: { isActive: true, isDeleted: false }
        });

        const brokers = await Broker.findAll({
            where: { isActive: true, isDeleted: false },
            order: [['name', 'ASC']]
        });

        res.render('booking/edit', {
            booking,
            customers,
            projects,
            brokers,
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: null
        });
    } catch (error) {
        console.error('Error loading edit form:', error);
        res.status(500).send('Error loading booking edit form');
    }
});

// Update booking
router.post('/:id/edit', isAuthenticated, async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const booking = await Booking.findByPk(req.params.id);

        if (!booking) {
            await transaction.rollback();
            return res.status(404).send('Booking not found');
        }

        const {
            customerId,
            projectId,
            plotNo,
            area,
            plc,
            legalDetails,
            rate,
            associateRate,
            discount,
            brokerId,
            status,
            bookingDate,
            registryCompleted,
            registryDate
        } = req.body;

        // Calculate effective rate and total amount
        const effectiveRate = parseFloat(rate) - (parseFloat(discount) || 0);
        const totalAmount = (parseFloat(area) * effectiveRate) + (parseFloat(plc) || 0);
        
        // Auto-calculate broker commission: (rate - associateRate) * area
        const areaVal = parseFloat(area) || 0;
        const rateVal = parseFloat(rate) || 0;
        const associateRateVal = parseFloat(associateRate) || 0;
        const brokerCommission = brokerId && associateRateVal > 0 
            ? Math.max(0, (rateVal - associateRateVal) * areaVal) 
            : 0;

        // Calculate remaining amount from payments
        const totalPaid = await Payment.sum('paymentAmount', {
            where: { bookingId: booking.id, isDeleted: false },
            transaction
        }) || 0;
        const remainingAmount = totalAmount - totalPaid;

        // Update booking
        await booking.update({
            bookingDate: bookingDate || booking.bookingDate,
            customerId,
            projectId,
            plotNo,
            area,
            plc: plc || 0,
            legalDetails,
            rate,
            associateRate: associateRate || 0,
            discount: discount || 0,
            effectiveRate,
            totalAmount,
            brokerId: brokerId || null,
            brokerCommission,
            remainingAmount,
            status: status || 'Active',
            registryCompleted: registryCompleted === 'on' || registryCompleted === true || registryCompleted === 'true',
            registryDate: (registryCompleted === 'on' || registryCompleted === true || registryCompleted === 'true') && registryDate ? new Date(registryDate) : null
        }, { transaction });

        await transaction.commit();
        res.redirect(`/booking/${booking.id}`);
    } catch (error) {
        await transaction.rollback();
        console.error('Error updating booking:', error);
        
        const booking = await Booking.findByPk(req.params.id, {
            include: [{ model: Customer, as: 'customer' }, { model: Project, as: 'project' }]
        });
        const customers = await Customer.findAll({ where: { isActive: true, isDeleted: false }, order: [['applicantName', 'ASC']] });
        const projects = await Project.findAll({ where: { isActive: true, isDeleted: false } });
        const brokers = await Broker.findAll({ where: { isActive: true, isDeleted: false }, order: [['name', 'ASC']] });
        
        res.render('booking/edit', {
            booking,
            customers,
            projects,
            brokers,
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: 'Error updating booking: ' + error.message
        });
    }
});

// Download booking slip as PDF
router.get('/:id/pdf', isAuthenticated, async (req, res) => {
    try {
        const booking = await Booking.findByPk(req.params.id, {
            include: [
                {
                    model: Customer,
                    as: 'customer'
                },
                {
                    model: Project,
                    as: 'project'
                }
            ]
        });

        if (!booking) {
            return res.status(404).send('Booking not found');
        }

        // Get all payments for this booking
        const payments = await Payment.findAll({
            where: { bookingId: booking.id, isDeleted: false },
            order: [['receiptDate', 'ASC']]
        });

        // Calculate total paid
        const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.paymentAmount), 0);

        // Create PDF
        const doc = new PDFDocument({ margin: 50 });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=booking-${booking.bookingNo}.pdf`);
        
        doc.pipe(res);

        // Header
        doc.fontSize(20).text('BOOKING SLIP', { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).text(`Booking No: ${booking.bookingNo}`, { align: 'right' });
        doc.text(`Customer No: ${booking.customer.customerNo}`, { align: 'right' });
        doc.text(`Date: ${new Date(booking.bookingDate).toLocaleDateString('en-IN')}`, { align: 'right' });
        doc.moveDown();

        // Applicant Details
        doc.fontSize(14).text('Applicant Details', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Name: ${booking.customer.applicantName}`);
        doc.text(`Father/Husband Name: ${booking.customer.fatherOrHusbandName}`);
        doc.text(`Address: ${booking.customer.address}`);
        doc.text(`Aadhaar No: ${booking.customer.aadhaarNo}`);
        doc.text(`Mobile No: ${booking.customer.mobileNo}`);
        if (booking.customer.email) {
            doc.text(`Email: ${booking.customer.email}`);
        }
        doc.moveDown();

        // Property Details
        doc.fontSize(14).text('Property Details', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Project Name: ${booking.project.projectName}`);
        doc.text(`Plot No: ${booking.plotNo}`);
        doc.text(`Area: ${booking.area} sq.ft.`);
        doc.text(`PLC: ₹${parseFloat(booking.plc).toLocaleString('en-IN')}`);
        doc.text(`Rate: ₹${parseFloat(booking.rate).toLocaleString('en-IN')} per sq.ft.`);
        doc.text(`Discount: ₹${parseFloat(booking.discount).toLocaleString('en-IN')}`);
        doc.text(`Effective Rate: ₹${parseFloat(booking.effectiveRate).toLocaleString('en-IN')} per sq.ft.`);
        doc.text(`Total Amount: ₹${parseFloat(booking.totalAmount).toLocaleString('en-IN')}`);
        if (booking.legalDetails) {
            doc.text(`Legal Details: ${booking.legalDetails}`);
        }
        doc.moveDown();

        // Payment Summary
        doc.fontSize(14).text('Payment Summary', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Total Amount: ₹${parseFloat(booking.totalAmount).toLocaleString('en-IN')}`);
        doc.text(`Total Paid: ₹${totalPaid.toLocaleString('en-IN')}`);
        doc.text(`Remaining Amount: ₹${parseFloat(booking.remainingAmount).toLocaleString('en-IN')}`);
        doc.text(`Number of Payments: ${payments.length}`);
        doc.moveDown();

        // Terms & Conditions
        doc.moveDown();
        doc.fontSize(12).text('Terms & Conditions', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(9);
        doc.text('1. This booking is subject to approval and verification of documents.');
        doc.text('2. The balance amount must be paid as per the agreed payment schedule.');
        doc.text('3. Any cancellation will be subject to cancellation charges as per company policy.');
        doc.text('4. All disputes are subject to local jurisdiction only.');
        doc.moveDown(2);

        // Signatures
        doc.fontSize(10);
        doc.text('________________________', 100, doc.y);
        doc.text('Customer Signature', 100, doc.y);
        doc.text('________________________', 350, doc.y - 15);
        doc.text('Authorized Signature', 350, doc.y);

        doc.end();
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Error generating PDF');
    }
});

// Delete Booking (Soft Delete with Cascade)
router.post('/:id/delete', isAuthenticated, async (req, res) => {
    const transaction = await require('../models').sequelize.transaction();
    
    try {
        const booking = await Booking.findByPk(req.params.id);
        
        if (!booking) {
            await transaction.rollback();
            return res.status(404).send('Booking not found');
        }

        // Soft delete booking
        await booking.update({ isDeleted: true }, { transaction });

        // Cascade soft delete: Delete all payments for this booking
        await Payment.update(
            { isDeleted: true },
            {
                where: { bookingId: booking.id },
                transaction
            }
        );

        await transaction.commit();
        res.redirect('/booking?message=deleted');
    } catch (error) {
        await transaction.rollback();
        console.error('Error deleting booking:', error);
        res.status(500).send('Error deleting booking: ' + error.message);
    }
});

module.exports = router;

