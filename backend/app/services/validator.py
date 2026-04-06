"""
Mandatory field validation for specific document types.
"""
import re
from typing import Tuple, List, Dict, Any
from app.db.models import DocumentType

def run_field_validation(doc_type: DocumentType, text: str) -> Tuple[float, List[str]]:
    """
    Checks for mandatory fields in the extracted OCR text.
    Returns:
        suspicion_score: 0.0 to 1.0 (higher = more missing fields)
        missing_fields: list of missing field names
    """
    text_lower = text.lower()
    missing = []
    score = 0.0

    # 1. Universal Placeholder Detection (Runs for ALL documents)
    placeholders = [
        r"your\s*name\s*here", r"your\s*father\s*name\s*here", 
        r"xxxx", r"0000", r"dd/mm/yyyy", r"placeholder",
        r"signature\s*here"
    ]
    for p in placeholders:
        if re.search(p, text_lower):
            print(f"      [!] TEMPLATE_PLACEHOLDER_DETECTED: {p}")
            missing.append(f"Template placeholder detected: {p}")
            score += 0.5

    # 2. PAN CARD Logic (Run if specifically ID_CARD OR if PAN keywords found)
    is_pan = "income tax department" in text_lower or "permanent account number" in text_lower
    if (doc_type == DocumentType.ID_CARD or is_pan) and is_pan:
        mandatory = {
            "Income Tax Department": [r"income\s*tax\s*department"],
            "Permanent Account Number": [r"permanent\s*account\s*number", r"pan\s*card"],
            "Individual Name Label": [r"(?<!father's\s)name", r"(?<!पिता\s)नाम"], 
            "Father's Name Label": [r"father's?\s*name", r"पिता\s*का\s*नाम"],
            "Date of Birth Label": [r"date\s*of\s*birth", r"dob", r"जन्म\s*तिथि"],
            "PAN Number Pattern": [r"[a-z]{5}[0-9]{4}[a-z]{1}"],
        }
        
        for field, patterns in mandatory.items():
            found = False
            for p in patterns:
                matches = re.findall(p, text_lower)
                if "name" in field.lower() and "father" not in field.lower():
                    if len(matches) >= 2 or (len(matches) == 1 and "father" not in text_lower):
                        found = True
                elif len(matches) > 0:
                    found = True
            
            if not found:
                print(f"      [!] MANDATORY_FIELD_MISSING: {field}")
                missing.append(field)
                score += 0.4

    # 3. AADHAR Logic
    is_aadhar = "aadhaar" in text_lower or "unique identification" in text_lower
    if (doc_type == DocumentType.ID_CARD or is_aadhar) and is_aadhar:
        mandatory = {
            "Aadhaar Word": [r"aadhaar"],
            "Enrollment/ID Pattern": [r"\d{4}\s\d{4}\s\d{4}"],
            "Government of India": [r"government\s*of\s*india", r"भारत\s*सरकार"],
        }
        for field, patterns in mandatory.items():
            if not any(re.search(p, text_lower) for p in patterns):
                print(f"      [!] MANDATORY_FIELD_MISSING: {field}")
                missing.append(field)
                score += 0.5 

    # 4. PASSPORT Logic
    if doc_type == DocumentType.PASSPORT:
        mandatory = {
            "Passport Number": [r"passport\s*no", r"number"],
            "Surname": [r"surname"],
            "Given Names": [r"given\s*name"],
            "Nationality": [r"nationality"],
            "Date of Birth": [r"date\s*of\s*birth"],
        }
        for field, patterns in mandatory.items():
            if not any(re.search(p, text_lower) for p in patterns):
                print(f"      [!] MANDATORY_FIELD_MISSING: {field}")
                missing.append(field)
                score += 0.4 

    return float(round(min(score, 1.0), 3)), missing
