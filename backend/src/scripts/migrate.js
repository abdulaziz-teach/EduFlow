import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

import connectDB, { disconnectDB } from '../config/db.js';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';

/**
 * Production Data Migration Script
 *
 * Safely backfills missing fields on existing users and provisions missing wallets.
 * Non-destructive: will never drop tables, alter existing credentials, or overwrite existing data.
 */
async function runMigration() {
  console.log('🚀 Starting EduFlow Safe Production Migration...');

  await connectDB();

  try {
    const users = await User.find({});
    console.log(`Found ${users.length} users to inspect.`);

    let updatedUsers = 0;
    let provisionedWallets = 0;

    for (const user of users) {
      let isModified = false;

      // 1. Backfill displayName from name if missing
      if (!user.displayName && user.name) {
        user.displayName = user.name;
        isModified = true;
      }

      // 2. Ensure status is active
      if (!user.status) {
        user.status = 'active';
        isModified = true;
      }

      // 3. Save user if updated
      if (isModified) {
        await user.save();
        updatedUsers++;
      }

      // 4. Ensure user has a Wallet
      const existingWallet = await Wallet.findOne({ userId: user._id });
      if (!existingWallet) {
        await Wallet.create({
          userId: user._id,
          coins: 100,
          gems: 0,
          tickets: 5,
        });
        provisionedWallets++;
      }
    }

    // 5. FIND-04: Idempotent removal of redundant Notification.userId single-field index
    let redundantIndexRemoved = false;
    try {
      const notifIndexes = await Notification.collection.indexes();
      const hasRedundantUserIdIndex = notifIndexes.some((idx) => idx.name === 'userId_1');
      if (hasRedundantUserIdIndex) {
        await Notification.collection.dropIndex('userId_1');
        redundantIndexRemoved = true;
        console.log('   ✔ Dropped redundant index [userId_1] on notifications collection.');
      }
    } catch (idxErr) {
      console.warn('   ⚠ Notification index check/cleanup skipped (collection may not exist yet):', idxErr.message);
    }

    // 6. FIND-02: Ensure AuditLog compound cursor index { createdAt: -1, _id: -1 } exists
    try {
      await AuditLog.syncIndexes();
      console.log('   ✔ Synced AuditLog indexes for cursor pagination.');
    } catch (auditIdxErr) {
      console.warn('   ⚠ AuditLog index sync skipped:', auditIdxErr.message);
    }

    console.log(`✅ Migration completed successfully:`);
    console.log(`   - Users updated: ${updatedUsers}`);
    console.log(`   - Wallets provisioned: ${provisionedWallets}`);
    console.log(`   - Redundant Notification index dropped: ${redundantIndexRemoved}`);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await disconnectDB();
  }
}

runMigration();
