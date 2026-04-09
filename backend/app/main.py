import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from loguru import logger

from app.core.config import settings
from app.db.database import create_tables, SessionLocal
from app.db.models import Document, DocumentStatus
from app.api import auth, documents, analysis, cases, admin, notifications, websocket, blockchain_api

from dotenv import load_dotenv
load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting DocuShield API...")
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.HEATMAP_DIR, exist_ok=True)
    os.makedirs(settings.REPORT_DIR, exist_ok=True)
    create_tables()

    # Cleanup + re-submit stuck/queued documents
    db = SessionLocal()
    try:
        # Reset any docs stuck in "processing" back to "queued"
        stuck_count = db.query(Document).filter(Document.status == "processing").update({"status": "queued"})
        db.commit()
        if stuck_count > 0:
            logger.info(f"Cleanup: Resetting {stuck_count} stuck documents to 'queued'")

        # Re-submit all queued docs (including ones reset above) for analysis
        queued_docs = db.query(Document).filter(Document.status == "queued").all()
        if queued_docs:
            logger.info(f"Startup: Re-submitting {len(queued_docs)} queued documents for analysis")
            import threading
            from app.services.analysis_runner import run_analysis_sync
            for doc in queued_docs:
                t = threading.Thread(target=run_analysis_sync, args=(str(doc.id),), daemon=True)
                t.start()
    except Exception as e:
        logger.error(f"Startup cleanup failed: {e}")
    finally:
        db.close()

    logger.info("Database tables verified and maintenance completed")

    # ── Schema migrations (safe to run every startup) ──────────────────────────
    from sqlalchemy import text as sql_text
    db = SessionLocal()
    try:
        # Add file_size column to blockchain_documents if it doesn't exist yet
        try:
            db.execute(sql_text(
                "ALTER TABLE blockchain_documents ADD COLUMN file_size INT NULL"
            ))
            db.commit()
            logger.info("Migration: Added file_size column to blockchain_documents")
        except Exception:
            db.rollback()  # Column already exists — ignore
    finally:
        db.close()

    yield
    logger.info("Shutting down DocuShield API")


app = FastAPI(
    title="DocuShield API",
    description="AI-powered document fraud detection platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# ── Middleware ────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(auth.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")
app.include_router(cases.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(blockchain_api.router, prefix="/api")
app.include_router(websocket.router)

# ── Static Files ─────────────────────────────────────────────────────────────

app.mount("/data/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
app.mount("/data/heatmaps", StaticFiles(directory=settings.HEATMAP_DIR), name="heatmaps")
app.mount("/data/reports", StaticFiles(directory=settings.REPORT_DIR), name="reports")


@app.api_route("/api/health", methods=["GET", "HEAD"], tags=["Health"])
def health():
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "service": "DocuShield API"
    }
