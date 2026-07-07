"""認証(ログイン)に関する Pydantic スキーマ。"""
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    """ログインリクエストボディ。"""

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """ログイン成功時のレスポンス。"""

    access_token: str
    token_type: str = "bearer"
