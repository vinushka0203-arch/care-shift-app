"""shift_requests に関する Pydantic スキーマ。"""
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class ShiftRequestCreate(BaseModel):
    """希望の提出リクエスト。"""

    work_date: date
    request_type: Literal["day_off", "work_preference"]
    shift_type_id: int | None = None
    note: str | None = Field(default=None, max_length=255)

    @model_validator(mode="after")
    def check_shift_type_for_preference(self) -> "ShiftRequestCreate":
        """勤務希望のときは希望する勤務区分を必須にする。"""
        if self.request_type == "work_preference" and self.shift_type_id is None:
            raise ValueError("勤務希望の場合は勤務区分を選択してください")
        return self


class ShiftRequestRead(BaseModel):
    """API レスポンス用の希望1件。管理者の一覧表示用に職員名も同梱する。"""

    id: int
    user_id: int
    user_name: str
    work_date: date
    shift_type_id: int | None
    request_type: str
    status: str
    note: str | None
    created_at: datetime


class ShiftRequestStatusUpdate(BaseModel):
    """希望の承認/却下リクエスト(管理者のみ)。"""

    status: Literal["accepted", "rejected"]
