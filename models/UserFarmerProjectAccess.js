const { DataTypes } = require('sequelize');
const { sequelize } = require('./sequelize');

const UserFarmerProjectAccess = sequelize.define('UserFarmerProjectAccess', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  farmerProjectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'farmer_project_id',
    references: {
      model: 'farmer_projects',
      key: 'id'
    }
  }
}, {
  tableName: 'user_farmer_project_access',
  timestamps: true,
  underscored: true
});

module.exports = UserFarmerProjectAccess;
