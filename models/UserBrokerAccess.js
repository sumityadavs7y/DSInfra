const { DataTypes } = require('sequelize');
const { sequelize } = require('./sequelize');

const UserBrokerAccess = sequelize.define('UserBrokerAccess', {
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
  brokerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'broker_id',
    references: {
      model: 'brokers',
      key: 'id'
    }
  }
}, {
  tableName: 'user_broker_access',
  timestamps: true,
  underscored: true
});

module.exports = UserBrokerAccess;

