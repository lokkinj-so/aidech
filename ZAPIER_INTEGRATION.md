# Zapier を使った Instagram → GBP 自動化

Zapierを使えば、コーディングなしでInstagramとGoogle Business Profileを連携できます。

## 🎯 Zapierの利点と制約

### ✅ 利点
- ノーコードで実装可能
- 視覚的な設定画面
- 多数のサービスと連携可能
- メンテナンスが簡単

### ⚠️ 制約
- **重要**: ZapierでもGoogle Business Profile APIの制約は同じ
- 月額料金が発生する（無料プランは制限あり）
- Instagram公式APIまたはサードパーティサービスが必要
- カスタマイズに限界がある

## 📋 Zapierで可能な実装パターン

### パターン1: Instagram → Zapier → 通知（推奨・無料）

**できること**:
- Instagram新規投稿を検出
- Slack/メール/LINE等に通知
- 手動でGBPに投稿

**料金**: 無料プラン可能（月100タスクまで）

**手順**:
1. Zapier アカウント作成
2. Instagram Trigger を設定
3. Slack/Email Action を設定

### パターン2: Instagram → Zapier → Buffer → GBP（半自動）

**できること**:
- Instagram投稿を自動検出
- Bufferに自動投稿
- BufferからGBPに自動投稿

**料金**:
- Zapier: $19.99/月〜
- Buffer: $6/月〜（Essentialsプラン）

### パターン3: Instagram → Zapier → Hootsuite → GBP（エンタープライズ）

**できること**:
- 完全自動化
- 複数SNSに一括投稿
- 詳細な分析機能

**料金**:
- Zapier: $19.99/月〜
- Hootsuite: $99/月〜

## 🚀 実装ガイド: パターン1（推奨・無料）

### ステップ1: Zapier設定

