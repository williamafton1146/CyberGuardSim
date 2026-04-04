from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.certificate import CertificateStatus, CertificateVerification
from app.services.certificates import build_certificate_status, issue_certificate, verify_certificate

router = APIRouter(tags=["certificates"])


@router.get("/users/me/certificate", response_model=CertificateStatus)
async def my_certificate(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CertificateStatus:
    return build_certificate_status(db, current_user)


@router.post("/users/me/certificate", response_model=CertificateStatus)
async def create_certificate(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CertificateStatus:
    return issue_certificate(db, current_user)


@router.get("/api/certificates/{code}", response_model=CertificateVerification)
async def verify_public_certificate(code: str, db: Session = Depends(get_db)) -> CertificateVerification:
    return verify_certificate(db, code)
