"""勤務区分に関するエンドポイント。"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin, get_current_user
from app.models.shift_type import ShiftType
from app.models.user import User
from app.schemas.shift_type import ShiftTypeCreate, ShiftTypeRead, ShiftTypeUpdate

router = APIRouter(prefix="/api/shift-types", tags=["shift-types"])


@router.get("", response_model=list[ShiftTypeRead])
def list_shift_types(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> list[ShiftType]:
    """勤務区分の一覧を並び順で返す(認証済みなら誰でも)。"""
    return db.query(ShiftType).order_by(ShiftType.sort_order, ShiftType.id).all()


@router.post("", response_model=ShiftTypeRead, status_code=status.HTTP_201_CREATED)
def create_shift_type(
    payload: ShiftTypeCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> ShiftType:
    """勤務区分を新規作成する(管理者のみ)。"""
    shift_type = ShiftType(**payload.model_dump())
    db.add(shift_type)
    db.commit()
    db.refresh(shift_type)
    return shift_type


@router.patch("/{shift_type_id}", response_model=ShiftTypeRead)
def update_shift_type(
    shift_type_id: int,
    payload: ShiftTypeUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> ShiftType:
    """勤務区分を部分更新する(管理者のみ)。"""
    shift_type = db.get(ShiftType, shift_type_id)
    if shift_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="勤務区分が見つかりません",
        )

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(shift_type, field, value)

    db.commit()
    db.refresh(shift_type)
    return shift_type
