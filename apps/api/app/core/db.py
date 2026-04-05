from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


is_sqlite = settings.database_url.startswith("sqlite")

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if is_sqlite else {},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


async def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    import app.models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    migrate_legacy_schema()


def migrate_legacy_schema() -> None:
    inspector = inspect(engine)
    dialect = engine.dialect.name

    def has_column(table_name: str, column_name: str) -> bool:
        return any(column["name"] == column_name for column in inspector.get_columns(table_name))

    def add_column(table_name: str, sql_fragment: str) -> None:
        with engine.begin() as connection:
            connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {sql_fragment}"))

    if inspector.has_table("users"):
        if not has_column("users", "username"):
            add_column("users", "username VARCHAR(120)")
        if not has_column("users", "role"):
            add_column("users", "role VARCHAR(30) DEFAULT 'user'")
        if not has_column("users", "created_at"):
            if dialect == "postgresql":
                add_column("users", "created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()")
            else:
                add_column("users", "created_at TIMESTAMP")
        with engine.begin() as connection:
            connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users (username)"))

    if inspector.has_table("scenarios"):
        if not has_column("scenarios", "is_enabled"):
            if dialect == "sqlite":
                add_column("scenarios", "is_enabled BOOLEAN DEFAULT 1")
            else:
                add_column("scenarios", "is_enabled BOOLEAN DEFAULT TRUE")
        if not has_column("scenarios", "release_at"):
            add_column("scenarios", "release_at TIMESTAMP")
        if not has_column("scenarios", "created_at"):
            if dialect == "postgresql":
                add_column("scenarios", "created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()")
            else:
                add_column("scenarios", "created_at TIMESTAMP")
        if not has_column("scenarios", "updated_at"):
            if dialect == "postgresql":
                add_column("scenarios", "updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()")
            else:
                add_column("scenarios", "updated_at TIMESTAMP")
