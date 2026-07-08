"""shifts テーブルの SQLAlchemy モデル。"""
from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Shift(Base):
    """シフト割り当て(職員 × 日付 × 勤務区分)。"""

    __tablename__ = "shifts"
    __table_args__ = (
        # 「1人1日1区分」のビジネスルールを DB 制約でも保証する
        UniqueConstraint("user_id", "work_date", name="uq_shifts_user_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    work_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    shift_type_id: Mapped[int] = mapped_column(ForeignKey("shift_types.id"), nullable=False)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
