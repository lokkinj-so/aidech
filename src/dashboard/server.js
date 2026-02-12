const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const RealisticSyncManager = require('../sync-realistic');
const logger = require('../utils/logger');

class DashboardServer {
  constructor(port = 3000) {
    this.port = port;
    this.syncManager = new RealisticSyncManager();
  }

  async initialize() {
    await this.syncManager.initialize();
  }

  /**
   * Start the dashboard server
   */
  async start() {
    await this.initialize();

    const server = http.createServer(async (req, res) => {
      await this.handleRequest(req, res);
    });

    server.listen(this.port, () => {
      logger.info(`📊 Dashboard server running at http://localhost:${this.port}`);
      logger.info(`Open your browser to view pending posts`);
    });

    return server;
  }

  /**
   * Handle HTTP requests
   */
  async handleRequest(req, res) {
    const url = new URL(req.url, `http://localhost:${this.port}`);

    try {
      if (url.pathname === '/' || url.pathname === '/index.html') {
        await this.serveDashboard(res);
      } else if (url.pathname === '/api/stats') {
        await this.serveStats(res);
      } else if (url.pathname === '/api/pending') {
        await this.servePendingPosts(res);
      } else if (url.pathname.startsWith('/api/mark-posted/')) {
        await this.markPostAsPosted(req, res, url);
      } else if (url.pathname.startsWith('/media/')) {
        await this.serveMedia(res, url.pathname);
      } else {
        this.send404(res);
      }
    } catch (error) {
      logger.error('Request error:', error);
      this.sendError(res, error);
    }
  }

