const { DataTypes } = require('sequelize');
const { sequelize } = require('./sequelize');

const EmployeeDocument = sequelize.define('EmployeeDocument', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    employeeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'employees',
            key: 'id'
        }
    },
    documentType: {
        type: DataTypes.ENUM(
            'Aadhaar Card',
            'PAN Card',
            'Driving License',
            'Passport',
            'Educational Certificate',
            'Experience Letter',
            'Offer Letter',
            'Joining Letter',
            'Resignation Letter',
            'Bank Statement',
            'Salary Slip',
            'Other'
        ),
        allowNull: false
    },
    documentNumber: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    documentName: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    filePath: {
        type: DataTypes.STRING(500),
        allowNull: false
    },
    fileSize: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    uploadDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    expiryDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    remarks: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    isDeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    uploadedBy: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'employee_documents',
    timestamps: true
});

module.exports = EmployeeDocument;

