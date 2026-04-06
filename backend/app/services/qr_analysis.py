import cv2
import base64
import zlib
import xml.etree.ElementTree as ET
from typing import Dict, Any, Tuple

try:
    from pyzbar.pyzbar import decode
    QR_AVAILABLE = True
except Exception:
    QR_AVAILABLE = False


# -------------------------------
# 🔐 SECURE QR DECODER (FIXED)
# -------------------------------
def decode_secure_qr(data: bytes) -> Dict[str, Any]:
    try:
        try:
            data = base64.b64decode(data)
        except:
            pass

        decompressed = zlib.decompress(data)
        xml_data = decompressed.decode('utf-8')
        root = ET.fromstring(xml_data)

        name = root.attrib.get("name")
        dob = root.attrib.get("dob")
        gender = root.attrib.get("gender")
        aadhaar = root.attrib.get("uid")

        house = root.attrib.get("house", "")
        street = root.attrib.get("street", "")
        address = f"{house} {street}".strip()

        return {
            "type": "secure_qr",
            "name": name,
            "dob": dob,
            "gender": gender,
            "aadhaar": aadhaar,
            "address": address
        }

    except Exception as e:
        return {"error": f"Secure QR decode failed: {str(e)}"}


# -------------------------------
# 🔍 QR vs OCR MATCH (NEW 🔥)
# -------------------------------
def compare_qr_ocr(qr_data: dict, ocr_data: dict) -> Dict[str, Any]:

    if not qr_data or not ocr_data:
        return {"match": None, "score": 0, "message": "Insufficient data"}

    qr_name = (qr_data.get("name") or "").strip().lower()
    ocr_name = (ocr_data.get("name") or "").strip().lower()

    if not qr_name or not ocr_name:
        return {"match": None, "score": 0, "message": "Name not found"}

    if qr_name == ocr_name:
        return {
            "match": True,
            "score": 0,
            "message": "QR and OCR names match"
        }

    if qr_name.split()[0] == ocr_name.split()[0]:
        return {
            "match": "partial",
            "score": 0.4,
            "message": "Partial name match detected"
        }

    return {
        "match": False,
        "score": 0.8,
        "message": "Mismatch detected → possible tampering"
    }


# -------------------------------
# 🔍 MAIN QR ANALYSIS (UPGRADED)
# -------------------------------
def run_qr_analysis(image_path: str, ocr_data: dict = None) -> Tuple[bool, Dict[str, Any]]:

    if not QR_AVAILABLE:
        return False, {"error": "pyzbar not installed"}

    img = cv2.imread(image_path)
    if img is None:
        return False, {"error": "Image not readable"}

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)

    decoded_objects = []
    try:
        decoded_objects = decode(gray)
    except Exception as e:
        print(f"      [!] PYZBAR_NATIVE_ERROR: {e}")

    # Fallback
    if not decoded_objects:
        detector = cv2.QRCodeDetector()
        val, _, _ = detector.detectAndDecode(gray)

        if val:
            class MockObj:
                def __init__(self, data):
                    self.data = data.encode("utf-8")

            decoded_objects = [MockObj(val)]

    if not decoded_objects:
        return False, {"message": "No QR found"}

    for obj in decoded_objects:
        raw_data = obj.data

        # -------------------------------
        # 🔹 NORMAL QR
        # -------------------------------
        try:
            text_data = raw_data.decode("utf-8")

            return True, {
                "type": "standard_qr",
                "raw_text": text_data
            }

        except:
            # -------------------------------
            # 🔐 SECURE QR
            # -------------------------------
            secure_data = decode_secure_qr(raw_data)

            if "aadhaar" in secure_data and secure_data["aadhaar"]:

                # 🔥 NEW: QR vs OCR CHECK
                identity_check = compare_qr_ocr(secure_data, ocr_data or {})

                return True, {
                    "type": "secure_qr",
                    "data": secure_data,
                    "identity_check": identity_check
                }

            else:
                return True, {
                    "warning": "QR decoded but not Aadhaar secure format",
                    "data": secure_data
                }

    return False, {"message": "QR detected but unreadable"}