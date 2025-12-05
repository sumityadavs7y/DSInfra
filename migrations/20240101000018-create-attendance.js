'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('attendance', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      employeeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'employees',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      checkIn: {
        type: Sequelize.TIME,
        allowNull: true
      },
      checkOut: {
        type: Sequelize.TIME,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('Present', 'Absent', 'Half-Day', 'Leave', 'Holiday', 'Week-Off'),
        allowNull: false,
        defaultValue: 'Present'
      },
      leaveType: {
        type: Sequelize.ENUM('Casual', 'Sick', 'Earned', 'Unpaid', 'Maternity', 'Paternity'),
        allowNull: true
      },
      workingHours: {
        type: Sequelize.DECIMAL(4, 2),
        allowNull: true,
        defaultValue: 0
      },
      overtime: {
        type: Sequelize.DECIMAL(4, 2),
        allowNull: true,
        defaultValue: 0
      },
      remarks: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      isDeleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      markedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Add unique constraint
    await queryInterface.addIndex('attendance', ['employeeId', 'date'], {
      unique: true,
      name: 'attendance_employee_date_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('attendance');
  }
};


