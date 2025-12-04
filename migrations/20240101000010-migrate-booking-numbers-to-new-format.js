'use strict';

/**
 * Migration: Update booking numbers to new format DS/YY/MM-XXXX
 * Example: DS/25/11-1145
 * 
 * This migration:
 * 1. Fetches all existing bookings ordered by bookingDate
 * 2. Groups by year and month
 * 3. Assigns new booking numbers starting from 1001 for each month
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Starting Booking Number Migration');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const dialect = queryInterface.sequelize.getDialect();
    
    // Fetch all bookings ordered by booking date
    // Use proper quoting for column names based on dialect
    let query;
    if (dialect === 'postgres') {
      // PostgreSQL requires double quotes for case-sensitive columns
      query = `SELECT id, "bookingNo", "bookingDate" FROM bookings ORDER BY "bookingDate" ASC, id ASC`;
    } else {
      // SQLite is case-insensitive by default
      query = `SELECT id, bookingNo, bookingDate FROM bookings ORDER BY bookingDate ASC, id ASC`;
    }
    
    const bookings = await queryInterface.sequelize.query(query, { type: Sequelize.QueryTypes.SELECT });

    console.log(`Found ${bookings.length} bookings to migrate\n`);

    if (bookings.length === 0) {
      console.log('No bookings to migrate.');
      return;
    }

    // Group bookings by year-month and assign new numbers
    const monthlyCounters = {}; // Track counter for each year-month combination
    const updates = [];

    for (const booking of bookings) {
      const bookingDate = new Date(booking.bookingDate);
      const year = bookingDate.getFullYear().toString().slice(-2); // Last 2 digits
      const month = String(bookingDate.getMonth() + 1).padStart(2, '0');
      const yearMonth = `${year}/${month}`;

      // Initialize counter for this month if not exists (starting from 1001)
      if (!monthlyCounters[yearMonth]) {
        monthlyCounters[yearMonth] = 1001;
      }

      // Generate new booking number
      const newBookingNo = `DS/${year}/${month}-${String(monthlyCounters[yearMonth]).padStart(4, '0')}`;
      
      // Store update info for summary
      updates.push({
        id: booking.id,
        oldBookingNo: booking.bookingNo,
        newBookingNo: newBookingNo,
        bookingDate: booking.bookingDate
      });

      // Update the booking using queryInterface.bulkUpdate for database compatibility
      if (dialect === 'postgres') {
        // PostgreSQL requires double quotes for case-sensitive columns
        await queryInterface.sequelize.query(
          `UPDATE bookings SET "bookingNo" = :bookingNo WHERE id = :id`,
          {
            replacements: { bookingNo: newBookingNo, id: booking.id },
            type: Sequelize.QueryTypes.UPDATE
          }
        );
      } else {
        // SQLite
        await queryInterface.sequelize.query(
          `UPDATE bookings SET bookingNo = ? WHERE id = ?`,
          {
            replacements: [newBookingNo, booking.id],
            type: Sequelize.QueryTypes.UPDATE
          }
        );
      }

      // Increment counter
      monthlyCounters[yearMonth]++;
    }

    // Display migration summary
    console.log('✅ Migration completed successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Migration Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Group updates by year-month for display
    const summary = {};
    updates.forEach(update => {
      const date = new Date(update.bookingDate);
      const yearMonth = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!summary[yearMonth]) {
        summary[yearMonth] = [];
      }
      summary[yearMonth].push(update);
    });

    // Display summary by month
    Object.keys(summary).sort().forEach(yearMonth => {
      console.log(`\n📅 ${yearMonth}:`);
      console.log(`   Total: ${summary[yearMonth].length} bookings`);
      console.log(`   Range: ${summary[yearMonth][0].newBookingNo} to ${summary[yearMonth][summary[yearMonth].length - 1].newBookingNo}`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📝 Sample Changes:\n');

    // Show first 10 changes as sample
    updates.slice(0, Math.min(10, updates.length)).forEach(update => {
      console.log(`ID ${update.id}: ${update.oldBookingNo} → ${update.newBookingNo}`);
    });

    if (updates.length > 10) {
      console.log(`... and ${updates.length - 10} more`);
    }

    console.log('\n✨ All booking numbers have been migrated to the new format!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  },

  async down(queryInterface, Sequelize) {
    console.log('\n⚠️  Rollback: This migration cannot be automatically reversed.');
    console.log('The old booking numbers were not stored.');
    console.log('Manual intervention required if rollback is needed.\n');
    
    // Note: We cannot rollback this migration automatically because
    // we don't have the original booking numbers stored.
    // If rollback is needed, you would need to restore from a database backup.
  }
};

