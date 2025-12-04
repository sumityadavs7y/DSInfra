'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('team_associates', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      teamId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'teams',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      brokerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'brokers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      role: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Role of the associate in the team'
      },
      joinedDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_DATE')
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add unique constraint for teamId + brokerId
    await queryInterface.addIndex('team_associates', ['teamId', 'brokerId'], {
      unique: true,
      name: 'unique_team_broker'
    });

    console.log('✅ Created team_associates table with unique constraint');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('team_associates');
    console.log('✅ Dropped team_associates table');
  }
};

