exports.envConfig = {
    port: process.env.PORT || "80",
    sessionSecret: process.env.SESSION_SECRET || 'ds-secret-key-2024',
    envMode: process.env.ENV_MODE || 'production'
  };
  
//   exports.mailerConfig = {
//     host: process.env.MAIL_HOST || "smtp.gmail.com",
//     port: process.env.MAIL_PORT || "587",
//     user: process.env.MAIL_USER || "adsspec.official@gmail.com",
//     key: process.env.MAIL_KEY,
//     official_mail: process.env.MAIL_OFFICIAL || "adsspec.official@gmail.com", // support@adsspec.com
//   };
  
//   exports.razorpayConfig = {
//     key_id: process.env.RAZORPAY_KEY_ID,
//     key_secret: process.env.RAZORPAY_KEY_SECRET,
//   };
  
exports.databaseConfig = {
    dialect: process.env.DB_DIALECT || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'dsinfra',
    username: process.env.DB_USER || 'dsuser',
    password: process.env.DB_PASSWORD,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    // Fallback to SQLite if needed
    storage: process.env.DB_DIALECT === 'sqlite' ? './database/app.db' : undefined,
};

