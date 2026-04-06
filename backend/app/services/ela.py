"""
Error Level Analysis (ELA) — detects JPEG compression inconsistencies
that indicate regions were added/modified after original compression.
"""
import os
import io
import numpy as np
from PIL import Image, ImageChops, ImageEnhance
from typing import Tuple, Dict, Any


def run_ela(image_path: str, quality: int = 90) -> Tuple[float, np.ndarray, Dict[str, Any]]:
    """
    Returns:
        score: float 0-1 (higher = more suspicious)
        ela_array: np.ndarray of the ELA image
        details: dict with statistics
    """
    try:
        original = Image.open(image_path).convert("RGB")
    except Exception as e:
        return 0.0, np.zeros((100, 100, 3), dtype=np.uint8), {"error": str(e)}

    # Re-compress at target quality
    buffer = io.BytesIO()
    original.save(buffer, format="JPEG", quality=quality)
    buffer.seek(0)
    print(f"      >> JPEG_RECOMPRESSION: Applied delta at Q={quality}")
    recompressed = Image.open(buffer).convert("RGB")

    # Difference image, amplified
    diff = ImageChops.difference(original, recompressed)
    enhancer = ImageEnhance.Brightness(diff)
    ela_image = enhancer.enhance(20)

    ela_array = np.array(ela_image)
    orig_array = np.array(original)

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
    print(f"      >> ELA_SIGNAL_INTENSITY: MaxVal={max_val}, Mean={mean_val:.2f}")
    score = min(1.0, suspicious_ratio * 3.0 + (max_val / 255.0) * 0.3)

    details = {
        "ela_mean": round(mean_val, 3),
        "ela_std": round(std_val, 3),
        "ela_max": round(max_val, 3),
        "suspicious_pixel_ratio": round(suspicious_ratio, 4),
        "quality_used": quality,
        "image_size": list(original.size),
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
