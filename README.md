# Instagram to Google Business Profile - 通知システム

> ⚠️ **重要**: Google Business Profile APIは一般ユーザーが使用できません。このシステムは**通知 + データ準備**アプローチを採用しており、Instagram投稿を自動検出して、GBPへの投稿作業を90%効率化します。

InstagramとGoogle Business Profileを連携し、投稿作業を半自動化するシステムです。

## 🎯 このシステムができること

✅ **完全自動**:
- Instagram投稿の自動検出
- 画像・動画の自動ダウンロード
- GBP用キャプションの自動フォーマット
- 通知の自動送信（Slack/LINE/メール）

✨ **半自動** (あなたの作業):
- Webダッシュボードで投稿内容を確認
- Google Business Profileに手動で投稿（2-3分/投稿）

**作業時間**: 従来の10分/投稿 → **2-3分/投稿に短縮**

## 🚨 なぜGoogle Business Profile APIは使えないのか？

[REALISTIC_ALTERNATIVES.md](./REALISTIC_ALTERNATIVES.md) を参照してください。

簡単に言うと:
- Google Business Profile APIの投稿作成機能はGoogle公式パートナーのみが使用可能
- 一般の開発者やスモールビジネスはアクセス不可
- ブラウザ自動化は利用規約違反のリスクあり

## 📋 前提条件

- Node.js 16.x 以上
- Instagram ビジネスアカウント
- Facebook Developer アカウント
- Google Business Profile アカウント（手動投稿用）

## 🚀 クイックスタート

### 1. インストール

```bash
git clone <repository-url>
cd instagram-gbp-automation
npm install
```

### 2. Instagram API設定

`.env.example` をコピーして `.env` を作成:

```bash
cp .env.example .env
```

Instagram Access Tokenの取得方法は [SETUP_GUIDE.md](./SETUP_GUIDE.md) を参照。

### 3. 通知設定（いずれかを設定）

**Slack通知**:
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

**LINE通知**:
```env
LINE_NOTIFY_TOKEN=your_line_notify_token_here
```

### 4. 実行

**ダッシュボードを起動**:
```bash
npm run dashboard
```

ブラウザで http://localhost:3000 を開く

**バックグラウンドで同期を開始**:
```bash
npm run sync
```

または定期実行:
```bash
npm start  # 30分ごとに自動実行
```

## 📊 使い方

### ワークフロー

1. **自動**: システムがInstagram投稿を検出
2. **自動**: 画像とキャプションをダウンロード
3. **自動**: Slack/LINEに通知
4. **手動**: ダッシュボードで内容確認
5. **手動**: Google Business Profileに投稿（2-3分）
6. **手動**: ダッシュボードで「投稿完了」をマーク

### ダッシュボードの使い方

1. http://localhost:3000 にアクセス
2. 保留中の投稿一覧が表示される
3. 各投稿で以下が確認できる:
   - Instagram投稿のキャプション
   - ダウンロード済み画像の保存場所
   - 投稿日時
4. 画像を `downloads/posts/{投稿ID}/` から取得
5. Google Business Profileに手動で投稿
6. 「GBPに投稿完了」ボタンをクリック

## 🔔 通知の設定

### Slack通知

