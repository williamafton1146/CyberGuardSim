from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.models.user import User


def ensure_admin_user(db: Session) -> User:
    admin = (
        db.query(User)
        .filter((User.role == "admin") | (User.username == settings.admin_username) | (User.email == "admin@cyberguardsim.local"))
        .first()
    )
    bootstrap_password = settings.admin_bootstrap_password

    if admin is None:
        admin = User(
            email="admin@cyberguardsim.local",
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
    admin.email = admin.email or "admin@cyberguardsim.local"
    admin.display_name = admin.display_name or "Администратор"
    admin.role = "admin"
    admin.league = "Администратор"
    if bootstrap_password and (not admin.password_hash or not verify_password(bootstrap_password, admin.password_hash)):
        admin.password_hash = hash_password(bootstrap_password)

    db.commit()
    db.refresh(admin)
    return admin
