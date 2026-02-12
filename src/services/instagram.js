const axios = require('axios');
const { config } = require('../config');

class InstagramService {
  constructor() {
    this.baseUrl = 'https://graph.facebook.com/v18.0';
    this.accessToken = config.instagram.accessToken;
    this.businessAccountId = config.instagram.businessAccountId;
  }

  /**
   * Get recent media posts from Instagram
   * @param {number} limit - Number of posts to retrieve
   * @returns {Promise<Array>} Array of media posts
   */
  async getRecentPosts(limit = 10) {
    try {
      const url = `${this.baseUrl}/${this.businessAccountId}/media`;
      const response = await axios.get(url, {
        params: {
          fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username',
          access_token: this.accessToken,
          limit: limit,
        },
      });

      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching Instagram posts:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get a specific media post by ID
   * @param {string} mediaId - Instagram media ID
   * @returns {Promise<Object>} Media post details
   */
  async getPost(mediaId) {
    try {
      const url = `${this.baseUrl}/${mediaId}`;
      const response = await axios.get(url, {
        params: {
          fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username,children',
          access_token: this.accessToken,
        },
      });

      // If it's a carousel, get child media
      if (response.data.children) {
        const children = await this.getCarouselChildren(response.data.children.data);
        response.data.childMedia = children;
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching Instagram post:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get carousel children media
   * @param {Array} children - Array of child media references
   * @returns {Promise<Array>} Array of child media details
   */
  async getCarouselChildren(children) {
    const promises = children.map(child =>
      axios.get(`${this.baseUrl}/${child.id}`, {
        params: {
          fields: 'id,media_type,media_url,thumbnail_url',
          access_token: this.accessToken,
        },
      })
    );

    const results = await Promise.all(promises);
    return results.map(res => res.data);
  }

  /**
   * Download media file from URL
   * @param {string} url - Media URL
   * @returns {Promise<Buffer>} Media file buffer
   */
  async downloadMedia(url) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    } catch (error) {
      console.error('Error downloading media:', error.message);
      throw error;
    }
  }
}

module.exports = InstagramService;
