#!/usr/bin/env node

/**
 * Multi-location status CLI
 * Usage: npm run sync:status
 */

require('dotenv').config();
const MultiLocationSync = require('../services/multi-sync');
const logger = require('../utils/logger');

async function main() {
  try {
    const sync = new MultiLocationSync({
      locationsFile: process.env.LOCATIONS_FILE || './config/locations.json',
    });

    const statuses = await sync.getStatus();

    console.log('\n=== Location Status ===\n');

    for (const status of statuses) {
      const activeIcon = status.active ? '✅' : '⏸️';
      const pendingIcon = status.pending_posts > 0 ? '⚠️' : '✓';

      console.log(`${activeIcon} ${status.name} (${status.id})`);
      console.log(`   Total posts: ${status.total_posts}`);
      console.log(`   ${pendingIcon} Pending: ${status.pending_posts}`);
      console.log(`   Last sync: ${status.last_sync || 'Never'}`);
      console.log('');
    }

    const totalPending = statuses.reduce((sum, s) => sum + s.pending_posts, 0);
    const activeCount = statuses.filter(s => s.active).length;

    console.log('=== Summary ===');
    console.log(`Active locations: ${activeCount}/${statuses.length}`);
    console.log(`Total pending posts: ${totalPending}`);

    process.exit(0);
  } catch (error) {
    logger.error('Status check failed:', error);
    console.error('❌ Failed to get status:', error.message);
    process.exit(1);
  }
}

main();
