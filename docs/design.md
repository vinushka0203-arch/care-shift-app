# 介護施設シフト管理アプリ 設計書

作成日: 2026-07-03 / ステータス: MVP設計

## 1. 目的とスコープ

介護施設の管理者がシフトを作成・共有し、職員が閲覧・希望提出できる Web アプリを作る。

### MVP に含めるもの
- ログイン(管理者 / 職員の2ロール)
- 職員管理(登録・編集)
- 勤務区分管理(早番・日勤・遅番・夜勤・明け・休み など、施設ごとに定義可能)
- 月間シフト表の作成・編集(管理者が手動で割り当て)
- シフト表の閲覧(職員はスマホから確認できる想定 → レスポンシブ対応)
- 希望休・希望勤務の提出(職員)と一覧確認(管理者)

### MVP に含めないもの(第2段階以降)
- シフトの自動生成(制約充足・最適化)
- 労働基準法チェック(連勤・夜勤明けルールの自動警告)
- 通知(メール / LINE)
- シフトの印刷用 PDF 出力

## 2. 技術スタック

| レイヤ | 技術 | 選定理由 |
|---|---|---|
| バックエンド | Python 3.12 + FastAPI | 学習目的で選定。型ヒント+自動APIドキュメント(Swagger UI)で学びやすい |
| ORM / マイグレーション | SQLAlchemy 2.0 + Alembic | Python の事実上の標準。スキーマ変更の履歴管理を学べる |
| DB | 開発: SQLite → 本番: PostgreSQL | 開発初期はセットアップ不要の SQLite で速く進め、デプロイ時に PostgreSQL へ移行 |
| 認証 | JWT(python-jose + passlib) | 仕組みを理解するため、まずライブラリを薄く使って自前実装 |
| フロントエンド | React + TypeScript + Vite | SPA の標準構成。Vite で高速な開発体験 |
| データ取得 | TanStack Query | サーバー状態管理の定番。キャッシュ・再取得を任せられる |
| UI | Tailwind CSS | シフト表のようなカスタム UI はコンポーネントライブラリより自由度が高い |
| テスト | pytest(API) / Vitest(フロント) | 各エコシステムの標準 |

## 3. システム構成

```
[ブラウザ (React SPA)] ──HTTP/JSON──> [FastAPI] ──SQLAlchemy──> [SQLite / PostgreSQL]
        ↑ JWT を Authorization ヘッダで送信
```

- フロントとバックは完全分離(別プロセス・別デプロイ)
- デプロイ想定: フロント = Vercel、バック+DB = Render または Railway(いずれも無料枠あり)

## 4. データモデル

```
users(職員 = ログインユーザー)
  id, name, email(unique), password_hash,
  role('admin' | 'staff'), employment_type('full_time' | 'part_time'),
  is_active, created_at

shift_types(勤務区分)
  id, name(例: 早番), short_label(例: 早), start_time, end_time,
  color(表示色), is_work(勤務か休みか), sort_order

shifts(シフト割り当て)
  id, user_id → users, work_date, shift_type_id → shift_types,
  note, created_at, updated_at
  UNIQUE(user_id, work_date)  -- 1人1日1区分

shift_requests(希望休・希望勤務)
  id, user_id → users, work_date, shift_type_id → shift_types(nullable: 「休み希望」等),
  request_type('day_off' | 'work_preference'),
  status('pending' | 'accepted' | 'rejected'), note, created_at
```

設計上のポイント:
- シフト表は「月」の実体テーブルを持たず、`shifts` を `work_date` で月範囲検索する(公開/下書き状態の管理が必要になったら `schedules` テーブルを後付けする)
- `UNIQUE(user_id, work_date)` で二重割り当てを DB レベルで防ぐ

## 5. API 設計(主要エンドポイント)

| メソッド | パス | 権限 | 内容 |
|---|---|---|---|
| POST | /api/auth/login | 全員 | ログイン、JWT 発行 |
| GET | /api/users/me | 認証済 | 自分の情報 |
| GET/POST | /api/users | admin | 職員一覧 / 登録 |
| PATCH | /api/users/{id} | admin | 職員情報の更新 |
| GET/POST/PATCH | /api/shift-types | admin(GETは全員) | 勤務区分の管理 |
| GET | /api/shifts?year=&month= | 認証済 | 月間シフト取得 |
| PUT | /api/shifts/bulk | admin | シフトの一括保存(セル編集をまとめて反映) |
| GET/POST | /api/shift-requests | 認証済 | 希望の一覧(自分の分。adminは全員分) / 提出 |
| PATCH | /api/shift-requests/{id} | admin | 希望の承認 / 却下 |

- シフト編集は「セルを1つずつ POST」ではなく **bulk PUT** にする(管理者は表をまとめて編集して保存するため、通信回数と整合性の面で有利)

## 6. 画面設計

| 画面 | 対象 | 概要 |
|---|---|---|
| ログイン | 全員 | メール+パスワード |
| 月間シフト表 | 全員 | 縦=職員、横=日付のグリッド。admin はセルをクリックして勤務区分を選択、staff は閲覧のみ。スマホでは横スクロール |
| 希望提出 | staff | カレンダーから日付を選び、希望休/希望勤務を提出。自分の提出履歴を確認 |
| 希望一覧 | admin | 提出された希望の一覧と承認/却下。シフト表画面にも希望をオーバーレイ表示 |
| 職員管理 | admin | 職員の一覧・登録・編集 |
| 勤務区分管理 | admin | 区分の追加・時間帯・色の設定 |

## 7. ディレクトリ構成

```
claude_code_guide/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI エントリポイント
│   │   ├── core/            # 設定・認証(JWT)・依存性
│   │   ├── models/          # SQLAlchemy モデル
│   │   ├── schemas/         # Pydantic スキーマ
│   │   └── routers/         # auth / users / shift_types / shifts / shift_requests
│   ├── alembic/             # マイグレーション
│   └── tests/
├── frontend/
│   └── src/
│       ├── api/             # API クライアント(fetch ラッパー + TanStack Query)
│       ├── components/      # 共通コンポーネント
│       ├── pages/           # 画面単位のコンポーネント
│       └── types/           # 型定義(API スキーマと対応)
└── docs/                    # 設計書・学習ログ
```

## 8. マイルストーン

1. **M1: 環境構築 + 認証** — FastAPI/React の雛形、DB接続、ログインと JWT 保護 API
2. **M2: マスタ管理** — 職員管理・勤務区分管理の CRUD(画面含む)
3. **M3: シフト表** — 月間グリッド表示と管理者による編集・一括保存(MVP の山場)
4. **M4: 希望提出** — 職員の希望提出と管理者の承認、シフト表への表示
5. **M5: デプロイ** — PostgreSQL 移行、Vercel + Render で公開

各マイルストーン完了時に学習ログ(`docs/learning-log.md`)へ記録し、コミットを区切ること。
