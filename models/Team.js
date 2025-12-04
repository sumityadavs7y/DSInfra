const { DataTypes } = require('sequelize');
const { sequelize } = require('./sequelize');

const Team = sequelize.define('Team', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  teamNo: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    comment: 'Auto-generated team number'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'teams',
  timestamps: true,
  hooks: {
    beforeValidate: async (team, options) => {
      if (!team.teamNo) {
        const year = new Date().getFullYear();
        const count = await Team.count({ paranoid: false });
        team.teamNo = `TEAM${year}${(count + 1).toString().padStart(5, '0')}`;
      }
    }
  }
});

module.exports = Team;
