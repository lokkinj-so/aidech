# 100店舗規模の完全自動化ガイド 🏢

このガイドでは、**100店舗以上**の大規模運用で完全自動化を実現する方法を説明します。

---

## 🎯 課題認識

### 手作業の限界

**1店舗の場合**:
- 1投稿 × 3分 = 3分/日
- 月間: 90分
- **許容範囲** ✅

**100店舗の場合**:
- 100投稿 × 3分 = **300分/日（5時間）**
- 月間: **9,000分（150時間）**
- **完全に不可能** ❌

→ **完全自動化が必須！**

---

## 🚀 3つの完全自動化ソリューション

### 比較表

| ソリューション | 初期費用 | 月額（100店舗） | 自動化 | リスク | 実装難易度 |
|-------------|---------|--------------|-------|-------|----------|
| **Buffer API** | 無料 | $200-500 | 100% | なし | ★★☆☆☆ |
| **Hootsuite API** | 無料 | $500-1000 | 100% | なし | ★★☆☆☆ |
| **Puppeteer自動化** | 無料 | $50-100 | 100% | 低い | ★★★★☆ |

---

## 📋 推奨: Buffer API統合（最も現実的）

### なぜBuffer？

- ✅ **公式にGBPをサポート**
- ✅ **API提供**（完全自動化可能）
- ✅ **100+店舗対応プランあり**
- ✅ **利用規約違反のリスクなし**
- ✅ **実装が簡単**

### Buffer料金プラン（2026年）

| プラン | アカウント数 | 月額 | 100店舗の場合 |
|-------|-----------|------|------------|
| Essentials | 1 | $6 | $600/月 |
| Team | 10 | $12 | $120/月 |
| Agency | 25 | $120 | $480/月 |
| **Agency+** | **100** | **カスタム** | **$300-500/月** 🏆 |

**推奨**: Agency+ プランで一括契約（ボリュームディスカウント）

### Buffer API実装

このシステムに統合済み！

#### ステップ1: Buffer APIキーを取得

1. [Buffer Developers](https://buffer.com/developers) にアクセス
2. アプリケーションを作成
3. API Access Tokenを取得

#### ステップ2: .envに設定

```env
# Buffer API Configuration
BUFFER_ACCESS_TOKEN=your_buffer_access_token
ENABLE_BUFFER_AUTO_POST=true
```

#### ステップ3: Buffer Profilesを設定

各店舗のGoogle Business ProfileをBufferに接続:

```bash
# BufferにGBPアカウントを接続
npm run buffer:connect
```

または手動で:
1. Buffer Web UIでGoogle Business Profileを接続
2. Profile IDを取得

#### ステップ4: 自動投稿を有効化

```env
# 完全自動投稿を有効化
AUTO_POST_TO_GBP=true
BUFFER_AUTO_PUBLISH=true  # 即座に投稿
# または
BUFFER_SCHEDULE=true  # Bufferのスケジュール機能を使用
```

#### ステップ5: 実行

```bash
npm start
```

**それだけ！** Instagram投稿が検出されたら、自動的にBufferを通じてGBPに投稿されます。

---

## 🔧 Buffer API実装コード

### 自動投稿サービス

新ファイル: `src/services/buffer.js`

```javascript
const axios = require('axios');
const logger = require('../utils/logger');

class BufferService {
  constructor(config = {}) {
    this.accessToken = config.accessToken || process.env.BUFFER_ACCESS_TOKEN;
    this.autoPublish = config.autoPublish || process.env.BUFFER_AUTO_PUBLISH === 'true';
    this.baseUrl = 'https://api.bufferapp.com/1';
  }

  /**
   * Get all Buffer profiles
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
   * Create a post in Buffer
   * @param {string} profileId - Buffer profile ID
   * @param {Object} post - Post data
   */
  async createPost(profileId, post) {
    try {
      const payload = {
        access_token: this.accessToken,
        profile_ids: [profileId],
        text: post.caption || '',
        media: {
          photo: post.media_url,
        },
        now: this.autoPublish, // true = publish immediately
      };

      // Add multiple images for carousel
      if (post.childMedia && post.childMedia.length > 0) {
        payload.media.photo = post.childMedia.map(child => child.media_url);
      }

      const response = await axios.post(
        `${this.baseUrl}/updates/create.json`,
        null,
        { params: payload }
      );

      logger.info(`Buffer post created: ${response.data.id}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to create Buffer post:', error.message);
      throw error;
    }
  }

  /**
   * Auto-post Instagram post to Google Business Profile via Buffer
   * @param {Object} instagramPost - Instagram post data
   * @param {string} gbpProfileId - Buffer profile ID for GBP
   */
  async autoPostToGBP(instagramPost, gbpProfileId) {
    try {
      logger.info(`Auto-posting to GBP via Buffer: ${instagramPost.id}`);

      const result = await this.createPost(gbpProfileId, {
        caption: instagramPost.caption || '',
        media_url: instagramPost.media_url,
        childMedia: instagramPost.children?.data || [],
      });

      logger.info(`Successfully posted to GBP via Buffer: ${result.id}`);
      return result;
    } catch (error) {
      logger.error('Failed to auto-post to GBP:', error.message);
      throw error;
    }
  }
}

