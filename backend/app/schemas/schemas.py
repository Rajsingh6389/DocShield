from typing import Optional, List
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field
from app.db.models import UserRole, DocumentStatus, Verdict, DocumentType, ForgeryType


# ─── Auth ─────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    role: UserRole = UserRole.USER


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    totp_code: Optional[str] = None


class UserOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    is_active: bool
    totp_enabled: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
    requires_2fa: bool = False


class TOTPSetupOut(BaseModel):
    secret: str
    qr_code_base64: str
    uri: str


# ─── Document ─────────────────────────────────────────────────────────────────

class DocumentOut(BaseModel):
    id: UUID
    filename: str
    original_filename: str
    file_size: int
    mime_type: str
    doc_type: str
    status: str
    uploaded_at: datetime
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DocumentListOut(BaseModel):
    items: List[DocumentOut]
    total: int
    page: int
    page_size: int


# ─── Analysis ─────────────────────────────────────────────────────────────────

class SignalScore(BaseModel):
    name: str
    score: float          # 0.0 – 1.0
    label: str            # e.g. "High Risk", "Clean"
    details: Optional[dict] = None


class AnalysisResultOut(BaseModel):
    id: UUID
    document_id: UUID
    fraud_score: Optional[float]
    verdict: str
    forgery_type: str
    signals: List[SignalScore]
    heatmap_url: Optional[str] = None
    report_url: Optional[str] = None
    processing_time_seconds: Optional[float] = None
    ai_explainer: Optional[str] = None
    analyzed_at: datetime

    class Config:
        from_attributes = True


# ─── Case ─────────────────────────────────────────────────────────────────────

class CaseOut(BaseModel):
    id: UUID
    document_id: UUID
    reviewer_verdict: Optional[Verdict]
    reviewer_notes: Optional[str]
    priority: int
    is_closed: bool
    created_at: datetime
    updated_at: datetime
    document: DocumentOut

    class Config:
        from_attributes = True


class CaseUpdate(BaseModel):
    reviewer_verdict: Optional[Verdict] = None
    reviewer_notes: Optional[str] = None
    is_closed: Optional[bool] = None
    priority: Optional[int] = None
    assigned_reviewer_id: Optional[UUID] = None


# ─── Audit Log ────────────────────────────────────────────────────────────────

class AuditLogOut(BaseModel):
    id: UUID
    user_id: Optional[UUID]
    action: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    details: Optional[dict]
    ip_address: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True


# ─── Notification ─────────────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    id: UUID
    title: str
    message: str
    type: str
    is_read: bool
    document_id: Optional[UUID]
    created_at: datetime

    class Config:
        from_attributes = True
