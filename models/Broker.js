const { DataTypes } = require('sequelize');
const { sequelize } = require('./sequelize');

const Broker = sequelize.define('Broker', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  brokerNo: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    comment: 'Auto-generated broker number'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  mobileNo: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [10, 15]
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  aadhaarNo: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [12, 12]
    }
  },
  panNo: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [10, 10]
    }
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
  tableName: 'brokers',
  timestamps: true,
  hooks: {
    beforeValidate: async (broker, options) => {
      if (!broker.brokerNo) {
        const year = new Date().getFullYear();
        const count = await Broker.count({ paranoid: false });
        broker.brokerNo = `BRK${year}${(count + 1).toString().padStart(5, '0')}`;
      }
    }
  }
});

module.exports = Broker;

