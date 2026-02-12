const cron = require('node-cron');
const { validateConfig, config } = require('./config');
const SyncManager = require('./sync');
const logger = require('./utils/logger');

class Application {
  constructor() {
    this.syncManager = new SyncManager();
    this.cronJob = null;
  }

  /**
   * Initialize the application
   */
  async initialize() {
    try {
      logger.info('Starting Instagram to GBP Automation...');

      // Validate configuration
      validateConfig();
      logger.info('Configuration validated');

      // Initialize sync manager
      await this.syncManager.initialize();

      logger.info('Application initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize application:', error.message);
      throw error;
    }
  }

  /**
   * Start the scheduler
   */
  start() {
    // Calculate cron expression based on interval
    const intervalMinutes = config.sync.intervalMinutes;
    const cronExpression = `*/${intervalMinutes} * * * *`;

    logger.info(`Starting scheduler with interval: ${intervalMinutes} minutes`);
    logger.info(`Cron expression: ${cronExpression}`);

    // Run initial sync
    this.runSync();

    // Schedule periodic syncs
    this.cronJob = cron.schedule(cronExpression, () => {
      this.runSync();
    });

    logger.info('Scheduler started successfully');
    logger.info('Press Ctrl+C to stop');
  }

  /**
   * Run sync operation
   */
  async runSync() {
    try {
      logger.info('='.repeat(50));
      logger.info('Starting scheduled sync...');

      const result = await this.syncManager.sync();

      logger.info('Scheduled sync completed');
      logger.info(`Result: ${result.synced} synced, ${result.skipped} skipped, ${result.errors} errors`);
      logger.info('='.repeat(50));
    } catch (error) {
      logger.error('Scheduled sync failed:', error.message);
    }
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.info('Scheduler stopped');
    }
  }

  /**
   * Display current statistics
   */
  displayStats() {
    const stats = this.syncManager.getStats();
    logger.info('Current Statistics:');
    logger.info(`Total posts synced: ${stats.totalSynced}`);
    logger.info(`Last sync: ${stats.lastSyncTime || 'Never'}`);
  }
}

// Run application if called directly
if (require.main === module) {
  const app = new Application();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    app.stop();
    app.displayStats();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    app.stop();
    app.displayStats();
    process.exit(0);
  });

  // Start application
  (async () => {
    try {
      await app.initialize();
      app.start();
    } catch (error) {
      logger.error('Fatal error:', error);
      process.exit(1);
    }
  })();
}

module.exports = Application;
