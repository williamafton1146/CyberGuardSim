from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CyberSim API"
    environment: str = "development"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 60 * 24
    database_url: str = "sqlite:///./cybersec.db"
    redis_url: str = "redis://localhost:6379/0"
    frontend_origin: str = "http://localhost:3000"
    admin_username: str = "Admin"
    admin_bootstrap_password: str = "AdminCyber12"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @model_validator(mode="after")
    def validate_sensitive_defaults(self) -> "Settings":
        normalized_environment = self.environment.strip().lower()
        is_development_like = normalized_environment in {"dev", "development", "local", "test", "testing"}

        if not is_development_like and self.secret_key == "change-me":
            raise ValueError("SECRET_KEY must be overridden outside development/test environments")

        if not is_development_like and self.admin_bootstrap_password in {"", "change-me", "change-me-admin-password", "AdminCyber12"}:
            raise ValueError("ADMIN_BOOTSTRAP_PASSWORD must be overridden outside development/test environments")

        return self


settings = Settings()
