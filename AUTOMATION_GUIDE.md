# 完全自動化ガイド 🤖

このガイドでは、**完全無料**でInstagram → GBP自動化を実現する方法を説明します。

---

## 🎯 完全自動化の選択肢

### ✅ 推奨: GitHub Actions（完全無料）

**特徴**:
- ✅ **完全無料**（月2,000分の無料枠）
- ✅ 30分〜2時間ごとに自動同期
- ✅ セットアップ5分
- ✅ サーバー不要
- ✅ メンテナンスフリー

**制約**:
- ⚠️ 通知のみ自動（GBP投稿は手動2-3分）
- ⚠️ ダウンロードした画像は30日間保存（それ以降は自動削除）

**料金**: **完全無料**

---

### 他の選択肢（比較）

| 方法 | 料金 | 自動化レベル | セットアップ |
|------|------|------------|------------|
| **GitHub Actions** | 無料 | 95% | 簡単 |
| **Zapier + Buffer** | $26/月 | 99% | 非常に簡単 |
| **自宅サーバー/Raspberry Pi** | 電気代のみ | 95% | 中程度 |
| **VPS (Render.com等)** | 無料〜$5/月 | 95% | 中程度 |
| **手動実行** | 無料 | 0% | なし |

---

## 🚀 GitHub Actions 完全自動化セットアップ

### 前提条件

- ✅ GitHubアカウント
- ✅ このリポジトリをGitHubにプッシュ済み
- ✅ Instagram Graph API設定済み

### ステップ1: GitHub Secretsを設定

1. GitHubリポジトリページに移動
2. **Settings** → **Secrets and variables** → **Actions** をクリック
3. **New repository secret** をクリック

以下のSecretsを追加:

#### 必須のSecrets

```
Name: INSTAGRAM_ACCESS_TOKEN
Value: あなたのInstagram Access Token
```

```
Name: INSTAGRAM_BUSINESS_ACCOUNT_ID
Value: あなたのInstagram Business Account ID
```

#### 通知用Secrets（いずれか1つ以上推奨）

```
Name: SLACK_WEBHOOK_URL
Value: https://hooks.slack.com/services/T00000000/...
```

```
Name: LINE_NOTIFY_TOKEN
Value: your_line_notify_token
```

```
Name: ZAPIER_WEBHOOK_URL
Value: https://hooks.zapier.com/hooks/catch/...
```

```
Name: DASHBOARD_URL
Value: https://your-dashboard-url.com (オプション)
```

### ステップ2: ワークフローファイルを確認

既にこのファイルが作成されています:

```
.github/workflows/instagram-sync.yml
```

### ステップ3: 同期間隔をカスタマイズ（オプション）

`.github/workflows/instagram-sync.yml` を編集:

```yaml
schedule:
  # 30分ごと（推奨）
  - cron: '*/30 * * * *'

  # または2時間ごと
  # - cron: '0 */2 * * *'

  # または1時間ごと
  # - cron: '0 * * * *'

  # または1日1回（朝9時）
  # - cron: '0 0 * * *'  # UTC 0:00 = JST 9:00
```

**cron構文の説明**:
```
分 時 日 月 曜日
│  │  │  │  │
│  │  │  │  └─ 0-6 (0 = 日曜日)
│  │  │  └──── 1-12
│  │  └─────── 1-31
│  └────────── 0-23
└───────────── 0-59

例:
*/30 * * * *  → 30分ごと
0 */2 * * *   → 2時間ごと
0 0 * * *     → 毎日深夜0時（UTC）
0 9 * * 1-5   → 平日の朝9時（UTC）
```

**注意**: GitHub Actionsの時刻は**UTC**です。
- UTC 0:00 = JST 9:00（日本時間）
- UTC 15:00 = JST 24:00（日本時間）

### ステップ4: GitHubにプッシュ

```bash
git add .github/workflows/instagram-sync.yml
git commit -m "Add GitHub Actions automation"
git push origin main
```

### ステップ5: 動作確認

1. GitHubリポジトリページで **Actions** タブをクリック
2. 左側の「Instagram to GBP Automation」をクリック
3. 右上の **Run workflow** → **Run workflow** で手動実行
4. ワークフローの実行状況を確認

**成功すると**:
- ✅ Instagram投稿が検出される
- ✅ 画像がダウンロードされる
- ✅ Slack/LINE/Zapierに通知が送信される
- ✅ `data/posts.json` が自動更新される

### ステップ6: ダウンロードした画像を取得

GitHub Actionsでダウンロードした画像は「Artifacts」として保存されます。

1. **Actions** タブ → 実行されたワークフローをクリック
2. 下部の **Artifacts** セクション
3. `instagram-media-XXX` をダウンロード
4. ZIPを展開して画像を取得

**または**: Zapier Webhookでダウンロードリンクを通知に含める

---

## 🔄 自動実行の仕組み

```
┌─────────────────────────────────────────┐
│  GitHub Actions (無料)                   │
│  2時間ごとに自動実行                      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  npm run sync                           │
│  - Instagramから新規投稿を取得            │
│  - 画像をダウンロード                     │
│  - キャプションを整形                     │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  通知送信                                │
│  ├→ Slack（新規投稿を通知）              │
│  ├→ LINE（新規投稿を通知）               │
│  └→ Zapier（他サービスに連携）           │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  あなたの作業                            │
│  1. 通知を確認                           │
│  2. Artifactsから画像をダウンロード      │
│  3. GBPに手動投稿（2-3分）               │
└─────────────────────────────────────────┘
```

---

## 💡 さらに効率化するTips

### Tip 1: Zapier + Googleスプレッドシートで記録

Zapierで以下のワークフローを作成:

1. **Trigger**: Webhooks by Zapier（このシステムから送信）
2. **Action**: Google Sheets「行を追加」

