"""users に関する Pydantic スキーマ。"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


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
