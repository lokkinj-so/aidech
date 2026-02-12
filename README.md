# Instagram → Google Business Profile 自動同期システム

Instagramの投稿を自動検出し、Google Business Profile (GBP) への投稿を自動化するNode.jsシステムです。

---

## このシステムがやること

```
Instagram投稿
    ↓ Instagram Graph API で自動検出（定期実行）
新規投稿を検出
    ↓ 画像・動画をダウンロード
    ↓ GBP用にキャプションを自動整形
    ↓ Slack / Zapier に通知
    ↓
GBPへ投稿（3つの方法から選択）
    ├── 方法A: 手動投稿（通知を受けて自分で投稿）  ← 無料
    ├── 方法B: Buffer API 経由で自動投稿            ← 安全・推奨
    └── 方法C: Puppeteer でブラウザ自動操作         ← 低コスト・リスクあり
```

---

## 使用技術

| 技術 | 用途 |
|------|------|
| **Node.js 18** | ランタイム |
| **Instagram Graph API** (v18.0) | Instagram投稿の取得 |
| **Buffer API** | GBPへの自動投稿（方法B） |
| **Puppeteer** | ブラウザ自動操作によるGBP投稿（方法C） |
| **GitHub Actions** | 無料の定期実行（cron） |
| **Slack Webhook** | 新規投稿の通知 |
| **Zapier Webhook** | 5000+アプリとの連携 |
| **node-cron** | ローカル環境での定期実行 |
| **Docker** | コンテナ化（オプション） |

---

## プロジェクト構成

```
aidech/
├── src/
│   ├── index.js                  # メイン（node-cronで定期実行）
│   ├── sync.js                   # 同期マネージャー
│   ├── sync-realistic.js         # 同期処理の実装
│   ├── config/
│   │   └── index.js              # 設定管理
│   ├── services/
│   │   ├── instagram.js          # Instagram Graph API クライアント
│   │   ├── notification.js       # Slack / Zapier への通知送信
│   │   ├── buffer.js             # Buffer API クライアント（GBP自動投稿）
│   │   ├── gbp-automation.js     # Puppeteer によるGBP自動投稿
│   │   ├── google-business.js    # GBP関連処理
│   │   ├── multi-sync.js         # 複数店舗の一括同期
│   │   └── storage.js            # データ保存
│   ├── cli/
│   │   ├── multi-sync.js         # 複数店舗同期の CLI
│   │   ├── status.js             # ステータス確認 CLI
│   │   └── buffer-setup.js       # Buffer API 接続設定 CLI
│   ├── dashboard/
│   │   └── server.js             # Webダッシュボード（ポート3000）
│   └── utils/
│       ├── logger.js             # ログ出力
│       └── state-manager.js      # 同期状態の永続化（JSON）
├── config/
│   └── locations.example.json    # 複数店舗設定のサンプル
├── .github/workflows/
│   └── instagram-sync.yml        # GitHub Actions 定期実行ワークフロー
├── .env.example                  # 環境変数のサンプル
├── package.json
├── Dockerfile
└── docker-compose.yml
```

---

## セットアップ

### 前提条件

- Node.js 18.x 以上
- Instagram ビジネスアカウント
- Facebook Developer アカウント（Instagram Graph API 用）

### 1. インストール

```bash
git clone <repository-url>
cd aidech
npm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env` を編集して、必要な値を設定します。

#### 必須設定

```env
# Instagram Graph API（SETUP_GUIDE.md を参照して取得）
INSTAGRAM_ACCESS_TOKEN=your_token
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_account_id
```

#### 通知設定（いずれか1つ以上を設定）

```env
# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Zapier（5000+アプリ連携）
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/xxxxx/yyyyy/
```

#### 自動投稿設定（方法B: Buffer API を使う場合）

```env
AUTO_POST_TO_GBP=true
BUFFER_ACCESS_TOKEN=your_buffer_token
BUFFER_AUTO_PUBLISH=true
```

#### 自動投稿設定（方法C: Puppeteer を使う場合）

```env
AUTO_POST_TO_GBP=true
USE_PUPPETEER=true
GOOGLE_EMAIL=your_google_email
GOOGLE_PASSWORD=your_google_password
```

#### その他

```env
MEDIA_DOWNLOAD_PATH=./downloads    # メディア保存先
SYNC_INTERVAL_MINUTES=30           # ローカル実行時の同期間隔
DASHBOARD_PORT=3000                # ダッシュボードのポート
LOG_LEVEL=info                     # ログレベル（info / debug）
TIMEZONE=Asia/Tokyo
```

### 3. 動作確認

```bash
# 1回だけ同期を実行
npm run sync
```

---

## コマンド一覧

