import hashlib
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from typing import Optional, Tuple

from app.db.models import BlockchainDocument


def calculate_hash(file_content: bytes) -> str:
    """
    Calculate SHA-256 hash of file content.
    """
    return hashlib.sha256(file_content).hexdigest()


def register_document_on_blockchain(
    db: Session,
    admin_id: uuid.UUID,
    file_content: bytes,
    filename: str
) -> BlockchainDocument:
    """
    Register document by storing its hash and metadata.
    """

    if not file_content:
        raise ValueError("File content cannot be empty")

    file_hash = calculate_hash(file_content)
    file_size = len(file_content)

    try:
        # 🔍 Check if already exists
        existing = (
            db.query(BlockchainDocument)
            .filter(BlockchainDocument.file_hash == file_hash)
            .first()
        )
        if existing:
            return existing

        # 🔗 Generate pseudo blockchain transaction ID
        tx_id = f"0x{uuid.uuid4().hex}{uuid.uuid4().hex[:8]}"

        db_obj = BlockchainDocument(
            file_hash=file_hash,
            original_filename=filename,
            file_size=file_size,   # ✅ NEW FIELD (add in model)
            admin_id=admin_id,
            transaction_id=tx_id,
            timestamp=datetime.now(timezone.utc)
        )

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)

        return db_obj

    except Exception as e:
        db.rollback()
        raise e


def verify_document_against_blockchain(
    db: Session,
    file_content: bytes
) -> Tuple[bool, Optional[BlockchainDocument]]:
    """
    Verify document by comparing hash + size.
    """

    if not file_content:
        return False, None

    file_hash = calculate_hash(file_content)
    file_size = len(file_content)

    record = (
        db.query(BlockchainDocument)
        .filter(BlockchainDocument.file_hash == file_hash)
        .first()
    )

    if record:
        # 🔐 Extra tamper check
        if hasattr(record, "file_size") and record.file_size != file_size:
            return False, None
        return True, record

    return False, None