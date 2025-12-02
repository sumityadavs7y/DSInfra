const express = require('express');
const router = express.Router();
const { BrokerPayment, Booking, Broker, User, sequelize } = require('../models');
const { isAuthenticated } = require('../middleware/auth');

// Create broker payment (completely independent of bookings)
router.post('/create', isAuthenticated, async (req, res) => {
    try {
        const { brokerId, paymentAmount, paymentDate, paymentMode, transactionNo, remarks } = req.body;

        // Validate required fields
        if (!brokerId || !paymentAmount) {
            return res.status(400).json({ success: false, message: 'Broker and payment amount are required' });
        }

        const broker = await Broker.findByPk(brokerId);
        if (!broker) {
            return res.status(404).json({ success: false, message: 'Broker not found' });
        }

        const paymentAmountVal = parseFloat(paymentAmount);

        if (paymentAmountVal <= 0) {
            return res.status(400).json({ success: false, message: 'Payment amount must be greater than 0' });
        }

        // Create broker payment
        const brokerPayment = await BrokerPayment.create({
            brokerId,
            paymentAmount: paymentAmountVal,
            paymentDate: paymentDate || new Date(),
            paymentMode: paymentMode || 'Cash',
            transactionNo,
            remarks,
            createdBy: req.session.userId
        });

        res.json({ success: true, message: 'Broker payment added successfully', payment: brokerPayment });
    } catch (error) {
        console.error('Error creating broker payment:', error);
        res.status(500).json({ success: false, message: 'Error creating broker payment: ' + error.message });
    }
});

// Get single broker payment
router.get('/:id', isAuthenticated, async (req, res) => {
    try {
        const brokerPayment = await BrokerPayment.findByPk(req.params.id, {
            include: [
                {
                    model: Broker,
                    as: 'broker',
                    attributes: ['id', 'name']
                }
            ]
        });

        if (!brokerPayment || brokerPayment.isDeleted) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        res.json({ success: true, payment: brokerPayment });
    } catch (error) {
        console.error('Error fetching broker payment:', error);
        res.status(500).json({ success: false, message: 'Error fetching payment: ' + error.message });
    }
});

// Edit broker payment
router.post('/:id/edit', isAuthenticated, async (req, res) => {
    try {
        const { paymentAmount, paymentDate, paymentMode, transactionNo, remarks } = req.body;

        const brokerPayment = await BrokerPayment.findByPk(req.params.id);

        if (!brokerPayment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        if (brokerPayment.isDeleted) {
            return res.status(400).json({ success: false, message: 'Cannot edit deleted payment' });
        }

        const paymentAmountVal = parseFloat(paymentAmount);

        if (paymentAmountVal <= 0) {
            return res.status(400).json({ success: false, message: 'Payment amount must be greater than 0' });
        }

        // Update broker payment
        await brokerPayment.update({
            paymentAmount: paymentAmountVal,
            paymentDate: paymentDate || brokerPayment.paymentDate,
            paymentMode: paymentMode || brokerPayment.paymentMode,
            transactionNo,
            remarks
        });

        res.json({ success: true, message: 'Broker payment updated successfully' });
    } catch (error) {
        console.error('Error updating broker payment:', error);
        res.status(500).json({ success: false, message: 'Error updating broker payment: ' + error.message });
    }
});

// Delete broker payment (soft delete)
router.post('/:id/delete', isAuthenticated, async (req, res) => {
    try {
        const brokerPayment = await BrokerPayment.findByPk(req.params.id);

        if (!brokerPayment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        await brokerPayment.update({ isDeleted: true });

        res.json({ success: true, message: 'Broker payment deleted successfully' });
    } catch (error) {
        console.error('Error deleting broker payment:', error);
        res.status(500).json({ success: false, message: 'Error deleting broker payment: ' + error.message });
    }
});

module.exports = router;