1. Slack Workspaceの設定に移動
2. 「アプリを追加」→「Incoming Webhooks」を検索
3. チャンネルを選択してWebhook URLを取得
4. `.env` に設定:
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX
```

### LINE通知

1. [LINE Notify](https://notify-bot.line.me/) にアクセス
2. 「マイページ」→「トークンを発行する」
3. トークン名を入力（例: Instagram to GBP）
4. 通知先を選択
5. `.env` に設定:
```env
LINE_NOTIFY_TOKEN=your_token_here
```

### Zapier連携（推奨）

Zapierを使えば、さらに多くのサービスと連携できます。

1. [Zapier](https://zapier.com/) でアカウント作成
2. 「Create Zap」→「Webhooks by Zapier」を選択
3. 「Catch Hook」を選択してWebhook URLを取得
4. `.env` に設定:
```env
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/xxxxx/yyyyy/
```
5. `npm run sync` でテスト実行
6. Zapierで好きなActionを追加（Slack、Buffer、Hootsuite等）

詳細は [ZAPIER_INTEGRATION.md](./ZAPIER_INTEGRATION.md) を参照。

## 📁 プロジェクト構造

```
instagram-gbp-automation/
├── src/
│   ├── services/
│   │   ├── instagram.js          # Instagram API
│   │   └── notification.js       # 通知システム
│   ├── dashboard/
│   │   └── server.js             # Webダッシュボード
│   ├── utils/
│   │   ├── state-manager.js      # 状態管理
│   │   └── logger.js             # ロギング
│   └── sync-realistic.js         # メイン同期ロジック
├── downloads/                     # ダウンロード済みメディア
│   └── posts/
│       └── {投稿ID}/
│           ├── image_0.jpg
│           ├── post-data.json
│           └── gbp-caption.txt
├── .env                          # 環境変数
└── README.md
```

## ⚙️ 設定オプション

### 同期間隔の変更

```env
SYNC_INTERVAL_MINUTES=60  # 60分ごとに同期
```

### ダウンロード先の変更

```env
MEDIA_DOWNLOAD_PATH=./my-downloads
```

### ログレベルの変更

```env
LOG_LEVEL=debug  # error, warn, info, debug
```

## 🎯 実際の運用例

### 小規模ビジネス（1日1-2投稿）

```bash
# 朝一度だけ手動実行
npm run sync

# ダッシュボードを開く
npm run dashboard

# 通知を確認してGBPに投稿
```

### 中規模ビジネス（1日3-5投稿）

```bash
# バックグラウンドで自動実行（30分ごと）
npm start &

# 必要に応じてダッシュボードを開く
npm run dashboard
```

### Docker での実行

```bash
# Docker Compose で起動
docker-compose up -d

# ログを確認
docker-compose logs -f
```

## 📊 コスト比較

| ソリューション | 初期 | 月額 | 作業時間/投稿 |
|-------------|-----|------|-----------|
| **このシステム** | 無料 | 無料 | 2-3分 |
| 完全手動 | 無料 | 無料 | 10-15分 |
| Buffer | 無料 | $6~ | 1分 |
| Hootsuite | 無料 | $99~ | 1分 |

## 🔒 セキュリティ

- `.env` ファイルは絶対にGitにコミットしない
- Instagram Access Tokenを定期的に更新
- ダウンロードした画像を適切に管理
- Webhook URLを公開しない

## 🐛 トラブルシューティング

### Instagram APIエラー

```
Error: Invalid Instagram Business Account ID
```

→ ビジネスアカウントIDが正しいか確認。個人アカウントではなくビジネスアカウントが必要。

### 通知が届かない

→ `.env` の設定を確認。Slack Webhook URLやLINE Tokenが正しいか確認。

### ダッシュボードが開かない

```bash
# ポートが既に使用されている場合
DASHBOARD_PORT=3001 npm run dashboard
```

## 📚 さらに詳しく

- [REALISTIC_ALTERNATIVES.md](./REALISTIC_ALTERNATIVES.md) - API制約と代替案の詳細
- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Instagram APIの詳細セットアップ

## 🤝 コントリビューション

プルリクエストは歓迎します。

## 📄 ライセンス

MIT License

## 💡 なぜこのアプローチなのか？

完全自動化は理想的ですが、Google Business Profile APIの制約により実現不可能です。このシステムは:

✅ **合法的**: Google/Instagram の利用規約に準拠
✅ **実用的**: 90%の作業時間削減
✅ **無料**: APIコストなし
✅ **安全**: アカウント凍結のリスクなし
✅ **柔軟**: 投稿前に内容を確認可能

**結論**: 完全自動ではないが、最も現実的で効果的なソリューションです。

---

**注意**: 大規模運用には有料のエンタープライズツール（Hootsuite, Buffer等）を検討してください。
