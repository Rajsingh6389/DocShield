from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import require_admin, get_current_user
from app.db.database import get_db
from app.db.models import User, AuditLog
from app.schemas.schemas import UserOut, AuditLogOut
from app.core.security import hash_password

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/users", response_model=List[UserOut])
def list_users(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.patch("/users/{user_id}/activate")
def toggle_user_active(
    user_id: str,
    active: bool,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.is_active = active
    db.commit()
    return {"message": f"User {'activated' if active else 'deactivated'}"}


@router.patch("/users/{user_id}/role")
def change_user_role(
    user_id: str,
    role: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    from app.db.models import UserRole
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    try:
        user.role = UserRole(role)
    except ValueError:
        raise HTTPException(400, f"Invalid role: {role}")
    db.commit()
    return {"message": f"Role updated to {role}"}


@router.get("/audit-logs", response_model=List[AuditLogOut])
def get_audit_logs(
    page: int = 1,
    page_size: int = 50,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return (
        db.query(AuditLog)
        .order_by(AuditLog.timestamp.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )


@router.get("/stats")
def get_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.db.models import Document, AnalysisResult, DocumentStatus, Verdict, UserRole
    from sqlalchemy import func

    is_staff = current_user.role in [UserRole.ADMIN, UserRole.REVIEWER, UserRole.AUDITOR]

    q_total = db.query(func.count(Document.id))
    q_forged = db.query(func.count(AnalysisResult.id)).filter(AnalysisResult.verdict == "forged")
    q_suspicious = db.query(func.count(AnalysisResult.id)).filter(AnalysisResult.verdict == "suspicious")
    q_authentic = db.query(func.count(AnalysisResult.id)).filter(AnalysisResult.verdict == "authentic")
    q_processing = db.query(func.count(Document.id)).filter(Document.status == "processing")
    q_avg = db.query(func.avg(AnalysisResult.fraud_score))

    if not is_staff:
        q_total = q_total.filter(Document.uploader_id == current_user.id)
        q_forged = q_forged.join(Document).filter(Document.uploader_id == current_user.id)
        q_suspicious = q_suspicious.join(Document).filter(Document.uploader_id == current_user.id)
        q_authentic = q_authentic.join(Document).filter(Document.uploader_id == current_user.id)
        q_processing = q_processing.filter(Document.uploader_id == current_user.id)
        q_avg = q_avg.join(Document).filter(Document.uploader_id == current_user.id)

    total_docs = q_total.scalar()
    forged = q_forged.scalar()
    suspicious = q_suspicious.scalar()
    authentic = q_authentic.scalar()
    processing = q_processing.scalar()
    avg_score = q_avg.scalar()

    return {
        "total_documents": total_docs,
        "forged": forged,
        "suspicious": suspicious,
        "authentic": authentic,
        "processing": processing,
        "avg_fraud_score": round(float(avg_score or 0), 2),
    }