  /**
   * Serve main dashboard HTML
   */
  async serveDashboard(res) {
    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Instagram to GBP Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            background: #f5f5f5;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        h1 { font-size: 28px; margin-bottom: 10px; }
        .subtitle { opacity: 0.9; font-size: 14px; }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-value {
            font-size: 32px;
            font-weight: bold;
            color: #667eea;
        }
        .stat-label {
            color: #666;
            font-size: 14px;
            margin-top: 5px;
        }
        .posts {
            display: grid;
            gap: 20px;
        }
        .post-card {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .post-header {
            padding: 15px;
            background: #f9f9f9;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .post-id {
            font-family: monospace;
            font-size: 12px;
            color: #666;
        }
        .post-type {
            background: #667eea;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
        }
        .post-body {
            display: grid;
            grid-template-columns: 300px 1fr;
            gap: 20px;
            padding: 20px;
        }
        .post-media {
            width: 100%;
            border-radius: 8px;
        }
        .post-content {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        .caption {
            background: #f9f9f9;
            padding: 15px;
            border-radius: 8px;
            white-space: pre-wrap;
            font-size: 14px;
            line-height: 1.6;
            max-height: 200px;
            overflow-y: auto;
        }
        .actions {
            display: flex;
            gap: 10px;
        }
        button {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
        }
        .btn-primary {
            background: #667eea;
            color: white;
        }
        .btn-primary:hover {
            background: #5568d3;
        }
        .btn-secondary {
            background: #e0e0e0;
            color: #333;
        }
        .btn-secondary:hover {
            background: #d0d0d0;
        }
        .btn-success {
            background: #10b981;
            color: white;
        }
        .btn-success:hover {
            background: #059669;
        }
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            background: white;
            border-radius: 8px;
        }
        .empty-state h2 {
            font-size: 24px;
            margin-bottom: 10px;
            color: #666;
        }
        @media (max-width: 768px) {
            .post-body {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📸 Instagram to GBP Dashboard</h1>
            <p class="subtitle">準備済みの投稿を確認して、Google Business Profileに投稿しましょう</p>
        </header>

        <div class="stats" id="stats">
            <div class="stat-card">
                <div class="stat-value" id="stat-pending">-</div>
                <div class="stat-label">保留中の投稿</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="stat-posted">-</div>
                <div class="stat-label">投稿済み</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="stat-total">-</div>
                <div class="stat-label">処理済み合計</div>
            </div>
        </div>

        <div id="posts-container">
            <div class="empty-state">
                <h2>読み込み中...</h2>
            </div>
        </div>
    </div>

    <script>
        async function loadStats() {
            const res = await fetch('/api/stats');
            const data = await res.json();
            document.getElementById('stat-pending').textContent = data.pendingPosts;
            document.getElementById('stat-posted').textContent = data.postedToGBP;
            document.getElementById('stat-total').textContent = data.totalProcessed;
        }

        async function loadPendingPosts() {
            const res = await fetch('/api/pending');
            const posts = await res.json();

            const container = document.getElementById('posts-container');

            if (posts.length === 0) {
                container.innerHTML = \`
                    <div class="empty-state">
                        <h2>✨ すべての投稿が完了しました</h2>
                        <p>新しいInstagram投稿が検出されると、ここに表示されます。</p>
                    </div>
                \`;
                return;
            }

            container.innerHTML = posts.map(post => \`
                <div class="post-card" data-post-id="\${post.instagramId}">
                    <div class="post-header">
                        <span class="post-id">\${post.instagramId}</span>
                        <span class="post-type">保留中</span>
                    </div>
                    <div class="post-body">
                        <div>
                            <p style="font-size: 12px; color: #666; margin-bottom: 10px;">
                                投稿日時: \${new Date(post.syncedAt).toLocaleString('ja-JP')}
                            </p>
                            <p style="font-size: 12px; color: #999; margin-bottom: 10px;">
                                ダウンロード先: <code>\${post.localPath || 'N/A'}</code>
                            </p>
                        </div>
                        <div class="post-content">
                            <div class="caption">\${post.caption || 'キャプションなし'}</div>
                            <div class="actions">
                                <button class="btn-success" onclick="markAsPosted('\${post.instagramId}')">
                                    ✓ GBPに投稿完了
                                </button>
                                <button class="btn-secondary" onclick="openFolder('\${post.instagramId}')">
                                    📂 フォルダを開く
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            \`).join('');
        }

        async function markAsPosted(postId) {
            if (!confirm('この投稿をGBPに投稿済みとしてマークしますか？')) {
                return;
            }

            const res = await fetch(\`/api/mark-posted/\${postId}\`, { method: 'POST' });
            if (res.ok) {
                const card = document.querySelector(\`[data-post-id="\${postId}"]\`);
                card.style.transition = 'opacity 0.3s';
                card.style.opacity = '0';
                setTimeout(() => {
                    loadStats();
                    loadPendingPosts();
                }, 300);
            } else {
                alert('エラーが発生しました');
            }
        }

        function openFolder(postId) {
            alert('フォルダパス:\\ndownloads/posts/' + postId + '\\n\\nこのフォルダに画像とキャプションが保存されています。');
        }

        // Initial load
        loadStats();
        loadPendingPosts();

        // Refresh every 30 seconds
        setInterval(() => {
            loadStats();
            loadPendingPosts();
        }, 30000);
    </script>
</body>
</html>
    `;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  }

  /**
   * Serve statistics API
   */
  async serveStats(res) {
    const stats = this.syncManager.getStats();
    this.sendJSON(res, stats);
  }

  /**
   * Serve pending posts API
   */
  async servePendingPosts(res) {
    const pending = this.syncManager.getPendingPosts();

    // Try to enrich with post data
    const enrichedPosts = await Promise.all(
      pending.map(async (post) => {
        try {
          const postDataPath = path.join(
            this.syncManager.downloadPath,
            'posts',
            post.instagramId,
            'post-data.json'
          );
          const postData = JSON.parse(await fs.readFile(postDataPath, 'utf8'));
          return {
            ...post,
            caption: postData.caption,
            localPath: postData.localPath,
            mediaType: postData.mediaType,
          };
        } catch (error) {
          return post;
        }
      })
    );

    this.sendJSON(res, enrichedPosts);
  }

  /**
   * Mark post as posted to GBP
   */
  async markPostAsPosted(req, res, url) {
    if (req.method !== 'POST') {
      this.send404(res);
      return;
    }

    const postId = url.pathname.split('/').pop();
    await this.syncManager.markAsPosted(postId);

    this.sendJSON(res, { success: true, postId });
  }

  /**
   * Serve media files
   */
  async serveMedia(res, pathname) {
    try {
      const filePath = path.join(__dirname, '../..', pathname);
      const content = await fs.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();

      const contentTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.mp4': 'video/mp4',
      };

      const contentType = contentTypes[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (error) {
      this.send404(res);
    }
  }

  sendJSON(res, data) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
  }

  send404(res) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }

  sendError(res, error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

// Run server if called directly
if (require.main === module) {
  const port = process.env.DASHBOARD_PORT || 3000;
  const server = new DashboardServer(port);
  server.start().catch(error => {
    logger.error('Failed to start dashboard:', error);
    process.exit(1);
  });
}

module.exports = DashboardServer;
