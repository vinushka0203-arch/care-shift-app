# デプロイ手順書(Neon + Render + Vercel)

介護施設シフト管理アプリをインターネットに公開する手順。**3サービスともクレジットカード登録不要の無料枠**で完結する。

## 全体像

```
[利用者のブラウザ]
   │
   ▼
[Vercel]  フロントエンド(React)を配信
   │  HTTPS/JSON
   ▼
[Render]  バックエンド(FastAPI)を実行
   │  SQL
   ▼
[Neon]    PostgreSQL データベース
```

- **DB を Neon にする理由**: Render の無料 PostgreSQL は30日で期限切れ・削除されるため、無料枠が恒久的な Neon を使う
- **無料枠の注意点**: Render の無料 Web Service は15分ほどアクセスがないとスリープし、次のアクセスの応答に1分ほどかかる(課金はされない)

## 事前準備

- GitHub の main ブランチが最新(プッシュ済み)であること
- 以下の3つのアカウントを作成する(いずれも「Sign up with GitHub」でOK)
  - https://neon.tech (DB)
  - https://render.com (バックエンド)
  - https://vercel.com (フロントエンド)

## 手順1: Neon で PostgreSQL を作る

1. Neon にログイン → 「Create a project」
2. プロジェクト名は任意(例: care-shift-app)。リージョンは Asia Pacific (Tokyo) があればそれを選ぶ
3. 作成後に表示される **接続文字列(Connection string)** をコピーして控える
   - `postgresql://ユーザー:パスワード@ホスト/DB名?sslmode=require` の形式

## 手順2: Render でバックエンドを公開する

1. Render にログイン → 「New +」→「Web Service」→ GitHub リポジトリ `care-shift-app` を選択
2. 設定値:

| 項目 | 値 |
|---|---|
| Name | 任意(例: care-shift-api) |
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Instance Type | **Free** |

3. 「Environment Variables」に以下を追加:

| キー | 値 |
|---|---|
| DATABASE_URL | 手順1の接続文字列(`postgres://` 始まりなら `postgresql://` に直す) |
| SECRET_KEY | ランダムな長い文字列(生成方法は下記) |
| CORS_ORIGINS | `["https://あなたのアプリ.vercel.app"]`(手順4の後に正しい URL へ更新) |
| PYTHON_VERSION | `3.11.11` |

SECRET_KEY の生成(ローカルの PowerShell で):
```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

4. 「Create Web Service」→ デプロイ完了を待つ(Start Command 内の `alembic upgrade head` により、起動時にテーブルが自動作成される)
5. 発行された URL(`https://xxxx.onrender.com`)を控える。`https://xxxx.onrender.com/` を開いて `{"status":"ok"}` が出れば成功

## 手順3: 初期データを投入する(ローカルから Neon へ)

本番 DB に管理者ユーザーと勤務区分を入れる。ローカル PC から直接 Neon に接続して実行する:

```powershell
cd "C:\Users\tm-95\OneDrive\デスクトップ\claude_code_guide\backend"
$env:DATABASE_URL = "手順1の接続文字列"
.\.venv\Scripts\python.exe scripts\create_admin.py 管理者メール 強いパスワード 管理者名
.\.venv\Scripts\python.exe scripts\seed_shift_types.py
```

**注意**: 本番の管理者パスワードは開発用(admin123)を使い回さず、強いものにすること。

## 手順4: Vercel でフロントエンドを公開する

1. Vercel にログイン → 「Add New...」→「Project」→ リポジトリ `care-shift-app` を Import
2. 設定値:

| 項目 | 値 |
|---|---|
| Root Directory | `frontend` |
| Framework Preset | Vite(自動検出される) |
| 環境変数 VITE_API_BASE_URL | 手順2で控えた Render の URL(末尾スラッシュなし) |

3. 「Deploy」→ 完了後に発行される URL(`https://xxxx.vercel.app`)を控える

## 手順5: CORS を本番 URL に更新する

1. Render の Environment Variables で `CORS_ORIGINS` を更新:
   ```
   ["https://手順4のURL.vercel.app"]
   ```
2. 保存すると自動で再デプロイされる

## 手順6: 動作確認

1. Vercel の URL を開く → ログイン画面が表示される
2. 手順3で作成した管理者アカウントでログイン
3. 勤務区分が6件入っていること、シフト表の編集・保存、職員登録、希望の提出・承認を一通り確認

## トラブルシューティング

- **ログインボタンを押しても反応がない / CORS エラー**: `CORS_ORIGINS` の URL が Vercel の URL と完全一致しているか確認(https、末尾スラッシュなし)
- **最初のアクセスが遅い**: Render 無料枠のスリープ復帰(約1分)。待ってから再操作
- **Internal Server Error**: Render の「Logs」タブでエラー内容を確認。DATABASE_URL の形式(`postgresql://`)と `?sslmode=require` を確認
