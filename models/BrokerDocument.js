const { DataTypes } = require('sequelize');
const { sequelize } = require('./sequelize');

const BrokerDocument = sequelize.define('BrokerDocument', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  brokerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'brokers',
      key: 'id'
    }
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Original file name'
  },
  fileType: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'MIME type of the file'
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'File size in bytes'
  },
  fileData: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Base64 encoded file data'
  },
  uploadedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  uploadedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'broker_documents',
  timestamps: true
});

module.exports = BrokerDocument;

