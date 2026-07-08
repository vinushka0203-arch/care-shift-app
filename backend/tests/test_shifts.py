"""シフト API(月次取得・一括保存)のテスト。"""
from datetime import time

import pytest

from app.models.shift_type import ShiftType
from tests.conftest import TestingSessionLocal, login_headers


@pytest.fixture
def day_shift_type(setup_database) -> int:
    """テスト用の勤務区分(日勤)を1件作成し、id を返す。"""
    db = TestingSessionLocal()
    # DB へ直接挿入するため、Pydantic を介さず Python の time 型で渡す
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


def bulk_item(user_id: int, work_date: str, shift_type_id: int | None) -> dict:
    """一括保存の item を組み立てるヘルパー。"""
    return {"user_id": user_id, "work_date": work_date, "shift_type_id": shift_type_id}


def test_get_shifts_without_token(client, setup_database):
    """未認証では 401 を返す。"""
    response = client.get("/api/shifts?year=2026&month=7")

    assert response.status_code == 401


def test_get_shifts_as_staff(client, admin_user, test_user):
    """一般職員でも月次シフト(職員一覧つき)を取得できる。"""
    headers = login_headers(client, "test@example.com", "password123")

    response = client.get("/api/shifts?year=2026&month=7", headers=headers)

    assert response.status_code == 200
    body = response.json()
    names = [u["name"] for u in body["users"]]
    assert "テスト太郎" in names
    assert body["shifts"] == []


def test_bulk_save_as_staff_forbidden(client, test_user, day_shift_type):
    """一般職員は一括保存できない(403)。"""
    headers = login_headers(client, "test@example.com", "password123")

    response = client.put(
        "/api/shifts/bulk",
        headers=headers,
        json={"items": [bulk_item(test_user.id, "2026-07-01", day_shift_type)]},
    )

    assert response.status_code == 403


def test_bulk_save_and_get_month_filter(client, admin_user, test_user, day_shift_type):
    """一括保存したシフトが指定月の取得にだけ含まれる。"""
    headers = login_headers(client, "admin@example.com", "adminpass123")

    save_response = client.put(
        "/api/shifts/bulk",
        headers=headers,
        json={
            "items": [
                bulk_item(test_user.id, "2026-07-01", day_shift_type),
                bulk_item(test_user.id, "2026-07-31", day_shift_type),
                bulk_item(test_user.id, "2026-08-01", day_shift_type),  # 翌月分
            ]
        },
    )
    assert save_response.status_code == 200
    assert save_response.json() == {"saved": 3, "deleted": 0}

    july = client.get("/api/shifts?year=2026&month=7", headers=headers).json()
    assert len(july["shifts"]) == 2
    assert {s["work_date"] for s in july["shifts"]} == {"2026-07-01", "2026-07-31"}

    august = client.get("/api/shifts?year=2026&month=8", headers=headers).json()
    assert len(august["shifts"]) == 1


def test_bulk_save_overwrites_same_cell(client, admin_user, test_user, day_shift_type):
    """同じセルへの再保存は上書きになり、行が重複しない。"""
    headers = login_headers(client, "admin@example.com", "adminpass123")

    db = TestingSessionLocal()
    night = ShiftType(
        name="夜勤", short_label="夜", start_time=time(16, 30), end_time=time(9, 30),
        color="#1e40af", is_work=True, sort_order=2,
    )
    db.add(night)
    db.commit()
    db.refresh(night)
    night_id = night.id
    db.close()

    for type_id in (day_shift_type, night_id):
        response = client.put(
            "/api/shifts/bulk",
            headers=headers,
            json={"items": [bulk_item(test_user.id, "2026-07-01", type_id)]},
        )
        assert response.status_code == 200

    body = client.get("/api/shifts?year=2026&month=7", headers=headers).json()
    assert len(body["shifts"]) == 1
    assert body["shifts"][0]["shift_type_id"] == night_id


def test_bulk_save_null_deletes_cell(client, admin_user, test_user, day_shift_type):
    """shift_type_id を null にするとセルの割り当てが削除される。"""
    headers = login_headers(client, "admin@example.com", "adminpass123")

    client.put(
        "/api/shifts/bulk",
        headers=headers,
        json={"items": [bulk_item(test_user.id, "2026-07-01", day_shift_type)]},
    )

    response = client.put(
        "/api/shifts/bulk",
        headers=headers,
        json={"items": [bulk_item(test_user.id, "2026-07-01", None)]},
    )

    assert response.status_code == 200
    assert response.json() == {"saved": 0, "deleted": 1}
    body = client.get("/api/shifts?year=2026&month=7", headers=headers).json()
    assert body["shifts"] == []


def test_bulk_save_unknown_shift_type(client, admin_user, test_user):
    """存在しない勤務区分 id が混ざっていたら 422 を返す。"""
    headers = login_headers(client, "admin@example.com", "adminpass123")

    response = client.put(
        "/api/shifts/bulk",
        headers=headers,
        json={"items": [bulk_item(test_user.id, "2026-07-01", 9999)]},
    )

    assert response.status_code == 422
