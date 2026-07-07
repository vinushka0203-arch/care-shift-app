"""職員管理 API(一覧・登録・更新)のテスト。"""
from tests.conftest import login_headers


def test_list_users_as_admin(client, admin_user, test_user):
    """管理者は職員一覧を取得できる。"""
    headers = login_headers(client, "admin@example.com", "adminpass123")

    response = client.get("/api/users", headers=headers)

    assert response.status_code == 200
    emails = [u["email"] for u in response.json()]
    assert "admin@example.com" in emails
    assert "test@example.com" in emails


def test_list_users_as_staff_forbidden(client, test_user):
    """一般職員が職員一覧にアクセスすると 403 を返す。"""
    headers = login_headers(client, "test@example.com", "password123")

    response = client.get("/api/users", headers=headers)

    assert response.status_code == 403


def test_list_users_without_token(client, setup_database):
    """トークンなしでは 401 を返す。"""
    response = client.get("/api/users")

    assert response.status_code == 401


def test_create_user_as_admin(client, admin_user):
    """管理者は職員を新規登録できる。"""
    headers = login_headers(client, "admin@example.com", "adminpass123")

    response = client.post(
        "/api/users",
        headers=headers,
        json={
            "name": "新人一郎",
            "email": "shinjin@example.com",
            "password": "shinjin-pass1",
            "role": "staff",
            "employment_type": "part_time",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "新人一郎"
    assert body["employment_type"] == "part_time"
    assert "password_hash" not in body


def test_create_user_duplicate_email(client, admin_user, test_user):
    """既存のメールアドレスで登録しようとすると 409 を返す。"""
    headers = login_headers(client, "admin@example.com", "adminpass123")

    response = client.post(
        "/api/users",
        headers=headers,
        json={
            "name": "重複太郎",
            "email": "test@example.com",
            "password": "duplicate-pass1",
        },
    )

    assert response.status_code == 409


def test_update_user_as_admin(client, admin_user, test_user):
    """管理者は職員情報を部分更新できる(名前と有効フラグ)。"""
    headers = login_headers(client, "admin@example.com", "adminpass123")

    response = client.patch(
        f"/api/users/{test_user.id}",
        headers=headers,
        json={"name": "改名次郎", "is_active": False},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "改名次郎"
    assert body["is_active"] is False
    # 変更していない項目は維持される
    assert body["email"] == "test@example.com"


def test_update_user_not_found(client, admin_user):
    """存在しない職員 ID の更新は 404 を返す。"""
    headers = login_headers(client, "admin@example.com", "adminpass123")

    response = client.patch("/api/users/9999", headers=headers, json={"name": "誰か"})

    assert response.status_code == 404
