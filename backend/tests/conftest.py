"""pytest 共通フィクスチャ。

本体の app.db とは分離したテスト専用 SQLite DB を使い、
各テストの前後でテーブルを作り直すことで独立性を保つ。
"""
import sys
from datetime import time
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.main import app
from app.models.shift_type import ShiftType
from app.models.user import User

TEST_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """テスト用 DB セッションを注入する依存性のオーバーライド。"""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_database():
    """各テストの前にテーブルを作り、後で破棄する。"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client() -> TestClient:
    """FastAPI の TestClient。"""
    return TestClient(app)


@pytest.fixture
def test_user(setup_database) -> User:
    """ログインテスト用の職員ユーザーを1人作成する。"""
    db = TestingSessionLocal()
    user = User(
        name="テスト太郎",
        email="test@example.com",
        password_hash=hash_password("password123"),
        role="staff",
        employment_type="full_time",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


@pytest.fixture
def admin_user(setup_database) -> User:
    """管理者権限のテスト用ユーザーを1人作成する。"""
    db = TestingSessionLocal()
    user = User(
        name="管理花子",
        email="admin@example.com",
        password_hash=hash_password("adminpass123"),
        role="admin",
        employment_type="full_time",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


@pytest.fixture
def day_shift_type(setup_database) -> int:
    """テスト用の勤務区分(日勤)を1件作成し、id を返す。

    DB へ直接挿入するため、Pydantic を介さず Python の time 型で渡す。
    """
    db = TestingSessionLocal()
    shift_type = ShiftType(
        name="日勤",
        short_label="日",
        start_time=time(9, 0),
        end_time=time(18, 0),
        color="#3b82f6",
        is_work=True,
        sort_order=1,
    )
    db.add(shift_type)
    db.commit()
    db.refresh(shift_type)
    type_id = shift_type.id
    db.close()
    return type_id


def login_headers(client, email: str, password: str) -> dict[str, str]:
    """ログインして Authorization ヘッダを組み立てるテスト用ヘルパー。"""
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, f"テスト用ログインに失敗: {response.text}"
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