1. [Zapier](https://zapier.com/) にアクセス
2. 「Create Zap」をクリック
3. Triggerを設定

### ステップ2: Instagram Trigger設定

**問題**: Zapierには直接Instagramトリガーがありません。

**解決策**:
以下のいずれかを使用:

#### オプションA: Instagram公式API経由（推奨）

Zapierの「Webhooks by Zapier」を使用:

1. このリポジトリの通知システムを利用
2. `.env` にZapier Webhook URLを追加
3. Instagramから通知 → Zapier Webhook

```env
# .envに追加
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/xxxxx/
```

通知サービスを拡張:

```javascript
// src/services/notification.js に追加
async sendToZapier(message, post) {
  if (!this.zapierWebhook) return;

  await axios.post(this.zapierWebhook, {
    post_id: post.id,
    caption: post.caption,
    media_url: post.media_url,
    media_type: post.media_type,
    permalink: post.permalink,
    timestamp: post.timestamp,
  });
}
```

#### オプションB: RSS Feed経由

サードパーティのInstagram RSS Feedサービスを使用:
- [RSS.app](https://rss.app/) (有料)
- [Queryfeed](https://queryfeed.net/) (有料)

1. Instagram RSS Feedを作成
2. Zapier「RSS by Zapier」をトリガーに設定
3. Feed URLを入力

### ステップ3: Action設定

**Slack通知の場合**:

1. Actionで「Slack」を選択
2. 「Send Channel Message」を選択
3. メッセージをフォーマット:

```
新しいInstagram投稿が検出されました 📸

投稿: {{caption}}
URL: {{permalink}}
```

**メール通知の場合**:

1. Actionで「Email by Zapier」を選択
2. 宛先とメッセージを設定

### ステップ4: GBPへの投稿（手動）

通知を受け取ったら、手動でGBPに投稿します。

---

## 🔄 実装ガイド: パターン2（半自動・有料）

### 必要なもの

- Zapier有料プラン ($19.99/月〜)
- Buffer Essentials ($6/月〜)

### ステップ1: Bufferアカウント作成

1. [Buffer](https://buffer.com/) にアクセス
2. アカウント作成
3. Google Business Profileを接続

### ステップ2: Zapier設定

1. Trigger: Instagram (Webhook or RSS)
2. Action: Buffer
   - 「Create a Post」を選択
   - アカウント: Google Business Profile
   - Text: `{{caption}}`
   - Media: `{{media_url}}`

### ステップ3: Buffer設定

1. Bufferで投稿時間をスケジュール
2. または即座に投稿

### メリット・デメリット

✅ **メリット**:
- ほぼ完全自動化
- 投稿時間のコントロール可能
- 複数SNSに対応

❌ **デメリット**:
- 月額費用がかかる
- カスタマイズに限界
- Bufferの制約（画像サイズ等）

---

## 💰 コスト比較

| ソリューション | 初期 | 月額 | 自動化レベル |
|-------------|-----|------|-----------|
| **このリポジトリ** | 無料 | 無料 | 95%（通知のみ手動） |
| **Zapier + 通知** | 無料 | 無料 | 90%（GBP投稿は手動） |
| **Zapier + Buffer** | 無料 | $26〜 | 99%（ほぼ完全自動） |
| **Zapier + Hootsuite** | 無料 | $119〜 | 99%（エンタープライズ） |

---

## 🎯 推奨ソリューション

### 小規模ビジネス（〜10投稿/月）

**推奨**: このリポジトリ + 手動投稿
- 料金: 無料
- 作業時間: 2-3分/投稿

### 中規模ビジネス（10-50投稿/月）

**推奨**: このリポジトリ OR Zapier + Buffer
- このリポジトリ: 無料、月20-30分の作業
- Zapier + Buffer: $26/月、ほぼ完全自動

### 大規模ビジネス（50+投稿/月）

**推奨**: Zapier + Hootsuite または エンタープライズツール
- 料金: $119/月〜
- 完全自動化 + 詳細分析

---

## 🔧 Zapier統合をこのリポジトリに追加

既存のシステムにZapier連携を追加する場合:

### 1. Zapier Webhook URLを追加

```bash
# .env に追加
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/xxxxx/yyyyy/
```

### 2. 通知サービスを拡張

```javascript
// src/services/notification.js

constructor(config = {}) {
  // 既存のコード...
  this.zapierWebhook = config.zapierWebhook || process.env.ZAPIER_WEBHOOK_URL;
}

async notifyNewPost(post, downloadPath) {
  const message = this.formatMessage(post, downloadPath);
  const notifications = [];

  // 既存の通知...

  // Zapier追加
  if (this.zapierWebhook) {
    notifications.push(this.sendToZapier(message, post));
  }

  // ...
}

async sendToZapier(message, post) {
  try {
    await axios.post(this.zapierWebhook, {
      event: 'new_instagram_post',
      post_id: post.id,
      caption: post.caption || '',
      media_type: post.media_type,
      media_url: post.media_url,
      permalink: post.permalink,
      timestamp: post.timestamp,
      download_path: message.downloadPath,
      formatted_caption: message.fullCaption,
    });

    logger.info('Zapier webhook sent');
  } catch (error) {
    logger.error('Failed to send Zapier webhook:', error.message);
    throw error;
  }
}
```

### 3. Zapierで受信

1. Zapierで「Webhooks by Zapier」をTriggerに設定
2. 「Catch Hook」を選択
3. 表示されたURLを `.env` に設定
4. テスト実行: `npm run sync`
5. Zapierでデータを確認

### 4. Actionを設定

Slack、Buffer、Hootsuite等、好きなサービスに連携

---

## ❓ よくある質問

### Q1: ZapierでGoogle Business Profileに直接投稿できる？

**A**: 技術的には可能ですが、以下の制約があります：
- Zapierの「Google My Business」アプリは読み取り専用の場合が多い
- 投稿作成にはBufferやHootsuiteなどのサードパーティが必要
- または高額なエンタープライズプランが必要

### Q2: 完全無料で自動化できる？

**A**: **ほぼ**可能です：
- このリポジトリ: 通知まで完全自動（GBP投稿のみ手動）
- Zapier無料プラン: 月100タスクまで通知可能
- ただし、GBPへの投稿は手動が必要（2-3分/投稿）

### Q3: Instagram公式APIなしでZapierは使える？

**A**: 難しいです：
- Instagram RSS Feedサービスは有料
- 公式APIなしでは信頼性の高い検出が困難
- 推奨: このリポジトリでInstagram APIを使用 → Zapier Webhookで連携

### Q4: Zapier vs このリポジトリ、どちらがいい？

**比較表**:

| 項目 | このリポジトリ | Zapier + Buffer |
|------|-------------|----------------|
| 料金 | 無料 | $26/月 |
| 自動化レベル | 95% | 99% |
| カスタマイズ | 高い | 中程度 |
| セットアップ | 中程度 | 簡単 |
| メンテナンス | 低い | 非常に低い |

**推奨**:
- **予算重視**: このリポジトリ
- **時間重視**: Zapier + Buffer
- **バランス**: このリポジトリ + Zapier通知

---

## 🚀 ハイブリッドアプローチ（推奨）

最もコスパの良い方法：

```
Instagram投稿
    ↓
このリポジトリ (無料)
    ├→ 画像ダウンロード
    ├→ キャプション整形
    └→ Zapier Webhook (無料)
        ├→ Slack通知 (無料)
        ├→ メール通知 (無料)
        └→ Google スプレッドシート記録 (無料)
    ↓
手動でGBP投稿 (2-3分)
```

**メリット**:
- ✅ 完全無料
- ✅ 高度なカスタマイズ
- ✅ 複数チャンネルに通知
- ✅ スプレッドシートで記録
- ✅ 作業時間最小化

---

## 📝 まとめ

### Zapierを使うべき人

- ✅ ノーコードで実装したい
- ✅ 月$26〜の予算がある（Buffer併用）
- ✅ 技術的な知識が少ない
- ✅ 複数SNSを一括管理したい

### このリポジトリを使うべき人

- ✅ 無料で実装したい
- ✅ カスタマイズしたい
- ✅ 技術的な知識がある（Node.js基本）
- ✅ 手動投稿の2-3分は許容できる

### 両方使うべき人（ハイブリッド）

- ✅ 無料で最大の効率を求める
- ✅ 複数の通知チャンネルが欲しい
- ✅ データを記録・分析したい
- ✅ 柔軟性とコスパの両立

---

**結論**: Zapierは便利ですが、Google Business Profile APIの制約は変わりません。このリポジトリ + Zapier通知のハイブリッドアプローチが最もコスパが良いです。
