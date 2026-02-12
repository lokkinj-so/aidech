const axios = require('axios');
const logger = require('../utils/logger');

class NotificationService {
  constructor(config = {}) {
    this.email = config.email || process.env.NOTIFICATION_EMAIL;
    this.slackWebhook = config.slackWebhook || process.env.SLACK_WEBHOOK_URL;
    this.lineToken = config.lineToken || process.env.LINE_NOTIFY_TOKEN;
    this.zapierWebhook = config.zapierWebhook || process.env.ZAPIER_WEBHOOK_URL;
    this.dashboardUrl = config.dashboardUrl || process.env.DASHBOARD_URL || 'http://localhost:3000';
  }

  /**
   * Send notification about new Instagram post
   * @param {Object} post - Instagram post data
   * @param {string} downloadPath - Path to downloaded media
   */
  async notifyNewPost(post, downloadPath) {
    const message = this.formatMessage(post, downloadPath);

    const notifications = [];

    // Send to all configured channels
    if (this.slackWebhook) {
      notifications.push(this.sendToSlack(message, post));
    }

    if (this.lineToken) {
      notifications.push(this.sendToLine(message));
    }

    if (this.zapierWebhook) {
      notifications.push(this.sendToZapier(message, post));
    }

    if (this.email) {
      notifications.push(this.sendEmail(message, post));
    }

    // If no notification channels configured, just log
    if (notifications.length === 0) {
      logger.warn('No notification channels configured');
      logger.info('New post ready:', message);
      return;
    }

    const results = await Promise.allSettled(notifications);

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        logger.info(`Notification ${index + 1} sent successfully`);
      } else {
        logger.error(`Notification ${index + 1} failed:`, result.reason);
      }
    });
  }

  /**
   * Format notification message
   * @param {Object} post - Instagram post data
   * @param {string} downloadPath - Path to downloaded media
   * @returns {Object} Formatted message
   */
  formatMessage(post, downloadPath) {
    const caption = post.caption || 'No caption';
    const truncatedCaption = caption.length > 200
      ? caption.substring(0, 197) + '...'
      : caption;

    return {
      title: '📸 新しいInstagram投稿が検出されました',
      postId: post.id,
      mediaType: post.media_type,
      caption: truncatedCaption,
      fullCaption: caption,
      permalink: post.permalink,
      timestamp: post.timestamp,
      downloadPath: downloadPath,
      dashboardUrl: `${this.dashboardUrl}/posts/${post.id}`,
    };
  }

  /**
   * Send notification to Slack
   * @param {Object} message - Formatted message
   * @param {Object} post - Original post data
   */
  async sendToSlack(message, post) {
    try {
      const blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: message.title,
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*投稿ID:*\n${message.postId}`,
            },
            {
              type: 'mrkdwn',
              text: `*メディアタイプ:*\n${message.mediaType}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*キャプション:*\n${message.caption}`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '📋 ダッシュボードで確認',
                emoji: true,
              },
              url: message.dashboardUrl,
              style: 'primary',
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '🔗 Instagram投稿を見る',
                emoji: true,
              },
              url: message.permalink,
            },
          ],
        },
      ];

      // Add image preview if available
      if (post.media_url && post.media_type === 'IMAGE') {
        blocks.push({
          type: 'image',
          image_url: post.media_url,
          alt_text: 'Instagram post image',
        });
      }

      await axios.post(this.slackWebhook, {
        blocks: blocks,
        text: message.title, // Fallback text
      });

      logger.info('Slack notification sent');
    } catch (error) {
      logger.error('Failed to send Slack notification:', error.message);
      throw error;
    }
  }

  /**
   * Send notification to LINE
   * @param {Object} message - Formatted message
   */
  async sendToLine(message) {
    try {
      const text = `
${message.title}

📝 キャプション:
${message.caption}

🔗 Instagram: ${message.permalink}
📋 ダッシュボード: ${message.dashboardUrl}
      `.trim();

      await axios.post(
        'https://notify-api.line.me/api/notify',
        `message=${encodeURIComponent(text)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${this.lineToken}`,
          },
        }
      );

      logger.info('LINE notification sent');
    } catch (error) {
      logger.error('Failed to send LINE notification:', error.message);
      throw error;
    }
  }

  /**
   * Send notification to Zapier
   * @param {Object} message - Formatted message
   * @param {Object} post - Original post data
   */
  async sendToZapier(message, post) {
    try {
      const payload = {
        event: 'new_instagram_post',
        post_id: post.id,
        caption: post.caption || '',
        formatted_caption: message.fullCaption,
        media_type: post.media_type,
        media_url: post.media_url,
        thumbnail_url: post.thumbnail_url || '',
        permalink: post.permalink,
        timestamp: post.timestamp,
        username: post.username || '',
        download_path: message.downloadPath,
        dashboard_url: message.dashboardUrl,
      };

      // Add carousel media if available
      if (post.childMedia && post.childMedia.length > 0) {
        payload.media_urls = post.childMedia.map(child => child.media_url);
        payload.media_count = post.childMedia.length;
      }

      await axios.post(this.zapierWebhook, payload);

      logger.info('Zapier webhook sent');
    } catch (error) {
      logger.error('Failed to send Zapier webhook:', error.message);
      throw error;
    }
  }

  /**
   * Send email notification (placeholder - requires SMTP setup)
   * @param {Object} message - Formatted message
   * @param {Object} post - Original post data
   */
  async sendEmail(message, post) {
    // This is a placeholder. In production, you would use:
    // - nodemailer with SMTP
    // - SendGrid API
    // - AWS SES
    // - Other email service

    logger.info('Email notification (placeholder):', {
      to: this.email,
      subject: message.title,
      body: `
        新しいInstagram投稿が検出されました

        投稿ID: ${message.postId}
        メディアタイプ: ${message.mediaType}

        キャプション:
        ${message.fullCaption}

        Instagram投稿: ${message.permalink}
        ダッシュボード: ${message.dashboardUrl}
      `,
    });

    // TODO: Implement actual email sending
    logger.warn('Email sending not implemented yet. Configure SMTP or email service.');
  }

  /**
   * Send summary notification
   * @param {Object} summary - Sync summary
   */
  async notifySummary(summary) {
    if (!this.slackWebhook && !this.lineToken) {
      return;
    }

    const message = `
📊 同期サマリー

✅ 新規投稿: ${summary.newPosts}件
⏭️ スキップ: ${summary.skipped}件
❌ エラー: ${summary.errors}件
⏰ 実行時刻: ${new Date().toLocaleString('ja-JP')}
    `.trim();

    if (this.slackWebhook) {
      try {
        await axios.post(this.slackWebhook, { text: message });
      } catch (error) {
        logger.error('Failed to send Slack summary:', error.message);
      }
    }

    if (this.lineToken) {
      try {
        await axios.post(
          'https://notify-api.line.me/api/notify',
          `message=${encodeURIComponent(message)}`,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Bearer ${this.lineToken}`,
            },
          }
        );
      } catch (error) {
        logger.error('Failed to send LINE summary:', error.message);
      }
    }
  }
}

module.exports = NotificationService;
