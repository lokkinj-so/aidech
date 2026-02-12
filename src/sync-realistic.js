const fs = require('fs').promises;
const path = require('path');
const InstagramService = require('./services/instagram');
const NotificationService = require('./services/notification');
const StateManager = require('./utils/state-manager');
const logger = require('./utils/logger');
const { config } = require('./config');

class RealisticSyncManager {
  constructor() {
    this.instagramService = new InstagramService();
    this.notificationService = new NotificationService();
    this.stateManager = new StateManager();
    this.downloadPath = process.env.MEDIA_DOWNLOAD_PATH || './downloads';
  }

  /**
   * Initialize sync manager
   */
  async initialize() {
    logger.info('Initializing realistic sync manager...');
    await this.stateManager.load();

    // Create downloads directory if it doesn't exist
    await fs.mkdir(this.downloadPath, { recursive: true });
    await fs.mkdir(path.join(this.downloadPath, 'posts'), { recursive: true });

    logger.info('Sync manager initialized');
  }

  /**
   * Sync Instagram posts and prepare for manual GBP posting
   */
  async sync() {
    try {
      logger.info('Starting sync process...');

      // Get recent Instagram posts
      const posts = await this.instagramService.getRecentPosts(20);
      logger.info(`Found ${posts.length} Instagram posts`);

      let newPosts = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const post of posts) {
        try {
          // Check if post has already been processed
          if (this.stateManager.isPostSynced(post.id)) {
            logger.debug(`Post ${post.id} already processed, skipping`);
            skippedCount++;
            continue;
          }

          // Get full post details
          const fullPost = await this.instagramService.getPost(post.id);
          logger.info(`Processing post: ${fullPost.id} (${fullPost.media_type})`);

          // Download and prepare post data
          const preparedData = await this.preparePostData(fullPost);

          // Send notification
          await this.notificationService.notifyNewPost(fullPost, preparedData.localPath);

          // Mark post as processed (but not posted to GBP yet)
          await this.stateManager.markPostSynced(
            fullPost.id,
            'pending_manual_post',
            fullPost.timestamp
          );

          newPosts++;
          logger.info(`✓ Post ${fullPost.id} prepared and notification sent`);
        } catch (error) {
          errorCount++;
          logger.error(`✗ Error processing post ${post.id}:`, error.message);
        }
      }

      logger.info('Sync process completed');
      logger.info(`Summary: ${newPosts} new posts prepared, ${skippedCount} skipped, ${errorCount} errors`);

      // Send summary notification
      await this.notificationService.notifySummary({
        newPosts,
        skipped: skippedCount,
        errors: errorCount,
      });

      return {
        success: true,
        newPosts,
        skipped: skippedCount,
        errors: errorCount,
      };
    } catch (error) {
      logger.error('Sync process failed:', error.message);
      throw error;
    }
  }

  /**
   * Prepare Instagram post data for manual GBP posting
   * @param {Object} instagramPost - Instagram post data
   * @returns {Object} Prepared post data
   */
  async preparePostData(instagramPost) {
    const postDir = path.join(this.downloadPath, 'posts', instagramPost.id);
    await fs.mkdir(postDir, { recursive: true });

    const preparedData = {
      postId: instagramPost.id,
      localPath: postDir,
      caption: this.prepareCaption(instagramPost.caption),
      originalCaption: instagramPost.caption,
      mediaType: instagramPost.media_type,
      permalink: instagramPost.permalink,
      timestamp: instagramPost.timestamp,
      media: [],
    };

    // Download media
    if (instagramPost.media_type === 'IMAGE') {
      const imagePath = await this.downloadMedia(
        instagramPost.media_url,
        postDir,
        'image_0.jpg'
      );
      preparedData.media.push({
        type: 'image',
        path: imagePath,
        url: instagramPost.media_url,
      });
    } else if (instagramPost.media_type === 'VIDEO') {
      const videoPath = await this.downloadMedia(
        instagramPost.media_url,
        postDir,
        'video_0.mp4'
      );
      preparedData.media.push({
        type: 'video',
        path: videoPath,
        url: instagramPost.media_url,
      });

      // Download thumbnail if available
      if (instagramPost.thumbnail_url) {
        const thumbPath = await this.downloadMedia(
          instagramPost.thumbnail_url,
          postDir,
          'thumbnail_0.jpg'
        );
        preparedData.media.push({
          type: 'thumbnail',
          path: thumbPath,
          url: instagramPost.thumbnail_url,
        });
      }
    } else if (instagramPost.media_type === 'CAROUSEL_ALBUM') {
      // Handle carousel posts with multiple media items
      if (instagramPost.childMedia) {
        for (let i = 0; i < instagramPost.childMedia.length; i++) {
          const child = instagramPost.childMedia[i];
          const ext = child.media_type === 'VIDEO' ? 'mp4' : 'jpg';
          const filename = `${child.media_type.toLowerCase()}_${i}.${ext}`;

          const mediaPath = await this.downloadMedia(
            child.media_url,
            postDir,
            filename
          );

          preparedData.media.push({
            type: child.media_type.toLowerCase(),
            path: mediaPath,
            url: child.media_url,
          });
        }
      }
    }

    // Save post metadata
    const metadataPath = path.join(postDir, 'post-data.json');
    await fs.writeFile(metadataPath, JSON.stringify(preparedData, null, 2));

    // Create ready-to-copy text file
    const copyTextPath = path.join(postDir, 'gbp-caption.txt');
    await fs.writeFile(copyTextPath, preparedData.caption);

    logger.info(`Post data prepared at: ${postDir}`);
    return preparedData;
  }

  /**
   * Prepare caption for Google Business Profile
   * @param {string} caption - Instagram caption
   * @returns {string} Prepared caption
   */
  prepareCaption(caption) {
    if (!caption) return '';

    // GBP has a limit of 1500 characters
    const maxLength = 1500;

    // Remove excessive hashtags (keep first 5)
    let text = caption;
    const hashtags = caption.match(/#\w+/g) || [];
    if (hashtags.length > 5) {
      const keepHashtags = hashtags.slice(0, 5);
      text = caption.replace(/#\w+/g, '').trim() + '\n\n' + keepHashtags.join(' ');
    }

    // Truncate if too long
    if (text.length > maxLength) {
      text = text.substring(0, maxLength - 3) + '...';
    }

    return text;
  }

  /**
   * Download media file from URL
   * @param {string} url - Media URL
   * @param {string} destDir - Destination directory
   * @param {string} filename - Filename
   * @returns {string} Downloaded file path
   */
  async downloadMedia(url, destDir, filename) {
    try {
      const buffer = await this.instagramService.downloadMedia(url);
      const filePath = path.join(destDir, filename);
      await fs.writeFile(filePath, buffer);
      logger.debug(`Downloaded media to: ${filePath}`);
      return filePath;
    } catch (error) {
      logger.error(`Failed to download media from ${url}:`, error.message);
      throw error;
    }
  }

  /**
   * Mark a post as posted to GBP (called manually or via dashboard)
   * @param {string} postId - Instagram post ID
   */
  async markAsPosted(postId) {
    const posts = this.stateManager.getSyncedPosts();
    const post = posts.find(p => p.instagramId === postId);

    if (post) {
      post.gbpPostId = 'manual_post';
      post.postedAt = new Date().toISOString();
      await this.stateManager.save();
      logger.info(`Post ${postId} marked as posted to GBP`);
    }
  }

  /**
   * Get pending posts (not yet posted to GBP)
   * @returns {Array} Array of pending posts
   */
  getPendingPosts() {
    const posts = this.stateManager.getSyncedPosts();
    return posts.filter(p => p.gbpPostId === 'pending_manual_post');
  }

  /**
   * Get sync statistics
   * @returns {Object} Sync statistics
   */
  getStats() {
    const syncedPosts = this.stateManager.getSyncedPosts();
    const pendingPosts = this.getPendingPosts();
    const postedPosts = syncedPosts.filter(p => p.gbpPostId !== 'pending_manual_post');
    const lastSyncTime = this.stateManager.getLastSyncTime();

    return {
      totalProcessed: syncedPosts.length,
      pendingPosts: pendingPosts.length,
      postedToGBP: postedPosts.length,
      lastSyncTime,
      recentPending: pendingPosts.slice(-10),
    };
  }
}

// Run sync if called directly
if (require.main === module) {
  const { validateConfig } = require('./config');

  (async () => {
    try {
      // Note: We don't need Google credentials for this realistic approach
      const syncManager = new RealisticSyncManager();
      await syncManager.initialize();
      await syncManager.sync();

      // Display stats
      const stats = syncManager.getStats();
      logger.info('\n=== Statistics ===');
      logger.info(`Total processed: ${stats.totalProcessed}`);
      logger.info(`Pending posts: ${stats.pendingPosts}`);
      logger.info(`Posted to GBP: ${stats.postedToGBP}`);

      process.exit(0);
    } catch (error) {
      logger.error('Fatal error:', error);
      process.exit(1);
    }
  })();
}

module.exports = RealisticSyncManager;
