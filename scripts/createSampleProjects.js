const { Project } = require('../models');

const sampleProjectsData = [
    {
        projectName: 'Green Valley Residency',
        location: 'Sector 12, Noida',
        description: 'Premium residential plots with modern amenities',
        totalPlots: 100,
        availablePlots: 85,
        isActive: true
    },
    {
        projectName: 'Sunrise Heights',
        location: 'Dwarka, New Delhi',
        description: 'Luxury plotted development with lush greenery',
        totalPlots: 150,
        availablePlots: 120,
        isActive: true
    },
    {
        projectName: 'Silver Oak Park',
        location: 'Gurgaon',
        description: 'Budget-friendly residential plots',
        totalPlots: 75,
        availablePlots: 60,
        isActive: true
    }
];

const createSampleProjects = async () => {
    try {
        // Check if projects already exist
        const projectCount = await Project.count();
        
        if (projectCount > 0) {
            return false; // Projects already exist
        }

        // Create sample projects
        for (const projectData of sampleProjectsData) {
            await Project.create(projectData);
        }

        console.log('✅ Sample projects created (3 projects)');
        
        return true; // Projects created
    } catch (error) {
        console.error('⚠️  Error creating sample projects:', error.message);
        return false;
    }
};

// Export the function for use in other files
module.exports = createSampleProjects;

// If run directly from command line
if (require.main === module) {
    const { testConnection, syncDatabase } = require('../models');
    
    (async () => {
        try {
            await testConnection();
            await syncDatabase();
            
            const created = await createSampleProjects();
            
            if (!created) {
                console.log('⚠️  Projects already exist in the database.');
                const allProjects = await Project.findAll();
                console.log('\nExisting Projects:');
                allProjects.forEach(p => {
                    console.log(`- ${p.projectName} (${p.location})`);
                });
            } else {
                console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('✅ Sample projects created successfully!');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('\nProjects created:');
                sampleProjectsData.forEach(p => {
                    console.log(`• ${p.projectName} - ${p.location}`);
                    console.log(`  Total Plots: ${p.totalPlots} | Available: ${p.availablePlots}`);
                });
                console.log('\nYou can now create bookings using these projects!');
            }
            
            process.exit(0);
        } catch (error) {
            console.error('❌ Error:', error);
            process.exit(1);
        }
    })();
}

