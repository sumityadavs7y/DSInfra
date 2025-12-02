const { User, testConnection, syncDatabase } = require('../models');

const createAdminUser = async () => {
    try {
        // Test database connection
        await testConnection();
        
        // Sync database
        await syncDatabase();

        // Check if admin already exists
        const existingAdmin = await User.findOne({ where: { email: 'admin@example.com' } });
        
        if (existingAdmin) {
            console.log('⚠️  Admin user already exists!');
            console.log('Email: admin@example.com');
            process.exit(0);
        }

        // Create admin user
        const admin = await User.create({
            name: 'Admin User',
            email: 'admin@example.com',
            password: 'admin123',
            role: 'admin',
            isActive: true
        });

        console.log('✅ Admin user created successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Email: admin@example.com');
        console.log('Password: admin123');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⚠️  Please change the password after first login!');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin user:', error);
        process.exit(1);
    }
};

createAdminUser();

