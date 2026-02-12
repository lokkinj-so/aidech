const InstagramService = require('./instagram');
const BufferService = require('./buffer');
const GBPAutomation = require('./gbp-automation');
const NotificationService = require('./notification');
const StorageService = require('./storage');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

/**
 * Multi-location sync service for enterprise-scale (100+ locations)
 */
class MultiLocationSync {
  constructor(config = {}) {
    this.config = config;
    this.locationsFile = config.locationsFile || './config/locations.json';
    this.autoPostEnabled = config.autoPostEnabled || process.env.AUTO_POST_TO_GBP === 'true';
    this.useBuffer = config.useBuffer !== false && process.env.BUFFER_ACCESS_TOKEN;
    this.usePuppeteer = config.usePuppeteer === true && process.env.USE_PUPPETEER === 'true';

    // Initialize services
    if (this.useBuffer) {
      this.bufferService = new BufferService(config);
    }

    if (this.usePuppeteer) {
      this.gbpAutomation = new GBPAutomation(config);
    }

    this.notificationService = new NotificationService(config);
    this.storageService = new StorageService(config);

    // Rate limiting
    this.batchSize = config.batchSize || 10; // Process 10 locations at a time
    this.batchDelay = config.batchDelay || 5000; // 5 seconds between batches
  }

  /**
   * Load locations configuration
   * @returns {Promise<Array>} List of locations
   */
  async loadLocations() {
    try {
      const data = await fs.readFile(this.locationsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      logger.error('Failed to load locations config:', error.message);
      throw new Error(`Locations file not found: ${this.locationsFile}`);
    }
  }

  /**
   * Sync all active locations
   * @returns {Promise<Object>} Sync summary
   */
  async syncAll() {
    logger.info('Starting multi-location sync...');

    const locations = await this.loadLocations();
    const activeLocations = locations.filter(loc => loc.active !== false);

    logger.info(`Found ${activeLocations.length} active locations`);

    const results = {
      total: activeLocations.length,
      success: 0,
      failed: 0,
      newPosts: 0,
      errors: [],
    };

    // Initialize Puppeteer if needed
    if (this.usePuppeteer && !this.gbpAutomation.browser) {
      await this.gbpAutomation.init();

      // Login once for all locations
      if (process.env.GOOGLE_EMAIL && process.env.GOOGLE_PASSWORD) {
        this.gbpPage = await this.gbpAutomation.login(
          process.env.GOOGLE_EMAIL,
          process.env.GOOGLE_PASSWORD
        );
      }
    }

    // Process locations in batches
    for (let i = 0; i < activeLocations.length; i += this.batchSize) {
      const batch = activeLocations.slice(i, i + this.batchSize);

      logger.info(`Processing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(activeLocations.length / this.batchSize)}`);

      // Process batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map(location => this.syncLocation(location))
      );

      // Aggregate results
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.success++;
          results.newPosts += result.value.newPosts || 0;
        } else {
          results.failed++;
          results.errors.push({
            location: result.reason?.location || 'unknown',
            error: result.reason?.message || 'Unknown error',
          });
        }
      }

      // Rate limiting delay between batches
      if (i + this.batchSize < activeLocations.length) {
        logger.info(`Waiting ${this.batchDelay}ms before next batch...`);
        await this.delay(this.batchDelay);
      }
    }

    // Cleanup
    if (this.usePuppeteer) {
      await this.gbpAutomation.close();
    }

    logger.info('Multi-location sync completed', results);
    return results;
  }

  /**
   * Sync a single location
   * @param {Object} location - Location config
   * @returns {Promise<Object>} Sync result
   */
  async syncLocation(location) {
    try {
      logger.info(`Syncing location: ${location.name} (${location.id})`);

      // Initialize Instagram service for this location
      const instagram = new InstagramService({
        accessToken: location.instagram_access_token || process.env.INSTAGRAM_ACCESS_TOKEN,
        businessAccountId: location.instagram_account_id,
      });

      // Get recent posts
      const posts = await instagram.getRecentPosts(5); // Last 5 posts

      // Load existing posts for this location
      const existingPosts = await this.storageService.loadPosts(location.id);
      const existingIds = new Set(existingPosts.map(p => p.id));

      // Find new posts
      const newPosts = posts.filter(post => !existingIds.has(post.id));

      if (newPosts.length === 0) {
        logger.info(`No new posts for ${location.name}`);
        return { location: location.id, newPosts: 0 };
      }

      logger.info(`Found ${newPosts.length} new posts for ${location.name}`);

      // Process each new post
      for (const post of newPosts) {
        await this.processNewPost(post, location);
      }

      return { location: location.id, newPosts: newPosts.length };
    } catch (error) {
      logger.error(`Failed to sync location ${location.name}:`, error.message);
      throw { location: location.id, message: error.message };
    }
  }

  /**
   * Process a new Instagram post
   * @param {Object} post - Instagram post
   * @param {Object} location - Location config
   */
  async processNewPost(post, location) {
    try {
      logger.info(`Processing new post for ${location.name}: ${post.id}`);

      // Download media
      const downloadPath = await this.storageService.downloadMedia(post, location.id);

      // Send notification
      await this.notificationService.notifyNewPost(post, downloadPath);

      // Auto-post to GBP if enabled
      if (this.autoPostEnabled) {
        if (this.useBuffer && location.buffer_profile_id) {
          // Use Buffer API
          await this.bufferService.autoPostToGBP(post, location.buffer_profile_id);
          logger.info(`Auto-posted to GBP via Buffer for ${location.name}`);
        } else if (this.usePuppeteer && location.gbp_location_id) {
          // Use Puppeteer automation
          await this.gbpAutomation.createPost(this.gbpPage, location.gbp_location_id, {
            caption: post.caption,
            imagePath: downloadPath,
          });
          logger.info(`Auto-posted to GBP via Puppeteer for ${location.name}`);
        }
      }

      // Save post to storage
      await this.storageService.savePost({
        ...post,
        location_id: location.id,
        location_name: location.name,
        download_path: downloadPath,
        processed_at: new Date().toISOString(),
      });

      logger.info(`Successfully processed post for ${location.name}`);
    } catch (error) {
      logger.error(`Failed to process post for ${location.name}:`, error.message);
      throw error;
    }
  }

  /**
   * Get sync status for all locations
   * @returns {Promise<Array>} Status for each location
   */
  async getStatus() {
    const locations = await this.loadLocations();
    const statuses = [];

    for (const location of locations) {
      const posts = await this.storageService.loadPosts(location.id);
      const pendingPosts = posts.filter(p => p.posted_to_gbp !== true);

      statuses.push({
        id: location.id,
        name: location.name,
        active: location.active !== false,
        total_posts: posts.length,
        pending_posts: pendingPosts.length,
        last_sync: posts.length > 0 ? posts[0].processed_at : null,
      });
    }

    return statuses;
  }

  /**
   * Delay utility
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = MultiLocationSync;