| コマンド | 説明 |
|---------|------|
| `npm run sync` | 1回だけ同期を実行 |
| `npm start` | 定期実行モード（node-cronで30分ごと） |
| `npm run sync:multi` | 複数店舗を一括同期 |
| `npm run sync:status` | 全店舗のステータス確認 |
| `npm run buffer:connect` | Buffer API の接続設定 |
| `npm run dashboard` | Webダッシュボードを起動（localhost:3000） |
| `npm run dev` | 開発モード（ファイル変更で自動再起動） |
| `npm test` | テスト実行 |

---

## 3つの自動化方法

### 方法A: 通知 + 手動投稿（無料）

GitHub Actions（無料）で定期実行し、Slack等に通知。メディアをダウンロードして手動でGBPに投稿します。

```
処理の流れ:
1. GitHub Actions が2時間ごとに実行
2. Instagram Graph API で新規投稿を検出
3. 画像・動画をダウンロード
4. GBP用にキャプションを整形（1500文字制限、ハッシュタグ5個まで）
5. Slack / Zapier に通知
6. → 自分でGBPに投稿（2〜3分/投稿）
```

**コスト**: 無料（GitHub Actions 月2,000分の無料枠内）

**セットアップ**:

1. GitHubリポジトリにプッシュ
2. Settings → Secrets に環境変数を追加:
   - `INSTAGRAM_ACCESS_TOKEN`
   - `INSTAGRAM_BUSINESS_ACCOUNT_ID`
   - `SLACK_WEBHOOK_URL`（任意）
3. GitHub Actions が自動で2時間ごとに実行される

ワークフロー定義: `.github/workflows/instagram-sync.yml`

---

### 方法B: Buffer API 自動投稿（推奨）

