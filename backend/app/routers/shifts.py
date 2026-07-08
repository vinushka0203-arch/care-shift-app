"""シフト(割り当て)に関するエンドポイント。"""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin, get_current_user
from app.models.shift import Shift
from app.models.shift_type import ShiftType
from app.models.user import User
from app.schemas.shift import (
    MonthlyShiftsResponse,
    ShiftBulkRequest,
    ShiftBulkResult,
    ShiftRead,
    StaffSummary,
)

router = APIRouter(prefix="/api/shifts", tags=["shifts"])


def _month_range(year: int, month: int) -> tuple[date, date]:
    """[月初, 翌月初) の半開区間を返す。"""
    start = date(year, month, 1)
    end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
    return start, end


@router.get("", response_model=MonthlyShiftsResponse)
def get_monthly_shifts(
    year: int = Query(ge=2000, le=2100),
    month: int = Query(ge=1, le=12),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> MonthlyShiftsResponse:
    """指定月のシフトと、表の行になる有効な職員の一覧を返す(認証済みなら誰でも)。"""
    start, end = _month_range(year, month)

    users = (
        db.query(User)
        .filter(User.is_active.is_(True))
        .order_by(User.id)
        .all()
    )
    shifts = (
        db.query(Shift)
        .filter(Shift.work_date >= start, Shift.work_date < end)
        .order_by(Shift.work_date)
        .all()
    )

    return MonthlyShiftsResponse(
        users=[StaffSummary.model_validate(user) for user in users],
        shifts=[ShiftRead.model_validate(shift) for shift in shifts],
    )


@router.put("/bulk", response_model=ShiftBulkResult)
def save_shifts_bulk(
    payload: ShiftBulkRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> ShiftBulkResult:
    """シフトを一括保存する(管理者のみ)。

    - shift_type_id あり: そのセルを upsert(既存なら更新、なければ作成)
    - shift_type_id が null: そのセルの割り当てを削除(空に戻す)
    """
    # 同一セルへの重複指定は最後の項目を採用する(UNIQUE 制約違反を避ける)
    unique_items = list({(item.user_id, item.work_date): item for item in payload.items}.values())

    # 参照整合性を先にまとめて検証し、不正 id が混ざっていたら全体を 422 で弾く
    user_ids = {item.user_id for item in unique_items}
    found_user_ids = {row.id for row in db.query(User.id).filter(User.id.in_(user_ids))}
    if user_ids - found_user_ids:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="存在しない職員が含まれています",
        )

    shift_type_ids = {item.shift_type_id for item in unique_items if item.shift_type_id is not None}
    found_type_ids = {
        row.id for row in db.query(ShiftType.id).filter(ShiftType.id.in_(shift_type_ids))
    }
    if shift_type_ids - found_type_ids:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="存在しない勤務区分が含まれています",
        )

    saved = 0
    deleted = 0
    for item in unique_items:
        existing = (
            db.query(Shift)
            .filter(Shift.user_id == item.user_id, Shift.work_date == item.work_date)
            .first()
        )

        if item.shift_type_id is None:
            if existing is not None:
                db.delete(existing)
                deleted += 1
            continue

        if existing is None:
            db.add(
                Shift(
                    user_id=item.user_id,
                    work_date=item.work_date,
                    shift_type_id=item.shift_type_id,
                )
            )
        else:
            existing.shift_type_id = item.shift_type_id
        saved += 1

    db.commit()
    return ShiftBulkResult(saved=saved, deleted=deleted)
