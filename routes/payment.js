const express = require('express');
const router = express.Router();
const { Payment, Booking, Customer, Project, User, Broker } = require('../models');
const { isAuthenticated, isNotAssociate, getAccessibleBrokerIds } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const { numberToWords } = require('../utils/helpers');
const { Op } = require('sequelize');

// List all payments
router.get('/', isAuthenticated, getAccessibleBrokerIds, async (req, res) => {
    try {
        const { showDeleted } = req.query;
        const whereClause = {};

        // By default, hide deleted payments
        if (showDeleted !== 'true') {
            whereClause.isDeleted = false;
        }

        // Build booking filter for accessible brokers
        const bookingWhere = {};
        if (req.accessibleBrokerIds !== null) {
            bookingWhere.brokerId = { [Op.in]: req.accessibleBrokerIds };
        }

        const payments = await Payment.findAll({
            where: whereClause,
            include: [
                {
                    model: Booking,
                    as: 'booking',
                    where: bookingWhere,
                    include: [
                        { model: Customer, as: 'customer' },
                        { model: Project, as: 'project' },
                        { model: Broker, as: 'broker' }
                    ]
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['name']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.render('payment/list', {
            payments,
            showDeleted: showDeleted === 'true',
            userName: req.session.userName,
            userRole: req.session.userRole
        });
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).send('Error loading payments');
    }
});

// Show create payment form
router.get('/create', isAuthenticated, isNotAssociate, async (req, res) => {
    try {
        const { bookingId } = req.query;
        
        // Get active bookings (only non-deleted bookings)
        const allBookings = await Booking.findAll({
            where: { 
                status: 'Active',
                isDeleted: false
            },
            include: [
                { model: Customer, as: 'customer' },
                { model: Project, as: 'project' }
            ],
            order: [['bookingDate', 'DESC']]
        });
        
        // Calculate totalPaid for each booking at runtime
        for (const booking of allBookings) {
            const totalPaid = await Payment.sum('paymentAmount', {
                where: { 
                    bookingId: booking.id, 
                    isDeleted: false 
                }
            }) || 0;
            
            // Set totalPaid as a property on the booking instance
            booking.dataValues.totalPaid = totalPaid;
            Object.defineProperty(booking, 'totalPaid', {
                value: totalPaid,
                writable: true,
                enumerable: true,
                configurable: true
            });
        }
        
        // Filter bookings with remaining balance (calculate at runtime)
        const bookings = allBookings.filter(booking => {
            const remainingAmount = parseFloat(booking.totalAmount) - parseFloat(booking.totalPaid || 0);
            return remainingAmount > 0;
        });

        // If bookingId is provided, fetch the booking details
        let selectedBooking = null;
        if (bookingId) {
            selectedBooking = await Booking.findByPk(bookingId, {
                include: [
                    { model: Customer, as: 'customer' },
                    { model: Project, as: 'project' }
                ]
            });
        }

        res.render('payment/create', {
            bookings,
            selectedBookingId: bookingId ? parseInt(bookingId) : null,
            selectedBooking,
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: null
        });
    } catch (error) {
        console.error('Error loading form:', error);
        res.status(500).send('Error loading payment form');
    }
});

// Create new payment
router.post('/create', isAuthenticated, isNotAssociate, async (req, res) => {
    const transaction = await require('../models').sequelize.transaction();
    
    try {
        const {
            bookingId,
            paymentAmount,
            paymentMode,
            transactionNo,
            remarks,
            paymentType,
            isRecurring,
            installmentNumber,
            receiptDate
        } = req.body;

        // Get booking details
        const booking = await Booking.findByPk(bookingId, {
            include: [
                { model: Customer, as: 'customer' },
                { model: Project, as: 'project' }
            ]
        });

        if (!booking) {
            await transaction.rollback();
            const allBookings = await Booking.findAll({
                where: { status: 'Active', isDeleted: false },
                include: [{ model: Customer, as: 'customer' }, { model: Project, as: 'project' }]
            });
            const bookings = allBookings.filter(b => (parseFloat(b.totalAmount) - parseFloat(b.totalPaid || 0)) > 0);
            return res.render('payment/create', {
                bookings,
                userName: req.session.userName,
                userRole: req.session.userRole,
                error: 'Booking not found'
            });
        }

        const amount = parseFloat(paymentAmount);
        const currentBalance = parseFloat(booking.totalAmount) - parseFloat(booking.totalPaid || 0);

        // Validate payment amount
        if (amount <= 0) {
            await transaction.rollback();
            const allBookings = await Booking.findAll({
                where: { status: 'Active', isDeleted: false },
                include: [{ model: Customer, as: 'customer' }, { model: Project, as: 'project' }]
            });
            const bookings = allBookings.filter(b => (parseFloat(b.totalAmount) - parseFloat(b.totalPaid || 0)) > 0);
            return res.render('payment/create', {
                bookings,
                userName: req.session.userName,
                userRole: req.session.userRole,
                error: 'Payment amount must be greater than 0'
            });
        }

        if (amount > currentBalance) {
            await transaction.rollback();
            const allBookings = await Booking.findAll({
                where: { status: 'Active', isDeleted: false },
                include: [{ model: Customer, as: 'customer' }, { model: Project, as: 'project' }]
            });
            const bookings = allBookings.filter(b => (parseFloat(b.totalAmount) - parseFloat(b.totalPaid || 0)) > 0);
            return res.render('payment/create', {
                bookings,
                userName: req.session.userName,
                userRole: req.session.userRole,
                error: `Payment amount cannot exceed remaining balance of ₹${currentBalance.toLocaleString('en-IN')}`
            });
        }

        // Generate receipt number in format: DSPAY/IN/XXXX (e.g., DSPAY/IN/1025)
        // The last 4 digits are globally incrementing (starting from 1001)
        const paymentCount = await Payment.count({ paranoid: false });
        const receiptNumber = 1001 + paymentCount;
        const receiptNo = `DSPAY/IN/${String(receiptNumber).padStart(4, '0')}`;

        // Calculate new balance
        const newBalance = currentBalance - amount;

        // Create payment
        const payment = await Payment.create({
            receiptNo,
            receiptDate: receiptDate || new Date(),
            bookingId,
            paymentAmount: amount,
            paymentMode,
            transactionNo,
            remarks,
            paymentType: paymentType || 'Installment',
            isRecurring: isRecurring === 'true' || isRecurring === true,
            installmentNumber: installmentNumber || null,
            createdBy: req.session.userId
        }, { transaction });

        // Note: totalPaid is now calculated at runtime, not stored
        // Balance is calculated as: booking.totalAmount - SUM(payments.paymentAmount)

        await transaction.commit();

        res.redirect(`/payment/${payment.id}`);
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating payment:', error);
        
        const allBookings = await Booking.findAll({
            where: { status: 'Active', isDeleted: false },
            include: [{ model: Customer, as: 'customer' }, { model: Project, as: 'project' }]
        });
        
        // Calculate totalPaid for each booking at runtime
        for (const booking of allBookings) {
            const totalPaid = await Payment.sum('paymentAmount', {
                where: { 
                    bookingId: booking.id, 
                    isDeleted: false 
                }
            }) || 0;
            
            booking.dataValues.totalPaid = totalPaid;
            Object.defineProperty(booking, 'totalPaid', {
                value: totalPaid,
                writable: true,
                enumerable: true,
                configurable: true
            });
        }
        
        const bookings = allBookings.filter(b => (parseFloat(b.totalAmount) - parseFloat(b.totalPaid || 0)) > 0);
        res.render('payment/create', {
            bookings,
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: 'Error creating payment: ' + error.message
        });
    }
});

// View payment receipt
router.get('/:id', isAuthenticated, async (req, res) => {
    try {
        const payment = await Payment.findByPk(req.params.id, {
            include: [
                {
                    model: Booking,
                    as: 'booking',
                    include: [
                        { model: Customer, as: 'customer' },
                        { model: Project, as: 'project' }
                    ]
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['name']
                }
            ]
        });

        if (!payment) {
            return res.status(404).send('Payment not found');
        }

        // Get all payments for this booking for history (exclude deleted)
        const allPayments = await Payment.findAll({
            where: { bookingId: payment.bookingId, isDeleted: false },
            order: [['receiptDate', 'ASC']]
        });

        res.render('payment/view', {
            payment,
            allPayments,
            userName: req.session.userName,
            userRole: req.session.userRole
        });
    } catch (error) {
        console.error('Error fetching payment:', error);
        res.status(500).send('Error loading payment details');
    }
});

// Generate payment slip (printable)
router.get('/:id/slip', isAuthenticated, async (req, res) => {
    try {
        const payment = await Payment.findByPk(req.params.id, {
            include: [
                {
                    model: Booking,
                    as: 'booking',
                    include: [
                        { model: Customer, as: 'customer' },
                        { model: Project, as: 'project' }
                    ]
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['name']
                }
            ]
        });

        if (!payment) {
            return res.status(404).send('Payment not found');
        }

        // Get all payments for this booking
        const allPaymentsData = await Payment.findAll({
            where: { 
                bookingId: payment.bookingId,
                isDeleted: false
            },
            order: [['receiptDate', 'ASC']]
        });

        // Calculate total paid
        const totalPaid = allPaymentsData.reduce((sum, p) => sum + parseFloat(p.paymentAmount), 0);

        // Convert amount to words
        const amountInWords = numberToWords(parseFloat(payment.paymentAmount));

        res.render('payment/slip', {
            payment,
            amountInWords,
            allPaymentsData,
            totalPaid,
            userName: req.session.userName,
            userRole: req.session.userRole
        });
    } catch (error) {
        console.error('Error generating payment slip:', error);
        res.status(500).send('Error generating payment slip');
    }
});

// Show edit payment form
router.get('/:id/edit', isAuthenticated, isNotAssociate, async (req, res) => {
    try {
        const payment = await Payment.findByPk(req.params.id, {
            include: [
                {
                    model: Booking,
                    as: 'booking',
                    include: [
                        { model: Customer, as: 'customer' },
                        { model: Project, as: 'project' }
                    ]
                }
            ]
        });

        if (!payment) {
            return res.status(404).send('Payment not found');
        }

        // Calculate totalPaid for the booking at runtime
        const totalPaid = await Payment.sum('paymentAmount', {
            where: { 
                bookingId: payment.booking.id, 
                isDeleted: false 
            }
        }) || 0;
        
        // Set totalPaid as a property on the booking instance
        payment.booking.dataValues.totalPaid = totalPaid;
        Object.defineProperty(payment.booking, 'totalPaid', {
            value: totalPaid,
            writable: true,
            enumerable: true,
            configurable: true
        });

        res.render('payment/edit', {
            payment,
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: null
        });
    } catch (error) {
        console.error('Error loading edit form:', error);
        res.status(500).send('Error loading payment edit form');
    }
});

// Update payment
router.post('/:id/edit', isAuthenticated, isNotAssociate, async (req, res) => {
    const transaction = await require('../models').sequelize.transaction();
    
    try {
        const payment = await Payment.findByPk(req.params.id, {
            include: [
                {
                    model: Booking,
                    as: 'booking',
                    include: [
                        { model: Customer, as: 'customer' },
                        { model: Project, as: 'project' }
                    ]
                }
            ]
        });

        if (!payment) {
            await transaction.rollback();
            return res.status(404).send('Payment not found');
        }

        const {
            paymentAmount,
            paymentMode,
            transactionNo,
            remarks,
            paymentType,
            isRecurring,
            installmentNumber,
            receiptDate
        } = req.body;

        const newAmount = parseFloat(paymentAmount);
        const booking = payment.booking;
        const totalBookingAmount = parseFloat(booking.totalAmount);

        // Get all other payments for this booking (excluding current payment being edited and deleted ones)
        const otherPayments = await Payment.findAll({
            where: { 
                bookingId: payment.bookingId,
                id: { [require('sequelize').Op.ne]: payment.id },
                isDeleted: false
            },
            transaction
        });

        // Calculate total of other payments
        const otherPaymentsTotal = otherPayments.reduce((sum, p) => sum + parseFloat(p.paymentAmount), 0);

        // Validate
        if (newAmount <= 0) {
            await transaction.rollback();
            return res.render('payment/edit', {
                payment,
                userName: req.session.userName,
                userRole: req.session.userRole,
                error: 'Payment amount must be greater than 0'
            });
        }

        // Total payments including this new amount
        const totalPayments = otherPaymentsTotal + newAmount;

        if (totalPayments > totalBookingAmount) {
            await transaction.rollback();
            const maxAllowed = totalBookingAmount - otherPaymentsTotal;
            return res.render('payment/edit', {
                payment,
                userName: req.session.userName,
                userRole: req.session.userRole,
                error: `Payment amount cannot exceed ₹${maxAllowed.toLocaleString('en-IN')} (would overpay the booking)`
            });
        }

        // Calculate new balance after this payment
        const balanceBeforeThisPayment = totalBookingAmount - otherPaymentsTotal;
        const balanceAfterThisPayment = balanceBeforeThisPayment - newAmount;

        // Update payment
        await payment.update({
            receiptDate: receiptDate || payment.receiptDate,
            paymentAmount: newAmount,
            paymentMode,
            transactionNo,
            remarks,
            paymentType: paymentType || 'Installment',
            isRecurring: isRecurring === 'true' || isRecurring === true,
            installmentNumber: installmentNumber || null
        }, { transaction });

        // Note: totalPaid is now calculated at runtime, not stored
        // No need to update booking record

        await transaction.commit();

        res.redirect(`/payment/${payment.id}`);
    } catch (error) {
        await transaction.rollback();
        console.error('Error updating payment:', error);
        
        const payment = await Payment.findByPk(req.params.id, {
            include: [{
                model: Booking,
                as: 'booking',
                include: [
                    { model: Customer, as: 'customer' },
                    { model: Project, as: 'project' }
                ]
            }]
        });
        
        res.render('payment/edit', {
            payment,
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: 'Error updating payment: ' + error.message
        });
    }
});

// Download payment receipt as PDF
router.get('/:id/pdf', isAuthenticated, async (req, res) => {
    try {
        const payment = await Payment.findByPk(req.params.id, {
            include: [
                {
                    model: Booking,
                    as: 'booking',
                    include: [
                        { model: Customer, as: 'customer' },
                        { model: Project, as: 'project' }
                    ]
                }
            ]
        });

        if (!payment) {
            return res.status(404).send('Payment not found');
        }

        // Get all payments for this booking (excluding current payment for history)
        const allPayments = await Payment.findAll({
            where: { 
                bookingId: payment.bookingId,
                isDeleted: false
            },
            order: [['receiptDate', 'ASC']]
        });

        // Calculate totals
        const totalPaid = allPayments.reduce((sum, p) => sum + parseFloat(p.paymentAmount), 0);
        const totalAmount = parseFloat(payment.booking.totalAmount);
        const pendingAmount = totalAmount - totalPaid;

        // Previous payments (excluding current one)
        const previousPayments = allPayments.filter(p => p.id !== payment.id);

        // Create PDF matching the exact sample format
        const doc = new PDFDocument({ 
            margins: {
                top: 50,
                bottom: 50,
                left: 50,
                right: 50
            },
            size: 'A4'
        });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=receipt-${payment.receiptNo}.pdf`);
        
        doc.pipe(res);

        // Title
        doc.fontSize(18).font('Helvetica-Bold').text('PAYMENT RECEIPT', { align: 'center' });
        doc.moveDown(0.5);

        // Header info line - Booking Appl. No, Receipt No, Date
        const y = doc.y;
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('Booking Appl. No.', 50, y);
        doc.font('Helvetica');
        doc.text(`: ${payment.booking.bookingNo}`, 150, y);
        
        doc.font('Helvetica-Bold');
        doc.text('Receipt No:', 300, y);
        doc.font('Helvetica');
        doc.text(` ${payment.receiptNo}`, 365, y);
        
        doc.font('Helvetica-Bold');
        doc.text('Date:', 480, y);
        doc.font('Helvetica');
        doc.text(` ${new Date(payment.receiptDate).toLocaleDateString('en-IN')}`, 505, y);
        
        doc.moveDown(1.5);

        // APPLICANTS DETAILS Section
        doc.fontSize(10).font('Helvetica-Bold').text('APPLICANTS DETAILS');
        doc.moveDown(0.3);
        
        const tableTop = doc.y;
        doc.fontSize(9).font('Helvetica');
        
        // Draw applicant details table
        let yPos = tableTop;
        const leftCol = 50;
        const middleCol = 320;
        
        // Row 1: Name and Aadhaar
        doc.font('Helvetica-Bold').text('Mr./Ms./Mrs/M+Dr', leftCol, yPos);
        doc.font('Helvetica').text(`: ${payment.booking.customer.applicantName}`, leftCol + 120, yPos);
        doc.font('Helvetica-Bold').text('Aadhar No.', middleCol, yPos);
        doc.font('Helvetica').text(`: ${payment.booking.customer.aadhaarNo || 'NA'}`, middleCol + 70, yPos);
        yPos += 15;
        
        // Row 2: Father/Husband and Mobile
        doc.font('Helvetica-Bold').text('Son/Wife/Daughter of', leftCol, yPos);
        doc.font('Helvetica').text(`: ${payment.booking.customer.fatherOrHusbandName || 'NA'}`, leftCol + 120, yPos);
        doc.font('Helvetica-Bold').text('Mobile No.', middleCol, yPos);
        doc.font('Helvetica').text(`: ${payment.booking.customer.mobileNo || 'NA'}`, middleCol + 70, yPos);
        yPos += 15;
        
        // Row 3: Address
        doc.font('Helvetica-Bold').text('Address', leftCol, yPos);
        doc.font('Helvetica').text(`: ${payment.booking.customer.address}`, leftCol + 120, yPos, { width: 400 });
        
        doc.moveDown(1.5);

        // PAYMENT DETAILS Section
        doc.fontSize(10).font('Helvetica-Bold').text('PAYMENT DETAILS');
        doc.moveDown(0.3);
        
        yPos = doc.y;
        
        // Amount Received
        doc.font('Helvetica-Bold').text('Amt. Received (Rs.)', leftCol, yPos);
        doc.fontSize(11).text(`: ₹ ${parseFloat(payment.paymentAmount).toLocaleString('en-IN')}`, leftCol + 120, yPos);
        doc.fontSize(9).font('Helvetica').text(`( Rupees ${numberToWords(payment.paymentAmount)} Only )`, leftCol + 250, yPos);
        yPos += 15;
        
        // Payment Mode
        doc.font('Helvetica-Bold').text('Payment Mode', leftCol, yPos);
        doc.font('Helvetica').text(`: ${payment.paymentMode}`, leftCol + 120, yPos);
        doc.font('Helvetica-Bold').text('Transaction No.:', middleCol, yPos);
        doc.font('Helvetica').text(` ${payment.transactionNo || 'NA'}`, middleCol + 85, yPos);
        doc.font('Helvetica-Bold').text('Date :', 480, yPos);
        doc.font('Helvetica').text(` ${new Date(payment.receiptDate).toLocaleDateString('en-IN')}`, 505, yPos);
        yPos += 15;
        
        // Remarks
        doc.font('Helvetica-Bold').text('Remarks (If Any)', leftCol, yPos);
        doc.font('Helvetica').text(`: ${payment.remarks || 'NA'}`, leftCol + 120, yPos);
        
        doc.moveDown(1.5);

        // PREVIOUS PAYMENT DETAILS Section with Table
        doc.fontSize(10).font('Helvetica-Bold').text('PREVIOUS PAYMENT DETAILS');
        doc.moveDown(0.2);
        
        // Add total and pending amount on the right
        const rightX = 400;
        yPos = doc.y;
        doc.fontSize(9).font('Helvetica-Bold').text('TOTAL AMOUNT (Rs.):', rightX, yPos);
        doc.font('Helvetica').text(`₹ ${totalAmount.toLocaleString('en-IN')}`, rightX + 120, yPos);
        yPos += 12;
        doc.font('Helvetica-Bold').text('PENDING AMOUNT (Rs.):', rightX, yPos);
        doc.font('Helvetica').text(`₹ ${pendingAmount.toLocaleString('en-IN')}`, rightX + 120, yPos);
        
        doc.moveDown(0.3);

        // Draw table for previous payments
        const tableStartY = doc.y;
        const colWidths = {
            date: 70,
            transactionNo: 100,
            mode: 80,
            amount: 90,
            receiptNo: 90
        };
        
        const drawTableRow = (y, date, txnNo, mode, amount, receiptNo, isHeader = false) => {
            const font = isHeader ? 'Helvetica-Bold' : 'Helvetica';
            const fontSize = isHeader ? 9 : 8;
            doc.font(font).fontSize(fontSize);
            
            let x = 50;
            doc.text(date, x, y, { width: colWidths.date });
            x += colWidths.date;
            doc.text(txnNo, x, y, { width: colWidths.transactionNo });
            x += colWidths.transactionNo;
            doc.text(mode, x, y, { width: colWidths.mode });
            x += colWidths.mode;
            doc.text(amount, x, y, { width: colWidths.amount });
            x += colWidths.amount;
            doc.text(receiptNo, x, y, { width: colWidths.receiptNo });
        };
        
        // Table header
        let tableY = tableStartY;
        doc.rect(50, tableY - 2, 495, 15).stroke();
        drawTableRow(tableY, 'Date', 'Transaction No.', 'Mode', 'Amount', 'Recpt. No.', true);
        tableY += 15;
        
        // Table rows for previous payments (max 10 rows shown)
        const maxRows = 10;
        for (let i = 0; i < maxRows; i++) {
            doc.rect(50, tableY - 2, 495, 15).stroke();
            if (i < previousPayments.length) {
                const p = previousPayments[i];
                drawTableRow(
                    tableY,
                    new Date(p.receiptDate).toLocaleDateString('en-IN'),
                    p.transactionNo || '-',
                    p.paymentMode,
                    `₹${parseFloat(p.paymentAmount).toLocaleString('en-IN')}`,
                    p.receiptNo
                );
            }
            tableY += 15;
        }
        
        doc.moveDown(2);

        // Terms & Condition
        doc.fontSize(8).font('Helvetica-Bold').text('Terms & Condition :', 50);
        doc.font('Helvetica').text('Applicable bank charges shall be levied on outstation cheques. In case the cheque or payment instrument is returned unpaid for any reason, the booking will automatically stand cancelled without any further notice.', 50, doc.y, { 
            width: 495,
            align: 'justify'
        });
        
        doc.moveDown(2);

        // Signature line
        const sigY = doc.y + 20;
        doc.fontSize(9).font('Helvetica');
        doc.text('( Authorised Signatory )', 450, sigY, { align: 'right' });

        doc.end();
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Error generating PDF');
    }
});

// Delete Payment (Soft Delete)
router.post('/:id/delete', isAuthenticated, isNotAssociate, async (req, res) => {
    try {
        const payment = await Payment.findByPk(req.params.id);
        
        if (!payment) {
            return res.status(404).send('Payment not found');
        }

        // Soft delete payment
        await payment.update({ isDeleted: true });

        // Recalculate booking's totalPaid
        const Booking = require('../models').Booking;
        // Note: Booking status is managed independently
        // totalPaid is calculated at runtime when needed, not stored

        res.redirect('/payment?message=deleted');
    } catch (error) {
        console.error('Error deleting payment:', error);
        res.status(500).send('Error deleting payment: ' + error.message);
    }
});

module.exports = router;

