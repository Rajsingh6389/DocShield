import os
import uuid
import mimetypes
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Request, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user, require_reviewer
from app.db.database import get_db
from app.db.models import Document, DocumentStatus, DocumentType, User, UserRole, AuditLog
from app.schemas.schemas import DocumentOut, DocumentListOut
from app.services.analysis_runner import run_analysis_sync

router = APIRouter(prefix="/documents", tags=["Documents"])

ALLOWED_MIME = {
    "image/jpeg", "image/png", "image/tiff", "image/bmp",
    "application/pdf",
}


def _save_upload(file: UploadFile) -> tuple[str, str, int]:
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"
    unique_name = f"{uuid.uuid4()}.{ext}"
    dest = os.path.join(settings.UPLOAD_DIR, unique_name)
    total = 0
    with open(dest, "wb") as out:
        while chunk := file.file.read(1024 * 1024):  # 1MB chunks
            total += len(chunk)
            if total > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
                os.remove(dest)
                raise HTTPException(413, f"File exceeds {settings.MAX_FILE_SIZE_MB}MB limit")
            out.write(chunk)
    return unique_name, dest, total


@router.post("/upload", response_model=DocumentOut, status_code=201)
async def upload_document(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    mime = file.content_type or mimetypes.guess_type(file.filename)[0] or ""
    if mime not in ALLOWED_MIME:
        raise HTTPException(400, f"Unsupported file type: {mime}")

    filename, file_path, file_size = _save_upload(file)

    doc = Document(
        filename=filename,
        original_filename=file.filename,
        file_path=file_path,
        file_size=file_size,
        mime_type=mime,
        uploader_id=current_user.id,
        status=DocumentStatus.QUEUED,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Run analysis in background thread (no Celery needed)
    background_tasks.add_task(run_analysis_sync, str(doc.id))

    # Audit log
    db.add(AuditLog(
        user_id=current_user.id,
        action="document_uploaded",
        resource_type="document",
        resource_id=str(doc.id),
        ip_address=request.client.host,
        details={"filename": file.filename, "size": file_size},
    ))
    db.commit()
    return doc


@router.post("/bulk-upload", response_model=List[DocumentOut], status_code=201)
async def bulk_upload(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if len(files) > 100:
        raise HTTPException(400, "Maximum 100 files per batch")
    results = []
    for file in files:
        mime = file.content_type or ""
        if mime not in ALLOWED_MIME:
            continue
        try:
            filename, file_path, file_size = _save_upload(file)
        except HTTPException:
            continue
        doc = Document(
            filename=filename,
            original_filename=file.filename,
            file_path=file_path,
            file_size=file_size,
            mime_type=mime,
            uploader_id=current_user.id,
            status=DocumentStatus.QUEUED,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        background_tasks.add_task(run_analysis_sync, str(doc.id))
        results.append(doc)
    return results


@router.get("/", response_model=DocumentListOut)
def list_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    doc_type: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Document)
    if doc_type:
        q = q.filter(Document.doc_type == doc_type)
    if status:
        q = q.filter(Document.status == status)
    
    # Filter by user if not admin/reviewer/auditor
    if current_user.role not in [UserRole.ADMIN, UserRole.REVIEWER, UserRole.AUDITOR]:
        q = q.filter(Document.uploader_id == current_user.id)

    total = q.count()
    items = q.order_by(Document.uploaded_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return DocumentListOut(items=items, total=total, page=page, page_size=page_size)


@router.get("/{doc_id}", response_model=DocumentOut)
def get_document(doc_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    
    # Security check: only owner or staff can see details
    if current_user.role not in [UserRole.ADMIN, UserRole.REVIEWER, UserRole.AUDITOR] and doc.uploader_id != current_user.id:
        raise HTTPException(403, "Access denied")

    return doc


@router.delete("/{doc_id}", status_code=204)
def delete_document(
    doc_id: str,
    current_user: User = Depends(require_reviewer),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)
    db.delete(doc)
    db.commit()


@router.get("/{doc_id}/download")
def download_document(doc_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc or not os.path.exists(doc.file_path):
        raise HTTPException(404, "Document not found")
    
    # Security check: only owner or staff can download
    if current_user.role not in [UserRole.ADMIN, UserRole.REVIEWER, UserRole.AUDITOR] and doc.uploader_id != current_user.id:
        raise HTTPException(403, "Access denied")

    return FileResponse(doc.file_path, filename=doc.original_filename)
