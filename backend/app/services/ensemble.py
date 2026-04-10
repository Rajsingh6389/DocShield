from typing import Dict, Any, Tuple, List
from app.db.models import Verdict, ForgeryType
from app.core.config import settings

# ✅ CORRECTED IMPORT
from app.services.qr_analysis import compare_qr_ocr


# ✅ UPDATED WEIGHTS (AI prioritized)
WEIGHTS = {
    "default": {
        "ela": 0.10, "clone": 0.05, "ocr": 0.15, "metadata": 0.05,
        "histogram": 0.05, "edge": 0.05, "shadow": 0.05,
        "dit": 0.45, "qr": 0.05,
    },
    "id_card": {
        "ela": 0.10, "clone": 0.05, "ocr": 0.15, "metadata": 0.05,
        "histogram": 0.05, "edge": 0.05, "shadow": 0.05,
        "dit": 0.50, "qr": 0.05,
    },
    "passport": {
        "ela": 0.10, "clone": 0.10, "ocr": 0.20, "metadata": 0.10,
        "histogram": 0.05, "edge": 0.05, "shadow": 0.05,
        "dit": 0.35, "qr": 0.10,
    },
    "invoice": {
        "ela": 0.15, "clone": 0.20, "ocr": 0.20, "metadata": 0.15,
        "histogram": 0.05, "edge": 0.05, "shadow": 0.05,
        "dit": 0.10,
    },
    "certificate": {
        "ela": 0.20, "clone": 0.15, "ocr": 0.15, "metadata": 0.15,
        "histogram": 0.05, "edge": 0.05, "shadow": 0.05,
        "dit": 0.15,
    },
}


def compute_ensemble_score(
    ela_score: float = 0.0,
    clone_score: float = 0.0,
    ocr_score: float = 0.0,
    metadata_score: float = 0.0,
    histogram_score: float = 0.0,
    edge_score: float = 0.0,
    shadow_score: float = 0.0,
    dit_score: float = 0.0,
    dit_confidence: float = 0.0,
    qr_score: float = 0.0,
    doc_type: str = "default",
    qr_data: dict = None,          # 🔥 NEW
    ocr_data: dict = None          # 🔥 NEW
) -> Tuple[float, Verdict, ForgeryType, List[Dict[str, Any]], Dict[str, Any]]:

    weights = WEIGHTS.get(doc_type, WEIGHTS["default"])

    # 🔥 Normalize weights
    total_weight = sum(weights.values())
    weights = {k: v / total_weight for k, v in weights.items()}

    scores = {
        "ela": ela_score,
        "clone": clone_score,
        "ocr": ocr_score,
        "metadata": metadata_score,
        "histogram": histogram_score,
        "edge": edge_score,
        "shadow": shadow_score,
        "dit": dit_score,
        "qr": qr_score,
    }

    print(f"      >> WEIGHTED_FUSION: {len(scores)} signals merged via '{doc_type}' profile")
    print("      " + "─" * 58)
    print(f"      {'SIGNAL':<25} | {'SCORE':<8} | {'WEIGHT':<8} | {'IMPACT'}")
    print("      " + "─" * 58)

    # ✅ UI OUTPUT
    signal_list = []
    label_map = {
        "ela": "Error Level Analysis",
        "clone": "Clone Detection",
        "ocr": "Font/Text Anomaly",
        "metadata": "Metadata Analysis",
        "histogram": "Color Histogram",
        "edge": "Edge Artifacts",
        "shadow": "Lighting Inconsistency",
        "dit": "Document AI (DiT)",
        "qr": "QR Code Analysis",
    }

    for key, val in scores.items():
        weight = weights.get(key, 0)
        impact = val * weight * 100
        print(f"      {label_map.get(key, key):<25} | {val:<8.2f} | {weight:<8.2f} | {impact:>6.1f}%")
        
        signal_list.append({
            "name": label_map.get(key, key),
            "score": val,
            "weight": round(weight, 3),
            "weighted_contribution": round(impact, 2),
            "label": _score_label(val),
        })
    print("      " + "─" * 58)

    # 🔥 Aadhaar OCR FIX (reduce false positives)
    if doc_type == "id_card":
        ocr_score *= 0.65
        scores["ocr"] = ocr_score

    # ✅ BASE SCORE
    raw = sum(scores[k] * weights.get(k, 0) for k in scores)
    fraud_score = raw * 100

    # 🔥 AI OVERRIDE
    if dit_confidence > 0.90:
        print("      >> AI_OVERRIDE_AUTHENTIC ✅")
        fraud_score *= 0.6

    elif dit_score > 0.7:
        print("      >> AI_OVERRIDE_SUSPICIOUS 🚨")
        fraud_score = max(fraud_score, 65.0)

    # 🔥 QR vs OCR CHECK
    identity_result = {"score": 0, "message": "No check"}

    if qr_data and ocr_data:
        identity_result = compare_qr_ocr(qr_data, ocr_data)

        if identity_result.get("score", 0) > 0:
            print("      >> IDENTITY_MISMATCH_DETECTED 🚨")
            fraud_score += identity_result["score"] * 30

    # 🔥 SMART BOOSTING
    boost = 0

    if ocr_score > 0.6:
        boost += ocr_score * 10

    if clone_score > 0.5:
        boost += clone_score * 12

    if ela_score > 0.4:
        boost += ela_score * 8

    fraud_score += boost

    fraud_score = round(min(fraud_score, 100.0), 2)

    print(f"      >> FINAL_PROBABILITY_X: {fraud_score}%")

    # ✅ VERDICT
    if fraud_score >= settings.FORGED_THRESHOLD:
        verdict = Verdict.FORGED
    elif fraud_score >= settings.SUSPICIOUS_THRESHOLD:
        verdict = Verdict.SUSPICIOUS
    else:
        verdict = Verdict.AUTHENTIC

    # ✅ TYPE
    forgery_type = _classify_forgery_type(scores, fraud_score)

    # 🔥 HUMAN-FRIENDLY EXPLANATION
    explanation = generate_explanation(scores, fraud_score)

    return fraud_score, verdict, forgery_type, signal_list, {
        "identity_check": identity_result,
        "ai_explanation": explanation
    }


