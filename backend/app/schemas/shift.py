"""shifts に関する Pydantic スキーマ。"""
from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class StaffSummary(BaseModel):
    """シフト表の行を描画するための最小限の職員情報。

    GET /api/users は管理者専用のため、シフト表に必要な id と名前だけを
    月次レスポンスに同梱して一般職員でも閲覧できるようにする。
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class ShiftRead(BaseModel):
    """API レスポンス用のシフト1件。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    work_date: date
    shift_type_id: int
    note: str | None


class MonthlyShiftsResponse(BaseModel):
    """指定月のシフトと、表の行になる職員の一覧。"""

    users: list[StaffSummary]
    shifts: list[ShiftRead]


class ShiftBulkItem(BaseModel):
    """一括保存の1項目。shift_type_id が null のセルは削除(空に戻す)。"""

    user_id: int
    work_date: date
    shift_type_id: int | None = None


class ShiftBulkRequest(BaseModel):
    """シフトの一括保存リクエスト。"""

    items: list[ShiftBulkItem] = Field(min_length=1)


class ShiftBulkResult(BaseModel):
    """一括保存の結果件数。"""

    saved: int
    deleted: int
