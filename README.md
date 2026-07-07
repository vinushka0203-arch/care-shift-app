# 介護施設シフト管理アプリ

介護施設向けのシフト管理アプリです。管理者が職員のシフトを手動で作成・編集し、職員はシフトの閲覧や希望休・希望勤務の提出を行えます。バックエンドは FastAPI + SQLAlchemy + Alembic(開発 DB は SQLite、本番は PostgreSQL)、フロントエンドは React(TypeScript) + Vite + Tailwind CSS + TanStack Query + React Router で構成されています。詳細な設計は `docs/design.md` を参照してください。

## バックエンドの起動手順(PowerShell)

```powershell
cd backend

# 仮想環境の作成(初回のみ)
python -m venv .venv

# 仮想環境の有効化
.\.venv\Scripts\Activate.ps1

# 依存パッケージのインストール(初回のみ)
pip install -r requirements.txt

# .env の作成(初回のみ。.env.example をコピーして使う)
Copy-Item .env.example .env

# マイグレーションの適用(初回・スキーマ変更時)
alembic upgrade head

# 管理者ユーザーの作成(初回のみ。既に存在する場合は何もしない)
python scripts/create_admin.py

# 開発サーバーの起動(http://localhost:8000 )
uvicorn app.main:app --reload
```

- API ドキュメント(Swagger UI): http://localhost:8000/docs
- テスト実行: `pytest`(テストは本体の `app.db` とは別の `test.db` を使用)

## フロントエンドの起動手順(PowerShell)

```powershell
cd frontend

# 依存パッケージのインストール(初回のみ)
npm install

# 開発サーバーの起動(http://localhost:5173 )
npm run dev
```

## 開発用ログイン情報

`backend/scripts/create_admin.py` をデフォルト引数で実行した場合、以下の管理者アカウントでログインできます。

- メールアドレス: `admin@example.com`
- パスワード: `admin123`
