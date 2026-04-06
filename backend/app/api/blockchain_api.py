from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.db.database import get_db
from app.services import blockchain
from app.core.deps import get_current_user
from app.db.models import User, UserRole

router = APIRouter(prefix="/blockchain", tags=["Blockchain"])

@router.post("/register")
async def register_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Admin only: Calculates the hash of an uploaded document and stores it in the blockchain record.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can register documents on the blockchain")
    
    content = await file.read()
    try:
        record = blockchain.register_document_on_blockchain(
            db, 
            admin_id=current_user.id, 
            file_content=content, 
            filename=file.filename
        )
        return {
            "status": "success",
            "message": "Document hash successfully registered on blockchain",
            "transaction_id": record.transaction_id,
            "file_hash": record.file_hash,
            "timestamp": record.timestamp
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@router.post("/verify")
async def verify_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Publicly accessible: Verifies if the uploaded document's hash exists in the blockchain.
    """
    content = await file.read()
    is_verified, record = blockchain.verify_document_against_blockchain(db, content)
    
    if is_verified:
        return {
            "verified": True,
            "status": "DONE (Match Found)",
            "message": "The document integrity is verified. It matches the version stored in the blockchain.",
            "transaction_id": record.transaction_id,
            "registered_at": record.timestamp,
            "original_filename": record.original_filename
        }
    else:
        return {
            "verified": False,
            "status": "TAMPERED DETECTED",
            "message": "No matching document hash found in the blockchain. This document may be tampered with or is not registered."
        }
