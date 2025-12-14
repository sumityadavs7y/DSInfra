'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Make fatherOrHusbandName, aadhaarNo, and mobileNo nullable in customers table
    await queryInterface.changeColumn('customers', 'fatherOrHusbandName', {
      type: Sequelize.STRING,
      allowNull: true
    });
    
    await queryInterface.changeColumn('customers', 'aadhaarNo', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true
    });
    
    await queryInterface.changeColumn('customers', 'mobileNo', {
      type: Sequelize.STRING,
      allowNull: true
    });
    
    console.log('✅ Made fatherOrHusbandName, aadhaarNo, and mobileNo optional in customers table');
  },

  down: async (queryInterface, Sequelize) => {
    // Revert: make fields required again
    await queryInterface.changeColumn('customers', 'fatherOrHusbandName', {
      type: Sequelize.STRING,
      allowNull: false
    });
    
    await queryInterface.changeColumn('customers', 'aadhaarNo', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    });
    
    await queryInterface.changeColumn('customers', 'mobileNo', {
      type: Sequelize.STRING,
      allowNull: false
    });
    
    console.log('✅ Reverted fatherOrHusbandName, aadhaarNo, and mobileNo to required fields');
  }
};

