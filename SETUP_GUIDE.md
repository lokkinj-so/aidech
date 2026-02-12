# セットアップガイド

このドキュメントでは、Instagram to Google Business Profile Automationの詳細なセットアップ手順を説明します。

## 目次

1. [Instagram Graph API のセットアップ](#instagram-graph-api-のセットアップ)
2. [Google Business Profile API のセットアップ](#google-business-profile-api-のセットアップ)
3. [アプリケーションの設定](#アプリケーションの設定)
4. [動作確認](#動作確認)

## Instagram Graph API のセットアップ

### ステップ 1: Facebook Developer アカウントの作成

1. [Facebook Developers](https://developers.facebook.com/) にアクセス
2. Facebookアカウントでログイン
3. 開発者として登録（初回のみ）

### ステップ 2: Facebook アプリの作成

1. ダッシュボードから「アプリを作成」をクリック
2. **アプリタイプ**: 「ビジネス」を選択
3. **アプリ表示名**: 任意の名前を入力（例: `Instagram to GBP Sync`）
4. **アプリの連絡先メールアドレス**: あなたのメールアドレス
5. **ビジネスアカウント**: 既存のビジネスアカウントを選択または新規作成
6. 「アプリを作成」をクリック

### ステップ 3: Instagram を製品として追加

1. アプリダッシュボードの左サイドバーから「製品を追加」をクリック
2. 「Instagram」を見つけて「設定」をクリック
3. Instagram Graph API が有効化されます

### ステップ 4: Instagram ビジネスアカウントの接続

**前提条件**:
- Instagramのビジネスアカウントが必要
- そのビジネスアカウントがFacebookページに接続されている必要があります

**Instagramをビジネスアカウントに変換**:
1. Instagramアプリを開く
2. プロフィールページに移動
3. メニュー（三本線）→「設定」→「アカウント」
4. 「プロフェッショナルアカウントに切り替える」を選択
5. 「ビジネス」を選択してセットアップを完了

**FacebookページにInstagramを接続**:
1. Facebookページの設定に移動
2. 「Instagram」セクションを見つける
3. 「アカウントを接続」をクリック
4. Instagramのログイン情報を入力

### ステップ 5: アクセストークンの取得

#### 短期トークンの取得:

1. [Graph API Explorer](https://developers.facebook.com/tools/explorer/) にアクセス
2. 右上のアプリドロップダウンから作成したアプリを選択
3. 「アクセス許可を取得」をクリック
4. 以下の権限を選択:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`
5. 「アクセストークンを生成」をクリック
6. 表示されたトークンをコピー

#### 長期トークンへの変換（推奨）:

短期トークン（1時間有効）を長期トークン（60日間有効）に変換します。

```bash
curl -i -X GET "https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=YOUR_SHORT_LIVED_TOKEN"
```

**パラメータ**:
- `YOUR_APP_ID`: アプリダッシュボードで確認できるApp ID
- `YOUR_APP_SECRET`: アプリダッシュボードの「設定」→「ベーシック」で確認できるApp Secret
- `YOUR_SHORT_LIVED_TOKEN`: 前のステップで取得した短期トークン

レスポンス例:
```json
{
  "access_token": "長期トークン",
  "token_type": "bearer",
  "expires_in": 5183999
}
```

### ステップ 6: Instagram Business Account ID の取得

```bash
curl -X GET "https://graph.facebook.com/v18.0/me/accounts?fields=instagram_business_account&access_token=YOUR_LONG_LIVED_TOKEN"
```

レスポンス例:
```json
{
  "data": [
    {
      "instagram_business_account": {
        "id": "17841400000000000"
      },
      "id": "1234567890"
    }
  ]
}
```

`instagram_business_account.id` の値（例: `17841400000000000`）をメモしてください。

### アクセストークンの自動更新（オプション）

長期トークンは60日間有効ですが、定期的に使用すれば自動的に更新されます。
毎日API呼び出しを行うことで、トークンを有効に保つことができます。

## Google Business Profile API のセットアップ

### ステップ 1: Google Cloud Project の作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 右上の「プロジェクトを選択」をクリック
3. 「新しいプロジェクト」をクリック
4. **プロジェクト名**: 任意の名前を入力（例: `instagram-gbp-sync`）
5. 「作成」をクリック

### ステップ 2: Google Business Profile API の有効化

1. 左サイドバーから「APIとサービス」→「ライブラリ」を選択
2. 検索バーで「Google My Business」を検索
3. 以下のAPIを有効化:
   - **Google My Business API**
   - **Google My Business Account Management API**
   - **Google Business Profile API**

各APIをクリックして「有効にする」ボタンを押します。

### ステップ 3: サービスアカウントの作成

1. 左サイドバーから「IAMと管理」→「サービスアカウント」を選択
2. 「サービスアカウントを作成」をクリック
3. **サービスアカウント名**: `instagram-gbp-sync`
4. **サービスアカウントID**: 自動生成される（例: `instagram-gbp-sync@project-id.iam.gserviceaccount.com`）
5. **説明**: `Instagram to GBP synchronization service`
6. 「作成して続行」をクリック
7. **ロールを選択**:
   - 「基本」→「編集者」を選択
   - または「Google My Business」→「Business Profile API Admin」を選択
8. 「続行」をクリック
9. 「完了」をクリック

### ステップ 4: サービスアカウントキーの生成

1. 作成したサービスアカウントをクリック
2. 上部の「キー」タブを選択
3. 「鍵を追加」→「新しい鍵を作成」をクリック
4. **キーのタイプ**: JSON を選択
5. 「作成」をクリック
6. JSONファイルが自動的にダウンロードされます

### ステップ 5: 認証情報ファイルの配置

```bash
# プロジェクトルートで実行
mkdir -p credentials
mv ~/Downloads/project-id-xxxxx.json credentials/google-service-account.json
chmod 600 credentials/google-service-account.json
```

### ステップ 6: Google Business Profile へのアクセス許可

1. [Google Business Profile](https://business.google.com/) にアクセス
2. 管理するビジネスを選択
3. 左サイドバーから「設定」→「ユーザー」を選択
4. 「ユーザーを招待」をクリック
5. サービスアカウントのメールアドレス（`*@*.iam.gserviceaccount.com`）を入力
6. **役割**: 「オーナー」または「管理者」を選択
7. 「招待」をクリック

### ステップ 7: Account ID と Location ID の取得

#### 方法 1: API 経由で取得

```bash
# まず、gcloud CLI をインストール
# https://cloud.google.com/sdk/docs/install

# サービスアカウントで認証
gcloud auth activate-service-account --key-file=credentials/google-service-account.json

# アカウント一覧を取得
gcloud alpha mybusiness accounts list

# ロケーション一覧を取得（ACCOUNT_IDを置き換えてください）
gcloud alpha mybusiness locations list --account=ACCOUNT_ID
```

#### 方法 2: Google Business Profile Manager 経由

1. [Google Business Profile Manager](https://business.google.com/) にアクセス
2. URLを確認: `https://business.google.com/u/0/locations/LOCATION_ID`
3. URLの `LOCATION_ID` 部分が Location ID です

#### 方法 3: API Explorer を使用

```bash
# アクセストークンを取得
gcloud auth activate-service-account --key-file=credentials/google-service-account.json
gcloud auth print-access-token

# アカウント一覧を取得
curl -X GET \
  'https://mybusinessaccountmanagement.googleapis.com/v1/accounts' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'

# ロケーション一覧を取得
curl -X GET \
  'https://mybusinessbusinessinformation.googleapis.com/v1/accounts/ACCOUNT_ID/locations' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

レスポンスから `name` フィールドの値をメモします:
- Account ID: `accounts/123456789`
- Location ID: `locations/987654321`

## アプリケーションの設定

### ステップ 1: 依存関係のインストール

```bash
npm install
```

### ステップ 2: 環境変数ファイルの作成

```bash
cp .env.example .env
```

### ステップ 3: .env ファイルの編集

```env
# Instagram Graph API Configuration
INSTAGRAM_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
INSTAGRAM_BUSINESS_ACCOUNT_ID=17841400000000000

# Google Business Profile API Configuration
GOOGLE_APPLICATION_CREDENTIALS=./credentials/google-service-account.json
GOOGLE_BUSINESS_ACCOUNT_ID=accounts/123456789
GOOGLE_BUSINESS_LOCATION_ID=locations/987654321

# Sync Configuration
SYNC_INTERVAL_MINUTES=30
TIMEZONE=Asia/Tokyo

# Logging
LOG_LEVEL=info
```

**各値の説明**:
- `INSTAGRAM_ACCESS_TOKEN`: Instagram Graph APIの長期アクセストークン
- `INSTAGRAM_BUSINESS_ACCOUNT_ID`: Instagramビジネスアカウントのインスタグラム数値ID
- `GOOGLE_APPLICATION_CREDENTIALS`: Googleサービスアカウントの認証情報ファイルのパス
- `GOOGLE_BUSINESS_ACCOUNT_ID`: Google Business Profileのアカウント ID（`accounts/` プレフィックス付き）
- `GOOGLE_BUSINESS_LOCATION_ID`: Google Business Profileのロケーション ID（`locations/` プレフィックス付き）
- `SYNC_INTERVAL_MINUTES`: 同期の実行間隔（分単位）
- `TIMEZONE`: タイムゾーン
- `LOG_LEVEL`: ログレベル（`error`, `warn`, `info`, `debug`）

## 動作確認

### テスト実行

```bash
# 一度だけ同期を実行してテスト
npm run sync
```

期待される出力:
```
[2024-01-15T10:00:00.000Z] [INFO] Initializing sync manager...
[2024-01-15T10:00:00.100Z] [INFO] State loaded successfully
[2024-01-15T10:00:00.200Z] [INFO] Google Business Profile API initialized
[2024-01-15T10:00:00.300Z] [INFO] Sync manager initialized
[2024-01-15T10:00:00.400Z] [INFO] Starting sync process...
[2024-01-15T10:00:01.000Z] [INFO] Found 10 Instagram posts
[2024-01-15T10:00:01.100Z] [INFO] Processing post: 18123456789012345 (IMAGE)
[2024-01-15T10:00:02.000Z] [INFO] ✓ Successfully synced post 18123456789012345
...
[2024-01-15T10:00:10.000Z] [INFO] Sync process completed
[2024-01-15T10:00:10.000Z] [INFO] Summary: 5 synced, 3 skipped, 0 errors
```

### 自動同期の開始

```bash
# 定期的な自動同期を開始
npm start
```

期待される出力:
```
[2024-01-15T10:00:00.000Z] [INFO] Starting Instagram to GBP Automation...
[2024-01-15T10:00:00.100Z] [INFO] Configuration validated
[2024-01-15T10:00:00.200Z] [INFO] Application initialized successfully
[2024-01-15T10:00:00.300Z] [INFO] Starting scheduler with interval: 30 minutes
[2024-01-15T10:00:00.300Z] [INFO] Cron expression: */30 * * * *
[2024-01-15T10:00:00.400Z] [INFO] Scheduler started successfully
[2024-01-15T10:00:00.400Z] [INFO] Press Ctrl+C to stop
```

### よくある問題と解決方法

#### 問題 1: Instagram API エラー

```
Error: (#190) This method must be called with a Page Access Token
```

**解決方法**: ページアクセストークンではなく、ユーザーアクセストークンを使用している可能性があります。上記の手順でトークンを再取得してください。

#### 問題 2: Google API エラー

```
Error: Unable to read the file: ./credentials/google-service-account.json
```

**解決方法**:
- ファイルパスが正しいか確認
- ファイルが存在するか確認: `ls -la credentials/`
- ファイルの読み取り権限を確認: `chmod 600 credentials/google-service-account.json`

#### 問題 3: 権限エラー

```
Error: The caller does not have permission
```

**解決方法**: サービスアカウントがGoogle Business Profileへのアクセス権を持っているか確認してください。

## 本番環境へのデプロイ

本番環境では、環境変数を安全に管理してください:

- **AWS**: AWS Secrets Managerを使用
- **GCP**: Secret Managerを使用
- **Heroku**: Config Varsを使用
- **Docker**: Docker Secretsを使用

セキュリティのベストプラクティス:
1. 認証情報をコードにハードコードしない
2. `.env` ファイルをGitにコミットしない
3. アクセストークンを定期的にローテーションする
4. 最小権限の原則に従う
5. ログに機密情報を出力しない

---

これでセットアップは完了です。問題が発生した場合は、GitHubのIssuesで報告してください。
