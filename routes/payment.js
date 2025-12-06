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

        // Convert amount to words
        const amountInWords = numberToWords(parseFloat(payment.paymentAmount));

        res.render('payment/slip', {
            payment,
            amountInWords,
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

        // Get all payments for this booking
        const allPayments = await Payment.findAll({
            where: { bookingId: payment.bookingId },
            order: [['receiptDate', 'ASC']]
        });

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
        res.setHeader('Content-Disposition', `attachment; filename=receipt-${payment.receiptNo}.pdf`);
        
        doc.pipe(res);

        // ==================== LETTERHEAD HEADER SPACE (100pt) ====================

        // Document Title (compact)
        doc.fontSize(16).text('PAYMENT RECEIPT', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(9).text(`Receipt No: ${payment.receiptNo}  |  Date: ${new Date(payment.receiptDate).toLocaleDateString('en-IN')}`, { align: 'center' });
        doc.moveDown(0.5);

        // Customer & Booking Details (compact combined)
        doc.fontSize(11).text('Customer & Booking Details', { underline: true });
        doc.moveDown(0.3);
        doc.fontSize(9);
        doc.text(`Customer: ${payment.booking.customer.applicantName} (${payment.booking.customer.customerNo})  |  Mobile: ${payment.booking.customer.mobileNo}`);
        doc.text(`Address: ${payment.booking.customer.address}`);
        doc.text(`Booking: ${payment.booking.bookingNo}  |  Project: ${payment.booking.project.projectName}  |  Plot: ${payment.booking.plotNo}`);
        doc.text(`Total Booking Amount: ₹${parseFloat(payment.booking.totalAmount).toLocaleString('en-IN')}`);
        doc.moveDown(0.5);

        // Payment Details (compact)
        doc.fontSize(11).text('Payment Details', { underline: true });
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor('black').text(`Payment Amount: ₹${parseFloat(payment.paymentAmount).toLocaleString('en-IN')}`, { bold: true });
        doc.fontSize(9).fillColor('black');
        doc.text(`Amount in Words: ${numberToWords(payment.paymentAmount)} Rupees Only`);
        doc.text(`Mode: ${payment.paymentMode}  |  Type: ${payment.paymentType}${payment.transactionNo ? '  |  Txn: ' + payment.transactionNo : ''}`);
        if (payment.isRecurring && payment.installmentNumber) {
            doc.text(`Installment Number: ${payment.installmentNumber}`);
        }
        if (payment.remarks) {
            doc.text(`Remarks: ${payment.remarks}`);
        }
        doc.moveDown(0.5);

        // Balance Details (compact)
        const totalPaidSoFar = parseFloat(booking.totalPaid || 0);
        const remainingBalance = parseFloat(booking.totalAmount) - totalPaidSoFar;
        
        doc.fontSize(11).text('Balance Details', { underline: true });
        doc.moveDown(0.3);
        doc.fontSize(9);
        doc.text(`Total Amount: ₹${parseFloat(booking.totalAmount).toLocaleString('en-IN')}  |  Total Paid: ₹${totalPaidSoFar.toLocaleString('en-IN')}  |  Balance Due: ₹${remainingBalance.toLocaleString('en-IN')}`);
        doc.moveDown(0.5);

        // Payment History List (compact)
        if (allPayments.length > 0) {
            doc.fontSize(11).text('Payment History', { underline: true });
            doc.moveDown(0.3);
            doc.fontSize(8);
            
            // Show last 5 payments as a list
            const paymentsToShow = allPayments.slice(-5);
            paymentsToShow.forEach((p, index) => {
                const paymentDate = new Date(p.receiptDate).toLocaleDateString('en-IN');
                const amount = parseFloat(p.paymentAmount).toLocaleString('en-IN');
                
                doc.text(`${index + 1}. ${paymentDate} - ${p.receiptNo} - ₹${amount} (${p.paymentMode})`, {
                    width: 495,
                    lineGap: 0
                });
                doc.moveDown(0.3);
            });
            
            if (allPayments.length > 5) {
                doc.fontSize(7).fillColor('gray').text(`(Showing last 5 of ${allPayments.length} total payments)`, { align: 'center' });
                doc.fillColor('black');
            }
        }

        doc.moveDown(0.8);

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
        const booking = await Booking.findByPk(payment.bookingId);
        
        if (booking) {
            // Note: totalPaid is now calculated at runtime, not stored
            // Balance is calculated as: booking.totalAmount - SUM(payments.paymentAmount)
            
            // Update status based on remaining amount (if needed in future)
            const remainingAmount = parseFloat(booking.totalAmount) - totalPaid;
            if (remainingAmount <= 0) {
                booking.status = 'Completed';
            } else if (remainingAmount < booking.totalAmount) {
                booking.status = 'Active';
            }
            
            await booking.save();
        }

        res.redirect('/payment?message=deleted');
    } catch (error) {
        console.error('Error deleting payment:', error);
        res.status(500).send('Error deleting payment: ' + error.message);
    }
});

module.exports = router;

