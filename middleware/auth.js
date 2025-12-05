// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    res.redirect('/auth/login');
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (req.session && req.session.userId && req.session.userRole === 'admin') {
        return next();
    }
    res.status(403).send('Access denied. Admin privileges required.');
};

// Middleware to check if user is NOT an associate (associates are read-only)
const isNotAssociate = (req, res, next) => {
    if (req.session && req.session.userId && req.session.userRole !== 'associate') {
        return next();
    }
    res.status(403).send('Access denied. Associate users have read-only access.');
};

// Middleware to redirect to dashboard if already logged in
const redirectIfAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return res.redirect('/dashboard');
    }
    next();
};

// Middleware to get accessible broker IDs for the current user
// For associates, returns only their assigned brokers
// For other roles, returns all brokers
const getAccessibleBrokerIds = async (req, res, next) => {
    try {
        if (req.session.userRole === 'associate') {
            const { UserBrokerAccess } = require('../models');
            const accessRecords = await UserBrokerAccess.findAll({
                where: { userId: req.session.userId },
                attributes: ['brokerId']
            });
            req.accessibleBrokerIds = accessRecords.map(record => record.brokerId);
        } else {
            // Admin, manager, employee, user have access to all brokers
            req.accessibleBrokerIds = null; // null means all brokers
        }
        next();
    } catch (error) {
        console.error('Error getting accessible broker IDs:', error);
        res.status(500).send('Error checking access permissions');
    }
};

// Middleware to check if user has access to a specific broker
const canAccessBroker = async (req, res, next) => {
    try {
        // Admin, manager, employee, user can access all brokers
        if (req.session.userRole !== 'associate') {
            return next();
        }

        // For associates, check if they have access to this broker
        const brokerId = req.params.id || req.params.brokerId;
        if (!brokerId) {
            return res.status(400).send('Broker ID not provided');
        }

        const { UserBrokerAccess } = require('../models');
        const hasAccess = await UserBrokerAccess.findOne({
            where: {
                userId: req.session.userId,
                brokerId: parseInt(brokerId)
            }
        });

        if (!hasAccess) {
            return res.status(403).send('Access denied. You do not have permission to view this associate.');
        }

        next();
    } catch (error) {
        console.error('Error checking broker access:', error);
        res.status(500).send('Error checking access permissions');
    }
};

// Middleware to check if user has access to a specific booking
const canAccessBooking = async (req, res, next) => {
    try {
        // Admin, manager, employee, user can access all bookings
        if (req.session.userRole !== 'associate') {
            return next();
        }

        // For associates, check if the booking belongs to one of their assigned brokers
        const bookingId = req.params.id || req.params.bookingId;
        if (!bookingId) {
            return res.status(400).send('Booking ID not provided');
        }

        const { Booking, UserBrokerAccess } = require('../models');
        const booking = await Booking.findByPk(bookingId);
        
        if (!booking) {
            return res.status(404).send('Booking not found');
        }

        // Check if user has access to this booking's broker
        const hasAccess = await UserBrokerAccess.findOne({
            where: {
                userId: req.session.userId,
                brokerId: booking.brokerId
            }
        });

        if (!hasAccess) {
            return res.status(403).send('Access denied. You do not have permission to view this booking.');
        }

        next();
    } catch (error) {
        console.error('Error checking booking access:', error);
        res.status(500).send('Error checking access permissions');
    }
};

// Middleware to block associates from accessing restricted routes
const blockAssociateAccess = (req, res, next) => {
    if (req.session && req.session.userRole === 'associate') {
        return res.status(403).send('Access denied. This module is not available for associate users.');
    }
    next();
};

module.exports = {
    isAuthenticated,
    isAdmin,
    isNotAssociate,
    redirectIfAuthenticated,
    getAccessibleBrokerIds,
    canAccessBroker,
    canAccessBooking,
    blockAssociateAccess
};

