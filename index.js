// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const app = express();
const { envConfig } = require('./config');
const { testConnection, User } = require('./models');
const { runMigrations } = require('./utils/migrate');
const createAdminUser = require('./scripts/createAdmin');
const createSampleData = require('./scripts/createSampleProjects');
const { isDevEnvMode } = require('./utils/helpers');


app.use(express.json())
app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + '/public'));

// Session configuration
app.use(session({
    secret: envConfig.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));


app.set('view engine', 'ejs');
app.set('views', 'views');

// Auto-login middleware (for development only)
app.use(async (req, res, next) => {
    if (isDevEnvMode() && !req.session.userId) {
        try {
            const admin = await User.findOne({ where: { email: 'admin@example.com' } });
            if (admin) {
                req.session.userId = admin.id;
                req.session.userName = admin.name;
                req.session.userEmail = admin.email;
                req.session.userRole = admin.role;
            }
        } catch (error) {
            // Silently fail - will require manual login
        }
    }
    next();
});

// Routes
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const userRoutes = require('./routes/user');
const customerRoutes = require('./routes/customer');
const brokerRoutes = require('./routes/broker');
const bookingRoutes = require('./routes/booking');
const paymentRoutes = require('./routes/payment');
const projectRoutes = require('./routes/project');
const brokerPaymentRoutes = require('./routes/brokerPayment');
const teamRoutes = require('./routes/team');

app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/user', userRoutes);
app.use('/customer', customerRoutes);
app.use('/broker', brokerRoutes);
app.use('/booking', bookingRoutes);
app.use('/payment', paymentRoutes);
app.use('/project', projectRoutes);
app.use('/broker-payment', brokerPaymentRoutes);
app.use('/team', teamRoutes);

// Initialize default data using scripts
const initializeDefaultData = async () => {
    try {
        // Always create admin user
        await createAdminUser();
        
        // Only create sample data if flag is enabled (from .env)
        if (isDevEnvMode()) {
            await createSampleData();
        }
    } catch (error) {
        console.error('⚠️  Error initializing default data:', error.message);
    }
};

// Initialize database and start server
const startServer = async () => {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🚀 Starting Server...');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Test database connection
      await testConnection();
      
      // Run database migrations (replaces sync())
      // This is the safe way to update database schema
      await runMigrations();
      
      // Initialize default admin user and sample projects
      await initializeDefaultData();
      
      // Start the server
      app.listen(envConfig.port, () => {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`✅ Server is running on port ${envConfig.port}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  };
  
  startServer();