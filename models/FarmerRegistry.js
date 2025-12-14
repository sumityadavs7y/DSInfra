const { DataTypes } = require('sequelize');
const { sequelize } = require('./sequelize');

const FarmerRegistry = sequelize.define('FarmerRegistry', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  serialNo: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Auto-generated serial number'
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'farmer_projects',
      key: 'id'
    }
  },
  registryDoneBy: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  rate: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  area: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'farmer_registries',
  timestamps: true
});

module.exports = FarmerRegistry;
