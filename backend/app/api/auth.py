from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.security import (
    hash_password, verify_password, create_access_token,
    generate_totp_secret, get_totp_uri, generate_qr_code_base64, verify_totp,
)
from app.db.database import get_db
from app.db.models import User, AuditLog
from app.schemas.schemas import UserCreate, UserLogin, UserOut, Token, TOTPSetupOut

router = APIRouter(prefix="/auth", tags=["Authentication"])


def log_action(db: Session, user_id, action: str, request: Request = None, details: dict = None):
    log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type="auth",
        ip_address=request.client.host if request else None,
        user_agent=request.headers.get("user-agent") if request else None,
        details=details or {},
    )
    db.add(log)
    db.commit()


@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: UserCreate, request: Request, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_action(db, user.id, "user_registered", request)
    return user


@router.post("/login", response_model=Token)
def login(payload: UserLogin, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    # 2FA check
    if user.totp_enabled:
        if not payload.totp_code:
            # Signal client to prompt for TOTP code
            return Token(
                access_token="",
                token_type="bearer",
                user=UserOut.model_validate(user),
                requires_2fa=True,
            )
        if not verify_totp(user.totp_secret, payload.totp_code):
            raise HTTPException(status_code=401, detail="Invalid 2FA code")

    token = create_access_token({"sub": str(user.id)})
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    log_action(db, user.id, "user_login", request)
    return Token(access_token=token, token_type="bearer", user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/2fa/setup", response_model=TOTPSetupOut)
def setup_2fa(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    secret = generate_totp_secret()
    uri = get_totp_uri(secret, current_user.email)
    qr = generate_qr_code_base64(uri)
    # Store secret temporarily (not enabled until verified)
    current_user.totp_secret = secret
    db.commit()
    return TOTPSetupOut(secret=secret, qr_code_base64=qr, uri=uri)


@router.post("/2fa/verify")
def verify_2fa(code: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.totp_secret:
        raise HTTPException(status_code=400, detail="No TOTP secret set. Call /2fa/setup first")
    if not verify_totp(current_user.totp_secret, code):
        raise HTTPException(status_code=400, detail="Invalid TOTP code")
    current_user.totp_enabled = True
    db.commit()
    return {"message": "2FA enabled successfully"}


@router.post("/2fa/disable")
def disable_2fa(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.totp_enabled = False
    current_user.totp_secret = None
    db.commit()
    return {"message": "2FA disabled"}
