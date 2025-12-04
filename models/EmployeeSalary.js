const { DataTypes } = require('sequelize');
const { sequelize } = require('./sequelize');

const EmployeeSalary = sequelize.define('EmployeeSalary', {
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
    month: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 12
        }
    },
    year: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    basicSalary: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    hra: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    transportAllowance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    mealAllowance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    otherAllowances: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    totalAllowances: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    providentFund: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    professionalTax: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    tds: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    loanDeduction: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    otherDeductions: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    totalDeductions: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    overtimePay: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    bonus: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    grossSalary: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    netSalary: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    presentDays: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    absentDays: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    paidDays: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    paymentDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    paymentStatus: {
        type: DataTypes.ENUM('Pending', 'Paid', 'On-Hold'),
        allowNull: false,
        defaultValue: 'Pending'
    },
    paymentMode: {
        type: DataTypes.ENUM('Bank Transfer', 'Cash', 'Cheque', 'UPI'),
        allowNull: true
    },
    transactionReference: {
        type: DataTypes.STRING(100),
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
    processedBy: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'employee_salaries',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['employeeId', 'month', 'year']
        }
    ]
});

module.exports = EmployeeSalary;

