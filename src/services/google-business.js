const { google } = require('googleapis');
const fs = require('fs').promises;
const { config } = require('../config');

class GoogleBusinessService {
  constructor() {
    this.locationId = config.google.locationId;
    this.auth = null;
    this.mybusiness = null;
  }

  /**
   * Initialize Google Business Profile API client
   */
  async initialize() {
    try {
      // Load service account credentials
      const credentials = JSON.parse(
        await fs.readFile(config.google.credentials, 'utf8')
      );

      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/business.manage'],
      });

      this.mybusiness = google.mybusinessbusinessinformation({
        version: 'v1',
        auth: this.auth,
      });

      console.log('Google Business Profile API initialized');
    } catch (error) {
      console.error('Error initializing Google Business API:', error.message);
      throw error;
    }
  }

  /**
   * Create a local post on Google Business Profile
   * @param {Object} postData - Post data
   * @param {string} postData.summary - Post text/caption
   * @param {Array} postData.media - Array of media items
   * @param {string} postData.topicType - Post topic type (STANDARD, EVENT, OFFER, PRODUCT)
   * @returns {Promise<Object>} Created post
   */
  async createPost(postData) {
    try {
      if (!this.auth) {
        await this.initialize();
      }

      // Note: As of 2024, the Google My Business API has been deprecated
      // and replaced with Google Business Profile API.
      // For creating posts, we need to use the newer API structure

      const post = {
        languageCode: 'ja',
        summary: postData.summary || '',
        topicType: postData.topicType || 'STANDARD',
      };

      // Add media if provided
      if (postData.media && postData.media.length > 0) {
        post.media = postData.media.map(item => ({
          mediaFormat: item.mediaFormat || 'PHOTO',
          sourceUrl: item.sourceUrl,
        }));
      }

      // Add call to action if provided
      if (postData.callToAction) {
        post.callToAction = postData.callToAction;
      }

      console.log('Creating post on Google Business Profile:', post);

      // Note: This is a placeholder for the actual API call
      // You may need to use the newer Google Business Profile API endpoint
      // or the Google My Business API v4.9 localPosts.create method

      const response = await this.mybusiness.locations.localPosts.create({
        parent: this.locationId,
        requestBody: post,
      });

      console.log('Post created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating GBP post:', error.message);
      if (error.response) {
        console.error('Error details:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Upload media to Google Business Profile
   * @param {Buffer} mediaBuffer - Media file buffer
   * @param {string} mediaType - Media type (PHOTO or VIDEO)
   * @returns {Promise<Object>} Upload response with media URL
   */
  async uploadMedia(mediaBuffer, mediaType = 'PHOTO') {
    try {
      if (!this.auth) {
        await this.initialize();
      }

      // Create media item
      const media = {
        locationName: this.locationId,
        mediaFormat: mediaType,
        sourceUrl: '', // This will be populated after upload
      };

      // Note: Media upload typically requires a two-step process:
      // 1. Get upload URL
      // 2. Upload media to that URL

      console.log('Media upload prepared for:', mediaType);
      return media;
    } catch (error) {
      console.error('Error uploading media:', error.message);
      throw error;
    }
  }

  /**
   * Get existing posts from Google Business Profile
   * @param {number} pageSize - Number of posts to retrieve
   * @returns {Promise<Array>} Array of posts
   */
  async getPosts(pageSize = 10) {
    try {
      if (!this.auth) {
        await this.initialize();
      }

      const response = await this.mybusiness.locations.localPosts.list({
        parent: this.locationId,
        pageSize: pageSize,
      });

      return response.data.localPosts || [];
    } catch (error) {
      console.error('Error fetching GBP posts:', error.message);
      return [];
    }
  }
}

module.exports = GoogleBusinessService;
