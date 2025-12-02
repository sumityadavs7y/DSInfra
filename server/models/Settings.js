const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Settings = sequelize.define('Settings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  companyName: {
    type: DataTypes.STRING,
    defaultValue: 'Real Estate Company'
  },
  companyAddress: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  companyPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  companyEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  companyLogo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  gstNo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  defaultTermsAndConditions: {
    type: DataTypes.TEXT,
    defaultValue: `1. The booking amount is non-refundable.
2. Payment schedule must be followed as per agreement.
3. All taxes and charges are extra as applicable.
4. Registry charges are to be borne by the buyer.
5. Possession will be given after full payment clearance.
6. Company reserves the right to cancel booking in case of default.`
  },
  bookingSlipFooter: {
    type: DataTypes.TEXT,
    defaultValue: 'Thank you for your business!'
  },
  receiptSlipFooter: {
    type: DataTypes.TEXT,
    defaultValue: 'Payment received with thanks.'
  }
}, {
  tableName: 'settings',
  timestamps: true
});

// Class method to get or create singleton settings
Settings.getSettings = async function() {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({});
  }
  return settings;
};

module.exports = Settings;
