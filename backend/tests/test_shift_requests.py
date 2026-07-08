"""希望休・希望勤務 API(提出・一覧・承認/却下)のテスト。"""
from tests.conftest import login_headers


def submit_day_off(client, headers, work_date: str = "2026-08-01", note: str | None = None):
    """休み希望を提出するヘルパー。"""
    return client.post(
        "/api/shift-requests",
        headers=headers,
        json={"work_date": work_date, "request_type": "day_off", "note": note},
    )


def test_submit_day_off_request(client, test_user):
    """休み希望を提出できる(初期状態は審査中)。"""
    headers = login_headers(client, "test@example.com", "password123")

    response = submit_day_off(client, headers, note="通院のため")

    assert response.status_code == 201
    body = response.json()
    assert body["request_type"] == "day_off"
    assert body["status"] == "pending"
    assert body["shift_type_id"] is None
    assert body["user_name"] == "テスト太郎"


def test_submit_work_preference_requires_shift_type(client, test_user):
    """勤務希望で勤務区分を指定しないと 422 を返す。"""
    headers = login_headers(client, "test@example.com", "password123")

    response = client.post(
        "/api/shift-requests",
        headers=headers,
        json={"work_date": "2026-08-01", "request_type": "work_preference"},
    )

    assert response.status_code == 422


def test_submit_work_preference_with_shift_type(client, test_user, day_shift_type):
    """勤務希望は勤務区分つきで提出できる。"""
    headers = login_headers(client, "test@example.com", "password123")

    response = client.post(
        "/api/shift-requests",
        headers=headers,
        json={
            "work_date": "2026-08-02",
            "request_type": "work_preference",
            "shift_type_id": day_shift_type,
        },
    )

    assert response.status_code == 201
    assert response.json()["shift_type_id"] == day_shift_type


def test_duplicate_pending_request_conflict(client, test_user):
    """同一日に審査中の希望が既にあると 409 を返す。"""
    headers = login_headers(client, "test@example.com", "password123")
    assert submit_day_off(client, headers).status_code == 201

    response = submit_day_off(client, headers)

    assert response.status_code == 409


def test_staff_sees_only_own_requests(client, admin_user, test_user):
    """一般職員は自分の希望だけが見える。"""
    staff_headers = login_headers(client, "test@example.com", "password123")
    admin_headers = login_headers(client, "admin@example.com", "adminpass123")
    submit_day_off(client, staff_headers, "2026-08-01")
    submit_day_off(client, admin_headers, "2026-08-02")  # 管理者本人の希望

    response = client.get("/api/shift-requests", headers=staff_headers)

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["user_name"] == "テスト太郎"


def test_admin_sees_all_requests(client, admin_user, test_user):
    """管理者は全員分の希望が見える。"""
    staff_headers = login_headers(client, "test@example.com", "password123")
    admin_headers = login_headers(client, "admin@example.com", "adminpass123")
    submit_day_off(client, staff_headers, "2026-08-01")
    submit_day_off(client, admin_headers, "2026-08-02")

    response = client.get("/api/shift-requests", headers=admin_headers)

    assert response.status_code == 200
    assert len(response.json()) == 2


def test_month_filter(client, test_user):
    """year/month を指定すると該当月の希望だけが返る。"""
    headers = login_headers(client, "test@example.com", "password123")
    submit_day_off(client, headers, "2026-08-31")
    submit_day_off(client, headers, "2026-09-01")

    response = client.get("/api/shift-requests?year=2026&month=8", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["work_date"] == "2026-08-31"


def test_approve_request_as_admin(client, admin_user, test_user):
    """管理者は希望を承認できる。"""
    staff_headers = login_headers(client, "test@example.com", "password123")
    admin_headers = login_headers(client, "admin@example.com", "adminpass123")
    request_id = submit_day_off(client, staff_headers).json()["id"]

    response = client.patch(
        f"/api/shift-requests/{request_id}",
        headers=admin_headers,
        json={"status": "accepted"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "accepted"


def test_approve_request_as_staff_forbidden(client, test_user):
    """一般職員は承認/却下できない(403)。"""
    headers = login_headers(client, "test@example.com", "password123")
    request_id = submit_day_off(client, headers).json()["id"]

    response = client.patch(
        f"/api/shift-requests/{request_id}",
        headers=headers,
        json={"status": "accepted"},
    )

    assert response.status_code == 403


def test_update_request_not_found(client, admin_user):
    """存在しない希望 ID の更新は 404 を返す。"""
    headers = login_headers(client, "admin@example.com", "adminpass123")

    response = client.patch(
        "/api/shift-requests/9999",
        headers=headers,
        json={"status": "rejected"},
    )

    assert response.status_code == 404
