const express = require('express');
const session = require('express-session');
const app = express();
const { envConfig } = require('./config');
const { testConnection, syncDatabase } = require('./models');


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

app.use((req, res, next) => {
    // res.locals.gigs = navigationData(); // Add any data you want to pass to all pages
    next();
});

// Routes
const indexRoutes = require('./routes/index');
app.use('/', indexRoutes);

// Initialize database and start server
const startServer = async () => {
    try {
      // Test database connection
      await testConnection();
      
      // Sync database models (creates tables if they don't exist)
      await syncDatabase();
      
      // Start the server
      app.listen(envConfig.port, () => {
        console.log(`🚀 Server is running on port ${envConfig.port}`);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  };
  
  startServer();