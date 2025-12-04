const { DataTypes } = require('sequelize');
const { sequelize } = require('./sequelize');

const Employee = sequelize.define('Employee', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    employeeNo: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false
    },
    firstName: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    lastName: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(100),
        unique: true,
        allowNull: false,
        validate: {
            isEmail: true
        }
    },
    phone: {
        type: DataTypes.STRING(15),
        allowNull: false
    },
    alternatePhone: {
        type: DataTypes.STRING(15),
        allowNull: true
    },
    dateOfBirth: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    gender: {
        type: DataTypes.ENUM('Male', 'Female', 'Other'),
        allowNull: true
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    city: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    state: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    pincode: {
        type: DataTypes.STRING(10),
        allowNull: true
    },
    department: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    designation: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    joiningDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    employmentType: {
        type: DataTypes.ENUM('Full-Time', 'Part-Time', 'Contract', 'Intern'),
        allowNull: false,
        defaultValue: 'Full-Time'
    },
    basicSalary: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    bankName: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    accountNumber: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    ifscCode: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    aadhaarNumber: {
        type: DataTypes.STRING(12),
        allowNull: true
    },
    panNumber: {
        type: DataTypes.STRING(10),
        allowNull: true
    },
    emergencyContactName: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    emergencyContactPhone: {
        type: DataTypes.STRING(15),
        allowNull: true
    },
    emergencyContactRelation: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    profilePhoto: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('Active', 'Resigned', 'Terminated', 'On Leave'),
        allowNull: false,
        defaultValue: 'Active'
    },
    exitDate: {
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
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'employees',
    timestamps: true
});

// Hook to auto-generate employee number
Employee.beforeValidate(async (employee) => {
    if (!employee.employeeNo) {
        const year = new Date().getFullYear();
        const count = await Employee.count() + 1;
        employee.employeeNo = `EMP${year}${String(count).padStart(5, '0')}`;
    }
});

// Virtual field for full name
Employee.prototype.getFullName = function() {
    return `${this.firstName} ${this.lastName}`;
};

module.exports = Employee;