# -------------------------------
# 🧠 HUMAN EXPLAINER
# -------------------------------
def generate_explanation(scores: dict, fraud_score: float) -> str:

    messages = []

    if scores.get("ocr", 0) > 0.6:
        messages.append("Text inconsistencies detected")

    if scores.get("ela", 0) > 0.4:
        messages.append("Image compression anomalies detected")

    if scores.get("clone", 0) > 0.5:
        messages.append("Duplicate regions detected")

    if scores.get("dit", 0) < 0.3:
        messages.append("Document structure appears consistent")

    if fraud_score < 30:
        final = "Document appears authentic"
    elif fraud_score < 60:
        final = "Document looks suspicious and needs manual verification"
    else:
        final = "High probability of forgery detected"

    return " | ".join(messages) + f". Conclusion: {final}"


# -------------------------------
# CLASSIFIER
# -------------------------------
def _classify_forgery_type(scores: dict, fraud_score: float) -> ForgeryType:
    if fraud_score < 20:
        return ForgeryType.NONE

    dominant = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    top_key, top_val = dominant[0]

    if top_val < 0.3:
        return ForgeryType.NONE

    if top_key == "clone":
        return ForgeryType.IMAGE_SPLICE

    if top_key == "ocr":
        return ForgeryType.TEXT_EDIT

    if top_key == "metadata":
        return ForgeryType.DIGITAL_MANIPULATION

    if top_key == "ela":
        return ForgeryType.IMAGE_TAMPERING

    return ForgeryType.DIGITAL_MANIPULATION


def _score_label(score: float) -> str:
    if score < 0.20:
        return "Clean"
    elif score < 0.40:
        return "Low Risk"
    elif score < 0.60:
        return "Moderate Risk"
    elif score < 0.80:
        return "High Risk"
    return "Critical"