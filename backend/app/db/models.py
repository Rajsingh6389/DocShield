from sqlalchemy import (
    Column, String, Boolean, DateTime, Float, Integer,
    Text, ForeignKey, Enum, JSON, func, TypeDecorator, CHAR, text
)
from sqlalchemy.orm import relationship, declarative_base
import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

Base = declarative_base()


class GUID(TypeDecorator):
    """Platform-independent GUID type.
    Uses PostgreSQL's UUID type, otherwise uses CHAR(32), storing as string without hyphens.
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            from sqlalchemy.dialects.postgresql import UUID as PG_UUID
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        elif dialect.name == 'mysql':
            return dialect.type_descriptor(CHAR(36))
        else:
            return dialect.type_descriptor(CHAR(32))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return value
        elif dialect.name == 'mysql':
            if not isinstance(value, uuid.UUID):
                return str(uuid.UUID(value))
            return str(value)
        else:
            if not isinstance(value, uuid.UUID):
                return uuid.UUID(value).hex
            else:
                return value.hex

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            if not isinstance(value, uuid.UUID):
                return uuid.UUID(value)
            else:
                return value


def now_utc():
    return datetime.now(timezone.utc)


class UserRole(str, PyEnum):
    ADMIN = "admin"
    REVIEWER = "reviewer"
    AUDITOR = "auditor"


class DocumentStatus(str, PyEnum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Verdict(str, PyEnum):
    AUTHENTIC = "authentic"
    SUSPICIOUS = "suspicious"
    FORGED = "forged"
    PENDING = "pending"


class DocumentType(str, PyEnum):
    ID_CARD = "id_card"
    PASSPORT = "passport"
    INVOICE = "invoice"
    CERTIFICATE = "certificate"
    DRIVING_LICENSE = "driving_license"
    BANK_STATEMENT = "bank_statement"
    UNKNOWN = "unknown"


class ForgeryType(str, PyEnum):
    TEXT_EDIT = "text_edit"
    IMAGE_SPLICE = "image_splice"
    STAMP_COPY = "stamp_copy"
    SIGNATURE_FORGE = "signature_forge"
    DIGITAL_MANIPULATION = "digital_manipulation"
    IMAGE_TAMPERING = "image_tampering"
    NONE = "none"
    MULTIPLE = "multiple"


# ─── User ────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.REVIEWER, nullable=False)
    is_active = Column(Boolean, default=True)
    totp_secret = Column(String(64), nullable=True)
    totp_enabled = Column(Boolean, default=False, server_default=text("false"))
    created_at = Column(DateTime(timezone=True), default=now_utc, server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)

    documents = relationship("Document", back_populates="uploader")
    audit_logs = relationship("AuditLog", back_populates="user")
    assigned_cases = relationship("Case", back_populates="assigned_reviewer")


# ─── Document ─────────────────────────────────────────────────────────────────

class Document(Base):
    __tablename__ = "documents"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    filename = Column(String(512), nullable=False)
    original_filename = Column(String(512), nullable=False)
    file_path = Column(String(1024), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(128), nullable=False)
    doc_type = Column(String(50), default=DocumentType.UNKNOWN.value)
    status = Column(String(50), default=DocumentStatus.QUEUED.value)
    uploaded_at = Column(DateTime(timezone=True), default=now_utc)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    uploader_id = Column(GUID(), ForeignKey("users.id"), nullable=True)

    uploader = relationship("User", back_populates="documents")
    analysis_result = relationship("AnalysisResult", back_populates="document", uselist=False)
    case = relationship("Case", back_populates="document", uselist=False)


# ─── Analysis Result ──────────────────────────────────────────────────────────

class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    document_id = Column(GUID(), ForeignKey("documents.id"), unique=True)
    fraud_score = Column(Float, nullable=True)
    verdict = Column(Enum(Verdict), default=Verdict.PENDING)
    forgery_type = Column(String(50), default=ForgeryType.NONE.value)

    # Per-signal scores (0.0 – 1.0)
    ela_score = Column(Float, nullable=True)
    clone_score = Column(Float, nullable=True)
    ocr_score = Column(Float, nullable=True)
    metadata_score = Column(Float, nullable=True)
    signature_score = Column(Float, nullable=True)
    histogram_score = Column(Float, nullable=True)
    edge_score = Column(Float, nullable=True)
    shadow_score = Column(Float, nullable=True)
    resnet_score = Column(Float, nullable=True)
    vit_score = Column(Float, nullable=True)
    qr_score = Column(Float, nullable=True)

    # JSON blobs for detailed findings
    ela_details = Column(JSON, nullable=True)
    clone_details = Column(JSON, nullable=True)
    ocr_details = Column(JSON, nullable=True)
    metadata_details = Column(JSON, nullable=True)
    vit_details = Column(JSON, nullable=True)
    qr_details = Column(JSON, nullable=True)
    ai_explainer = Column(Text, nullable=True)

    heatmap_path = Column(String(1024), nullable=True)
    report_path = Column(String(1024), nullable=True)
    processing_time_seconds = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)
    analyzed_at = Column(DateTime(timezone=True), default=now_utc)

    document = relationship("Document", back_populates="analysis_result")


# ─── Case ────────────────────────────────────────────────────────────────────

class Case(Base):
    __tablename__ = "cases"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    document_id = Column(GUID(), ForeignKey("documents.id"), unique=True)
    assigned_reviewer_id = Column(GUID(), ForeignKey("users.id"), nullable=True)
    reviewer_verdict = Column(Enum(Verdict), nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    priority = Column(Integer, default=0)  # higher = more urgent
    is_closed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    document = relationship("Document", back_populates="case")
    assigned_reviewer = relationship("User", back_populates="assigned_cases")


# ─── Audit Log ────────────────────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=True)
    action = Column(String(256), nullable=False)
    resource_type = Column(String(128), nullable=True)
    resource_id = Column(String(256), nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(String(512), nullable=True)
    timestamp = Column(DateTime(timezone=True), default=now_utc)

    user = relationship("User", back_populates="audit_logs")


# ─── Notification ─────────────────────────────────────────────────────────────

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=True)
    title = Column(String(256), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(64), default="info")  # info, warning, danger
    is_read = Column(Boolean, default=False)
    document_id = Column(GUID(), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc)


# ─── Blockchain ──────────────────────────────────────────────────────────────

class BlockchainDocument(Base):
    __tablename__ = "blockchain_documents"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    file_hash = Column(String(64), nullable=False, index=True, unique=True)
    original_filename = Column(String(512), nullable=False)
    file_size = Column(Integer, nullable=True)  # File size in bytes
    admin_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), default=now_utc)
    transaction_id = Column(String(128), nullable=False)  # Simulated Tx ID

    admin = relationship("User")
