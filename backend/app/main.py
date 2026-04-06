import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from loguru import logger

from app.core.config import settings
from app.db.database import create_tables
from app.api import auth, documents, analysis, cases, admin, notifications, websocket

from dotenv import load_dotenv
load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting DocuShield API...")
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.HEATMAP_DIR, exist_ok=True)
    os.makedirs(settings.REPORT_DIR, exist_ok=True)
    create_tables()
    logger.info("Database tables created/verified")
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
app.include_router(websocket.router)

# ── Static Files ─────────────────────────────────────────────────────────────

app.mount("/data/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
app.mount("/data/heatmaps", StaticFiles(directory=settings.HEATMAP_DIR), name="heatmaps")
app.mount("/data/reports", StaticFiles(directory=settings.REPORT_DIR), name="reports")


@app.get("/api/health", tags=["Health"])
def health():
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "service": "DocuShield API"
    }
