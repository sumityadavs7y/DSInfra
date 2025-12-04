'use strict';

/**
 * Migration: Fix booking numbers to use globally incrementing counter
 * 
 * Previous migration reset counter per month. This migration fixes it so:
 * - Numbers start from 1001 and increment continuously
 * - Month changes don't reset the counter
 * - Example: DS/25/11-1001, DS/25/11-1002, DS/25/12-1003, DS/25/12-1004
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Fixing Booking Numbers - Global Counter');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const dialect = queryInterface.sequelize.getDialect();
    
    // Fetch all bookings ordered by booking date
    let query;
    if (dialect === 'postgres') {
      query = `SELECT id, "bookingNo", "bookingDate" FROM bookings ORDER BY "bookingDate" ASC, id ASC`;
    } else {
      query = `SELECT id, bookingNo, bookingDate FROM bookings ORDER BY bookingDate ASC, id ASC`;
    }
    
    const bookings = await queryInterface.sequelize.query(query, { type: Sequelize.QueryTypes.SELECT });

    console.log(`Found ${bookings.length} bookings to renumber\n`);

    if (bookings.length === 0) {
      console.log('No bookings to renumber.');
      return;
    }

    // Assign new numbers with globally incrementing counter
    const updates = [];
    let globalCounter = 1001; // Start from 1001 and never reset

    for (const booking of bookings) {
      const bookingDate = new Date(booking.bookingDate);
      const year = bookingDate.getFullYear().toString().slice(-2);
      const month = String(bookingDate.getMonth() + 1).padStart(2, '0');

      // Generate new booking number with globally increasing counter
      const newBookingNo = `DS/${year}/${month}-${String(globalCounter).padStart(4, '0')}`;
      
      // Store update info for summary
      updates.push({
        id: booking.id,
        oldBookingNo: booking.bookingNo,
        newBookingNo: newBookingNo,
        bookingDate: booking.bookingDate
      });

      // Update the booking
      if (dialect === 'postgres') {
        await queryInterface.sequelize.query(
          `UPDATE bookings SET "bookingNo" = :bookingNo WHERE id = :id`,
          {
            replacements: { bookingNo: newBookingNo, id: booking.id },
            type: Sequelize.QueryTypes.UPDATE
          }
        );
      } else {
        await queryInterface.sequelize.query(
          `UPDATE bookings SET bookingNo = ? WHERE id = ?`,
          {
            replacements: [newBookingNo, booking.id],
            type: Sequelize.QueryTypes.UPDATE
          }
        );
      }

      // Increment global counter (never reset)
      globalCounter++;
    }

    // Display migration summary
    console.log('✅ Renumbering completed successfully!\n');
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

    console.log('\n✨ All booking numbers now use globally incrementing counter!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  },

  async down(queryInterface, Sequelize) {
    console.log('\n⚠️  Rollback: This migration cannot be automatically reversed.');
    console.log('The previous booking numbers were not stored.');
    console.log('Manual intervention required if rollback is needed.\n');
  }
};

