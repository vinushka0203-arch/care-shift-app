"""users に関する Pydantic スキーマ。"""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRead(BaseModel):
    """API レスポンス用のユーザー情報(password_hash は含めない)。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: str
    employment_type: str
    is_active: bool
    created_at: datetime


class UserCreate(BaseModel):
    """職員の新規登録リクエスト(管理者のみ)。"""

    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8)
    role: Literal["admin", "staff"] = "staff"
    employment_type: Literal["full_time", "part_time"] = "full_time"


class UserUpdate(BaseModel):
    """職員情報の部分更新リクエスト(管理者のみ)。

    email の変更は MVP では対応しない(JWT の識別子に使っているため)。
    password は指定されたときだけ再設定する。
    """

    name: str | None = Field(default=None, min_length=1, max_length=100)
    password: str | None = Field(default=None, min_length=8)
    role: Literal["admin", "staff"] | None = None
    employment_type: Literal["full_time", "part_time"] | None = None
    is_active: bool | None = None
