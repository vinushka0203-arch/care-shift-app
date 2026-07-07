"""shift_types テーブルの SQLAlchemy モデル。"""
from datetime import time

from sqlalchemy import Boolean, Integer, String, Time
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ShiftType(Base):
    """勤務区分(早番・日勤・遅番・夜勤・明け・休み など)。"""

    __tablename__ = "shift_types"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    short_label: Mapped[str] = mapped_column(String(10), nullable=False)
    # 休みの区分(is_work=False)は時刻を持たないため null 許容
    start_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    end_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    color: Mapped[str] = mapped_column(String(20), nullable=False, default="#3b82f6")
    is_work: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
