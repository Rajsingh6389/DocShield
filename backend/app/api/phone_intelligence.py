from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, Optional
from loguru import logger
from datetime import datetime

from app.core.deps import get_current_user
from app.db.models import User, UserRole
from app.services.telegram_service import telegram_intel
from app.services.osint_report import generate_osint_pdf
from fastapi.responses import FileResponse
import os
import tempfile

router = APIRouter(prefix="/intel", tags=["OSINT Intelligence"])

def mask_string(s: str, visible_chars: int = 1) -> str:
    """Masks a string leaving some characters visible."""
    if not s or s == "N/A":
        return s
    s = str(s)
    if len(s) <= visible_chars * 2:
        return "*" * len(s)
    return s[:visible_chars] + "*" * (len(s) - visible_chars * 2) + s[-visible_chars:]

@router.get("/phone/{phone}", response_model=Dict[str, Any])
async def get_phone_leakage(
    phone: str,
    current_user: User = Depends(get_current_user)
):
    """
    Fetches phone intelligence from Telegram bot.
    Returns masked data for regular users/admins without 2FA.
    Returns full data for Admins with 2FA enabled.
    """
    logger.info(f"User {current_user.email} requesting intel for {phone}")
    
    # Fetch result from Telegram Service (async polling)
    result = await telegram_intel.get_phone_intel(phone)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No intelligence found for this number or service timed out."
        )

    # Authorization Check for Unmasking: Admin AND 2FA Verified
    is_authorized = (current_user.role == UserRole.ADMIN and current_user.totp_enabled)
    
    if not is_authorized:
        logger.info(f"Returning masked results to {current_user.email}")
        # Mask sensitive fields
        processed_result = result.copy()
        
        # Mask Name
        processed_result["name"] = mask_string(result.get("name", "N/A"), visible_chars=2)
        
        # Mask Father Name
        processed_result["father_name"] = mask_string(result.get("father_name", "N/A"), visible_chars=1)
        
        # Mask Passport
        processed_result["passport"] = mask_string(result.get("passport", "N/A"), visible_chars=1)
        
        # Mask Nickname
        processed_result["nickname"] = mask_string(result.get("nickname", "N/A"), visible_chars=1)
        
        # Mask Email
        email = result.get("email", "N/A")
        if email != "N/A" and "@" in email:
            u, d = email.split("@", 1)
            processed_result["email"] = f"{mask_string(u, 1)}@{d}"
        else:
            processed_result["email"] = mask_string(email, visible_chars=1)
            
        # Mask Phones list
        phones = result.get("phones", [])
        processed_result["phones"] = [mask_string(p, visible_chars=2) for p in phones]
        
        # Mask Addresses list
        addresses = result.get("addresses", [])
        masked_addresses = []
        for addr in addresses:
            if addr != "N/A" and len(addr) > 10:
                masked_addresses.append(f"{addr[:5]}...{addr[-5:]}")
            elif addr != "N/A":
                masked_addresses.append("****")
            else:
                masked_addresses.append("N/A")
        processed_result["addresses"] = masked_addresses
        
        # Update flat address field from masked list
        if masked_addresses:
            processed_result["address"] = " | ".join(masked_addresses)
        else:
            processed_result["address"] = "N/A"
            
        # Omit raw text and HTML report which might contain unmasked data
        if "raw_text" in processed_result:
            del processed_result["raw_text"]
        if "html_report" in processed_result:
            del processed_result["html_report"]
            
        processed_result["is_masked"] = True
        return processed_result

    logger.success(f"Returning full results to authorized Admin: {current_user.email}")
    result["is_masked"] = False
    return result

@router.get("/phone/{phone}/pdf")
async def get_phone_intel_pdf(
    phone: str,
    current_user: User = Depends(get_current_user)
):
    """
    Generates and returns a PDF report for phone intelligence.
    Only available for Admins with 2FA.
    """
    if not (current_user.role == UserRole.ADMIN and current_user.totp_enabled):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="PDF export requires Admin privileges and 2FA verification."
        )

    result = await telegram_intel.get_phone_intel(phone)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Intelligence data not found for PDF generation."
        )

    # Generate PDF in a temporary file
    temp_dir = tempfile.gettempdir()
    safe_phone = "".join(c for c in phone if c.isalnum())
    filename = f"OSINT_REPORT_{safe_phone}_{datetime.now().strftime('%Y%p%d_%H%M%S')}.pdf"
    file_path = os.path.join(temp_dir, filename)
    
    try:
        generate_osint_pdf(result, file_path)
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type="application/pdf"
        )
    except Exception as e:
        logger.error(f"PDF Generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate PDF report."
        )
