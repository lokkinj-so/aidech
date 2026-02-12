#!/usr/bin/env node

/**
 * Buffer setup CLI - Connect GBP profiles
 * Usage: npm run buffer:connect
 */

require('dotenv').config();
const BufferService = require('../services/buffer');
const logger = require('../utils/logger');
const fs = require('fs').promises;

async function main() {
  try {
    if (!process.env.BUFFER_ACCESS_TOKEN) {
      console.error('❌ BUFFER_ACCESS_TOKEN not found in .env');
      console.log('\nPlease set up Buffer API first:');
      console.log('1. Go to https://buffer.com/developers');
      console.log('2. Create an app and get Access Token');
      console.log('3. Add BUFFER_ACCESS_TOKEN to .env');
      process.exit(1);
    }

    const buffer = new BufferService();

    console.log('Connecting to Buffer...\n');

    // Get user info
    const user = await buffer.getUser();
    console.log(`✅ Connected as: ${user.name || user.id}`);

    // Get all profiles
    const profiles = await buffer.getProfiles();
    console.log(`\nFound ${profiles.length} connected profiles:\n`);

    for (const profile of profiles) {
      const serviceIcon = {
        facebook: '📘',
        twitter: '🐦',
        linkedin: '💼',
        instagram: '📸',
        googlebusiness: '🏢',
        google: '🏢',
      }[profile.service] || '📱';

      console.log(`${serviceIcon} ${profile.formatted_username || profile.service}`);
      console.log(`   Service: ${profile.service}`);
      console.log(`   ID: ${profile.id}`);
      console.log(`   Timezone: ${profile.timezone || 'N/A'}`);
      console.log('');
    }

    // Get Google Business Profile profiles
    const gbpProfiles = await buffer.getGBPProfiles();

    if (gbpProfiles.length === 0) {
      console.log('⚠️  No Google Business Profile connected.');
      console.log('\nTo connect GBP:');
      console.log('1. Go to https://buffer.com/');
      console.log('2. Click "Connect More Channels"');
      console.log('3. Select "Google My Business"');
      console.log('4. Connect your GBP locations');
      console.log('5. Run this command again');
      process.exit(0);
    }

    console.log('=== Google Business Profile Locations ===\n');

    const mapping = {};

    for (const profile of gbpProfiles) {
      const locationId = profile.formatted_username
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_');

      mapping[locationId] = profile.id;

      console.log(`📍 ${profile.formatted_username}`);
      console.log(`   Buffer ID: ${profile.id}`);
      console.log(`   Location ID (suggested): ${locationId}`);
      console.log('');
    }

    // Save mapping template
    const mappingPath = './config/buffer-mapping.json';
    await fs.writeFile(mappingPath, JSON.stringify(mapping, null, 2));

    console.log(`✅ Mapping saved to: ${mappingPath}`);
    console.log('\nNext steps:');
    console.log('1. Copy locations from buffer-mapping.json');
    console.log('2. Add them to config/locations.json');
    console.log('3. Set buffer_profile_id for each location');
    console.log('4. Run: npm run sync:multi');

    process.exit(0);
  } catch (error) {
    logger.error('Buffer setup failed:', error);
    console.error('❌ Setup failed:', error.message);

    if (error.response?.status === 401) {
      console.log('\n⚠️  Invalid BUFFER_ACCESS_TOKEN');
      console.log('Please check your Buffer API credentials');
    }

    process.exit(1);
  }
}

main();
