const { DataTypes } = require('sequelize');
const { sequelize } = require('./sequelize');

const TeamAssociate = sequelize.define('TeamAssociate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  teamId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'teams',
      key: 'id'
    }
  },
  brokerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'brokers',
      key: 'id'
    }
  },
  role: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Role of the associate in the team (e.g., Team Leader, Member)'
  },
  joinedDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'team_associates',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['teamId', 'brokerId']
    }
  ]
});

module.exports = TeamAssociate;

