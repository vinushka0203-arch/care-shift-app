"""SQLAlchemy のエンジン・セッション設定。"""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine = create_engine(settings.database_url, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """全モデルの基底クラス。"""


def get_db() -> Generator[Session, None, None]:
    """リクエストごとの DB セッションを提供する依存性関数。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
