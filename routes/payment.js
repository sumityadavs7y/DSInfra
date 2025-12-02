const express = require('express');
const router = express.Router();
const { Payment, Booking, Customer, Project, User } = require('../models');
const { isAuthenticated } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const { numberToWords } = require('../utils/helpers');

// List all payments
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const payments = await Payment.findAll({
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
            ],
            order: [['createdAt', 'DESC']]
        });

        res.render('payment/list', {
            payments,
            userName: req.session.userName,
            userRole: req.session.userRole
        });
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).send('Error loading payments');
    }
});

// Show create payment form
router.get('/create', isAuthenticated, async (req, res) => {
    try {
        // Get bookings with remaining balance
        const bookings = await Booking.findAll({
            where: { 
                status: 'Active',
                remainingAmount: { [require('sequelize').Op.gt]: 0 }
            },
            include: [
                { model: Customer, as: 'customer' },
                { model: Project, as: 'project' }
            ],
            order: [['bookingDate', 'DESC']]
        });

        res.render('payment/create', {
            bookings,
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
router.post('/create', isAuthenticated, async (req, res) => {
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
            const bookings = await Booking.findAll({
                where: { status: 'Active', remainingAmount: { [require('sequelize').Op.gt]: 0 } },
                include: [{ model: Customer, as: 'customer' }, { model: Project, as: 'project' }]
            });
            return res.render('payment/create', {
                bookings,
                userName: req.session.userName,
                userRole: req.session.userRole,
                error: 'Booking not found'
            });
        }

        const amount = parseFloat(paymentAmount);
        const currentBalance = parseFloat(booking.remainingAmount);

        // Validate payment amount
        if (amount <= 0) {
            await transaction.rollback();
            const bookings = await Booking.findAll({
                where: { status: 'Active', remainingAmount: { [require('sequelize').Op.gt]: 0 } },
                include: [{ model: Customer, as: 'customer' }, { model: Project, as: 'project' }]
            });
            return res.render('payment/create', {
                bookings,
                userName: req.session.userName,
                userRole: req.session.userRole,
                error: 'Payment amount must be greater than 0'
            });
        }

        if (amount > currentBalance) {
            await transaction.rollback();
            const bookings = await Booking.findAll({
                where: { status: 'Active', remainingAmount: { [require('sequelize').Op.gt]: 0 } },
                include: [{ model: Customer, as: 'customer' }, { model: Project, as: 'project' }]
            });
            return res.render('payment/create', {
                bookings,
                userName: req.session.userName,
                userRole: req.session.userRole,
                error: `Payment amount cannot exceed remaining balance of ₹${currentBalance.toLocaleString('en-IN')}`
            });
        }

        // Generate receipt number
        const paymentCount = await Payment.count();
        const receiptNo = `RCP${new Date().getFullYear()}${String(paymentCount + 1).padStart(5, '0')}`;

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
            balanceBeforePayment: currentBalance,
            balanceAfterPayment: newBalance,
            createdBy: req.session.userId
        }, { transaction });

        // Update booking remaining amount
        await booking.update({
            remainingAmount: newBalance,
            status: newBalance === 0 ? 'Completed' : 'Active'
        }, { transaction });

        await transaction.commit();

        res.redirect(`/payment/${payment.id}`);
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating payment:', error);
        
        const bookings = await Booking.findAll({
            where: { status: 'Active', remainingAmount: { [require('sequelize').Op.gt]: 0 } },
            include: [{ model: Customer, as: 'customer' }, { model: Project, as: 'project' }]
        });
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

        // Get all payments for this booking for history
        const allPayments = await Payment.findAll({
            where: { bookingId: payment.bookingId },
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

// Show edit payment form
router.get('/:id/edit', isAuthenticated, async (req, res) => {
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
router.post('/:id/edit', isAuthenticated, async (req, res) => {
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
        const oldAmount = parseFloat(payment.paymentAmount);

        // Get all other payments for this booking
        const otherPayments = await Payment.findAll({
            where: { 
                bookingId: payment.bookingId,
                id: { [require('sequelize').Op.ne]: payment.id }
            }
        });

        // Calculate total of other payments
        const otherPaymentsTotal = otherPayments.reduce((sum, p) => sum + parseFloat(p.paymentAmount), 0);
        
        // Calculate booking amount (initial payment)
        const bookingInitialAmount = parseFloat(payment.booking.bookingAmount);
        const totalBookingAmount = parseFloat(payment.booking.totalAmount);

        // Total payments including this new amount
        const totalPayments = bookingInitialAmount + otherPaymentsTotal + newAmount;

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

        if (totalPayments > totalBookingAmount) {
            await transaction.rollback();
            const maxAllowed = totalBookingAmount - bookingInitialAmount - otherPaymentsTotal;
            return res.render('payment/edit', {
                payment,
                userName: req.session.userName,
                userRole: req.session.userRole,
                error: `Payment amount cannot exceed ₹${maxAllowed.toLocaleString('en-IN')} (would overpay the booking)`
            });
        }

        // Calculate new balance after this payment
        const balanceBeforeThisPayment = totalBookingAmount - bookingInitialAmount - otherPaymentsTotal;
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
            installmentNumber: installmentNumber || null,
            balanceBeforePayment: balanceBeforeThisPayment,
            balanceAfterPayment: balanceAfterThisPayment
        }, { transaction });

        // Recalculate booking's remaining amount
        const newBookingBalance = totalBookingAmount - totalPayments;
        await payment.booking.update({
            remainingAmount: newBookingBalance,
            status: newBookingBalance === 0 ? 'Completed' : 'Active'
        }, { transaction });

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

        // Get all payments for this booking
        const allPayments = await Payment.findAll({
            where: { bookingId: payment.bookingId },
            order: [['receiptDate', 'ASC']]
        });

        // Create PDF
        const doc = new PDFDocument({ margin: 50 });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=receipt-${payment.receiptNo}.pdf`);
        
        doc.pipe(res);

        // Header
        doc.fontSize(20).text('PAYMENT RECEIPT', { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).text(`Receipt No: ${payment.receiptNo}`, { align: 'right' });
        doc.text(`Date: ${new Date(payment.receiptDate).toLocaleDateString('en-IN')}`, { align: 'right' });
        doc.moveDown();

        // Customer Details
        doc.fontSize(14).text('Customer Details', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Customer No: ${payment.booking.customer.customerNo}`);
        doc.text(`Name: ${payment.booking.customer.applicantName}`);
        doc.text(`Mobile: ${payment.booking.customer.mobileNo}`);
        doc.text(`Address: ${payment.booking.customer.address}`);
        doc.moveDown();

        // Booking Details
        doc.fontSize(14).text('Booking Details', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Booking No: ${payment.booking.bookingNo}`);
        doc.text(`Project: ${payment.booking.project.projectName}`);
        doc.text(`Plot No: ${payment.booking.plotNo}`);
        doc.text(`Total Amount: ₹${parseFloat(payment.booking.totalAmount).toLocaleString('en-IN')}`);
        doc.moveDown();

        // Payment Details
        doc.fontSize(14).text('Payment Details', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Payment Amount: ₹${parseFloat(payment.paymentAmount).toLocaleString('en-IN')}`);
        doc.text(`Amount in Words: ${numberToWords(payment.paymentAmount)} Rupees Only`);
        doc.text(`Payment Mode: ${payment.paymentMode}`);
        doc.text(`Payment Type: ${payment.paymentType}`);
        if (payment.transactionNo) {
            doc.text(`Transaction No: ${payment.transactionNo}`);
        }
        if (payment.isRecurring && payment.installmentNumber) {
            doc.text(`Installment Number: ${payment.installmentNumber}`);
        }
        if (payment.remarks) {
            doc.text(`Remarks: ${payment.remarks}`);
        }
        doc.moveDown();

        // Balance Details
        doc.fontSize(14).text('Balance Details', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Balance Before Payment: ₹${parseFloat(payment.balanceBeforePayment).toLocaleString('en-IN')}`);
        doc.text(`Balance After Payment: ₹${parseFloat(payment.balanceAfterPayment).toLocaleString('en-IN')}`);
        doc.moveDown();

        // Previous Payments Table
        if (allPayments.length > 0) {
            doc.fontSize(14).text('Payment History', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(9);
            
            const tableTop = doc.y;
            const colWidths = [80, 80, 80, 80, 80];
            const headers = ['Date', 'Receipt No', 'Amount', 'Mode', 'Balance'];
            
            // Table headers
            let x = 50;
            headers.forEach((header, i) => {
                doc.text(header, x, tableTop, { width: colWidths[i], align: 'left' });
                x += colWidths[i];
            });
            
            doc.moveDown();
            doc.moveTo(50, doc.y).lineTo(450, doc.y).stroke();
            doc.moveDown(0.3);
            
            // Table rows
            allPayments.forEach(p => {
                x = 50;
                const rowData = [
                    new Date(p.receiptDate).toLocaleDateString('en-IN'),
                    p.receiptNo,
                    `₹${parseFloat(p.paymentAmount).toLocaleString('en-IN')}`,
                    p.paymentMode,
                    `₹${parseFloat(p.balanceAfterPayment).toLocaleString('en-IN')}`
                ];
                
                rowData.forEach((data, i) => {
                    doc.text(data, x, doc.y, { width: colWidths[i], align: 'left', continued: i < rowData.length - 1 });
                    x += colWidths[i];
                });
                doc.moveDown(0.7);
            });
        }

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

module.exports = router;

