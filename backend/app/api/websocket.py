"""WebSocket endpoint for real-time document processing status updates."""
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.db.database import SessionLocal
from app.db.models import Document, AnalysisResult

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/status/{doc_id}")
async def document_status_ws(websocket: WebSocket, doc_id: str):
    await websocket.accept()
    prev_status = None

    try:
        for _ in range(600):  # Up to 10 minutes at 1s intervals
            # Open a fresh DB session per iteration to avoid stale connections
            db = SessionLocal()
            try:
                doc = db.query(Document).filter(Document.id == doc_id).first()
                if not doc:
                    await websocket.send_json({"error": "Document not found"})
                    return

                result = db.query(AnalysisResult).filter(
                    AnalysisResult.document_id == doc_id
                ).first()

                status_payload = {
                    "document_id": doc_id,
                    "status": doc.status,
                    "verdict": result.verdict if result else "pending",
                    "fraud_score": result.fraud_score if result else None,
                }
            finally:
                db.close()

            if status_payload != prev_status:
                await websocket.send_json(status_payload)
                prev_status = status_payload

            if doc.status in ("completed", "failed"):
                # Send once more to guarantee delivery
                await websocket.send_json(status_payload)
                return

            await asyncio.sleep(1)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"DEBUG: WebSocket error for {doc_id}: {e}")
