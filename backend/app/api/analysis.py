import os
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from loguru import logger

from app.core.deps import get_current_user, require_reviewer
from app.db.database import get_db
from app.db.models import (
    AnalysisResult, Document, User, Verdict, ForgeryType, UserRole
)
from app.schemas.schemas import AnalysisResultOut, SignalScore
from app.core.config import settings

router = APIRouter(prefix="/analysis", tags=["Analysis"])


def _build_signal_list(result: AnalysisResult):
    signal_map = [
        ("Error Level Analysis", result.ela_score, result.ela_details),
        ("Clone Detection", result.clone_score, result.clone_details),
        ("Font/Text Anomaly", result.ocr_score, result.ocr_details),
        ("Metadata Analysis", result.metadata_score, result.metadata_details),
        ("Color Histogram", result.histogram_score, None),
        ("Edge Artifacts", result.edge_score, None),
        ("Lighting Inconsistency", result.shadow_score, None),
        ("Document AI (DiT)", result.resnet_score, result.vit_details),
        ("QR Code Analysis", result.qr_score, result.qr_details),
    ]
    signals = []
    for name, score, details in signal_map:
        s = score or 0.0
        if s < 0.20:
            label = "Clean"
        elif s < 0.40:
            label = "Low Risk"
        elif s < 0.60:
            label = "Moderate Risk"
        elif s < 0.80:
            label = "High Risk"
        else:
            label = "Critical"
        signals.append(SignalScore(name=name, score=s, label=label, details=details))
    return signals


@router.get("/{doc_id}/result", response_model=AnalysisResultOut)
@router.get("/{doc_id}/results", response_model=AnalysisResultOut, include_in_schema=False)
def get_analysis_result(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = db.query(AnalysisResult).join(Document).filter(AnalysisResult.document_id == doc_id).first()
    if not result:
        raise HTTPException(404, "Analysis result not found. Document may still be processing.")
    
    # Ownership Check
    if current_user.role not in [UserRole.ADMIN, UserRole.REVIEWER, UserRole.AUDITOR] and result.document.uploader_id != current_user.id:
        raise HTTPException(403, "Access denied")

    heatmap_url = None
    if result.heatmap_path and os.path.exists(result.heatmap_path):
        filename = os.path.basename(result.heatmap_path)
        heatmap_url = f"/data/heatmaps/{filename}"
    else:
        pass

    report_url = None
    if result.report_path and os.path.exists(result.report_path):
        filename = os.path.basename(result.report_path)
        report_url = f"/data/reports/{filename}"

    return AnalysisResultOut(
        id=result.id,
        document_id=result.document_id,
        fraud_score=result.fraud_score,
        verdict=result.verdict,
        forgery_type=result.forgery_type,
        signals=_build_signal_list(result),
        heatmap_url=heatmap_url,
        report_url=report_url,
        processing_time_seconds=result.processing_time_seconds,
        ai_explainer=result.ai_explainer,
        analyzed_at=result.analyzed_at,
    )


@router.get("/{doc_id}", response_model=AnalysisResultOut, include_in_schema=False)
def get_analysis_result_alias(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Catch-all alias for analysis results."""
    return get_analysis_result(doc_id, current_user, db)


@router.post("/{doc_id}/retry")
def retry_analysis(
    doc_id: str,
    background_tasks=None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Re-trigger analysis for a stuck or failed document."""
    from app.services.analysis_runner import run_analysis_sync
    import threading

    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    if current_user.role not in [UserRole.ADMIN, UserRole.REVIEWER, UserRole.AUDITOR] and doc.uploader_id != current_user.id:
        raise HTTPException(403, "Access denied")
    if doc.status == "processing":
        return {"message": "Analysis already in progress"}

    # Reset to queued and re-run
    doc.status = "queued"
    db.commit()
    t = threading.Thread(target=run_analysis_sync, args=(doc_id,), daemon=True)
    t.start()
    return {"message": "Analysis re-triggered", "document_id": doc_id}


@router.get("/{doc_id}/status")
def get_analysis_status(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            logger.warning(f"Status check failed: Document {doc_id} not found")
            raise HTTPException(404, "Document not found")
        
        # Ownership Check
        if current_user.role not in [UserRole.ADMIN, UserRole.REVIEWER, UserRole.AUDITOR] and doc.uploader_id != current_user.id:
            raise HTTPException(403, "Access denied")
        
        result = db.query(AnalysisResult).filter(AnalysisResult.document_id == doc_id).first()
        
        return {
            "document_id": doc_id,
            "status": doc.status,
            "verdict": result.verdict if result else "pending",
            "fraud_score": result.fraud_score if result else None,
            "error": result.error_message if result else None,
        }
    except Exception as e:
        logger.error(f"Error in get_analysis_status for {doc_id}: {str(e)}")
        raise e


@router.get("/{doc_id}/heatmap")
def get_heatmap(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = db.query(AnalysisResult).join(Document).filter(AnalysisResult.document_id == doc_id).first()
    if not result or not result.heatmap_path or not os.path.exists(result.heatmap_path):
        raise HTTPException(404, "Heatmap not available")
    
    # Ownership Check
    if current_user.role not in [UserRole.ADMIN, UserRole.REVIEWER, UserRole.AUDITOR] and result.document.uploader_id != current_user.id:
        raise HTTPException(403, "Access denied")
    return FileResponse(result.heatmap_path, media_type="image/jpeg")


@router.get("/{doc_id}/report")
def download_report(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = db.query(AnalysisResult).join(Document).filter(AnalysisResult.document_id == doc_id).first()
    if not result or not result.report_path or not os.path.exists(result.report_path):
        raise HTTPException(404, "Report not available")
    
    # Ownership Check
    if current_user.role not in [UserRole.ADMIN, UserRole.REVIEWER, UserRole.AUDITOR] and result.document.uploader_id != current_user.id:
        raise HTTPException(403, "Access denied")
    doc = db.query(Document).filter(Document.id == doc_id).first()
    filename = f"docushield_report_{doc_id[:8]}.pdf"
    return FileResponse(result.report_path, media_type="application/pdf", filename=filename)
