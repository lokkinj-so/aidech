# 実装ガイド - エンジニア向け

> Instagram投稿を各種ポータルサイト（GBP、ホットペッパー、食べログ等）に自動投稿するシステムの実装仕様

---

## 📋 目次

1. [システム概要](#システム概要)
2. [全体アーキテクチャ](#全体アーキテクチャ)
3. [データフロー](#データフロー)
4. [実装すべき機能](#実装すべき機能)
5. [API連携仕様](#api連携仕様)
6. [LINE通知システム統合](#line通知システム統合)
7. [マルチポータル投稿](#マルチポータル投稿)
8. [開発タスク一覧](#開発タスク一覧)

---

## 🎯 システム概要

### 目的

**Instagram投稿を検知し、複数のポータルサイトに自動投稿する**

### 対象ポータルサイト

- ✅ Google Business Profile (GBP/MEO)
- ✅ ホットペッパーグルメ/ビューティー
- ✅ 食べログ
- ✅ ぐるなび
- ✅ Retty
- ✅ エキテン
- ✅ Yahoo!ロコ
- ✅ その他、API/自動化対応可能なポータル

### 核心機能

```
Instagram投稿
    ↓
[自動検知]
    ↓
[画像・動画ダウンロード]
    ↓
[テキスト整形]
    ↓
[マルチポータル自動投稿] ← ★これを実装
    ├─ GBP
    ├─ ホットペッパー
    ├─ 食べログ
    ├─ ぐるなび
    ├─ Retty
    └─ その他
    ↓
[LINE通知]（あなたのMEO×LINEシステムと統合）
```

---

## 🏗️ 全体アーキテクチャ

### システム構成図

```
┌─────────────────────────────────────────────────────────────┐
│                        クライアント企業                          │
│                     (Instagramアカウント)                       │
└────────────────────────┬────────────────────────────────────┘
                         │ Instagram投稿
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   Instagram Graph API                        │
│                  (投稿検知・メディア取得)                        │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                      同期エンジン (Node.js)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. Instagram投稿検知                                    │   │
│  │ 2. メディアダウンロード                                  │   │
│  │ 3. テキスト整形・ハッシュタグ処理                          │   │
│  │ 4. マルチポータル投稿エンジン ★NEW                        │   │
│  │ 5. LINE通知システム統合                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         ↓
        ┌────────────────┴───────────────┐
        ↓                                ↓
┌───────────────┐              ┌──────────────────────┐
│ ポータル投稿   │              │ あなたのMEO×LINE      │
│ エンジン       │              │ システム              │
└───────┬───────┘              └──────────────────────┘
        │
        ├─→ GBP (Buffer API / Puppeteer)
        ├─→ ホットペッパー (Puppeteer)
        ├─→ 食べログ (Puppeteer)
        ├─→ ぐるなび (API / Puppeteer)
        ├─→ Retty (Puppeteer)
        └─→ その他
```

---

## 📊 データフロー

### 1. Instagram投稿検知フロー

```javascript
// src/services/instagram.js

class InstagramService {
  async fetchNewPosts(accountId, accessToken) {
    // 1. Instagram Graph APIから最新投稿を取得
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${accountId}/media`,
      {
        params: {
          fields: 'id,caption,media_type,media_url,permalink,timestamp',
          access_token: accessToken
        }
      }
    );

    // 2. 前回取得時刻以降の投稿のみフィルタ
    const newPosts = response.data.data.filter(post => {
      return new Date(post.timestamp) > this.lastSyncTime;
    });

    return newPosts;
  }

  async downloadMedia(post) {
    // 3. 画像・動画をダウンロード
    const mediaPath = `downloads/posts/${post.id}/`;
    await fs.mkdir(mediaPath, { recursive: true });

    if (post.media_type === 'IMAGE') {
      await this.downloadImage(post.media_url, `${mediaPath}image.jpg`);
    } else if (post.media_type === 'VIDEO') {
      await this.downloadVideo(post.media_url, `${mediaPath}video.mp4`);
    } else if (post.media_type === 'CAROUSEL_ALBUM') {
      // 複数画像の場合
      const children = await this.fetchCarouselChildren(post.id);
      for (let i = 0; i < children.length; i++) {
        await this.downloadImage(children[i].media_url, `${mediaPath}image_${i}.jpg`);
      }
    }

    return mediaPath;
  }
}
```

---

### 2. テキスト整形フロー

```javascript
// src/services/text-formatter.js

class TextFormatter {
  formatForPortal(caption, portalType) {
    switch (portalType) {
      case 'gbp':
        return this.formatForGBP(caption);
      case 'hotpepper':
        return this.formatForHotpepper(caption);
      case 'tabelog':
        return this.formatForTabelog(caption);
      case 'gurunavi':
        return this.formatForGurunavi(caption);
      case 'retty':
        return this.formatForRetty(caption);
      default:
        return caption;
    }
  }

  formatForGBP(caption) {
    // GBP用: ハッシュタグを維持、絵文字OK、1500文字以内
    return caption.substring(0, 1500);
  }

  formatForHotpepper(caption) {
    // ホットペッパー用: ハッシュタグ削除、絵文字NG、400文字以内
    return caption
      .replace(/#\S+/g, '')  // ハッシュタグ削除
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '')  // 絵文字削除
      .substring(0, 400)
      .trim();
  }

  formatForTabelog(caption) {
    // 食べログ用: ハッシュタグ削除、絵文字一部OK、1000文字以内
    return caption
      .replace(/#\S+/g, '')
      .substring(0, 1000)
      .trim();
  }

  formatForGurunavi(caption) {
    // ぐるなび用: ハッシュタグ削除、絵文字NG、500文字以内
    return caption
      .replace(/#\S+/g, '')
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
      .substring(0, 500)
      .trim();
  }

  formatForRetty(caption) {
    // Retty用: ハッシュタグOK、絵文字OK、2000文字以内
    return caption.substring(0, 2000);
  }
}
```

---

### 3. マルチポータル投稿エンジン ★核心部分

```javascript
// src/services/multi-portal-engine.js

class MultiPortalEngine {
  constructor(config) {
    this.config = config;
    this.portalHandlers = {
      gbp: new GBPHandler(),
      hotpepper: new HotpepperHandler(),
      tabelog: new TabelogHandler(),
      gurunavi: new GurunaviHandler(),
      retty: new RettyHandler()
    };
  }

  /**
   * メインエントリーポイント: Instagram投稿を全ポータルに投稿
   */
  async postToAllPortals(instagramPost, clientConfig) {
    const results = [];

    // クライアント設定で有効なポータルのみ処理
    const enabledPortals = clientConfig.enabled_portals || ['gbp'];

    for (const portalType of enabledPortals) {
      try {
        console.log(`[${portalType}] 投稿開始...`);

        const handler = this.portalHandlers[portalType];
        const result = await handler.post(instagramPost, clientConfig);

        results.push({
          portal: portalType,
          status: 'success',
          post_id: result.postId,
          url: result.url
        });

        console.log(`[${portalType}] 投稿成功: ${result.url}`);
      } catch (error) {
        console.error(`[${portalType}] 投稿失敗:`, error);
        results.push({
          portal: portalType,
          status: 'error',
          error: error.message
        });
      }

      // レート制限対策: ポータル間で1秒待機
      await this.sleep(1000);
    }

    return results;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## 🔌 API連携仕様

### 1. GBP (Google Business Profile)

#### オプションA: Buffer API（推奨・安全）

```javascript
// src/services/portals/gbp-buffer.js

class GBPHandler {
  async post(instagramPost, clientConfig) {
    const bufferProfileId = clientConfig.buffer_profile_id;
    const accessToken = process.env.BUFFER_ACCESS_TOKEN;

    // Buffer APIで投稿作成
    const response = await axios.post(
      `https://api.bufferapp.com/1/updates/create.json`,
      {
        profile_ids: [bufferProfileId],
        text: instagramPost.formattedCaption,
        media: {
          photo: instagramPost.mediaUrls[0]  // 画像URL
        },
        now: true  // 即座に投稿
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    return {
      postId: response.data.updates[0].id,
      url: `https://www.google.com/maps/place/?q=place_id:${clientConfig.gbp_place_id}`
    };
  }
}
```

#### オプションB: Puppeteer（低コスト）

```javascript
// src/services/portals/gbp-puppeteer.js

class GBPPuppeteerHandler {
  async post(instagramPost, clientConfig) {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    try {
      // 1. GBPにログイン
      await this.login(page, clientConfig.google_email, clientConfig.google_password);

      // 2. ビジネスプロフィール選択
      await this.selectBusiness(page, clientConfig.business_name);

      // 3. 投稿作成
      await page.click('[aria-label="投稿を作成"]');
      await page.type('textarea[aria-label="新しい投稿を作成"]', instagramPost.formattedCaption);

      // 4. 画像アップロード
      const inputFile = await page.$('input[type="file"]');
      await inputFile.uploadFile(instagramPost.mediaPath);

      // 5. 投稿
      await page.click('button[aria-label="公開"]');
      await page.waitForSelector('.success-message');

      return {
        postId: 'gbp-' + Date.now(),
        url: `https://business.google.com/`
      };
    } finally {
      await browser.close();
    }
  }

  async login(page, email, password) {
    await page.goto('https://accounts.google.com/');
    await page.type('input[type="email"]', email);
    await page.click('#identifierNext');
    await page.waitForTimeout(2000);
    await page.type('input[type="password"]', password);
    await page.click('#passwordNext');
    await page.waitForNavigation();
  }

  async selectBusiness(page, businessName) {
    await page.goto('https://business.google.com/');
    await page.waitForSelector(`[aria-label="${businessName}"]`);
    await page.click(`[aria-label="${businessName}"]`);
  }
}
```

---

### 2. ホットペッパー（グルメ/ビューティー）

```javascript
// src/services/portals/hotpepper.js

class HotpepperHandler {
  async post(instagramPost, clientConfig) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
      // 1. ログイン
      await page.goto('https://yoyaku.hotpepper.jp/login');
      await page.type('#login_id', clientConfig.hotpepper_id);
      await page.type('#password', clientConfig.hotpepper_password);
      await page.click('button[type="submit"]');
      await page.waitForNavigation();

      // 2. 店舗選択
      await page.goto(`https://yoyaku.hotpepper.jp/store/${clientConfig.hotpepper_store_id}/`);

      // 3. お知らせ投稿
      await page.click('a[href*="news/create"]');

      // 4. タイトル入力
      const title = instagramPost.caption.substring(0, 50);
      await page.type('input[name="title"]', title);

      // 5. 本文入力（ハッシュタグ・絵文字削除済み）
      await page.type('textarea[name="body"]', instagramPost.formattedCaption);

      // 6. 画像アップロード
      const inputFile = await page.$('input[type="file"]');
      await inputFile.uploadFile(instagramPost.mediaPath);

      // 7. 公開
      await page.click('button[name="publish"]');
      await page.waitForSelector('.success');

      return {
        postId: 'hotpepper-' + Date.now(),
        url: `https://www.hotpepper.jp/str${clientConfig.hotpepper_store_id}/`
      };
    } finally {
      await browser.close();
    }
  }
}
```

---

### 3. 食べログ

```javascript
// src/services/portals/tabelog.js

class TabelogHandler {
  async post(instagramPost, clientConfig) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
      // 1. 店舗管理画面ログイン
      await page.goto('https://owner.tabelog.com/owner_account/login');
      await page.type('input[name="account[login_id]"]', clientConfig.tabelog_id);
      await page.type('input[name="account[password]"]', clientConfig.tabelog_password);
      await page.click('button[type="submit"]');
      await page.waitForNavigation();

      // 2. PR情報投稿
      await page.goto('https://owner.tabelog.com/owner/pr_info/new');

      // 3. タイトル・本文入力
      await page.type('input[name="pr_info[title]"]', instagramPost.caption.substring(0, 30));
      await page.type('textarea[name="pr_info[body]"]', instagramPost.formattedCaption);

      // 4. 画像アップロード（最大5枚）
      const inputFile = await page.$('input[type="file"]');
      await inputFile.uploadFile(instagramPost.mediaPath);

      // 5. 公開
      await page.click('button[value="publish"]');
      await page.waitForSelector('.alert-success');

      return {
        postId: 'tabelog-' + Date.now(),
        url: `https://tabelog.com/${clientConfig.tabelog_restaurant_id}/`
      };
    } finally {
      await browser.close();
    }
  }
}
```

---

### 4. ぐるなび

```javascript
// src/services/portals/gurunavi.js

class GurunaviHandler {
  async post(instagramPost, clientConfig) {
    // ぐるなびにはAPI Proというサービスがある
    // ただし、店舗情報更新APIのみで投稿APIはない模様
    // → Puppeteerで実装

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
      // 1. ログイン
      await page.goto('https://pro.gnavi.co.jp/login/');
      await page.type('input[name="loginId"]', clientConfig.gurunavi_id);
      await page.type('input[name="password"]', clientConfig.gurunavi_password);
      await page.click('button[type="submit"]');
      await page.waitForNavigation();

      // 2. お知らせ作成
      await page.goto('https://pro.gnavi.co.jp/shop/news/create');
      await page.type('input[name="title"]', instagramPost.caption.substring(0, 40));
      await page.type('textarea[name="content"]', instagramPost.formattedCaption);

      // 3. 画像アップロード
      const inputFile = await page.$('input[type="file"]');
      await inputFile.uploadFile(instagramPost.mediaPath);

      // 4. 公開
      await page.click('button#publish');
      await page.waitForSelector('.success-message');

      return {
        postId: 'gurunavi-' + Date.now(),
        url: `https://r.gnavi.co.jp/${clientConfig.gurunavi_shop_id}/`
      };
    } finally {
      await browser.close();
    }
  }
}
```

---

### 5. Retty

```javascript
// src/services/portals/retty.js

class RettyHandler {
  async post(instagramPost, clientConfig) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
      // 1. ログイン
      await page.goto('https://retty.me/login');
      await page.type('input[name="email"]', clientConfig.retty_email);
      await page.type('input[name="password"]', clientConfig.retty_password);
      await page.click('button[type="submit"]');
      await page.waitForNavigation();

      // 2. 店舗投稿（店舗オーナー向け）
      await page.goto(`https://retty.me/restaurant/${clientConfig.retty_restaurant_id}/owner/post`);

      // 3. 本文入力
      await page.type('textarea[name="post_text"]', instagramPost.formattedCaption);

      // 4. 画像アップロード
      const inputFile = await page.$('input[type="file"][accept*="image"]');
      await inputFile.uploadFile(instagramPost.mediaPath);

      // 5. 投稿
      await page.click('button[data-action="submit"]');
      await page.waitForSelector('.post-success');

      return {
        postId: 'retty-' + Date.now(),
        url: `https://retty.me/restaurant/${clientConfig.retty_restaurant_id}/`
      };
    } finally {
      await browser.close();
    }
  }
}
```

---

## 🔔 LINE通知システム統合

### あなたのMEO×LINEシステムとの連携

```javascript
// src/services/line-integration.js

class LineIntegration {
  /**
   * あなたのMEO×LINEシステムに投稿結果を通知
   */
  async notifyPostResults(clientId, instagramPost, portalResults) {
    const webhook = process.env.YOUR_MEO_SYSTEM_WEBHOOK;
    const apiKey = process.env.YOUR_MEO_SYSTEM_API_KEY;

    // 1. あなたのシステムにWebhook送信
    await axios.post(webhook, {
      client_id: clientId,
      event_type: 'instagram_to_portals',
      instagram_post: {
        id: instagramPost.id,
        caption: instagramPost.caption,
        permalink: instagramPost.permalink,
        timestamp: instagramPost.timestamp
      },
      portal_results: portalResults,  // GBP、ホットペッパー等の結果
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    // 2. あなたのシステム側で、この情報を元にLINE通知を送信
    // （あなたのシステム側の実装）
  }

  /**
   * LINE通知メッセージの例
   * （あなたのシステム側で実装する内容）
   */
  generateLineMessage(clientName, instagramPost, portalResults) {
    const successCount = portalResults.filter(r => r.status === 'success').length;
    const totalCount = portalResults.length;

    let message = `【${clientName}】Instagram投稿を検出\n\n`;
    message += `📱 Instagram投稿\n`;
    message += `${instagramPost.caption.substring(0, 100)}...\n\n`;
    message += `✅ 自動投稿結果: ${successCount}/${totalCount}\n\n`;

    portalResults.forEach(result => {
      const emoji = result.status === 'success' ? '✅' : '❌';
      message += `${emoji} ${this.getPortalName(result.portal)}\n`;
      if (result.status === 'success') {
        message += `   ${result.url}\n`;
      } else {
        message += `   エラー: ${result.error}\n`;
      }
    });

    message += `\n詳細: https://your-system.com/clients/${clientId}/posts/${instagramPost.id}`;

    return message;
  }

  getPortalName(portalType) {
    const names = {
      gbp: 'Google ビジネスプロフィール',
      hotpepper: 'ホットペッパー',
      tabelog: '食べログ',
      gurunavi: 'ぐるなび',
      retty: 'Retty'
    };
    return names[portalType] || portalType;
  }
}
```

---

## 📝 設定ファイル仕様

### config/clients.json

```json
{
  "clients": [
    {
      "id": "client001",
      "name": "〇〇飲食チェーン",
      "instagram": {
        "access_token": "EAAG...",
        "business_account_id": "17841..."
      },
      "enabled_portals": ["gbp", "hotpepper", "tabelog", "gurunavi", "retty"],
      "portals": {
        "gbp": {
          "method": "buffer",  // "buffer" or "puppeteer"
          "buffer_profile_id": "5f8c3a...",
          "place_id": "ChIJ..."
        },
        "hotpepper": {
          "store_id": "J001234567",
          "login_id": "owner@example.com",
          "password": "encrypted_password"
        },
        "tabelog": {
          "restaurant_id": "tokyo/A1234/12345678/",
          "login_id": "owner@example.com",
          "password": "encrypted_password"
        },
        "gurunavi": {
          "shop_id": "a123456",
          "login_id": "owner@example.com",
          "password": "encrypted_password"
        },
        "retty": {
          "restaurant_id": "123456",
          "email": "owner@example.com",
          "password": "encrypted_password"
        }
      },
      "locations": [
        {
          "name": "渋谷店",
          "instagram_hashtag": "#〇〇渋谷店",
          "gbp_buffer_profile_id": "5f8c3a...",
          "hotpepper_store_id": "J001234567"
        },
        {
          "name": "新宿店",
          "instagram_hashtag": "#〇〇新宿店",
          "gbp_buffer_profile_id": "5f8c3b...",
          "hotpepper_store_id": "J001234568"
        }
      ],
      "line_notification": {
        "enabled": true,
        "notify_token": "YOUR_LINE_TOKEN",  // または、あなたのシステムのWebhook
        "webhook_url": "https://your-meo-system.com/api/webhook/client001"
      }
    }
  ]
}
```

---

## 🛠️ 開発タスク一覧

### フェーズ1: 基礎実装（1-2週間）

#### タスク1.1: Instagram同期機能
- [ ] Instagram Graph API連携
- [ ] 新規投稿検知
- [ ] 画像・動画ダウンロード
- [ ] テキスト整形

#### タスク1.2: GBP投稿機能
- [ ] Buffer API連携
- [ ] Puppeteer実装（オプション）
- [ ] エラーハンドリング

#### タスク1.3: LINE通知統合
- [ ] あなたのMEO×LINEシステムとのWebhook連携
- [ ] 投稿結果通知
- [ ] エラー通知

---

### フェーズ2: マルチポータル対応（2-3週間）

#### タスク2.1: ホットペッパー連携
- [ ] ログイン処理
- [ ] お知らせ投稿
- [ ] 画像アップロード
- [ ] エラーハンドリング

#### タスク2.2: 食べログ連携
- [ ] ログイン処理
- [ ] PR情報投稿
- [ ] 画像アップロード
- [ ] エラーハンドリング

#### タスク2.3: ぐるなび連携
- [ ] ログイン処理
- [ ] お知らせ投稿
- [ ] 画像アップロード
- [ ] エラーハンドリング

#### タスク2.4: Retty連携
- [ ] ログイン処理
- [ ] 店舗投稿
- [ ] 画像アップロード
- [ ] エラーハンドリング

---

### フェーズ3: マルチロケーション対応（1週間）

#### タスク3.1: マルチロケーション設定
- [ ] locations.json仕様策定
- [ ] ロケーション別設定管理
- [ ] ハッシュタグでの振り分け

#### タスク3.2: 一括同期機能
- [ ] 全ロケーション同期コマンド
- [ ] ロケーション別同期
- [ ] ステータス確認

---

### フェーズ4: エンタープライズ機能（2週間）

#### タスク4.1: マルチクライアント管理
- [ ] clients.json実装
- [ ] クライアント別同期
- [ ] ステータスダッシュボード

#### タスク4.2: ホワイトラベル機能
- [ ] 通知メッセージカスタマイズ
- [ ] ダッシュボードブランディング
- [ ] クライアント専用URL

#### タスク4.3: レポート機能
- [ ] 投稿実績レポート
- [ ] ポータル別成功率
- [ ] クライアント別サマリー

---

### フェーズ5: 本番運用対応（1週間）

#### タスク5.1: エラーハンドリング
- [ ] リトライ機能
- [ ] エラー通知
- [ ] ログ記録

#### タスク5.2: パフォーマンス最適化
- [ ] 並列処理
- [ ] レート制限対策
- [ ] キャッシュ実装

#### タスク5.3: セキュリティ
- [ ] 認証情報の暗号化
- [ ] VPN/プロキシ対応
- [ ] ボット検出回避

---

## 💻 実装サンプル: メイン処理

### src/index.js

```javascript
// メインエントリーポイント

const InstagramService = require('./services/instagram');
const MultiPortalEngine = require('./services/multi-portal-engine');
const LineIntegration = require('./services/line-integration');
const clientsConfig = require('../config/clients.json');

async function main() {
  console.log('Instagram→マルチポータル自動投稿 開始');

  const instagramService = new InstagramService();
  const portalEngine = new MultiPortalEngine();
  const lineIntegration = new LineIntegration();

  // 全クライアントを処理
  for (const client of clientsConfig.clients) {
    console.log(`\n[${client.name}] 処理開始`);

    try {
      // 1. Instagram新規投稿を取得
      const newPosts = await instagramService.fetchNewPosts(
        client.instagram.business_account_id,
        client.instagram.access_token
      );

      console.log(`  新規投稿: ${newPosts.length}件`);

      for (const post of newPosts) {
        console.log(`  投稿ID: ${post.id}`);

        // 2. メディアダウンロード
        const mediaPath = await instagramService.downloadMedia(post);
        console.log(`  メディアダウンロード完了: ${mediaPath}`);

        // 3. テキスト整形（各ポータル用）
        const formattedPost = {
          id: post.id,
          caption: post.caption,
          permalink: post.permalink,
          timestamp: post.timestamp,
          mediaPath: mediaPath,
          mediaUrls: [post.media_url]
        };

        // 4. 全ポータルに投稿
        const portalResults = await portalEngine.postToAllPortals(
          formattedPost,
          client
        );

        console.log(`  投稿結果: ${JSON.stringify(portalResults, null, 2)}`);

        // 5. LINE通知（あなたのMEO×LINEシステムに連携）
        await lineIntegration.notifyPostResults(
          client.id,
          formattedPost,
          portalResults
        );

        console.log(`  LINE通知送信完了`);
      }

      console.log(`[${client.name}] 処理完了`);
    } catch (error) {
      console.error(`[${client.name}] エラー:`, error);
      // エラー通知
      await lineIntegration.notifyError(client.id, error);
    }
  }

  console.log('\n全クライアント処理完了');
}

// 実行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
```

---

## 🚀 デプロイ・運用

### GitHub Actions設定

```yaml
# .github/workflows/instagram-sync.yml

name: Instagram to Multi-Portal Sync

on:
  schedule:
    - cron: '0 */2 * * *'  # 2時間ごと
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run sync
        env:
          INSTAGRAM_ACCESS_TOKEN: ${{ secrets.INSTAGRAM_ACCESS_TOKEN }}
          BUFFER_ACCESS_TOKEN: ${{ secrets.BUFFER_ACCESS_TOKEN }}
          YOUR_MEO_SYSTEM_WEBHOOK: ${{ secrets.YOUR_MEO_SYSTEM_WEBHOOK }}
          YOUR_MEO_SYSTEM_API_KEY: ${{ secrets.YOUR_MEO_SYSTEM_API_KEY }}
        run: npm run sync:all-clients

      - name: Upload logs
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: sync-logs
          path: logs/
```

---

## 📊 モニタリング・ログ

### ログ仕様

```javascript
// src/utils/logger.js

const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

module.exports = logger;
```

### ログ出力例

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Portal post success",
  "client_id": "client001",
  "instagram_post_id": "18123456789",
  "portal": "hotpepper",
  "result": {
    "status": "success",
    "post_id": "hotpepper-1234567890",
    "url": "https://www.hotpepper.jp/strJ001234567/"
  }
}
```

---

## 🔐 セキュリティ考慮事項

### 1. 認証情報の暗号化

```javascript
// src/utils/encryption.js

const crypto = require('crypto');

class EncryptionUtil {
  constructor(secretKey) {
    this.algorithm = 'aes-256-cbc';
    this.key = crypto.scryptSync(secretKey, 'salt', 32);
  }

  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  decrypt(text) {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encrypted = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString();
  }
}

module.exports = EncryptionUtil;
```

### 2. プロキシ・VPN設定

```javascript
// Puppeteer使用時のプロキシ設定

const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--proxy-server=http://proxy.example.com:8080',
    '--no-sandbox',
    '--disable-setuid-sandbox'
  ]
});
```

---

## 📞 サポート・質問

実装中に不明点があれば、以下を確認してください：

1. **Instagram Graph API**: [公式ドキュメント](https://developers.facebook.com/docs/instagram-api/)
2. **Buffer API**: [公式ドキュメント](https://buffer.com/developers/api)
3. **Puppeteer**: [公式ドキュメント](https://pptr.dev/)

---

## ✅ チェックリスト

実装完了時のチェックリスト:

- [ ] Instagram投稿検知が動作する
- [ ] GBP投稿が動作する（Buffer or Puppeteer）
- [ ] ホットペッパー投稿が動作する
- [ ] 食べログ投稿が動作する
- [ ] ぐるなび投稿が動作する
- [ ] Retty投稿が動作する
- [ ] LINE通知が送信される（あなたのシステム経由）
- [ ] マルチクライアント管理が動作する
- [ ] エラーハンドリングが実装されている
- [ ] ログが記録される
- [ ] セキュリティ対策が実装されている

---

**これで、Instagram投稿を検知して、GBP・ホットペッパー・食べログ・ぐるなび・Retty等、全ポータルサイトに自動投稿するシステムが完成します！** 🚀

**質問があればいつでも聞いてください！**
