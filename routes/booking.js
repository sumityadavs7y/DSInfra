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
            associatePlcCommission,
            bookingAmount,
            paymentMode,
            transactionNo,
            paymentRemarks,
            bookingDate,
            receiptDate
        } = req.body;

        // Calculate effective rate and total amount
        const effectiveRate = parseFloat(rate) - (parseFloat(discount) || 0);
        const baseAmount = parseFloat(area) * effectiveRate;
        const plcPercent = parseFloat(plc) || 0;
        const plcAmount = baseAmount * (plcPercent / 100);
        const totalAmount = baseAmount + plcAmount;
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
        
        // Auto-calculate broker commission: [(effectiveRate - associateRate) × area] + [plc% of (effectiveRate × area)]
        const areaVal = parseFloat(area) || 0;
        const associateRateVal = parseFloat(associateRate) || 0;
        const associatePlcPercent = parseFloat(associatePlcCommission) || 0;
        
        let brokerCommission = 0;
        if (brokerId) {
            const baseCommission = (effectiveRate - associateRateVal) * areaVal;
            const plcCommission = baseAmount * (associatePlcPercent / 100);
            brokerCommission = Math.max(0, baseCommission + plcCommission);
        }

        // Generate booking number in format: DS/YY/MM-XXXX (e.g., DS/25/11-1145)
        // The last 4 digits are globally incrementing (not reset per month)
        const bookingDateObj = bookingDate ? new Date(bookingDate) : new Date();
        const year = bookingDateObj.getFullYear().toString().slice(-2); // Last 2 digits
        const month = String(bookingDateObj.getMonth() + 1).padStart(2, '0');
        
        // Count ALL bookings (not just this month) to get the next global number
        const totalBookingCount = await Booking.count({ paranoid: false });
        
        // Start numbering from 1001 and increment globally
        const bookingNumber = 1001 + totalBookingCount;
        const bookingNo = `DS/${year}/${month}-${String(bookingNumber).padStart(4, '0')}`;

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
            associatePlcCommission: associatePlcPercent,
            remainingAmount: totalAmount, // Initially full amount
            status: 'Active',
            createdBy: req.session.userId
        }, { transaction });

        // Generate payment/receipt number in format: DSPAY/IN/XXXX (e.g., DSPAY/IN/1025)
        // The last 4 digits are globally incrementing (starting from 1001)
        const paymentCount = await Payment.count({ paranoid: false });
        const receiptNumber = 1001 + paymentCount;
        const receiptNo = `DSPAY/IN/${String(receiptNumber).padStart(4, '0')}`;

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
            associatePlcCommission,
            status,
            bookingDate,
            registryCompleted,
            registryDate
        } = req.body;

        // Calculate effective rate and total amount
        const effectiveRate = parseFloat(rate) - (parseFloat(discount) || 0);
        const baseAmount = parseFloat(area) * effectiveRate;
        const plcPercent = parseFloat(plc) || 0;
        const plcAmount = baseAmount * (plcPercent / 100);
        const totalAmount = baseAmount + plcAmount;
        
        // Auto-calculate broker commission: [(effectiveRate - associateRate) × area] + [plc% of (effectiveRate × area)]
        const areaVal = parseFloat(area) || 0;
        const associateRateVal = parseFloat(associateRate) || 0;
        const associatePlcPercent = parseFloat(associatePlcCommission) || 0;
        
        let brokerCommission = 0;
        if (brokerId) {
            const baseCommission = (effectiveRate - associateRateVal) * areaVal;
            const plcCommission = baseAmount * (associatePlcPercent / 100);
            brokerCommission = Math.max(0, baseCommission + plcCommission);
        }

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
            associatePlcCommission: associatePlcPercent,
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

        // Create PDF with letterhead-compatible margins - Compact layout
        const doc = new PDFDocument({ 
            margins: {
                top: 100,      // Space for letterhead header
                bottom: 60,    // Space for letterhead footer
                left: 50,
                right: 50
            },
            size: 'A4'
        });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=booking-${booking.bookingNo}.pdf`);
        
        doc.pipe(res);

        // ==================== LETTERHEAD HEADER SPACE (100pt) ====================

        // Document Title (compact)
        doc.fontSize(16).text('BOOKING SLIP', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(9).text(`Booking No: ${booking.bookingNo}  |  Customer No: ${booking.customer.customerNo}  |  Date: ${new Date(booking.bookingDate).toLocaleDateString('en-IN')}`, { align: 'center' });
        doc.moveDown(0.5);

        // Applicant Details (compact)
        doc.fontSize(11).text('Applicant Details', { underline: true });
        doc.moveDown(0.3);
        doc.fontSize(9);
        doc.text(`Name: ${booking.customer.applicantName}  |  F/H Name: ${booking.customer.fatherOrHusbandName}`);
        doc.text(`Address: ${booking.customer.address}`);
        doc.text(`Aadhaar: ${booking.customer.aadhaarNo}  |  Mobile: ${booking.customer.mobileNo}${booking.customer.email ? '  |  Email: ' + booking.customer.email : ''}`);
        doc.moveDown(0.5);

        // Property Details (compact)
        doc.fontSize(11).text('Property Details', { underline: true });
        doc.moveDown(0.3);
        doc.fontSize(9);
        doc.text(`Project: ${booking.project.projectName}  |  Plot No: ${booking.plotNo}  |  Area: ${booking.area} sq.ft.`);
        doc.text(`Rate: ₹${parseFloat(booking.rate).toLocaleString('en-IN')}/sq.ft.  |  Discount: ₹${parseFloat(booking.discount).toLocaleString('en-IN')}  |  PLC: ${parseFloat(booking.plc).toFixed(2)}%`);
        doc.text(`Effective Rate: ₹${parseFloat(booking.effectiveRate).toLocaleString('en-IN')}/sq.ft.  |  Total Amount: ₹${parseFloat(booking.totalAmount).toLocaleString('en-IN')}`);
        doc.moveDown(0.5);

        // Payment Summary (compact)
        doc.fontSize(11).text('Payment Summary', { underline: true });
        doc.moveDown(0.3);
        doc.fontSize(9);
        doc.text(`Total Amount: ₹${parseFloat(booking.totalAmount).toLocaleString('en-IN')}  |  Paid: ₹${totalPaid.toLocaleString('en-IN')}  |  Balance: ₹${parseFloat(booking.remainingAmount).toLocaleString('en-IN')}`);
        doc.text(`Payments Made: ${payments.length}`);
        doc.moveDown(0.5);

        // Legal Details (if exists, compact)
        if (booking.legalDetails) {
            doc.fontSize(11).text('Legal Details', { underline: true });
            doc.moveDown(0.3);
            doc.fontSize(8);
            doc.text(booking.legalDetails, { width: 495, lineGap: 1 });
            doc.moveDown(0.5);
        }

        // Terms & Conditions (compact)
        doc.fontSize(10).text('Terms & Conditions', { underline: true });
        doc.moveDown(0.3);
        doc.fontSize(8);
        doc.text('1. Booking subject to document verification. 2. Balance as per agreed schedule. 3. Cancellation charges apply. 4. Subject to local jurisdiction.', { width: 495, lineGap: 1 });
        doc.moveDown(1);

        // Signatures (compact - ensure they're above footer space)
        const pageHeight = doc.page.height;
        const footerStart = pageHeight - 60;
        
        // Ensure enough space for signatures
        if (doc.y > footerStart - 50) {
            doc.addPage();
        }
        
        doc.fontSize(9);
        const sigY = Math.max(doc.y, footerStart - 45);
        doc.text('______________________', 100, sigY);
        doc.text('Customer Signature', 100, sigY + 15, { width: 150, align: 'center' });
        doc.text('______________________', 350, sigY);
        doc.text('Authorized Signature', 350, sigY + 15, { width: 150, align: 'center' });

        // ==================== LETTERHEAD FOOTER SPACE (60pt) ====================

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

