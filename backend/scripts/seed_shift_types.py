"""標準的な勤務区分のシードデータを投入するスクリプト。

使い方:
    python scripts/seed_shift_types.py

既に同名の区分が存在する場合はスキップする(二重投入しない)。
"""
import sys
from datetime import time
from pathlib import Path

# backend/ を import パスに追加し、app パッケージを読み込めるようにする
sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.core.database import SessionLocal  # noqa: E402
from app.models.shift_type import ShiftType  # noqa: E402

SEED_DATA = [
    {"name": "早番", "short_label": "早", "start_time": time(7, 0), "end_time": time(16, 0), "color": "#f59e0b", "is_work": True, "sort_order": 1},
    {"name": "日勤", "short_label": "日", "start_time": time(9, 0), "end_time": time(18, 0), "color": "#3b82f6", "is_work": True, "sort_order": 2},
    {"name": "遅番", "short_label": "遅", "start_time": time(11, 0), "end_time": time(20, 0), "color": "#8b5cf6", "is_work": True, "sort_order": 3},
    {"name": "夜勤", "short_label": "夜", "start_time": time(16, 30), "end_time": time(9, 30), "color": "#1e40af", "is_work": True, "sort_order": 4},
    {"name": "明け", "short_label": "明", "start_time": None, "end_time": None, "color": "#94a3b8", "is_work": False, "sort_order": 5},
    {"name": "休み", "short_label": "休", "start_time": None, "end_time": None, "color": "#e5e7eb", "is_work": False, "sort_order": 6},
]


def seed() -> None:
    """勤務区分の初期データを投入する。"""
    db = SessionLocal()
    try:
        for data in SEED_DATA:
            existing = db.query(ShiftType).filter(ShiftType.name == data["name"]).first()
            if existing is not None:
                print(f"既に存在するためスキップ: {data['name']}")
                continue
            db.add(ShiftType(**data))
            print(f"作成: {data['name']}")
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
