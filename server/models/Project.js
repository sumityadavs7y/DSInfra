const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  legalDetails: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  totalPlots: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  availablePlots: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  plots: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of plot objects with plotNo, area, areaUnit, rate, plc, status, bookedBy, corner, facing'
  },
  termsAndConditions: {
    type: DataTypes.TEXT,
    defaultValue: `1. The booking amount is non-refundable.
2. Payment schedule must be followed as per agreement.
3. All taxes and charges are extra as applicable.
4. Registry charges are to be borne by the buyer.
5. Possession will be given after full payment clearance.`
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'projects',
  timestamps: true,
  hooks: {
    beforeSave: (project) => {
      // Calculate available plots before saving
      if (project.plots && Array.isArray(project.plots)) {
        project.availablePlots = project.plots.filter(plot => plot.status === 'available').length;
      }
    }
  }
});

// Instance method to update plot status
Project.prototype.updatePlotStatus = function(plotNo, status, bookingId = null) {
  const plots = this.plots || [];
  const plotIndex = plots.findIndex(p => p.plotNo === plotNo);
  
  if (plotIndex !== -1) {
    plots[plotIndex].status = status;
    if (bookingId) {
      plots[plotIndex].bookedBy = bookingId;
    }
    this.plots = plots;
    this.availablePlots = plots.filter(p => p.status === 'available').length;
  }
};

module.exports = Project;
