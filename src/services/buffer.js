const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Buffer API Service for automatic posting to Google Business Profile
 * @see https://buffer.com/developers/api
 */
class BufferService {
  constructor(config = {}) {
    this.accessToken = config.accessToken || process.env.BUFFER_ACCESS_TOKEN;
    this.autoPublish = config.autoPublish !== undefined
      ? config.autoPublish
      : process.env.BUFFER_AUTO_PUBLISH === 'true';
    this.baseUrl = 'https://api.bufferapp.com/1';
  }

  /**
   * Get user info
   * @returns {Promise<Object>} User information
   */
  async getUser() {
    try {
      const response = await axios.get(`${this.baseUrl}/user.json`, {
        params: { access_token: this.accessToken }
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to get Buffer user:', error.message);
      throw error;
    }
  }

  /**
   * Get all Buffer profiles (social media accounts)
   * @returns {Promise<Array>} List of profiles
   */
  async getProfiles() {
    try {
      const response = await axios.get(`${this.baseUrl}/profiles.json`, {
        params: { access_token: this.accessToken }
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to get Buffer profiles:', error.message);
      throw error;
    }
  }

  /**
   * Get Google Business Profile profiles only
   * @returns {Promise<Array>} List of GBP profiles
   */
  async getGBPProfiles() {
    const profiles = await this.getProfiles();
    return profiles.filter(profile =>
      profile.service === 'googlebusiness' || profile.service === 'google'
    );
  }

  /**
   * Create a post in Buffer
   * @param {string} profileId - Buffer profile ID
   * @param {Object} postData - Post data
   * @param {string} postData.text - Post text/caption
   * @param {string|Array<string>} postData.media - Media URL(s)
   * @param {boolean} postData.now - Publish immediately (default: use service setting)
   * @param {Date} postData.scheduledAt - Schedule for later (optional)
   * @returns {Promise<Object>} Created post data
   */
  async createPost(profileId, postData) {
    try {
      const payload = {
        access_token: this.accessToken,
        profile_ids: Array.isArray(profileId) ? profileId : [profileId],
        text: postData.text || '',
        now: postData.now !== undefined ? postData.now : this.autoPublish,
      };

      // Add media
      if (postData.media) {
        if (Array.isArray(postData.media)) {
          // Multiple images (carousel)
          payload.media = {
            photo: postData.media,
          };
        } else {
          // Single image
          payload.media = {
            photo: postData.media,
          };
        }
      }

      // Schedule for later
      if (postData.scheduledAt && !payload.now) {
        payload.scheduled_at = Math.floor(postData.scheduledAt.getTime() / 1000);
      }

      // Add link (optional)
      if (postData.link) {
        payload.media = payload.media || {};
        payload.media.link = postData.link;
      }

      const response = await axios.post(
        `${this.baseUrl}/updates/create.json`,
        null,
        { params: payload }
      );

      logger.info(`Buffer post created: ${response.data.id}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to create Buffer post:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Auto-post Instagram content to Google Business Profile via Buffer
   * @param {Object} instagramPost - Instagram post data
   * @param {string} instagramPost.caption - Post caption
   * @param {string} instagramPost.media_url - Media URL
   * @param {Array} instagramPost.children - Child media for carousel
   * @param {string} instagramPost.permalink - Instagram post URL
   * @param {string} gbpProfileId - Buffer profile ID for GBP
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Created post data
   */
  async autoPostToGBP(instagramPost, gbpProfileId, options = {}) {
    try {
      logger.info(`Auto-posting to GBP via Buffer: ${instagramPost.id}`);

      // Prepare media URLs
      let mediaUrls;
      if (instagramPost.children?.data && instagramPost.children.data.length > 0) {
        // Carousel post - multiple images
        mediaUrls = instagramPost.children.data.map(child => child.media_url);
      } else {
        // Single image/video
        mediaUrls = instagramPost.media_url;
      }

      // Prepare caption
      const caption = this.formatCaption(instagramPost.caption, instagramPost.permalink);

      // Create post
      const result = await this.createPost(gbpProfileId, {
        text: caption,
        media: mediaUrls,
        now: options.now,
        scheduledAt: options.scheduledAt,
        link: options.includeInstagramLink ? instagramPost.permalink : undefined,
      });

      logger.info(`Successfully posted to GBP via Buffer: ${result.id}`);
      return result;
    } catch (error) {
      logger.error('Failed to auto-post to GBP:', error.message);
      throw error;
    }
  }

  /**
   * Format caption for GBP
   * @param {string} caption - Original caption
   * @param {string} permalink - Instagram post URL
   * @returns {string} Formatted caption
   */
  formatCaption(caption, permalink) {
    let formatted = caption || '';

    // Remove excessive hashtags (GBP best practice: max 5 hashtags)
    const hashtags = formatted.match(/#[\w\u0100-\uFFFF]+/g) || [];
    if (hashtags.length > 5) {
      // Keep only first 5 hashtags
      const keptHashtags = hashtags.slice(0, 5);
      formatted = formatted.replace(/#[\w\u0100-\uFFFF]+/g, '');
      formatted += '\n\n' + keptHashtags.join(' ');
    }

    // Add Instagram link (optional)
    if (process.env.INCLUDE_INSTAGRAM_LINK === 'true') {
      formatted += `\n\n📸 Instagram: ${permalink}`;
    }

    return formatted;
  }

  /**
   * Get post status
   * @param {string} updateId - Buffer update ID
   * @returns {Promise<Object>} Update status
   */
  async getUpdate(updateId) {
    try {
      const response = await axios.get(`${this.baseUrl}/updates/${updateId}.json`, {
        params: { access_token: this.accessToken }
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to get Buffer update:', error.message);
      throw error;
    }
  }

  /**
   * Delete a scheduled post
   * @param {string} updateId - Buffer update ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteUpdate(updateId) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/updates/${updateId}/destroy.json`,
        null,
        { params: { access_token: this.accessToken } }
      );
      logger.info(`Buffer update deleted: ${updateId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to delete Buffer update:', error.message);
      throw error;
    }
  }
}

module.exports = BufferService;
