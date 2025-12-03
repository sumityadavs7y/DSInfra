const { DataTypes } = require('sequelize');
const { sequelize } = require('./sequelize');

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  projectName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  legalDetails: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Default legal details to be used in bookings'
  },
  totalPlots: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  availablePlots: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'projects',
  timestamps: true
});

module.exports = Project;

