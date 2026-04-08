import os
import cv2
from typing import Tuple, Dict, Any
from huggingface_hub import InferenceClient

# Singleton client
_CLIENT = None


def get_client():
    global _CLIENT
    if _CLIENT is None:
        token = os.getenv("HF_API_TOKEN")

        if not token:
            print(" [⚠️] HF_API_TOKEN_MISSING :: DOCUMENT_AI_OFFLINE")
            return None

        _CLIENT = InferenceClient(token=token)

    return _CLIENT


def run_dit_analysis(image_path: str) -> Tuple[float, Dict[str, Any]]:
    """
    Advanced DiT Document Analysis (Production Ready)

    Returns:
        anomaly_score (0-1)
        details:
            - confidence
            - anomaly_score
            - document_class
            - top_predictions
    """

    try:
        client = get_client()
        if not client:
            return 0.0, {
                "error": "Hugging Face token missing",
                "status": "failed"
            }

        model_id = "microsoft/dit-base-finetuned-rvlcdip"

        # ⚡ OPTIMIZED: Resize before network upload to reduce latency
        img = cv2.imread(image_path)
        if img is None:
             return 0.0, {"error": "Image not readable"}
        
        h, w = img.shape[:2]
        if w > 800:
            scale = 800 / w
            img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
        
        _, buffer = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 85])
        image_bytes = buffer.tobytes()

        print(f" [🤖] AI_UPLINK :: DOCUMENT IMAGE TRANSFORMER (DiT)... (Payload: {len(image_bytes)//1024} KB)")

        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp.write(image_bytes)
            tmp_path = tmp.name

        try:
            # 🔥 Call Hugging Face API
            results = client.image_classification(
                tmp_path,
                model=model_id
            )
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

        if not results:
            return 0.0, {"status": "empty_response"}

        # ✅ Sort results safely
        results = sorted(results, key=lambda x: x["score"], reverse=True)

        top = results[0]
        score = float(top["score"])
        label = str(top["label"])

        print(f"      >> DiT_CLASSIFICATION: {score*100:.2f}% ({label})")

        # --------------------------------------------------
        # 🔥 FIXED ANOMALY LOGIC (CLEAN + STABLE)
        # --------------------------------------------------
        anomaly = 1.0 - score

        # Normalize slightly (avoid over-sensitivity)
        normalized_anomaly = round(
            min(max(anomaly * 1.2, 0.0), 1.0),
            4
        )

        # --------------------------------------------------
        # 🔥 DOCUMENT TYPE MAPPING (VERY IMPORTANT)
        # --------------------------------------------------
        doc_type_map = {
            "letter": "document",
            "form": "id_card",
            "invoice": "invoice",
            "advertisement": "generic",
            "email": "document",
            "resume": "certificate",
            "scientific publication": "document",
        }

        mapped_type = doc_type_map.get(label.lower(), "unknown")

        # --------------------------------------------------
        # 🔥 TOP-K INSIGHTS (for UI / Explainability)
        # --------------------------------------------------
        top_k = [
            {
                "label": r["label"],
                "confidence": round(float(r["score"]), 4)
            }
            for r in results[:3]
        ]

        return normalized_anomaly, {
            "model": model_id,
            "document_class": label,
            "mapped_type": mapped_type,
            "confidence": round(score, 4),
            "anomaly_score": normalized_anomaly,
            "top_predictions": top_k,
            "source": "huggingface_api",
            "status": "success"
        }

    except Exception as e:
        print(f" [⚠️] DiT_ANALYTICS_FAILED: {e}")

        return 0.0, {
            "error": str(e),
            "status": "failed"
        }