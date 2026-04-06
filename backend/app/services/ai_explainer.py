"""
AI Explainer service — generates futuristic + human-friendly summaries
"""
from typing import Dict, Any
from app.db.models import Verdict, ForgeryType


def generate_ai_explanation(
    fraud_score: float,
    verdict: Verdict,
    forgery_type: ForgeryType,
    scores: Dict[str, float],
    identity_check: Dict[str, Any] = None  # 🔥 NEW
) -> str:

    # -------------------------------
    # 🤖 HEADER
    # -------------------------------
    if verdict == Verdict.FORGED:
        header = "[SYSTEM_CRITICAL] :: SECURITY_BREACH_DETECTED"
    elif verdict == Verdict.SUSPICIOUS:
        header = "[SYSTEM_WARNING] :: ANOMALY_DETECTED"
    else:
        header = "[SYSTEM_SUCCESS] :: INTEGRITY_VERIFIED"

    # -------------------------------
    # 🧠 LOGIC STREAMS (TOP SIGNALS)
    # -------------------------------
    sorted_signals = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    logic_streams = []

    for signal, score in sorted_signals[:3]:
        if score > 0.1:
            signal_name = signal.upper()
            status = "STABLE" if score < 0.3 else "UNSTABLE" if score < 0.7 else "CRITICAL"
            logic_streams.append(f"{signal_name}_COORDINATES_{status}({score:.2f})")

    # -------------------------------
    # 🔍 HUMAN-FRIENDLY REASONS
    # -------------------------------
    reasons = []

    if scores.get("ocr", 0) > 0.6:
        reasons.append("Text inconsistencies detected")

    if scores.get("ela", 0) > 0.4:
        reasons.append("Image compression anomalies detected")

    if scores.get("clone", 0) > 0.5:
        reasons.append("Duplicate regions suggest possible copy-paste")

    if scores.get("dit", 0) < 0.3:
        reasons.append("Document structure appears consistent")

    # 🔥 QR vs OCR check
    identity_msg = ""
    if identity_check:
        if identity_check.get("match") is False:
            identity_msg = "Identity mismatch between QR and OCR data detected"
        elif identity_check.get("match") == "partial":
            identity_msg = "Partial identity match detected"
        elif identity_check.get("match") is True:
            identity_msg = "Identity verified via QR code"

    # -------------------------------
    # 📊 CONCLUSION
    # -------------------------------
    if verdict == Verdict.FORGED:
        conclusion = f"RESULT: [REJECT] :: FORGERY_PROBABILITY: {fraud_score}% :: TYPE: {forgery_type.value.upper()}"
    elif verdict == Verdict.SUSPICIOUS:
        conclusion = f"RESULT: [REVIEW] :: PROBABILITY: {fraud_score}% :: HUMAN_VERIFICATION_REQUIRED"
    else:
        conclusion = f"RESULT: [ACCEPT] :: PASS_SIGNAL_STRENGTH: {100-fraud_score}%"

    # -------------------------------
    # 🧾 HUMAN SUMMARY (NEW 🔥)
    # -------------------------------
    human_summary = ""

    if reasons:
        human_summary += " | ".join(reasons)

    if identity_msg:
        human_summary += f" | {identity_msg}"

    if human_summary:
        human_summary = f"HUMAN_ANALYSIS: {human_summary}\n"

    # -------------------------------
    # 🧩 FINAL ASSEMBLY
    # -------------------------------
    explanation = f"{header}\n"

    if logic_streams:
        explanation += f"LOGIC_STREAMS: {' | '.join(logic_streams)}\n"

    if human_summary:
        explanation += human_summary

    explanation += f"CONCLUSION: {conclusion}\n"
    explanation += ":: END_OF_LOG_STREAM ::"

    return explanation