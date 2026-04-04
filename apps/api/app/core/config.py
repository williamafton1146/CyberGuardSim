from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CyberSim API"
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


settings = Settings()
