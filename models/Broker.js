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
  photo: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Base64 encoded photo'
  },
  documents: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('documents');
      // Handle null, undefined, empty string, or the string 'null'
      if (!rawValue || rawValue === '' || rawValue === 'null' || rawValue === 'undefined') {
        return [];
      }
      // If it's already an array, return it
      if (Array.isArray(rawValue)) {
        return rawValue;
      }
      // Try to parse JSON
      try {
        const parsed = JSON.parse(rawValue);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        // Silently return empty array for malformed JSON
        return [];
      }
    },
    set(value) {
      this.setDataValue('documents', JSON.stringify(value || []));
    },
    comment: 'JSON array of documents'
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

