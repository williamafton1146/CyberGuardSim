import secrets

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.certificate import Certificate
from app.models.progress import UserScenarioProgress
from app.models.scenario import Scenario
from app.models.user import User
from app.schemas.certificate import CertificateStatus, CertificateVerification, IssuedCertificate
from app.services.scenarios import scenario_is_live


def build_verify_url(code: str) -> str:
    return f"{settings.frontend_origin.rstrip('/')}/certificates/{code}"


def _serialize_certificate(certificate: Certificate) -> IssuedCertificate:
    return IssuedCertificate(
        code=certificate.code,
        display_name=certificate.display_name,
        league=certificate.league,
        security_rating=certificate.security_rating,
        issued_at=certificate.issued_at,
        verify_url=build_verify_url(certificate.code),
    )


def _playable_scenarios(db: Session) -> list[Scenario]:
    scenarios = db.query(Scenario).order_by(Scenario.id).all()
    return [scenario for scenario in scenarios if scenario_is_live(scenario)]


def _completed_playable_scenarios(db: Session, user: User) -> set[int]:
    live_ids = [scenario.id for scenario in _playable_scenarios(db)]
    if not live_ids:
        return set()

    rows = (
        db.query(UserScenarioProgress.scenario_id)
        .filter(
            UserScenarioProgress.user_id == user.id,
            UserScenarioProgress.best_completed.is_(True),
            UserScenarioProgress.scenario_id.in_(live_ids),
        )
        .all()
    )
    return {scenario_id for scenario_id, in rows}


def build_certificate_status(db: Session, user: User) -> CertificateStatus:
    certificate = db.query(Certificate).filter(Certificate.user_id == user.id).first()
    playable_scenarios = _playable_scenarios(db)
    completed_scenarios = _completed_playable_scenarios(db, user)

    if certificate is not None:
        return CertificateStatus(
            status="issued",
            completed_scenarios=len(completed_scenarios),
            required_scenarios=len(playable_scenarios),
            certificate=_serialize_certificate(certificate),
        )

    status_value = "eligible" if playable_scenarios and len(completed_scenarios) == len(playable_scenarios) else "not_eligible"
    return CertificateStatus(
        status=status_value,
        completed_scenarios=len(completed_scenarios),
        required_scenarios=len(playable_scenarios),
    )


def issue_certificate(db: Session, user: User) -> CertificateStatus:
    existing = db.query(Certificate).filter(Certificate.user_id == user.id).first()
    if existing is not None:
        return build_certificate_status(db, user)

    certificate_status = build_certificate_status(db, user)
    if certificate_status.status != "eligible":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Сертификат можно получить только после завершения всех доступных сценариев",
        )

    certificate = Certificate(
        user_id=user.id,
        code=secrets.token_urlsafe(18),
        display_name=user.display_name,
        league=user.league,
        security_rating=user.security_rating,
    )
    db.add(certificate)
    db.commit()
    db.refresh(certificate)
    return build_certificate_status(db, user)


def verify_certificate(db: Session, code: str) -> CertificateVerification:
    certificate = db.query(Certificate).filter(Certificate.code == code).first()
    if certificate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Сертификат не найден")

    return CertificateVerification(
        code=certificate.code,
        display_name=certificate.display_name,
        league=certificate.league,
        security_rating=certificate.security_rating,
        issued_at=certificate.issued_at,
        verify_url=build_verify_url(certificate.code),
    )
