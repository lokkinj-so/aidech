const fs = require('fs').promises;
const path = require('path');

class StateManager {
  constructor() {
    this.stateFile = path.join(__dirname, '../../data/sync-state.json');
    this.state = {
      lastSyncTime: null,
      syncedPosts: [],
    };
  }

  /**
   * Load state from file
   */
  async load() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.stateFile);
      await fs.mkdir(dataDir, { recursive: true });

      // Try to read existing state
      const data = await fs.readFile(this.stateFile, 'utf8');
      this.state = JSON.parse(data);
      console.log('State loaded successfully');
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('No existing state file, starting fresh');
        await this.save();
      } else {
        console.error('Error loading state:', error.message);
      }
    }
  }

  /**
   * Save state to file
   */
  async save() {
    try {
      await fs.writeFile(this.stateFile, JSON.stringify(this.state, null, 2));
      console.log('State saved successfully');
    } catch (error) {
      console.error('Error saving state:', error.message);
    }
  }

  /**
   * Check if a post has been synced
   * @param {string} postId - Instagram post ID
   * @returns {boolean} True if post has been synced
   */
  isPostSynced(postId) {
    return this.state.syncedPosts.some(post => post.instagramId === postId);
  }

  /**
   * Mark a post as synced
   * @param {string} instagramId - Instagram post ID
   * @param {string} gbpPostId - Google Business Profile post ID
   * @param {string} timestamp - Sync timestamp
   */
  async markPostSynced(instagramId, gbpPostId, timestamp) {
    this.state.syncedPosts.push({
      instagramId,
      gbpPostId,
      syncedAt: timestamp,
    });
    this.state.lastSyncTime = new Date().toISOString();
    await this.save();
  }

  /**
   * Get last sync time
   * @returns {string|null} Last sync timestamp
   */
  getLastSyncTime() {
    return this.state.lastSyncTime;
  }

  /**
   * Get all synced posts
   * @returns {Array} Array of synced posts
   */
  getSyncedPosts() {
    return this.state.syncedPosts;
  }
}

module.exports = StateManager;
