"""FastAPI エントリポイント。"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, shift_requests, shift_types, shifts, users

app = FastAPI(title="介護施設シフト管理アプリ API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(shift_types.router)
app.include_router(shifts.router)
app.include_router(shift_requests.router)


@app.get("/")
def health_check() -> dict[str, str]:
    """疎通確認用のヘルスチェック。"""
    return {"status": "ok"}