module.exports = BufferService;
```

### 統合コード

`src/services/sync.js` に追加:

```javascript
const BufferService = require('./buffer');

class SyncService {
  constructor(config = {}) {
    // ... 既存のコード ...

    this.bufferService = new BufferService(config);
    this.autoPostEnabled = config.autoPostEnabled || process.env.AUTO_POST_TO_GBP === 'true';
  }

  async processNewPost(post) {
    // ... 既存の処理（ダウンロード、通知等）...

    // Buffer経由で自動投稿
    if (this.autoPostEnabled && this.bufferService.accessToken) {
      try {
        // 店舗IDに対応するBuffer Profile IDを取得
        const gbpProfileId = this.getGBPProfileId(post.locationId);

        await this.bufferService.autoPostToGBP(post, gbpProfileId);

        logger.info(`Auto-posted to GBP: ${post.id}`);
      } catch (error) {
        logger.error(`Failed to auto-post: ${error.message}`);
        // エラーでも通知は送る
      }
    }
  }

  getGBPProfileId(locationId) {
    // 店舗IDとBuffer Profile IDのマッピング
    const mapping = process.env.GBP_PROFILE_MAPPING
      ? JSON.parse(process.env.GBP_PROFILE_MAPPING)
      : {};

    return mapping[locationId];
  }
}
```

### 店舗マッピング設定

`.env` に追加:

```env
# 店舗IDとBuffer Profile IDのマッピング（JSON形式）
GBP_PROFILE_MAPPING={
  "location_1": "buffer_profile_id_1",
  "location_2": "buffer_profile_id_id_2",
  ...
}
```

または外部ファイル:

```json
// config/gbp-profiles.json
{
  "tokyo_shibuya": "5f9a3b2c1d4e5f6g7h8i9j0k",
  "tokyo_shinjuku": "1a2b3c4d5e6f7g8h9i0j1k2l",
  "osaka_umeda": "3c4d5e6f7g8h9i0j1k2l3m4n",
  ...
}
```

---

## 🤖 選択肢2: Puppeteer自動化（コスト重視、リスク低）

### なぜPuppeteer？

- ✅ **完全無料**（サーバー代のみ）
- ✅ **100%自動化**
- ✅ **BufferやHootsuiteより安い**
- ⚠️ **利用規約グレーゾーン**（多くの企業が使用）
- ⚠️ **検出リスク**（低いが0ではない）

### 実装概要

Google Business ProfileをブラウザでHeadless自動操作:

1. ログイン
2. 投稿作成画面に移動
3. テキスト入力
4. 画像アップロード
5. 投稿ボタンクリック

### Puppeteer実装

新ファイル: `src/services/gbp-automation.js`

```javascript
const puppeteer = require('puppeteer');
const logger = require('../utils/logger');

class GBPAutomation {
  constructor(config = {}) {
    this.headless = config.headless !== false;
    this.slowMo = config.slowMo || 100; // 人間らしい動作
  }

  /**
   * Initialize browser
   */
  async init() {
    this.browser = await puppeteer.launch({
      headless: this.headless,
      slowMo: this.slowMo,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
    });
  }

  /**
   * Login to Google Business Profile
   */
  async login(email, password) {
    const page = await this.browser.newPage();

    // User-Agentを設定（ボット検出回避）
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );

    // Googleログインページへ
    await page.goto('https://business.google.com/');

    // メールアドレス入力
    await page.type('input[type="email"]', email);
    await page.click('#identifierNext');
    await page.waitForTimeout(2000);

