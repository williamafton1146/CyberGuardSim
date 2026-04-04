from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


CertificateState = Literal["not_eligible", "eligible", "issued"]


class IssuedCertificate(BaseModel):
    code: str
    display_name: str
    league: str
    security_rating: int
    issued_at: datetime
    verify_url: str

    model_config = ConfigDict(from_attributes=True)


class CertificateStatus(BaseModel):
    status: CertificateState
    completed_scenarios: int
    required_scenarios: int
    certificate: IssuedCertificate | None = None


class CertificateVerification(BaseModel):
    code: str
    display_name: str
    league: str
    security_rating: int
    issued_at: datetime
    verify_url: str
    status: Literal["valid"] = "valid"