[Buffer](https://buffer.com/) を経由してGBPに自動投稿します。公式のGBP連携なのでアカウント凍結リスクがありません。

```
処理の流れ:
1. Instagram Graph API で新規投稿を検出
2. メディアとキャプションを取得
3. Buffer API に投稿を送信
4. Buffer が GBP に自動投稿
5. → 完全自動（作業不要）
```

**コスト**: Buffer料金 $6〜500/月（店舗数による）

**セットアップ**:

```bash
# 1. Buffer でアカウント作成 → GBP を接続
# 2. Buffer API トークンを取得
# 3. 接続設定
npm run buffer:connect

# 4. .env に追加
# AUTO_POST_TO_GBP=true
# BUFFER_ACCESS_TOKEN=your_token
# BUFFER_AUTO_PUBLISH=true

# 5. テスト実行
npm run sync
```

**関連コード**: `src/services/buffer.js`

---

### 方法C: Puppeteer ブラウザ自動操作（低コスト・リスクあり）

Puppeteer（ヘッドレスChrome）でGBPの管理画面を自動操作して投稿します。

```
処理の流れ:
1. Instagram Graph API で新規投稿を検出
2. Puppeteer で Google アカウントにログイン
3. GBP管理画面で投稿を自動作成
4. 画像アップロード + キャプション入力 + 投稿
5. → 完全自動（作業不要）
```

**コスト**: VPS $50/月 + プロキシ $20/月 = 約 $70/月

**注意点**:
- Google利用規約のグレーゾーン
- アカウント凍結リスクあり（低確率だがゼロではない）
- GoogleのUI変更で動作しなくなる可能性がある
- 2段階認証があると追加対応が必要

**セットアップ**:

```bash
# VPS上で実行（Ubuntu 22.04推奨）
npm install puppeteer
sudo apt-get install chromium-browser

# .env に追加
# AUTO_POST_TO_GBP=true
# USE_PUPPETEER=true
# GOOGLE_EMAIL=your_email
# GOOGLE_PASSWORD=your_password

# テスト実行
npm run sync
```

**関連コード**: `src/services/gbp-automation.js`

---

## 複数店舗の管理

100店舗以上の一括管理に対応しています。

### 設定ファイル

`config/locations.json` を作成:

```json
{
  "locations": [
    {
      "id": "shibuya",
      "name": "渋谷店",
      "active": true,
      "instagram_token": "token_1",
      "instagram_account_id": "account_1",
      "buffer_profile_id": "buffer_profile_1",
      "gbp_location_id": "gbp_location_1"
    },
    {
      "id": "shinjuku",
      "name": "新宿店",
      "active": true,
      "instagram_token": "token_2",
      "instagram_account_id": "account_2",
      "buffer_profile_id": "buffer_profile_2",
      "gbp_location_id": "gbp_location_2"
    }
  ],
  "settings": {
    "batch_size": 10,
    "batch_delay_ms": 5000
  }
}
```

### 実行

```bash
# 全店舗を一括同期
npm run sync:multi

# ステータス確認
npm run sync:status
```

**関連コード**: `src/services/multi-sync.js`, `src/cli/multi-sync.js`

---

## Webダッシュボード

手動投稿（方法A）のときに便利な管理画面です。

```bash
npm run dashboard
# → http://localhost:3000
```

**機能**:
- 保留中の投稿一覧を表示
- キャプションのプレビュー
- 「GBPに投稿済み」マーク機能
- 統計情報（処理済み / 保留中 / 投稿済み）
- 30秒ごとに自動更新

**関連コード**: `src/dashboard/server.js`

---

## 処理の詳細

### Instagram投稿の取得

Instagram Graph API (v18.0) を使って最新20件の投稿を取得します。

- 対応メディアタイプ: IMAGE, VIDEO, CAROUSEL_ALBUM
- カルーセル投稿は子メディアも個別に取得
- 取得フィールド: id, caption, media_type, media_url, permalink, thumbnail_url, timestamp

**関連コード**: `src/services/instagram.js`

### キャプションの整形

- GBPの文字数制限（1500文字）に合わせてトリミング
- ハッシュタグが5個を超える場合、先頭5個のみ残す

### 状態管理

処理済みの投稿IDをJSONファイルで管理し、同じ投稿を二重処理しません。

- `pending_manual_post`: 検出済み・GBP未投稿
- `posted`: GBP投稿済み

**関連コード**: `src/utils/state-manager.js`

### 通知

新規投稿の検出時と同期完了時に通知を送信します。

- **Slack**: Block Kit形式のリッチメッセージ（画像プレビュー付き）
- **Zapier**: Webhook でデータ送信（5000+アプリ連携可能）
- **メール**: 実装プレースホルダあり（SMTP/SendGrid等で拡張可能）

**関連コード**: `src/services/notification.js`

---

## GitHub Actions の設定

`.github/workflows/instagram-sync.yml` で2時間ごとに自動実行されます。

```yaml
# 実行スケジュールの変更例
schedule:
  - cron: '0 */2 * * *'    # 2時間ごと（デフォルト）
  # - cron: '*/30 * * * *' # 30分ごと
  # - cron: '0 * * * *'    # 1時間ごと
```

**処理内容**:
1. Node.js 18 セットアップ
2. 依存関係インストール
3. GitHub Secrets から `.env` を生成
4. 同期実行
5. ダウンロードしたメディアをArtifactsとして保存（30日間）
6. 同期状態をリポジトリにコミット

**GitHub Secrets に登録する値**:
- `INSTAGRAM_ACCESS_TOKEN`
- `INSTAGRAM_BUSINESS_ACCOUNT_ID`
- `SLACK_WEBHOOK_URL`（任意）
- `ZAPIER_WEBHOOK_URL`（任意）
- `BUFFER_ACCESS_TOKEN`（方法Bの場合）

---

## Docker での実行

```bash
# ビルド & 起動
docker-compose up -d

# ログ確認
docker-compose logs -f
```

---

## トラブルシューティング

### Instagram API エラー

```
Error: Invalid Instagram Business Account ID
```

→ ビジネスアカウントID が正しいか確認。個人アカウントではなくビジネスアカウントが必要です。Instagram API の設定手順は `SETUP_GUIDE.md` を参照してください。

### Buffer 接続エラー

```bash
# 接続状態を確認
npm run buffer:connect

# BUFFER_ACCESS_TOKEN が正しいか確認
```

### Puppeteer エラー

```bash
# Chromium がインストールされているか確認
which chromium-browser

# なければインストール
sudo apt-get install chromium-browser
```

### GitHub Actions が動かない

- リポジトリの Settings → Secrets に環境変数が登録されているか確認
- Actions タブでワークフローが有効になっているか確認
- 無料枠（月2,000分）を超えていないか確認

---

## 関連ドキュメント

| ファイル | 内容 |
|---------|------|
| [SETUP_GUIDE.md](./SETUP_GUIDE.md) | Instagram API の取得手順 |
| [AUTOMATION_GUIDE.md](./AUTOMATION_GUIDE.md) | GitHub Actions の詳細設定 |
| [ENTERPRISE_SCALE.md](./ENTERPRISE_SCALE.md) | 100店舗以上の運用ガイド |
| [ZAPIER_INTEGRATION.md](./ZAPIER_INTEGRATION.md) | Zapier 連携の設定方法 |
| [REALISTIC_ALTERNATIVES.md](./REALISTIC_ALTERNATIVES.md) | GBP API の制約と代替手段 |
| [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) | 実装の詳細ガイド |

---

## セキュリティ

- `.env` ファイルは Git にコミットしない（`.gitignore` に含まれている）
- Instagram Access Token は定期的に更新する
- Webhook URL は外部に公開しない
- Puppeteer 使用時は VPN / プロキシを推奨

---

## ライセンス

MIT License
