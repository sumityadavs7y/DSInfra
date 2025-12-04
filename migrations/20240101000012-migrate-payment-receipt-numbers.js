'use strict';

/**
 * Migration: Update payment receipt numbers to DSPAY/IN/XXXX format
 * Example: DSPAY/IN/1025
 * 
 * This migration:
 * 1. Fetches all existing payments ordered by receipt date
 * 2. Assigns new receipt numbers starting from 1001
 * 3. Numbers increment globally and never reset
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Migrating Payment Receipt Numbers');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const dialect = queryInterface.sequelize.getDialect();
    
    // Step 1: Temporarily drop unique constraint to avoid conflicts
    console.log('Step 1: Removing unique constraint temporarily...');
    try {
      if (dialect === 'postgres') {
        await queryInterface.sequelize.query(
          `ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_receiptNo_key;`
        );
      } else {
        // SQLite doesn't support dropping constraints easily, we'll handle it differently
        console.log('SQLite: Skipping constraint removal (will handle in update)');
      }
    } catch (error) {
      console.log('Note: Constraint may not exist, continuing...');
    }

    // Step 2: Fetch and update all payments
    console.log('Step 2: Fetching all payments...\n');
    
    let query;
    if (dialect === 'postgres') {
      query = `SELECT id, "receiptNo", "receiptDate" FROM payments ORDER BY "receiptDate" ASC, id ASC`;
    } else {
      query = `SELECT id, receiptNo, receiptDate FROM payments ORDER BY receiptDate ASC, id ASC`;
    }
    
    const payments = await queryInterface.sequelize.query(query, { type: Sequelize.QueryTypes.SELECT });

    console.log(`Found ${payments.length} payments to migrate\n`);

    if (payments.length === 0) {
      console.log('No payments to migrate.');
      return;
    }

    // Step 3: Update all payments with new receipt numbers
    console.log('Step 3: Updating receipt numbers...\n');
    
    const updates = [];
    let globalCounter = 1001; // Start from 1001

    for (const payment of payments) {
      // Generate new receipt number: DSPAY/IN/XXXX
      const newReceiptNo = `DSPAY/IN/${String(globalCounter).padStart(4, '0')}`;
      
      // Store update info for summary
      updates.push({
        id: payment.id,
        oldReceiptNo: payment.receiptNo,
        newReceiptNo: newReceiptNo,
        receiptDate: payment.receiptDate
      });

      // Update the payment
      if (dialect === 'postgres') {
        await queryInterface.sequelize.query(
          `UPDATE payments SET "receiptNo" = :receiptNo WHERE id = :id`,
          {
            replacements: { receiptNo: newReceiptNo, id: payment.id },
            type: Sequelize.QueryTypes.UPDATE
          }
        );
      } else {
        await queryInterface.sequelize.query(
          `UPDATE payments SET receiptNo = ? WHERE id = ?`,
          {
            replacements: [newReceiptNo, payment.id],
            type: Sequelize.QueryTypes.UPDATE
          }
        );
      }

      globalCounter++;
    }

    // Step 4: Re-add unique constraint
    console.log('\nStep 4: Re-adding unique constraint...');
    if (dialect === 'postgres') {
      await queryInterface.sequelize.query(
        `ALTER TABLE payments ADD CONSTRAINT payments_receiptNo_key UNIQUE ("receiptNo");`
      );
    }

    // Display migration summary
    console.log('\n✅ Migration completed successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Migration Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`Total payments migrated: ${updates.length}`);
    console.log(`New format: DSPAY/IN/XXXX`);
    console.log(`Number range: DSPAY/IN/1001 to DSPAY/IN/${String(globalCounter - 1).padStart(4, '0')}`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📝 Sample Changes:\n');

    // Show first 10 changes as sample
    updates.slice(0, Math.min(10, updates.length)).forEach(update => {
      console.log(`ID ${update.id}: ${update.oldReceiptNo} → ${update.newReceiptNo}`);
    });

    if (updates.length > 10) {
      console.log(`... and ${updates.length - 10} more`);
    }

    console.log('\n✨ All payment receipt numbers migrated to new format!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  },

  async down(queryInterface, Sequelize) {
    console.log('\n⚠️  Rollback: This migration cannot be automatically reversed.');
    console.log('The old receipt numbers were not stored.');
    console.log('Manual intervention required if rollback is needed.\n');
  }
};

