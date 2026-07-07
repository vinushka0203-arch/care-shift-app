"""GET /api/users/me のテスト。"""


def test_read_current_user_with_valid_token(client, test_user):
    """有効なトークンで自分の情報を取得できる。"""
    login_response = client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "password123"},
    )
    token = login_response.json()["access_token"]

    response = client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "test@example.com"
    assert body["name"] == "テスト太郎"
    assert "password_hash" not in body


def test_read_current_user_without_token(client, setup_database):
    """トークンなしでアクセスすると 401 を返す。"""
    response = client.get("/api/users/me")

    assert response.status_code == 401
