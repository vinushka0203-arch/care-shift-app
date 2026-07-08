"""希望休・希望勤務に関するエンドポイント。"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dates import month_range
from app.core.deps import get_current_admin, get_current_user
from app.models.shift_request import ShiftRequest
from app.models.shift_type import ShiftType
from app.models.user import User
from app.schemas.shift_request import (
    ShiftRequestCreate,
    ShiftRequestRead,
    ShiftRequestStatusUpdate,
)

router = APIRouter(prefix="/api/shift-requests", tags=["shift-requests"])


def _to_read(request: ShiftRequest, user_name: str) -> ShiftRequestRead:
    """モデルと職員名からレスポンス用スキーマを組み立てる。"""
    return ShiftRequestRead(
        id=request.id,
        user_id=request.user_id,
        user_name=user_name,
        work_date=request.work_date,
        shift_type_id=request.shift_type_id,
        request_type=request.request_type,
        status=request.status,
        note=request.note,
        created_at=request.created_at,
    )


@router.get("", response_model=list[ShiftRequestRead])
def list_shift_requests(
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ShiftRequestRead]:
    """希望の一覧。一般職員は自分の分のみ、管理者は全員分を返す。"""
    query = db.query(ShiftRequest, User.name).join(User, ShiftRequest.user_id == User.id)

    if current_user.role != "admin":
        query = query.filter(ShiftRequest.user_id == current_user.id)

    if year is not None and month is not None:
        start, end = month_range(year, month)
        query = query.filter(ShiftRequest.work_date >= start, ShiftRequest.work_date < end)

    rows = query.order_by(ShiftRequest.work_date, ShiftRequest.id).all()
    return [_to_read(request, user_name) for request, user_name in rows]


@router.post("", response_model=ShiftRequestRead, status_code=status.HTTP_201_CREATED)
def create_shift_request(
    payload: ShiftRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ShiftRequestRead:
    """希望を提出する(本人のアカウントで)。同一日に審査中の希望があれば 409。"""
    duplicate = (
        db.query(ShiftRequest)
        .filter(
            ShiftRequest.user_id == current_user.id,
            ShiftRequest.work_date == payload.work_date,
            ShiftRequest.status == "pending",
        )
        .first()
    )
    if duplicate is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="この日にはすでに審査中の希望があります",
        )

    # 休み希望に区分が付いていても無視する(null に正規化)
    shift_type_id = payload.shift_type_id if payload.request_type == "work_preference" else None
    if shift_type_id is not None and db.get(ShiftType, shift_type_id) is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="存在しない勤務区分です",
        )

    request = ShiftRequest(
        user_id=current_user.id,
        work_date=payload.work_date,
        shift_type_id=shift_type_id,
        request_type=payload.request_type,
        note=payload.note,
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return _to_read(request, current_user.name)


@router.patch("/{request_id}", response_model=ShiftRequestRead)
def update_shift_request_status(
    request_id: int,
    payload: ShiftRequestStatusUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> ShiftRequestRead:
    """希望を承認/却下する(管理者のみ)。"""
    request = db.get(ShiftRequest, request_id)
    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="希望が見つかりません",
        )

    request.status = payload.status
    db.commit()
    db.refresh(request)

    user = db.get(User, request.user_id)
    return _to_read(request, user.name if user else "")
