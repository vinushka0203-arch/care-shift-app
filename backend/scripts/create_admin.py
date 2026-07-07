"""管理者ユーザーを作成するスクリプト。

使い方:
    python scripts/create_admin.py [email] [password] [name]

引数を省略した場合はデフォルト値(admin@example.com / admin123)で作成する。
既に同じ email のユーザーが存在する場合は何もしない。
"""
import sys
from pathlib import Path

# backend/ を import パスに追加し、app パッケージを読み込めるようにする
sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.core.database import SessionLocal  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models.user import User  # noqa: E402

DEFAULT_EMAIL = "admin@example.com"
DEFAULT_PASSWORD = "admin123"
DEFAULT_NAME = "管理者"


def create_admin(email: str, password: str, name: str) -> None:
    """管理者ユーザーを1人作成する。"""
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing is not None:
            print(f"既にユーザーが存在します: {email}")
            return

        user = User(
            name=name,
            email=email,
            password_hash=hash_password(password),
            role="admin",
            employment_type="full_time",
            is_active=True,
        )
        db.add(user)
        db.commit()
        print(f"管理者ユーザーを作成しました: {email} / {password}")
    finally:
        db.close()


if __name__ == "__main__":
    args = sys.argv[1:]
    email = args[0] if len(args) > 0 else DEFAULT_EMAIL
    password = args[1] if len(args) > 1 else DEFAULT_PASSWORD
    name = args[2] if len(args) > 2 else DEFAULT_NAME
    create_admin(email, password, name)
