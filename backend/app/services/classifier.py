"""
Document type auto-classification based on filename, OCR keywords,
and image characteristics.
"""
import re
from typing import Tuple

from app.db.models import DocumentType

# Keyword patterns mapped to document types
PATTERNS = {
    DocumentType.PASSPORT: [
        r'\bpassport\b', r'\bpass\s*port\b', r'\bsurname\b.*\bgiven\b',
        r'\bnationality\b.*\bpassport\b', r'PASSPORT'
    ],
    DocumentType.ID_CARD: [
        r'\bid\s*card\b', r'\bnational\s+id\b', r'\bidentity\s+card\b',
        r'\baadhar\b', r'\bpan\b', r'\bdriving\s+licen[sc]e\b', r'\bdl\b',
        r'INCOME\s*TAX\s*DEPARTMENT', r'PERMANENT\s*ACCOUNT\s*NUMBER',
        r'GOVT\.\s*OF\s*INDIA', r'Aadhaar', r'Unique\s*Identification',
    ],
    DocumentType.DRIVING_LICENSE: [
        r'\bdriving\s+licen[sc]e\b', r'\bdriver.?s?\s+licen[sc]e\b',
        r'\bdmv\b', r'\bvehicle\b.*\blicen[sc]e\b',
    ],
    DocumentType.INVOICE: [
        r'\binvoice\b', r'\bpurchase\s+order\b', r'\bbill\s+to\b',
        r'\btax\s+invoice\b', r'\bgst\b', r'\bvat\b', r'\binvoice\s+no\b',
    ],
    DocumentType.CERTIFICATE: [
        r'\bcertificate\b', r'\bcertification\b', r'\bhereby\s+certif',
        r'\bawarded\b', r'\bdegree\b', r'\bdiploma\b', r'\bcompletion\b',
    ],
    DocumentType.BANK_STATEMENT: [
        r'\bbank\s+statement\b', r'\baccount\s+number\b', r'\bbalance\b',
        r'\bdebit\b.*\bcredit\b', r'\btransaction\b', r'\bifsc\b',
    ],
}


def classify_document_type(filename: str, extracted_text: str = "") -> DocumentType:
    """
    Classifies document type from filename and extracted OCR text.
    Returns DocumentType enum value.
    """
    combined = f"{filename} {extracted_text}".lower()

    best_match = DocumentType.UNKNOWN
    best_count = 0

    for doc_type, patterns in PATTERNS.items():
        count = sum(1 for p in patterns if re.search(p, combined, re.IGNORECASE))
        if count > best_count:
            best_count = count
            best_match = doc_type

    return best_match
