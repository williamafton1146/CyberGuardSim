from pydantic import BaseModel, EmailStr, Field, model_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=2, max_length=120)


class LoginRequest(BaseModel):
    identifier: str | None = Field(default=None, min_length=1, max_length=255)
    email: EmailStr | None = None
    password: str = Field(min_length=8, max_length=128)

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
