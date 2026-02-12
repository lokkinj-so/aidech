const puppeteer = require('puppeteer');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

/**
 * Google Business Profile Automation using Puppeteer
 *
 * ⚠️ WARNING: This approach is in a gray area of Google's Terms of Service.
 * Use at your own risk. Account suspension is possible, though unlikely with proper implementation.
 *
 * Recommended: Use Buffer API instead (see buffer.js)
 *
 * @see https://pptr.dev/
 */
class GBPAutomation {
  constructor(config = {}) {
    this.headless = config.headless !== false;
    this.slowMo = config.slowMo || 100; // Simulate human-like behavior
    this.cookiesPath = config.cookiesPath || './data/cookies.json';
    this.browser = null;
  }

  /**
   * Initialize browser with anti-detection measures
   */
  async init() {
    logger.info('Initializing Puppeteer browser...');

    this.browser = await puppeteer.launch({
      headless: this.headless,
      slowMo: this.slowMo,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--window-size=1920,1080',
      ],
    });

    logger.info('Browser initialized');
  }

  /**
   * Login to Google Business Profile
   * @param {string} email - Google account email
   * @param {string} password - Google account password
   * @returns {Promise<Page>} Logged in page
   */
  async login(email, password) {
    logger.info('Logging in to Google Business Profile...');

    const page = await this.browser.newPage();

    // Anti-detection measures
    await this.setupAntiDetection(page);

    // Try to load saved cookies
    if (await this.loadCookies(page)) {
      logger.info('Loaded saved session cookies');

      // Verify login
      await page.goto('https://business.google.com/', { waitUntil: 'networkidle2' });

      // Check if already logged in
      const isLoggedIn = await this.checkLoggedIn(page);
      if (isLoggedIn) {
        logger.info('Already logged in via saved cookies');
        return page;
      }
    }

    // Perform login
    await page.goto('https://accounts.google.com/', { waitUntil: 'networkidle2' });

    // Email input
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await this.humanType(page, 'input[type="email"]', email);
    await page.click('#identifierNext');
    await this.randomDelay(2000, 3000);

    // Password input
    await page.waitForSelector('input[type="password"]', { visible: true, timeout: 10000 });
    await this.humanType(page, 'input[type="password"]', password);
    await page.click('#passwordNext');
    await this.randomDelay(3000, 5000);

    // Save cookies
    await this.saveCookies(page);

    logger.info('Logged in successfully');
    return page;
  }

  /**
   * Create a post on Google Business Profile
   * @param {Page} page - Puppeteer page
   * @param {string} locationId - GBP location ID
   * @param {Object} postData - Post data
   * @param {string} postData.caption - Post caption
   * @param {string} postData.imagePath - Path to image file
   * @param {Array<string>} postData.imagePaths - Paths to multiple images (for carousel)
   * @returns {Promise<boolean>} Success status
   */
  async createPost(page, locationId, postData) {
    try {
      logger.info(`Creating post for location: ${locationId}`);

      // Navigate to location
      await page.goto(`https://business.google.com/locations/${locationId}`, {
        waitUntil: 'networkidle2',
      });
      await this.randomDelay(1000, 2000);

      // Click "Create post" button
      // Note: Selectors may change over time, needs maintenance
      const createButtonSelectors = [
        '[aria-label="投稿を作成"]',
        '[aria-label="Create post"]',
        'button:has-text("Create post")',
        'button:has-text("投稿を作成")',
      ];

      let createButton = null;
      for (const selector of createButtonSelectors) {
        try {
          createButton = await page.$(selector);
          if (createButton) break;
        } catch (e) {
          continue;
        }
      }

      if (!createButton) {
        throw new Error('Create post button not found');
      }

      await createButton.click();
      await this.randomDelay(1000, 2000);

      // Type caption
      const textAreaSelectors = [
        'textarea[placeholder*="What\'s new"]',
        'textarea[placeholder*="新着情報"]',
        'textarea',
      ];

      let textArea = null;
      for (const selector of textAreaSelectors) {
        try {
          textArea = await page.$(selector);
          if (textArea) break;
        } catch (e) {
          continue;
        }
      }

      if (!textArea) {
        throw new Error('Text area not found');
      }

      await this.humanType(page, textArea, postData.caption);
      await this.randomDelay(500, 1000);

      // Upload image(s)
      if (postData.imagePath || postData.imagePaths) {
        const imagePaths = postData.imagePaths || [postData.imagePath];

        const fileInput = await page.$('input[type="file"]');
        if (!fileInput) {
          throw new Error('File input not found');
        }

        // Upload all images
        for (const imagePath of imagePaths) {
          await fileInput.uploadFile(imagePath);
          await this.randomDelay(2000, 3000); // Wait for upload
        }

        logger.info(`Uploaded ${imagePaths.length} image(s)`);
      }

      // Click post button
      const postButtonSelectors = [
        'button[aria-label="投稿"]',
        'button[aria-label="Post"]',
        'button:has-text("Post")',
        'button:has-text("投稿")',
      ];

      let postButton = null;
      for (const selector of postButtonSelectors) {
        try {
          postButton = await page.$(selector);
          if (postButton) break;
        } catch (e) {
          continue;
        }
      }

      if (!postButton) {
        throw new Error('Post button not found');
      }

      await postButton.click();
      await this.randomDelay(2000, 3000);

      logger.info(`Successfully created post for location: ${locationId}`);
      return true;
    } catch (error) {
      logger.error('Failed to create GBP post:', error.message);

      // Take screenshot for debugging
      try {
        await page.screenshot({
          path: `./logs/error-${Date.now()}.png`,
          fullPage: true,
        });
      } catch (e) {
        // Ignore screenshot errors
      }

      throw error;
    }
  }

  /**
   * Setup anti-detection measures
   * @param {Page} page - Puppeteer page
   */
  async setupAntiDetection(page) {
    // Set user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Set viewport
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    });

    // Override navigator.webdriver
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });

      // Override plugins and languages
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en', 'ja'],
      });
    });

    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9,ja;q=0.8',
    });
  }

  /**
   * Type text like a human
   * @param {Page} page - Puppeteer page
   * @param {string|ElementHandle} selector - Selector or element handle
   * @param {string} text - Text to type
   */
  async humanType(page, selector, text) {
    const element = typeof selector === 'string' ? await page.$(selector) : selector;

    for (const char of text) {
      await element.type(char, {
        delay: Math.random() * 100 + 50, // 50-150ms per character
      });
    }
  }

  /**
   * Random delay between min and max milliseconds
   * @param {number} min - Minimum delay
   * @param {number} max - Maximum delay
   */
  async randomDelay(min, max) {
    const delay = Math.random() * (max - min) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Check if logged in
   * @param {Page} page - Puppeteer page
   * @returns {Promise<boolean>} True if logged in
   */
  async checkLoggedIn(page) {
    try {
      // Check for presence of elements that only appear when logged in
      const loggedInSelectors = [
        '[data-testid="profile-menu"]',
        '[aria-label="Google Account"]',
        '.gb_E', // Google account button
      ];

      for (const selector of loggedInSelectors) {
        const element = await page.$(selector);
        if (element) return true;
      }

      return false;
    } catch (e) {
      return false;
    }
  }

  /**
   * Save cookies to file
   * @param {Page} page - Puppeteer page
   */
  async saveCookies(page) {
    try {
      const cookies = await page.cookies();
      await fs.mkdir(path.dirname(this.cookiesPath), { recursive: true });
      await fs.writeFile(this.cookiesPath, JSON.stringify(cookies, null, 2));
      logger.info('Cookies saved');
    } catch (error) {
      logger.error('Failed to save cookies:', error.message);
    }
  }

  /**
   * Load cookies from file
   * @param {Page} page - Puppeteer page
   * @returns {Promise<boolean>} True if cookies loaded
   */
  async loadCookies(page) {
    try {
      const cookiesString = await fs.readFile(this.cookiesPath, 'utf8');
      const cookies = JSON.parse(cookiesString);
      await page.setCookie(...cookies);
      logger.info('Cookies loaded');
      return true;
    } catch (error) {
      logger.debug('No saved cookies found');
      return false;
    }
  }

  /**
   * Close browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      logger.info('Browser closed');
    }
  }
}

module.exports = GBPAutomation;