**結果**: 投稿が自動的にスプレッドシートに記録される

### Tip 2: Slack通知にダウンロードリンクを追加

`src/services/notification.js` を編集:

```javascript
// Slack通知にArtifactリンクを追加
const artifactUrl = `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
```

### Tip 3: 画像を外部ストレージに自動アップロード

GitHub Actionsで以下を追加:

```yaml
- name: Upload to S3/Dropbox/Google Drive
  run: |
    # S3にアップロード
    aws s3 sync downloads/ s3://your-bucket/instagram/

    # またはDropbox
    # rclone sync downloads/ dropbox:/instagram/
```

### Tip 4: 複数のInstagramアカウントを監視

複数のSecretsを作成し、ワークフローを並列実行:

```yaml
strategy:
  matrix:
    account:
      - name: account1
        token: ${{ secrets.INSTAGRAM_TOKEN_1 }}
        id: ${{ secrets.INSTAGRAM_ID_1 }}
      - name: account2
        token: ${{ secrets.INSTAGRAM_TOKEN_2 }}
        id: ${{ secrets.INSTAGRAM_ID_2 }}
```

---

## 🎯 実際の使用フロー（完全自動化）

### 平日の朝

**9:00 AM** - Instagram投稿をアップロード
**11:00 AM** - GitHub Actionsが自動実行（2時間後）
**11:02 AM** - Slackに通知が届く 📱
**11:05 AM** - Artifactsから画像をダウンロード
**11:08 AM** - GBPに投稿（2分）
**完了！** ✅

### 週末や夜間

**自動実行** - 2時間ごとにチェック
**通知** - 新規投稿があればSlack/LINEに通知
**翌営業日** - まとめてGBPに投稿

---

## 🆓 無料枠の範囲

### GitHub Actions無料枠

- ✅ **月2,000分**の実行時間
- ✅ パブリックリポジトリは**無制限**
- ✅ ストレージ: 500MB

**計算**:
- 1回の実行: 約2分
- 2時間ごと実行: 12回/日 × 2分 = 24分/日
- 月間: 24分 × 30日 = **720分/月**

→ **無料枠内で十分！** 🎉

### Zapier無料枠

- ✅ 月100タスク
- ✅ 2時間ごと × 12回/日 × 30日 = 360タスク

→ 有料プラン推奨（$19.99/月）
または手動で通知のみ利用

---

## 🔧 トラブルシューティング

### Q1: ワークフローが実行されない

**A**: 以下を確認:
1. `.github/workflows/` ディレクトリが正しいか
2. YAMLファイルの構文が正しいか（インデント重要）
3. Secretsが正しく設定されているか
4. リポジトリの **Settings** → **Actions** → **General** で「Allow all actions」が有効か

### Q2: Secretsが認識されない

**A**:
1. Secretsの名前が完全に一致しているか確認（大文字小文字を区別）
2. ワークフローファイルで `${{ secrets.SECRET_NAME }}` と書いているか
3. リポジトリを再読み込み

### Q3: 画像がダウンロードされない

**A**:
1. Artifactsのリテンション期間（デフォルト30日）を確認
2. ワークフローで `upload-artifact` ステップが有効か確認
3. ダウンロードパスが正しいか確認

### Q4: cronが実行されない

**A**:
1. cron構文が正しいか確認（[Crontab Guru](https://crontab.guru/)で検証）
2. GitHub Actionsは最大15分の遅延が発生することがある
3. 初回は手動実行（Run workflow）でテスト

### Q5: 実行時間が長すぎる

**A**:
1. 画像のダウンロードをスキップ（`DOWNLOAD_MEDIA=false`）
2. または画像サイズを制限
3. 並列実行を避ける

---

## 🚀 次のステップ

### レベル1: 基本的な自動化（現在）
- ✅ GitHub Actionsで2時間ごとに同期
- ✅ Slack/LINE通知
- ✅ 手動でGBP投稿

### レベル2: 半自動化
- ✅ Zapier + Buffer連携（$26/月）
- ✅ ほぼ完全自動化

### レベル3: 完全自動化（エンタープライズ）
- ✅ Hootsuite/Later等のエンタープライズツール
- ✅ 複数SNS一括管理
- ✅ 詳細な分析とレポート

---

## 📊 コスト比較（再掲）

| 方法 | 初期 | 月額 | 自動化 | 手間 |
|------|-----|------|-------|------|
| **GitHub Actions** | 無料 | **無料** | 95% | 最小 |
| **Zapier + Buffer** | 無料 | $26 | 99% | ほぼゼロ |
| **VPS** | 無料 | $5 | 95% | 中程度 |
| **自宅サーバー** | $35〜 | 電気代 | 95% | 中程度 |
| **手動** | 無料 | 無料 | 0% | 最大 |

---

## 🎯 結論

**GitHub Actionsを使えば**:
- ✅ 完全無料
- ✅ 30分〜2時間ごとに自動同期
- ✅ セットアップ5分
- ✅ サーバー不要
- ✅ メンテナンスフリー

**「2時間ラグで勝手に同期するツール」を有料で買う必要はありません！**

このリポジトリ + GitHub Actions = **完全無料の完全自動化** 🚀

---

## 📚 参考リンク

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Crontab Guru](https://crontab.guru/) - cron構文テスター
- [ZAPIER_INTEGRATION.md](./ZAPIER_INTEGRATION.md) - Zapier連携ガイド
- [REALISTIC_ALTERNATIVES.md](./REALISTIC_ALTERNATIVES.md) - 代替案ガイド

---

**これで完全無料の完全自動化が実現できます！** 🎉

ネットで売られている有料ツールと同等以上の機能を、完全無料で手に入れましょう。
