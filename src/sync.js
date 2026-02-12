const InstagramService = require('./services/instagram');
const GoogleBusinessService = require('./services/google-business');
const StateManager = require('./utils/state-manager');
const logger = require('./utils/logger');

class SyncManager {
  constructor() {
    this.instagramService = new InstagramService();
    this.googleBusinessService = new GoogleBusinessService();
    this.stateManager = new StateManager();
  }

  /**
   * Initialize sync manager
   */
  async initialize() {
    logger.info('Initializing sync manager...');
    await this.stateManager.load();
    await this.googleBusinessService.initialize();
    logger.info('Sync manager initialized');
  }

  /**
   * Sync Instagram posts to Google Business Profile
   */
  async sync() {
    try {
      logger.info('Starting sync process...');

      // Get recent Instagram posts
      const posts = await this.instagramService.getRecentPosts(20);
      logger.info(`Found ${posts.length} Instagram posts`);

      let syncedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const post of posts) {
        try {
          // Check if post has already been synced
          if (this.stateManager.isPostSynced(post.id)) {
            logger.debug(`Post ${post.id} already synced, skipping`);
            skippedCount++;
            continue;
          }

          // Get full post details
          const fullPost = await this.instagramService.getPost(post.id);
          logger.info(`Processing post: ${fullPost.id} (${fullPost.media_type})`);

          // Prepare post data for GBP
          const gbpPostData = await this.prepareGBPPost(fullPost);

          // Create post on Google Business Profile
          const gbpPost = await this.googleBusinessService.createPost(gbpPostData);

          // Mark post as synced
          await this.stateManager.markPostSynced(
            fullPost.id,
            gbpPost.name || 'unknown',
            fullPost.timestamp
          );

          syncedCount++;
          logger.info(`✓ Successfully synced post ${fullPost.id}`);
        } catch (error) {
          errorCount++;
          logger.error(`✗ Error syncing post ${post.id}:`, error.message);
        }
      }

      logger.info('Sync process completed');
      logger.info(`Summary: ${syncedCount} synced, ${skippedCount} skipped, ${errorCount} errors`);

      return {
        success: true,
        synced: syncedCount,
        skipped: skippedCount,
        errors: errorCount,
      };
    } catch (error) {
      logger.error('Sync process failed:', error.message);
      throw error;
    }
  }

  /**
   * Prepare Instagram post data for Google Business Profile
   * @param {Object} instagramPost - Instagram post data
   * @returns {Object} GBP post data
   */
  async prepareGBPPost(instagramPost) {
    const postData = {
      summary: this.truncateCaption(instagramPost.caption || ''),
      topicType: 'STANDARD',
      media: [],
    };

    // Handle different media types
    if (instagramPost.media_type === 'IMAGE') {
      postData.media.push({
        mediaFormat: 'PHOTO',
        sourceUrl: instagramPost.media_url,
      });
    } else if (instagramPost.media_type === 'VIDEO') {
      postData.media.push({
        mediaFormat: 'VIDEO',
        sourceUrl: instagramPost.media_url,
      });
    } else if (instagramPost.media_type === 'CAROUSEL_ALBUM') {
      // Handle carousel posts with multiple media items
      if (instagramPost.childMedia) {
        for (const child of instagramPost.childMedia.slice(0, 10)) {
          // GBP typically supports up to 10 media items
          postData.media.push({
            mediaFormat: child.media_type === 'VIDEO' ? 'VIDEO' : 'PHOTO',
            sourceUrl: child.media_url,
          });
        }
      }
    }

    // Add link to original Instagram post
    if (instagramPost.permalink) {
      postData.callToAction = {
        actionType: 'LEARN_MORE',
        url: instagramPost.permalink,
      };
    }

    return postData;
  }

  /**
   * Truncate caption to fit GBP limits (1500 characters)
   * @param {string} caption - Instagram caption
   * @returns {string} Truncated caption
   */
  truncateCaption(caption) {
    const maxLength = 1500;
    if (caption.length <= maxLength) {
      return caption;
    }

    return caption.substring(0, maxLength - 3) + '...';
  }

  /**
   * Get sync statistics
   * @returns {Object} Sync statistics
   */
  getStats() {
    const syncedPosts = this.stateManager.getSyncedPosts();
    const lastSyncTime = this.stateManager.getLastSyncTime();

    return {
      totalSynced: syncedPosts.length,
      lastSyncTime,
      syncedPosts: syncedPosts.slice(-10), // Last 10 synced posts
    };
  }
}

// Run sync if called directly
if (require.main === module) {
  const { validateConfig } = require('./config');

  (async () => {
    try {
      validateConfig();
      const syncManager = new SyncManager();
      await syncManager.initialize();
      await syncManager.sync();
      process.exit(0);
    } catch (error) {
      logger.error('Fatal error:', error);
      process.exit(1);
    }
  })();
}

module.exports = SyncManager;
