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
    dialect: process.env.DB_DIALECT || 'sqlite',
    storage: './database/app.db',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
};

