const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const { authenticate, checkPermission } = require('../middleware/auth');

// Get all projects
router.get('/', authenticate, async (req, res) => {
  try {
    const { isActive } = req.query;
    const where = {};
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    const projects = await Project.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      count: projects.length,
      projects
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch projects' });
  }
});

// Get single project
router.get('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    res.json({
      success: true,
      project
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch project' });
  }
});

// Create new project
router.post('/', authenticate, checkPermission('canEditSettings'), async (req, res) => {
  try {
    const project = await Project.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ success: false, message: 'Failed to create project', error: error.message });
  }
});

// Update project
router.put('/:id', authenticate, checkPermission('canEditSettings'), async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    await project.update(req.body);
    
    res.json({
      success: true,
      message: 'Project updated successfully',
      project
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ success: false, message: 'Failed to update project' });
  }
});

// Get available plots for a project
router.get('/:id/available-plots', authenticate, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    const plots = project.plots || [];
    const availablePlots = plots.filter(plot => plot.status === 'available');
    
    res.json({
      success: true,
      count: availablePlots.length,
      plots: availablePlots
    });
  } catch (error) {
    console.error('Get available plots error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch available plots' });
  }
});

// Update plot status
router.patch('/:projectId/plots/:plotNo/status', authenticate, async (req, res) => {
  try {
    const { projectId, plotNo } = req.params;
    const { status, bookedBy } = req.body;
    
    const project = await Project.findByPk(projectId);
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    const plots = project.plots || [];
    const plotIndex = plots.findIndex(p => p.plotNo === plotNo);
    
    if (plotIndex === -1) {
      return res.status(404).json({ success: false, message: 'Plot not found' });
    }
    
    plots[plotIndex].status = status;
    if (bookedBy) {
      plots[plotIndex].bookedBy = bookedBy;
    }
    
    project.plots = plots;
    await project.save();
    
    res.json({
      success: true,
      message: 'Plot status updated successfully',
      plot: plots[plotIndex]
    });
  } catch (error) {
    console.error('Update plot status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update plot status' });
  }
});

module.exports = router;
