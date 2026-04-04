from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User


def ensure_admin_user(db: Session) -> User:
    admin = (
        db.query(User)
        .filter((User.role == "admin") | (User.username == settings.admin_username) | (User.email == "admin@cybersim.local"))
        .first()
    )
    bootstrap_password = settings.admin_bootstrap_password

    if admin is None:
        admin = User(
            email="admin@cybersim.local",
            username=settings.admin_username,
            password_hash=hash_password(bootstrap_password),
            display_name="Администратор",
            role="admin",
            league="Администратор",
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        return admin

    admin.username = settings.admin_username
    admin.email = admin.email or "admin@cybersim.local"
    admin.display_name = admin.display_name or "Администратор"
    admin.role = "admin"
    admin.league = "Администратор"
    if bootstrap_password and not admin.password_hash:
        admin.password_hash = hash_password(bootstrap_password)

    db.commit()
    db.refresh(admin)
    return admin