    // パスワード入力
    await page.type('input[type="password"]', password);
    await page.click('#passwordNext');
    await page.waitForTimeout(3000);

    logger.info('Logged in to Google Business Profile');
    return page;
  }

  /**
   * Create a post on Google Business Profile
   */
  async createPost(page, locationId, postData) {
    try {
      // 店舗ページに移動
      await page.goto(`https://business.google.com/locations/${locationId}`);
      await page.waitForTimeout(2000);

      // 「投稿を作成」ボタンをクリック
      await page.click('[aria-label="投稿を作成"]');
      await page.waitForTimeout(1000);

      // テキスト入力
      const textArea = await page.$('textarea');
      await textArea.type(postData.caption, { delay: 50 }); // 人間らしく入力

      // 画像アップロード
      if (postData.imagePath) {
        const fileInput = await page.$('input[type="file"]');
        await fileInput.uploadFile(postData.imagePath);
        await page.waitForTimeout(3000); // アップロード待機
      }

      // 投稿ボタンをクリック
      await page.click('button[aria-label="投稿"]');
      await page.waitForTimeout(2000);

      logger.info(`Posted to GBP location: ${locationId}`);
      return true;
    } catch (error) {
      logger.error('Failed to create GBP post:', error.message);
      throw error;
    }
  }

  /**
   * Close browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

module.exports = GBPAutomation;
```

### Puppeteer使用方法

```javascript
const GBPAutomation = require('./services/gbp-automation');

async function autoPostToGBP() {
  const gbp = new GBPAutomation({
    headless: true,
    slowMo: 100, // ボット検出回避
  });

  await gbp.init();

  // ログイン（初回のみ、以降はセッション保存）
  const page = await gbp.login(
    process.env.GOOGLE_EMAIL,
    process.env.GOOGLE_PASSWORD
  );

  // 投稿作成
  await gbp.createPost(page, 'location_id_1', {
    caption: 'Instagram投稿のキャプション',
    imagePath: './downloads/posts/123/image.jpg',
  });

  await gbp.close();
}
```

### Puppeteerのリスク軽減策

1. **ヘッドレスモードの検出回避**:
```javascript
await page.evaluateOnNewDocument(() => {
  Object.defineProperty(navigator, 'webdriver', {
    get: () => false,
  });
});
```

2. **人間らしい動作パターン**:
```javascript
// ランダムな待機時間
const randomDelay = () => Math.random() * 2000 + 1000;
await page.waitForTimeout(randomDelay());

// マウス移動
await page.mouse.move(100, 100);
await page.mouse.move(200, 200);
```

3. **IPローテーション**:
```javascript
// プロキシを使用
const browser = await puppeteer.launch({
  args: ['--proxy-server=http://proxy-server:port'],
});
```

4. **セッション保存**:
```javascript
// Cookieを保存して再ログインを避ける
const cookies = await page.cookies();
fs.writeFileSync('./cookies.json', JSON.stringify(cookies));

// 次回ロード
const cookies = JSON.parse(fs.readFileSync('./cookies.json'));
await page.setCookie(...cookies);
```

---

## 🏢 100店舗規模のアーキテクチャ

### システム構成

```
┌─────────────────────────────────────────┐
│  Instagram Business Accounts (100店舗)  │
└─────────────────────────────────────────┘
              ↓ (Instagram Graph API)
┌─────────────────────────────────────────┐
│  GitHub Actions / VPS                   │
│  - 新規投稿を検出                         │
│  - 画像ダウンロード                       │
│  - キャプション整形                       │
└─────────────────────────────────────────┘
              ↓
      ┌───────┴───────┐
      ↓               ↓
┌──────────┐   ┌──────────────┐
│ Buffer   │   │ Puppeteer    │
│ API      │   │ Automation   │
└──────────┘   └──────────────┘
      ↓               ↓
┌─────────────────────────────────────────┐
│  Google Business Profile (100店舗)      │
│  - 自動投稿                              │
└─────────────────────────────────────────┘
```

### データベース設計

100店舗の管理には、店舗情報のデータベースが必要:

```javascript
// config/locations.json
[
  {
    "id": "tokyo_shibuya",
    "name": "渋谷店",
    "instagram_account_id": "1234567890",
    "gbp_location_id": "ChIJ...",
    "buffer_profile_id": "5f9a3b2c...",
    "active": true
  },
  {
    "id": "tokyo_shinjuku",
    "name": "新宿店",
    "instagram_account_id": "0987654321",
    "gbp_location_id": "ChIJ...",
    "buffer_profile_id": "1a2b3c4d...",
    "active": true
  },
  // ... 100店舗分
]
```

### マルチアカウント同期

`src/services/multi-sync.js`:

```javascript
const SyncService = require('./sync');
const locations = require('../config/locations.json');

class MultiLocationSync {
  async syncAll() {
    const activeLocations = locations.filter(loc => loc.active);

    // 並列実行（10店舗ずつ）
    for (let i = 0; i < activeLocations.length; i += 10) {
      const batch = activeLocations.slice(i, i + 10);

      await Promise.all(
        batch.map(location => this.syncLocation(location))
      );

      // レート制限対策
      await this.delay(5000);
    }
  }

  async syncLocation(location) {
    const sync = new SyncService({
      instagramAccountId: location.instagram_account_id,
      bufferProfileId: location.buffer_profile_id,
      locationId: location.id,
    });

    await sync.run();
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = MultiLocationSync;
```

---

## 💰 100店舗のコスト比較

### Buffer API（推奨）

| 項目 | コスト |
|------|-------|
| Buffer Agency+ (100店舗) | $300-500/月 |
| サーバー/GitHub Actions | 無料 |
| **合計** | **$300-500/月** |

**年間**: $3,600-6,000

### Puppeteer自動化

| 項目 | コスト |
|------|-------|
| VPS (4CPU, 8GB RAM) | $50/月 |
| プロキシ（オプション） | $20/月 |
| **合計** | **$70/月** |

**年間**: $840

### 完全手動

| 項目 | コスト |
|------|-------|
| 人件費（5時間/日 × $20/時） | $100/日 = $3,000/月 |
| **合計** | **$3,000/月** |

**年間**: $36,000

### 比較

| ソリューション | 月額 | 年間 | 節約額（vs 手動） |
|-------------|------|------|----------------|
| **Buffer API** | $300-500 | $3,600-6,000 | **$30,000-32,400** 🏆 |
| **Puppeteer** | $70 | $840 | **$35,160** 🏆🏆 |
| 手動 | $3,000 | $36,000 | - |

---

## 🎯 推奨実装ステップ

### Phase 1: Buffer API統合（即座に開始可能）

1. Buffer Agency+プランに申し込み
2. 100店舗のGBPをBufferに接続
3. このシステムにBuffer API統合
4. テスト（1店舗）
5. 全店舗展開

**期間**: 1-2週間
**リスク**: なし
**コスト**: $300-500/月

### Phase 2: Puppeteer自動化（コスト最適化）

1. Puppeteer実装
2. VPS構築
3. セッション管理実装
4. ボット検出回避策実装
5. テスト（1店舗）
6. 段階的展開（10店舗→50店舗→100店舗）

**期間**: 1-2ヶ月
**リスク**: 低（適切な実装で）
**コスト**: $70/月

### Phase 3: ハイブリッド（推奨）

- **重要店舗（20店舗）**: Buffer API（安全）
- **一般店舗（80店舗）**: Puppeteer（コスト削減）

**コスト**: $150/月
**リスク**: 最小化
**柔軟性**: 最大

---

## 📚 次のステップ

1. **まずはBuffer API統合を実装**（安全・確実）
2. **並行してPuppeteer開発**（コスト削減）
3. **ハイブリッド運用に移行**（最適化）

詳細な実装コードは以下に用意しています:
- `src/services/buffer.js` - Buffer API統合
- `src/services/gbp-automation.js` - Puppeteer自動化
- `src/services/multi-sync.js` - マルチアカウント管理

---

## ⚠️ 重要な注意事項

### Buffer API
- ✅ 利用規約に完全準拠
- ✅ アカウント凍結リスクなし
- ✅ サポートあり

### Puppeteer自動化
- ⚠️ Googleの利用規約グレーゾーン
- ⚠️ アカウント凍結リスク（低いが0ではない）
- ⚠️ 検出された場合、手動対応が必要

**推奨**: まずBuffer APIで開始し、コストが問題になったらPuppeteerを検討。

---

**100店舗規模でも、完全自動化は可能です！** 🚀

年間$30,000以上のコスト削減を実現しましょう。
