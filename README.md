# Instagram to Google Business Profile Automation

InstagramとGoogle Business Profile (旧Google My Business)を自動連携し、Instagramの投稿を自動的にGBPに同期するシステムです。

## 🌟 機能

- ✅ Instagramの新規投稿を自動検出
- ✅ 画像・動画・カルーセル投稿に対応
- ✅ キャプション（本文）の自動転送
- ✅ 定期的な自動同期（カスタマイズ可能）
- ✅ 重複投稿の防止
- ✅ 同期履歴の管理
- ✅ エラーハンドリングとロギング

## 📋 前提条件

- Node.js 16.x 以上
- Instagram ビジネスアカウント
- Facebook Developer アカウント
- Google Cloud Platform アカウント
- Google Business Profile (登録済みビジネス)

## 🚀 セットアップ

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd instagram-gbp-automation
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. Instagram Graph API の設定

#### 3.1 Facebook App の作成

1. [Facebook Developers](https://developers.facebook.com/) にアクセス
2. 「アプリを作成」をクリック
3. アプリタイプとして「ビジネス」を選択
4. アプリ名を入力して作成

#### 3.2 Instagram Graph API の有効化

1. 左サイドバーから「製品を追加」を選択
2. 「Instagram」を追加
3. 「Instagram Graph API」を有効化

#### 3.3 アクセストークンの取得

1. 「ツール」→「グラフAPIエクスプローラー」にアクセス
2. アプリを選択
3. 権限を追加:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_read_engagement`
4. 「Generate Access Token」をクリック
5. 長期アクセストークンに変換（推奨）

#### 3.4 Instagram Business Account ID の取得

```bash
curl -X GET "https://graph.facebook.com/v18.0/me/accounts?access_token=YOUR_ACCESS_TOKEN"
```

レスポンスから `instagram_business_account` の `id` を取得します。

### 4. Google Business Profile API の設定

#### 4.1 Google Cloud Project の作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成
3. 「APIとサービス」→「ライブラリ」に移動

#### 4.2 必要な API の有効化

以下のAPIを有効化してください：
- Google Business Profile API (旧Google My Business API)
- Google My Business Account Management API

#### 4.3 サービスアカウントの作成

1. 「IAMと管理」→「サービスアカウント」に移動
2. 「サービスアカウントを作成」をクリック
3. サービスアカウント名を入力（例: `instagram-gbp-sync`）
4. 「作成して続行」をクリック
5. ロールを選択: `Business Profile API Admin`
6. 「完了」をクリック

#### 4.4 認証情報のダウンロード

1. 作成したサービスアカウントをクリック
2. 「キー」タブに移動
3. 「鍵を追加」→「新しい鍵を作成」
4. JSON形式を選択してダウンロード
5. ダウンロードしたファイルを `credentials/google-service-account.json` として保存

```bash
mkdir credentials
mv ~/Downloads/your-service-account-key.json credentials/google-service-account.json
```

#### 4.5 Location ID の取得

```bash
# サービスアカウントで認証後
gcloud auth activate-service-account --key-file=credentials/google-service-account.json

# アカウントIDを取得
gcloud mybusiness accounts list

# ロケーションIDを取得
gcloud mybusiness locations list --account=ACCOUNT_ID
```

または、[Google Business Profile Manager](https://business.google.com/) から確認できます。

### 5. 環境変数の設定

`.env.example` をコピーして `.env` ファイルを作成します。

```bash
cp .env.example .env
```

`.env` ファイルを編集して、必要な情報を入力します：

```env
# Instagram Graph API Configuration
INSTAGRAM_ACCESS_TOKEN=your_instagram_access_token_here
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_instagram_business_account_id_here

# Google Business Profile API Configuration
GOOGLE_APPLICATION_CREDENTIALS=./credentials/google-service-account.json
GOOGLE_BUSINESS_ACCOUNT_ID=accounts/1234567890
GOOGLE_BUSINESS_LOCATION_ID=locations/1234567890

# Sync Configuration
SYNC_INTERVAL_MINUTES=30
TIMEZONE=Asia/Tokyo

# Logging
LOG_LEVEL=info
```

## 📖 使用方法

### 手動同期の実行

一度だけ同期を実行する場合：

```bash
npm run sync
```

### 自動同期の開始

定期的に自動同期を実行する場合：

```bash
npm start
```

これにより、`SYNC_INTERVAL_MINUTES` で設定した間隔（デフォルト: 30分）で自動的に同期が実行されます。

### 開発モード

ファイル変更時に自動再起動する開発モードで実行：

```bash
npm run dev
```

### 停止方法

`Ctrl+C` を押してプロセスを停止します。

## 📁 プロジェクト構造

```
instagram-gbp-automation/
├── src/
│   ├── config/
│   │   └── index.js              # 設定管理
│   ├── services/
│   │   ├── instagram.js          # Instagram API クライアント
│   │   └── google-business.js    # Google Business Profile API クライアント
│   ├── utils/
│   │   ├── state-manager.js      # 同期状態管理
│   │   └── logger.js             # ロギングユーティリティ
│   ├── sync.js                   # メイン同期ロジック
│   └── index.js                  # アプリケーションエントリーポイント
├── credentials/
│   └── google-service-account.json  # Google認証情報（.gitignoreに含まれる）
├── data/
│   └── sync-state.json           # 同期履歴（自動生成）
├── .env                          # 環境変数（.gitignoreに含まれる）
├── .env.example                  # 環境変数のテンプレート
├── .gitignore
├── package.json
└── README.md
```

## 🔧 設定オプション

### 同期間隔の変更

`.env` ファイルの `SYNC_INTERVAL_MINUTES` を変更します：

```env
SYNC_INTERVAL_MINUTES=60  # 60分（1時間）ごとに同期
```

### ログレベルの変更

デバッグ情報を表示したい場合：

```env
LOG_LEVEL=debug
```

利用可能なログレベル: `error`, `warn`, `info`, `debug`

## 📊 同期の仕組み

1. **投稿の取得**: Instagram Graph APIから最新の投稿を取得
2. **重複チェック**: 既に同期済みの投稿をスキップ
3. **データ変換**: Instagram投稿をGoogle Business Profile形式に変換
4. **メディア処理**: 画像・動画・カルーセルを適切に処理
5. **投稿作成**: Google Business Profile APIで投稿を作成
6. **状態保存**: 同期履歴を保存して重複を防止

## ⚠️ 注意事項

### API制限

- **Instagram Graph API**: レート制限があります（通常は200リクエスト/時間）
- **Google Business Profile API**: 1日あたりのクォータ制限があります

### 投稿の制約

- Google Business Profileの投稿には文字数制限（1500文字）があります
- 一部のInstagram投稿タイプ（ストーリーズなど）は同期されません
- メディアファイルのサイズや形式に制限がある場合があります

### セキュリティ

- `.env` ファイルと `credentials/` ディレクトリは絶対にGitにコミットしないでください
- アクセストークンは定期的に更新することを推奨します
- 本番環境では環境変数を安全に管理してください

## 🐛 トラブルシューティング

### Instagram APIのエラー

```
Error: Invalid Instagram Business Account ID
```

→ Instagram Business Account IDが正しいか確認してください。個人アカウントではなく、ビジネスアカウントである必要があります。

### Google APIのエラー

```
Error: Failed to initialize Google Business API
```

→ サービスアカウントの認証情報が正しいか、APIが有効化されているか確認してください。

### 同期が実行されない

→ `.env` ファイルが正しく設定されているか、`npm start` でアプリケーションが起動しているか確認してください。

### ログの確認

詳細なログを確認したい場合は、ログレベルを `debug` に設定してください：

```bash
LOG_LEVEL=debug npm start
```

## 🚀 デプロイ

### Docker での実行

Dockerfileを作成して、コンテナ化して実行することもできます。

### クラウドでの実行

- **AWS Lambda**: 定期的なトリガーで実行
- **Google Cloud Functions**: Cloud Schedulerと組み合わせて実行
- **Heroku**: Worker dynoとして実行

## 📄 ライセンス

MIT License

## 🤝 コントリビューション

プルリクエストは歓迎します。大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## 📞 サポート

問題が発生した場合は、GitHubのIssuesで報告してください。

---

**注意**: このツールは個人利用または小規模ビジネス向けです。大規模な運用を行う場合は、API制限やコスト、パフォーマンスを考慮してください。
