from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

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
    Admin only: Register document hash.
    """

    # 🔐 Role check
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Only admins can register documents"
        )

    try:
        content = await file.read()

        if not content:
            raise HTTPException(status_code=400, detail="Empty file uploaded")

        record = blockchain.register_document_on_blockchain(
            db=db,
            admin_id=current_user.id,
            file_content=content,
            filename=file.filename
        )

        return {
            "status": "success",
            "transaction_id": record.transaction_id,
            "file_hash": record.file_hash,
            "timestamp": record.timestamp
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Registration failed: {str(e)}"
        )

    finally:
        await file.close()   # ✅ important


@router.post("/verify")
async def verify_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Public: Verify document integrity.
    """

    try:
        content = await file.read()

        if not content:
            raise HTTPException(status_code=400, detail="Empty file uploaded")

        is_verified, record = blockchain.verify_document_against_blockchain(
            db,
            content
        )

        if is_verified:
            return {
                "verified": True,
                "status": "VERIFIED ✅",
                "transaction_id": record.transaction_id,
                "registered_at": record.timestamp,
                "original_filename": record.original_filename
            }

        return {
            "verified": False,
            "status": "NOT VERIFIED ❌",
            "message": "Document not found or tampered"
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Verification failed: {str(e)}"
        )

    finally:
        await file.close()   # ✅ important