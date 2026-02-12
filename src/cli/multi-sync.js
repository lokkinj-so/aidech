#!/usr/bin/env node

/**
 * Multi-location sync CLI
 * Usage: npm run sync:multi
 */

require('dotenv').config();
const MultiLocationSync = require('../services/multi-sync');
const logger = require('../utils/logger');

async function main() {
  try {
    logger.info('Starting multi-location sync...');

    const sync = new MultiLocationSync({
      locationsFile: process.env.LOCATIONS_FILE || './config/locations.json',
      autoPostEnabled: process.env.AUTO_POST_TO_GBP === 'true',
      useBuffer: process.env.BUFFER_ACCESS_TOKEN !== undefined,
      usePuppeteer: process.env.USE_PUPPETEER === 'true',
      batchSize: parseInt(process.env.SYNC_BATCH_SIZE) || 10,
      batchDelay: parseInt(process.env.SYNC_BATCH_DELAY) || 5000,
    });

    const results = await sync.syncAll();

    console.log('\n=== Sync Summary ===');
    console.log(`Total locations: ${results.total}`);
    console.log(`✅ Success: ${results.success}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📸 New posts: ${results.newPosts}`);

    if (results.errors.length > 0) {
      console.log('\n=== Errors ===');
      for (const error of results.errors) {
        console.log(`- ${error.location}: ${error.error}`);
      }
    }

    console.log('\n✅ Multi-location sync completed!');
    process.exit(0);
  } catch (error) {
    logger.error('Multi-location sync failed:', error);
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
  }
}

main();
