"""shift_requests テーブルの SQLAlchemy モデル。"""
from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ShiftRequest(Base):
    """職員の希望休・希望勤務の提出。管理者が承認/却下する。"""

    __tablename__ = "shift_requests"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    work_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    # 休み希望(day_off)は null、勤務希望(work_preference)は希望する区分
    shift_type_id: Mapped[int | None] = mapped_column(
        ForeignKey("shift_types.id"), nullable=True
    )
    request_type: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
