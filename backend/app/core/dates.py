"""日付まわりの共通ユーティリティ。"""
from datetime import date


def month_range(year: int, month: int) -> tuple[date, date]:
    """[月初, 翌月初) の半開区間を返す。"""
    start = date(year, month, 1)
    end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
    return start, end
