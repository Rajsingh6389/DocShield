import re
import numpy as np
import cv2
from typing import Tuple, Dict, Any, List

try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False


# -------------------------------
# 🔧 TEXT CLEANING
# -------------------------------
def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = text.upper()
    text = text.replace("0", "O")
    text = text.replace("1", "I")
    text = re.sub(r'[^A-Z0-9 ]', '', text)
    return text.strip()


# -------------------------------
# 🔍 FIELD EXTRACTION
# -------------------------------
def extract_fields(full_text: str) -> Dict[str, Any]:
    text = full_text.upper()

    dob_match = re.search(r'\d{2}[/-]\d{2}[/-]\d{4}', full_text)
    dob = dob_match.group() if dob_match else None

    aadhaar_match = re.search(r'\d{4}\s?\d{4}\s?\d{4}', full_text)
    aadhaar = aadhaar_match.group() if aadhaar_match else None

    pan_match = re.search(r'[A-Z]{5}[0-9]{4}[A-Z]', full_text)
    pan = pan_match.group() if pan_match else None

    # 🔥 FIXED NAME EXTRACTION
    words = [w for w in full_text.split() if w.isalpha() and len(w) > 2]
    name = None
    if len(words) >= 2:
        name = " ".join(words[:3])

    return {
        "name": name,
        "dob": dob,
        "aadhaar": aadhaar,
        "pan": pan
    }


# -------------------------------
# 🔍 MAIN OCR FUNCTION
# -------------------------------
def run_ocr_analysis(image_path: str) -> Tuple[float, List[Dict], Dict[str, Any], str]:

    if not TESSERACT_AVAILABLE:
        return 0.0, [], {"error": "pytesseract not installed"}, ""

    try:
        img = cv2.imread(image_path)
        if img is None:
            return 0.0, [], {"error": "Image not readable"}, ""

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        print(f"      >> READING_IMAGE: {image_path}")

        # -------------------------------
        # 🔥 IMAGE ENHANCEMENT
        # -------------------------------
        # ⚡ OPTIMIZED: Use faster bilateral filter or Gaussian instead of Heavy NlMeans
        gray = cv2.GaussianBlur(gray, (3, 3), 0)

        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray = clahe.apply(gray)

        kernel = np.array([[0, -1, 0],
                           [-1, 5,-1],
                           [0, -1, 0]])
        gray = cv2.filter2D(gray, -1, kernel)

        # Resize
        h, w = gray.shape
        if w < 1000:
            scale = 1000 / w
            gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_LINEAR)

        # -------------------------------
        # 🧪 OCR PASSES
        # -------------------------------
        custom_config = r'--oem 3 --psm 6'

        processed = cv2.adaptiveThreshold(
            gray, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            11, 2
        )

        print("      >> OCR_PASS_1 (Adaptive)...")
        ocr_data = pytesseract.image_to_data(
            processed,
            output_type=pytesseract.Output.DICT,
            lang="eng",
            config=custom_config
        )

        if len([t for t in ocr_data["text"] if t.strip()]) < 5:
            print("      >> OCR_PASS_2 (Otsu)...")
            _, otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            ocr_data = pytesseract.image_to_data(
                otsu,
                output_type=pytesseract.Output.DICT,
                lang="eng",
                config=custom_config
            )

        if len([t for t in ocr_data["text"] if t.strip()]) < 2:
            print("      >> OCR_PASS_3 (Raw)...")
            ocr_data = pytesseract.image_to_data(
                gray,
                output_type=pytesseract.Output.DICT,
                lang="eng",
                config=custom_config
            )

    except Exception as e:
        print(f"      [!] OCR ERROR: {str(e)}")
        return 0.0, [], {"error": str(e)}, ""

    # -------------------------------
    # 📊 ANALYSIS
    # -------------------------------
    words = []
    confidences = []
    heights = []
    suspicious_regions = []

    n = len(ocr_data["text"])

    for i in range(n):
        word = ocr_data["text"][i].strip()

        try:
            conf = int(float(ocr_data["conf"][i]))
        except:
            conf = 0

        h = int(ocr_data["height"][i])

        if not word or conf < 0:
            continue

        words.append(word)
        confidences.append(conf)
        heights.append(h)

        if conf < 30:
            suspicious_regions.append({
                "x": int(ocr_data["left"][i]),
                "y": int(ocr_data["top"][i]),
                "w": int(ocr_data["width"][i]),
                "h": h,
                "conf": conf,
                "text": word
            })

    full_text = normalize_text(" ".join(words))

    print(f"      >> TEXT_LENGTH: {len(full_text)}")
    print(f"      >> TEXT_PREVIEW: {full_text[:100]}")

    # -------------------------------
    # 📊 SCORE CALCULATION (FIXED)
    # -------------------------------
    score = 0.0
    issues = []

    if confidences:
        mean_conf = np.mean(confidences)

        if mean_conf < 50:
            issues.append("Low OCR confidence")
            score += 0.25

        if mean_conf < 30:
            score += 0.15

    if heights:
        mean_h = np.mean(heights)
        std_h = np.std(heights)
        cv = std_h / mean_h if mean_h > 0 else 0

        if cv > 0.5:
            issues.append("Font size inconsistency")
            score += 0.25

    # -------------------------------
    # 🔍 FIELD EXTRACTION
    # -------------------------------
    extracted = extract_fields(full_text)

    # 🔥 Aadhaar-specific correction
    if "AADHAAR" in full_text or extracted.get("aadhaar"):
        score *= 0.7

    details = {
        "total_words": len(words),
        "mean_confidence": round(np.mean(confidences) if confidences else 0, 2),
        "issues": issues,
        "extracted_fields": extracted,
        "preview": full_text[:200],
        "clean_text": full_text  # 🔥 added
    }

    return round(min(score, 1.0), 4), suspicious_regions, details, full_text