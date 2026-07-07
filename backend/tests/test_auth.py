"""POST /api/auth/login のテスト。"""


def test_login_success(client, test_user):
    """正しいメールアドレスとパスワードでログインできる。"""
    response = client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "password123"},
    )

    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


def test_login_failure_wrong_password(client, test_user):
    """パスワードが間違っている場合は 401 を返す。"""
    response = client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "wrong-password"},
    )

    assert response.status_code == 401


def test_login_failure_unknown_email(client, setup_database):
    """存在しないメールアドレスの場合も 401 を返す。"""
    response = client.post(
        "/api/auth/login",
        json={"email": "unknown@example.com", "password": "password123"},
    )

    assert response.status_code == 401


def test_login_failure_inactive_user(client, setup_database):
    """無効化されたユーザー(退職者など)はパスワードが正しくても 401 を返す。"""
    from app.core.security import hash_password
    from app.models.user import User
    from tests.conftest import TestingSessionLocal

    db = TestingSessionLocal()
    db.add(
        User(
            name="退職済み花子",
            email="inactive@example.com",
            password_hash=hash_password("password123"),
            role="staff",
            employment_type="full_time",
            is_active=False,
        )
    )
    db.commit()
    db.close()

    response = client.post(
        "/api/auth/login",
        json={"email": "inactive@example.com", "password": "password123"},
    )

    assert response.status_code == 401
