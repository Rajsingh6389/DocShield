import hashlib
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from typing import Optional, Tuple

from app.db.models import BlockchainDocument

def calculate_hash(file_content: bytes) -> str:
    """
    Calculates the SHA-256 hash of the given file content.
    """
    sha256_hash = hashlib.sha256()
    sha256_hash.update(file_content)
    return sha256_hash.hexdigest()

def register_document_on_blockchain(
    db: Session, 
    admin_id: uuid.UUID, 
    file_content: bytes, 
    filename: str
) -> BlockchainDocument:
    """
    Calculates the hash, simulates a blockchain transaction, and stores the record.
    """
    file_hash = calculate_hash(file_content)
    
    # Check if already registered
    existing = db.query(BlockchainDocument).filter(BlockchainDocument.file_hash == file_hash).first()
    if existing:
        return existing

    # Simulate a blockchain transaction ID
    tx_id = f"0x{uuid.uuid4().hex}{uuid.uuid4().hex[:8]}"
    
    db_obj = BlockchainDocument(
        file_hash=file_hash,
        original_filename=filename,
        admin_id=admin_id,
        transaction_id=tx_id,
        timestamp=datetime.now(timezone.utc)
    )
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def verify_document_against_blockchain(
    db: Session, 
    file_content: bytes
) -> Tuple[bool, Optional[BlockchainDocument]]:
    """
    Calculates the hash of the provided content and checks if it exists in the blockchain records.
    Returns (is_verified, blockchain_record)
    """
    file_hash = calculate_hash(file_content)
    record = db.query(BlockchainDocument).filter(BlockchainDocument.file_hash == file_hash).first()
    
    if record:
        return True, record
    return False, None
