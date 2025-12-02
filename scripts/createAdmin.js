const { User } = require('../models');

const createAdminUser = async () => {
    try {
        // Check if admin already exists
        const adminCount = await User.count({ where: { role: 'admin' } });
        
        if (adminCount > 0) {
            return false; // Admin already exists
        }

        // Create admin user
        await User.create({
            name: 'Admin User',
            email: 'admin@example.com',
            password: 'admin123',
            role: 'admin',
            isActive: true
        });

        console.log('✅ Default admin user created');
        console.log('   Email: admin@example.com');
        console.log('   Password: admin123');
        
        return true; // Admin created
    } catch (error) {
        console.error('⚠️  Error creating admin user:', error.message);
        return false;
    }
};

// Export the function for use in other files
module.exports = createAdminUser;

// If run directly from command line
if (require.main === module) {
    const { testConnection, syncDatabase } = require('../models');
    
    (async () => {
        try {
            await testConnection();
            await syncDatabase();
            
            const created = await createAdminUser();
            
            if (!created) {
                console.log('⚠️  Admin user already exists!');
            } else {
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('⚠️  Please change the password after first login!');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            }
            
            process.exit(0);
        } catch (error) {
            console.error('❌ Error:', error);
            process.exit(1);
        }
    })();
}

