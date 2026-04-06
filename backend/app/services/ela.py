"""
Error Level Analysis (ELA) — detects JPEG compression inconsistencies
that indicate regions were added/modified after original compression.
"""
import cv2
import numpy as np
from typing import Tuple, Dict, Any


def run_ela(image_path: str, quality: int = 90) -> Tuple[float, np.ndarray, Dict[str, Any]]:
    """
    Returns:
        score: float 0-1 (higher = more suspicious)
        ela_array: np.ndarray of the ELA image
        details: dict with statistics
    """
    try:
        # Load original using OpenCV
        original = cv2.imread(image_path)
        if original is None:
            raise ValueError("Could not read image")
        original = cv2.cvtColor(original, cv2.COLOR_BGR2RGB)
    except Exception as e:
        return 0.0, np.zeros((100, 100, 3), dtype=np.uint8), {"error": str(e)}

    # Re-compress at target quality using OpenCV
    try:
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
        result, enc_img = cv2.imencode('.jpg', cv2.cvtColor(original, cv2.COLOR_RGB2BGR), encode_param)
        recompressed = cv2.imdecode(enc_img, cv2.IMREAD_COLOR)
        recompressed = cv2.cvtColor(recompressed, cv2.COLOR_BGR2RGB)
    except Exception as e:
        return 0.0, np.zeros((100, 100, 3), dtype=np.uint8), {"error": f"Recompression failed: {str(e)}"}

    # Difference image
    # Note: cv2.absdiff returns the absolute difference between two arrays
    diff = cv2.absdiff(original, recompressed)
    
    # Amplify the difference (equivalent to ImageEnhance.Brightness)
    ela_array = cv2.convertScaleAbs(diff, alpha=20.0, beta=0)
    
    # Compute regional stats
    flat = ela_array.flatten().astype(float)
    mean_val = float(np.mean(flat))
    std_val = float(np.std(flat))
    max_val = float(np.max(flat))

    # Suspicious regions: pixels with high ELA values
    threshold = mean_val + 2 * std_val
    suspicious_pixels = int(np.sum(ela_array > threshold))
    total_pixels = ela_array.shape[0] * ela_array.shape[1] * 3
    suspicious_ratio = suspicious_pixels / max(total_pixels, 1)

    # Score: based on suspicious pixel ratio and max deviation
    score = min(1.0, suspicious_ratio * 3.0 + (max_val / 255.0) * 0.3)

    details = {
        "ela_mean": round(mean_val, 3),
        "ela_std": round(std_val, 3),
        "ela_max": round(max_val, 3),
        "suspicious_pixel_ratio": round(suspicious_ratio, 4),
        "quality_used": quality,
        "image_size": [original.shape[1], original.shape[0]],
    }

    return round(score, 4), ela_array, details


def ela_score_label(score: float) -> str:
    if score < 0.2:
        return "Clean"
    elif score < 0.4:
        return "Low Risk"
    elif score < 0.6:
        return "Moderate Risk"
    elif score < 0.8:
        return "High Risk"
    return "Critical"
