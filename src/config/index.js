require('dotenv').config();

const config = {
  instagram: {
    accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
    businessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID,
  },
  google: {
    credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    accountId: process.env.GOOGLE_BUSINESS_ACCOUNT_ID,
    locationId: process.env.GOOGLE_BUSINESS_LOCATION_ID,
  },
  sync: {
    intervalMinutes: parseInt(process.env.SYNC_INTERVAL_MINUTES || '30', 10),
    timezone: process.env.TIMEZONE || 'Asia/Tokyo',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

// Validate required configuration
function validateConfig() {
  const required = [
    { key: 'instagram.accessToken', value: config.instagram.accessToken },
    { key: 'instagram.businessAccountId', value: config.instagram.businessAccountId },
    { key: 'google.credentials', value: config.google.credentials },
    { key: 'google.locationId', value: config.google.locationId },
  ];

  const missing = required.filter(({ value }) => !value).map(({ key }) => key);

  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
}

module.exports = { config, validateConfig };
