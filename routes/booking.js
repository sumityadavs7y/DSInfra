const express = require('express');
const router = express.Router();
const { Booking, Project, User } = require('../models');
const { isAuthenticated } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const { numberToWords } = require('../utils/helpers');

// List all bookings
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const bookings = await Booking.findAll({
            include: [
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
        const projects = await Project.findAll({
            where: { isActive: true }
        });

        res.render('booking/create', {
            projects,
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
    try {
        const {
            applicantName,
            fatherOrHusbandName,
            address,
            aadhaarNo,
            mobileNo,
            projectId,
            plotNo,
            area,
            plc,
            legalDetails,
            rate,
            discount,
            bookingAmount,
            paymentMode,
            transactionNo,
            remarks
        } = req.body;

        // Calculate effective rate and total amount
        const effectiveRate = parseFloat(rate) - (parseFloat(discount) || 0);
        const totalAmount = (parseFloat(area) * effectiveRate) + (parseFloat(plc) || 0);
        const remainingAmount = totalAmount - parseFloat(bookingAmount);

        // Generate booking number
        const bookingCount = await Booking.count();
        const bookingNo = `BK${new Date().getFullYear()}${String(bookingCount + 1).padStart(5, '0')}`;

        // Create booking
        const booking = await Booking.create({
            bookingNo,
            bookingDate: new Date(),
            applicantName,
            fatherOrHusbandName,
            address,
            aadhaarNo,
            mobileNo,
            projectId,
            plotNo,
            area,
            plc: plc || 0,
            legalDetails,
            rate,
            discount: discount || 0,
            effectiveRate,
            totalAmount,
            bookingAmount,
            paymentMode,
            transactionNo,
            remarks,
            remainingAmount,
            status: 'Active',
            createdBy: req.session.userId
        });

        res.redirect(`/booking/${booking.id}`);
    } catch (error) {
        console.error('Error creating booking:', error);
        
        const projects = await Project.findAll({ where: { isActive: true } });
        res.render('booking/create', {
            projects,
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
                    model: Project,
                    as: 'project'
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

        res.render('booking/view', {
            booking,
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
                    model: Project,
                    as: 'project'
                }
            ]
        });

        if (!booking) {
            return res.status(404).send('Booking not found');
        }

        const projects = await Project.findAll({
            where: { isActive: true }
        });

        res.render('booking/edit', {
            booking,
            projects,
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
    try {
        const booking = await Booking.findByPk(req.params.id);

        if (!booking) {
            return res.status(404).send('Booking not found');
        }

        const {
            applicantName,
            fatherOrHusbandName,
            address,
            aadhaarNo,
            mobileNo,
            projectId,
            plotNo,
            area,
            plc,
            legalDetails,
            rate,
            discount,
            bookingAmount,
            paymentMode,
            transactionNo,
            remarks,
            status
        } = req.body;

        // Calculate effective rate and total amount
        const effectiveRate = parseFloat(rate) - (parseFloat(discount) || 0);
        const totalAmount = (parseFloat(area) * effectiveRate) + (parseFloat(plc) || 0);
        const remainingAmount = totalAmount - parseFloat(bookingAmount);

        // Update booking
        await booking.update({
            applicantName,
            fatherOrHusbandName,
            address,
            aadhaarNo,
            mobileNo,
            projectId,
            plotNo,
            area,
            plc: plc || 0,
            legalDetails,
            rate,
            discount: discount || 0,
            effectiveRate,
            totalAmount,
            bookingAmount,
            paymentMode,
            transactionNo,
            remarks,
            remainingAmount,
            status: status || 'Active'
        });

        res.redirect(`/booking/${booking.id}`);
    } catch (error) {
        console.error('Error updating booking:', error);
        
        const booking = await Booking.findByPk(req.params.id);
        const projects = await Project.findAll({ where: { isActive: true } });
        
        res.render('booking/edit', {
            booking,
            projects,
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
                    model: Project,
                    as: 'project'
                }
            ]
        });

        if (!booking) {
            return res.status(404).send('Booking not found');
        }

        // Create PDF
        const doc = new PDFDocument({ margin: 50 });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=booking-${booking.bookingNo}.pdf`);
        
        doc.pipe(res);

        // Header
        doc.fontSize(20).text('BOOKING SLIP', { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).text(`Booking No: ${booking.bookingNo}`, { align: 'right' });
        doc.text(`Date: ${new Date(booking.bookingDate).toLocaleDateString('en-IN')}`, { align: 'right' });
        doc.moveDown();

        // Applicant Details
        doc.fontSize(14).text('Applicant Details', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Name: ${booking.applicantName}`);
        doc.text(`Father/Husband Name: ${booking.fatherOrHusbandName}`);
        doc.text(`Address: ${booking.address}`);
        doc.text(`Aadhaar No: ${booking.aadhaarNo}`);
        doc.text(`Mobile No: ${booking.mobileNo}`);
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

        // Payment Details
        doc.fontSize(14).text('Payment Details', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Booking Amount: ₹${parseFloat(booking.bookingAmount).toLocaleString('en-IN')}`);
        doc.text(`Amount in Words: ${numberToWords(booking.bookingAmount)} Rupees Only`);
        doc.text(`Payment Mode: ${booking.paymentMode}`);
        if (booking.transactionNo) {
            doc.text(`Transaction No: ${booking.transactionNo}`);
        }
        if (booking.remarks) {
            doc.text(`Remarks: ${booking.remarks}`);
        }
        doc.text(`Remaining Amount: ₹${parseFloat(booking.remainingAmount).toLocaleString('en-IN')}`);
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

module.exports = router;

