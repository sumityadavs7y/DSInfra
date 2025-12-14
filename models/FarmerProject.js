const { DataTypes } = require('sequelize');
const { sequelize } = require('./sequelize');

const FarmerProject = sequelize.define('FarmerProject', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'farmer_projects',
  timestamps: true
});

module.exports = FarmerProject;
