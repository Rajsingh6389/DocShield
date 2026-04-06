"""WebSocket endpoint for real-time document processing status updates."""
import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.db.models import Document, AnalysisResult

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/status/{doc_id}")
async def document_status_ws(websocket: WebSocket, doc_id: str):
    await websocket.accept()
    print(f"DEBUG: WebSocket accepted for doc {doc_id}")
    db: Session = SessionLocal()
    try:
        prev_status = None
        for i in range(300): # 10 minutes
            doc = db.query(Document).filter(Document.id == doc_id).first()
            if not doc:
                await websocket.send_json({"error": "Document not found"})
                break
            
            result = db.query(AnalysisResult).filter(AnalysisResult.document_id == doc_id).first()
            status_payload = {
                "document_id": doc_id,
                "status": doc.status.value,
                "verdict": result.verdict.value if result else "pending",
                "fraud_score": result.fraud_score if result else None,
            }

            if status_payload != prev_status:
                print(f"DEBUG: WS sending status update for {doc_id}: {doc.status.value}")
                await websocket.send_json(status_payload)
                prev_status = status_payload

            if doc.status.value in ("completed", "failed"):
                # Send one last time to be sure
                print(f"DEBUG: WS final update for {doc_id}")
                await websocket.send_json(status_payload)
                break

            await asyncio.sleep(2)
            db.expire_all() # Ensure we get fresh data
            doc = db.query(Document).filter(Document.id == doc_id).first()
    except WebSocketDisconnect:
        print(f"DEBUG: WebSocket disconnected for doc {doc_id}")
    except Exception as e:
        print(f"DEBUG: WebSocket error: {e}")
    finally:
        db.close()
