"""pytest 共通フィクスチャ。

本体の app.db とは分離したテスト専用 SQLite DB を使い、
各テストの前後でテーブルを作り直すことで独立性を保つ。
"""
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.main import app
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
