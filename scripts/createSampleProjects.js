const { Project, Customer, Broker, Booking, Payment, sequelize } = require('../models');

// Sample Legal Details
const sampleLegalDetails = `TERMS AND CONDITIONS:

1. This booking is subject to verification of documents and approval by the management.

2. The possession of the plot shall be handed over within 30 days of full payment completion.

3. Any additional charges for registration, stamp duty, and other statutory charges shall be borne by the buyer.

4. The buyer shall not make any construction without prior approval of the layout plan from the company.

5. All disputes are subject to local jurisdiction only.

6. This booking shall stand cancelled if remaining amount is not paid within the stipulated time period.`;

const sampleProjectsData = [
    {
        projectName: 'Green Valley Residency',
        location: 'Sector 12, Noida',
        description: 'Premium residential plots with modern amenities including 24/7 security, landscaped gardens, and wide roads.',
        legalDetails: sampleLegalDetails,
        totalPlots: 100,
        availablePlots: 85,
        isActive: true
    },
    {
        projectName: 'Sunrise Heights',
        location: 'Dwarka, New Delhi',
        description: 'Luxury plotted development with lush greenery, club house, and swimming pool.',
        legalDetails: sampleLegalDetails,
        totalPlots: 150,
        availablePlots: 120,
        isActive: true
    },
    {
        projectName: 'Silver Oak Park',
        location: 'Gurgaon',
        description: 'Budget-friendly residential plots with basic amenities and easy connectivity.',
        legalDetails: sampleLegalDetails,
        totalPlots: 75,
        availablePlots: 60,
        isActive: true
    }
];

const sampleCustomerData = {
    applicantName: 'Rajesh Kumar',
    fatherOrHusbandName: 'Suresh Kumar',
    address: '123, MG Road, Sector 10, New Delhi - 110001',
    aadhaarNo: '123456789012',
    mobileNo: '9876543210',
    email: 'rajesh.kumar@email.com',
    isActive: true
};

const sampleBrokerData = {
    name: 'Amit Sharma',
    mobileNo: '9988776655',
    email: 'amit.broker@email.com',
    address: '456, Commercial Complex, Connaught Place, New Delhi',
    aadhaarNo: '987654321098',
    panNo: 'ABCDE1234F',
    isActive: true
};

const createSampleData = async () => {
    const transaction = await sequelize.transaction();
    
    try {
        // Check if any data already exists (if so, skip sample data creation)
        const projectCount = await Project.count();
        const customerCount = await Customer.count();
        
        if (projectCount > 0 || customerCount > 0) {
            await transaction.rollback();
            return false; // Data already exists, skip sample data
        }

        // Create sample projects
        const projects = [];
        for (const projectData of sampleProjectsData) {
            const project = await Project.create(projectData, { transaction });
            projects.push(project);
        }
        console.log('✅ Sample projects created (3 projects)');

        // Create sample customer
        const custCount = await Customer.count({ paranoid: false });
        const customerNo = `CUST${new Date().getFullYear()}${String(custCount + 1).padStart(5, '0')}`;
        const customer = await Customer.create({
            customerNo,
            ...sampleCustomerData
        }, { transaction });
        console.log('✅ Sample customer created: ' + customer.applicantName);

        // Create sample broker
        const brkCount = await Broker.count({ paranoid: false });
        const brokerNo = `BRK${new Date().getFullYear()}${String(brkCount + 1).padStart(5, '0')}`;
        const broker = await Broker.create({
            brokerNo,
            ...sampleBrokerData
        }, { transaction });
        console.log('✅ Sample broker created: ' + broker.name);

        // Create sample booking with first project
        const project = projects[0];
        const area = 1200; // sq.ft.
        const rate = 3500; // per sq.ft.
        const associateRate = 3800; // per sq.ft. (broker's rate)
        const plc = 50000;
        const discount = 100;
        const effectiveRate = rate - discount;
        const totalAmount = (area * effectiveRate) + plc;
        const brokerCommission = (associateRate - rate) * area; // (3800-3500)*1200 = 360000
        
        const bookingCount = await Booking.count({ paranoid: false });
        const bookingNo = `BK${new Date().getFullYear()}${String(bookingCount + 1).padStart(5, '0')}`;
        
        const booking = await Booking.create({
            bookingNo,
            bookingDate: new Date(),
            customerId: customer.id,
            projectId: project.id,
            plotNo: 'A-101',
            area,
            plc,
            legalDetails: project.legalDetails,
            rate,
            associateRate,
            discount,
            effectiveRate,
            totalAmount,
            brokerId: broker.id,
            brokerCommission,
            remainingAmount: totalAmount, // Will update after payment
            status: 'Active'
        }, { transaction });
        console.log('✅ Sample booking created: ' + booking.bookingNo);

        // Create initial payment for booking
        const bookingAmount = 500000; // Initial payment
        const paymentCount = await Payment.count({ paranoid: false });
        const receiptNo = `RCP${new Date().getFullYear()}${String(paymentCount + 1).padStart(5, '0')}`;
        
        await Payment.create({
            receiptNo,
            receiptDate: new Date(),
            bookingId: booking.id,
            paymentAmount: bookingAmount,
            paymentMode: 'Online Transfer',
            transactionNo: 'DEMO' + Date.now(),
            remarks: 'Initial booking payment (Sample Data)',
            paymentType: 'Booking',
            isRecurring: false,
            balanceBeforePayment: totalAmount,
            balanceAfterPayment: totalAmount - bookingAmount
        }, { transaction });
        console.log('✅ Sample payment created: ₹' + bookingAmount.toLocaleString('en-IN'));

        // Update booking remaining amount
        await booking.update({
            remainingAmount: totalAmount - bookingAmount
        }, { transaction });

        await transaction.commit();
        
        return true; // Sample data created
    } catch (error) {
        await transaction.rollback();
        console.error('⚠️  Error creating sample data:', error.message);
        return false;
    }
};

// Export the function for use in other files
module.exports = createSampleData;

// If run directly from command line
if (require.main === module) {
    const { testConnection, syncDatabase } = require('../models');
    
    (async () => {
        try {
            await testConnection();
            await syncDatabase();
            
            const created = await createSampleData();
            
            if (!created) {
                console.log('\n⚠️  Sample data skipped (data already exists).');
            } else {
                console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('✅ All sample data created successfully!');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('\nSample data includes:');
                console.log('• 3 Projects with legal details');
                console.log('• 1 Customer: Rajesh Kumar');
                console.log('• 1 Broker: Amit Sharma');
                console.log('• 1 Booking (Plot A-101 in Green Valley)');
                console.log('• 1 Initial Payment of ₹5,00,000');
                console.log('\nBroker Commission: ₹3,60,000');
            }
            
            process.exit(0);
        } catch (error) {
            console.error('❌ Error:', error);
            process.exit(1);
        }
    })();
}
