const { DataTypes } = require('sequelize');
const { sequelize } = require('./sequelize');

const Attendance = sequelize.define('Attendance', {
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
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    checkIn: {
        type: DataTypes.TIME,
        allowNull: true
    },
    checkOut: {
        type: DataTypes.TIME,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('Present', 'Absent', 'Half-Day', 'Leave', 'Holiday', 'Week-Off'),
        allowNull: false,
        defaultValue: 'Present'
    },
    leaveType: {
        type: DataTypes.ENUM('Casual', 'Sick', 'Earned', 'Unpaid', 'Maternity', 'Paternity'),
        allowNull: true
    },
    workingHours: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: true,
        defaultValue: 0
    },
    overtime: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: true,
        defaultValue: 0
    },
    remarks: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    isDeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    markedBy: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'attendance',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['employeeId', 'date']
        }
    ]
});

module.exports = Attendance;

