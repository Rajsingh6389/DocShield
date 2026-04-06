from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
import hashlib
import pyotp
import qrcode
import io
import base64

from app.core.config import settings

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ─── Password ─────────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """
    Hash password safely (fixes bcrypt 72-byte limit)
    """
    # 🔐 Convert to fixed length using SHA256
    password = hashlib.sha256(password.encode()).hexdigest()
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify password safely
    """
    plain_password = hashlib.sha256(plain_password.encode()).hexdigest()
    return pwd_context.verify(plain_password, hashed_password)


# ─── JWT ──────────────────────────────────────────────────────────────────────

def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create JWT access token
    """
    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )

    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode JWT token
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        return None


# ─── TOTP / 2FA ───────────────────────────────────────────────────────────────

def generate_totp_secret() -> str:
    """
    Generate new TOTP secret
    """
    return pyotp.random_base32()


def get_totp_uri(secret: str, email: str) -> str:
    """
    Generate TOTP URI for QR code
    """
    return pyotp.totp.TOTP(secret).provisioning_uri(
        name=email,
        issuer_name="DocuShield"
    )


def generate_qr_code_base64(totp_uri: str) -> str:
    """
    Generate QR code as base64 string
    """
    img = qrcode.make(totp_uri)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode()


def verify_totp(secret: str, code: str) -> bool:
    """
    Verify TOTP code
    """
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)