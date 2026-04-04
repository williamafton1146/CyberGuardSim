from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.core.passwords import extract_password_context, password_weakness_reason


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=32)
    display_name: str = Field(min_length=2, max_length=32)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("display_name", mode="before")
    @classmethod
    def normalize_display_name(cls, value: str) -> str:
        return value.strip()

    @field_validator("email")
    @classmethod
    def enforce_email_length(cls, value: EmailStr) -> EmailStr:
        if len(str(value)) > 32:
            raise ValueError("Email не должен превышать 32 символа")
        return value

    @model_validator(mode="after")
    def validate_password_strength(self) -> "RegisterRequest":
        weakness_reason = password_weakness_reason(
            self.password,
            context_fragments=extract_password_context(str(self.email), self.display_name),
        )
        if weakness_reason:
            raise ValueError(weakness_reason)
        return self


class LoginRequest(BaseModel):
    identifier: str | None = Field(default=None, min_length=1, max_length=32)
    email: EmailStr | None = None
    password: str = Field(min_length=8, max_length=32)

    @field_validator("identifier", mode="before")
    @classmethod
    def normalize_identifier(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if "@" in value:
            return value.lower()
        return value

    @field_validator("email", mode="before")
    @classmethod
    def normalize_login_email(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip().lower()

    @field_validator("email")
    @classmethod
    def enforce_login_email_length(cls, value: EmailStr | None) -> EmailStr | None:
        if value is not None and len(str(value)) > 32:
            raise ValueError("Email не должен превышать 32 символа")
        return value

    @model_validator(mode="after")
    def ensure_identifier(self) -> "LoginRequest":
        if not self.identifier and not self.email:
            raise ValueError("Нужно передать identifier или email")
        return self

    @property
    def resolved_identifier(self) -> str:
        return (self.identifier or self.email or "").strip()


class AuthUserPayload(BaseModel):
    id: int
    email: str
    username: str | None = None
    display_name: str
    role: str
    security_rating: int
    league: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    redirect_to: str
    user: AuthUserPayload
