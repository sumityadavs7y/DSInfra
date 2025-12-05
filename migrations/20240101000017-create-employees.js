'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('employees', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      employeeNo: {
        type: Sequelize.STRING(50),
        unique: true,
        allowNull: false
      },
      firstName: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      lastName: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(100),
        unique: true,
        allowNull: false
      },
      phone: {
        type: Sequelize.STRING(15),
        allowNull: false
      },
      alternatePhone: {
        type: Sequelize.STRING(15),
        allowNull: true
      },
      dateOfBirth: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      gender: {
        type: Sequelize.ENUM('Male', 'Female', 'Other'),
        allowNull: true
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      state: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      pincode: {
        type: Sequelize.STRING(10),
        allowNull: true
      },
      department: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      designation: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      joiningDate: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      employmentType: {
        type: Sequelize.ENUM('Full-Time', 'Part-Time', 'Contract', 'Intern'),
        allowNull: false,
        defaultValue: 'Full-Time'
      },
      basicSalary: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      bankName: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      accountNumber: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      ifscCode: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      aadhaarNumber: {
        type: Sequelize.STRING(12),
        allowNull: true
      },
      panNumber: {
        type: Sequelize.STRING(10),
        allowNull: true
      },
      emergencyContactName: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      emergencyContactPhone: {
        type: Sequelize.STRING(15),
        allowNull: true
      },
      emergencyContactRelation: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      profilePhoto: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('Active', 'Resigned', 'Terminated', 'On Leave'),
        allowNull: false,
        defaultValue: 'Active'
      },
      exitDate: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      remarks: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      isDeleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      createdBy: {
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
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('employees');
  }
};


