"""shift_types に関する Pydantic スキーマ。"""
from datetime import time

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ShiftTypeCreate(BaseModel):
    """勤務区分の新規作成リクエスト(管理者のみ)。"""

    name: str = Field(min_length=1, max_length=50)
    short_label: str = Field(min_length=1, max_length=10)
    start_time: time | None = None
    end_time: time | None = None
    color: str = Field(default="#3b82f6", pattern=r"^#[0-9a-fA-F]{6}$")
    is_work: bool = True
    sort_order: int = 0

    @model_validator(mode="after")
    def check_times_for_work(self) -> "ShiftTypeCreate":
        """勤務の区分には開始・終了時刻を必須にする。"""
        if self.is_work and (self.start_time is None or self.end_time is None):
            raise ValueError("勤務の区分には開始時刻と終了時刻が必要です")
        return self


class ShiftTypeUpdate(BaseModel):
    """勤務区分の部分更新リクエスト(管理者のみ)。"""

    name: str | None = Field(default=None, min_length=1, max_length=50)
    short_label: str | None = Field(default=None, min_length=1, max_length=10)
    start_time: time | None = None
    end_time: time | None = None
    color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")
    is_work: bool | None = None
    sort_order: int | None = None


class ShiftTypeRead(BaseModel):
    """API レスポンス用の勤務区分。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    short_label: str
    start_time: time | None
    end_time: time | None
    color: str
    is_work: bool
    sort_order: int
