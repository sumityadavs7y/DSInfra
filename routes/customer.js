const express = require('express');
const router = express.Router();
const { Customer, User, Booking, Project } = require('../models');
const { isAuthenticated } = require('../middleware/auth');

// List all customers
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const customers = await Customer.findAll({
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['name']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.render('customer/list', {
            customers,
            userName: req.session.userName,
            userRole: req.session.userRole
        });
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).send('Error loading customers');
    }
});

// Show create customer form
router.get('/create', isAuthenticated, async (req, res) => {
    res.render('customer/create', {
        userName: req.session.userName,
        userRole: req.session.userRole,
        error: null
    });
});

// Create new customer
router.post('/create', isAuthenticated, async (req, res) => {
    try {
        const {
            applicantName,
            fatherOrHusbandName,
            address,
            aadhaarNo,
            mobileNo,
            email,
            isBroker
        } = req.body;

        // Check if Aadhaar already exists
        const existingCustomer = await Customer.findOne({ where: { aadhaarNo } });
        if (existingCustomer) {
            return res.render('customer/create', {
                userName: req.session.userName,
                userRole: req.session.userRole,
                error: 'Customer with this Aadhaar number already exists'
            });
        }

        // Generate customer number
        const customerCount = await Customer.count();
        const customerNo = `CUST${new Date().getFullYear()}${String(customerCount + 1).padStart(5, '0')}`;

        // Create customer
        const customer = await Customer.create({
            customerNo,
            applicantName,
            fatherOrHusbandName,
            address,
            aadhaarNo,
            mobileNo,
            email: email || null,
            isBroker: isBroker === 'on' || isBroker === true || isBroker === 'true',
            isActive: true,
            createdBy: req.session.userId
        });

        res.redirect(`/customer/${customer.id}`);
    } catch (error) {
        console.error('Error creating customer:', error);
        res.render('customer/create', {
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: 'Error creating customer: ' + error.message
        });
    }
});

// View customer details
router.get('/:id', isAuthenticated, async (req, res) => {
    try {
        const customer = await Customer.findByPk(req.params.id, {
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['name']
                }
            ]
        });

        if (!customer) {
            return res.status(404).send('Customer not found');
        }

        // Get bookings where this person is the customer (exclude deleted)
        const customerBookings = await Booking.findAll({
            where: { customerId: customer.id, isDeleted: false },
            include: [
                { model: Project, as: 'project' },
                { model: Customer, as: 'broker' }
            ],
            order: [['bookingDate', 'DESC']]
        });

        // Get bookings where this person is the broker (exclude deleted)
        const brokerBookings = await Booking.findAll({
            where: { brokerId: customer.id, isDeleted: false },
            include: [
                { model: Customer, as: 'customer' },
                { model: Project, as: 'project' }
            ],
            order: [['bookingDate', 'DESC']]
        });

        // Calculate total commission from broker bookings (only non-deleted)
        const totalCommission = brokerBookings.reduce((sum, b) => {
            return sum + (parseFloat(b.brokerCommission) || 0);
        }, 0);

        res.render('customer/view', {
            customer,
            customerBookings,
            brokerBookings,
            totalCommission,
            userName: req.session.userName,
            userRole: req.session.userRole
        });
    } catch (error) {
        console.error('Error fetching customer:', error);
        res.status(500).send('Error loading customer details');
    }
});

// Show edit customer form
router.get('/:id/edit', isAuthenticated, async (req, res) => {
    try {
        const customer = await Customer.findByPk(req.params.id);

        if (!customer) {
            return res.status(404).send('Customer not found');
        }

        res.render('customer/edit', {
            customer,
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: null
        });
    } catch (error) {
        console.error('Error loading edit form:', error);
        res.status(500).send('Error loading customer edit form');
    }
});

// Update customer
router.post('/:id/edit', isAuthenticated, async (req, res) => {
    try {
        const customer = await Customer.findByPk(req.params.id);

        if (!customer) {
            return res.status(404).send('Customer not found');
        }

        const {
            applicantName,
            fatherOrHusbandName,
            address,
            aadhaarNo,
            mobileNo,
            email,
            isActive,
            isBroker
        } = req.body;

        // Check if Aadhaar is being changed and already exists for another customer
        if (aadhaarNo !== customer.aadhaarNo) {
            const existingCustomer = await Customer.findOne({ 
                where: { 
                    aadhaarNo,
                    id: { [require('sequelize').Op.ne]: customer.id }
                } 
            });
            
            if (existingCustomer) {
                return res.render('customer/edit', {
                    customer,
                    userName: req.session.userName,
                    userRole: req.session.userRole,
                    error: 'Customer with this Aadhaar number already exists'
                });
            }
        }

        // Update customer
        await customer.update({
            applicantName,
            fatherOrHusbandName,
            address,
            aadhaarNo,
            mobileNo,
            email: email || null,
            isBroker: isBroker === 'on' || isBroker === true || isBroker === 'true',
            isActive: isActive === 'true' || isActive === true
        });

        res.redirect(`/customer/${customer.id}`);
    } catch (error) {
        console.error('Error updating customer:', error);
        
        const customer = await Customer.findByPk(req.params.id);
        res.render('customer/edit', {
            customer,
            userName: req.session.userName,
            userRole: req.session.userRole,
            error: 'Error updating customer: ' + error.message
        });
    }
});

// API endpoint to get customer details (for AJAX)
router.get('/api/:id', isAuthenticated, async (req, res) => {
    try {
        const customer = await Customer.findByPk(req.params.id);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json(customer);
    } catch (error) {
        console.error('Error fetching customer:', error);
        res.status(500).json({ error: 'Error loading customer' });
    }
});

module.exports = router;

