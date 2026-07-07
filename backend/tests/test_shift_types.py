"""勤務区分 API(一覧・作成・更新)のテスト。"""
from tests.conftest import login_headers

EARLY_SHIFT = {
    "name": "早番",
    "short_label": "早",
    "start_time": "07:00",
    "end_time": "16:00",
    "color": "#f59e0b",
    "is_work": True,
    "sort_order": 1,
}


def test_create_and_list_shift_types(client, admin_user, test_user):
    """管理者が作成した勤務区分を、一般職員も一覧で参照できる。"""
    admin_headers = login_headers(client, "admin@example.com", "adminpass123")

    create_response = client.post("/api/shift-types", headers=admin_headers, json=EARLY_SHIFT)
    assert create_response.status_code == 201
    assert create_response.json()["name"] == "早番"

    # 一覧は認証済みなら staff でも取得できる
    staff_headers = login_headers(client, "test@example.com", "password123")
    list_response = client.get("/api/shift-types", headers=staff_headers)

    assert list_response.status_code == 200
    body = list_response.json()
    assert len(body) == 1
    assert body[0]["short_label"] == "早"


def test_create_shift_type_as_staff_forbidden(client, test_user):
    """一般職員が勤務区分を作成しようとすると 403 を返す。"""
    headers = login_headers(client, "test@example.com", "password123")

    response = client.post("/api/shift-types", headers=headers, json=EARLY_SHIFT)

    assert response.status_code == 403


def test_create_work_shift_type_without_times_invalid(client, admin_user):
    """勤務の区分(is_work=True)は時刻なしだと 422 を返す。"""
    headers = login_headers(client, "admin@example.com", "adminpass123")

    response = client.post(
        "/api/shift-types",
        headers=headers,
        json={"name": "時刻なし", "short_label": "無", "is_work": True},
    )

    assert response.status_code == 422


def test_create_rest_shift_type_without_times(client, admin_user):
    """休みの区分(is_work=False)は時刻なしで作成できる。"""
    headers = login_headers(client, "admin@example.com", "adminpass123")

    response = client.post(
        "/api/shift-types",
        headers=headers,
        json={"name": "休み", "short_label": "休", "is_work": False, "sort_order": 6},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["start_time"] is None
    assert body["end_time"] is None


def test_update_shift_type(client, admin_user):
    """勤務区分の部分更新ができる。"""
    headers = login_headers(client, "admin@example.com", "adminpass123")
    created = client.post("/api/shift-types", headers=headers, json=EARLY_SHIFT).json()

    response = client.patch(
        f"/api/shift-types/{created['id']}",
        headers=headers,
        json={"color": "#ef4444", "sort_order": 9},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["color"] == "#ef4444"
    assert body["sort_order"] == 9
    # 変更していない項目は維持される
    assert body["name"] == "早番"


def test_update_shift_type_not_found(client, admin_user):
    """存在しない勤務区分 ID の更新は 404 を返す。"""
    headers = login_headers(client, "admin@example.com", "adminpass123")

    response = client.patch("/api/shift-types/9999", headers=headers, json={"name": "何か"})

    assert response.status_code == 404
