"""
Visual signal detectors:
  - Color histogram anomaly detection
  - Edge artifact detection around tampered boundaries
  - Lighting and shadow inconsistency detection
"""
import numpy as np
import cv2
from typing import Tuple, Dict, Any


def run_histogram_analysis(image_path: str) -> Tuple[float, Dict[str, Any]]:
    """
    Detects unnatural color distributions by analyzing histogram entropy
    and channel balance. Heavily edited images often show comb-like histograms.
    """
    try:
        img = cv2.imread(image_path)
        if img is None:
            return 0.0, {"error": "Cannot read image"}
    except Exception as e:
        return 0.0, {"error": str(e)}

    score = 0.0
    issues = []
    channel_stats = {}

    for i, channel_name in enumerate(["blue", "green", "red"]):
        hist = cv2.calcHist([img], [i], None, [256], [0, 256]).flatten()
        # Entropy of histogram
        hist_norm = hist / (hist.sum() + 1e-10)
        entropy = -np.sum(hist_norm * np.log2(hist_norm + 1e-10))
        # Perfect distribution = ~8 bits entropy
        # Heavily edited = "comb" gaps → lower entropy
        zero_bins = int(np.sum(hist == 0))
        channel_stats[channel_name] = {
            "entropy": round(float(entropy), 3),
            "zero_bins": zero_bins,
            "peak": int(np.argmax(hist)),
        }
        print(f"      >> CHANNEL_{channel_name.upper()}: Entropy={entropy:.2f}, ZeroBins={zero_bins}")
        if entropy < 5.0:
            issues.append(f"{channel_name} channel: very low entropy ({entropy:.2f}) — possible heavy editing")
            score += 0.2
        if zero_bins > 80:
            issues.append(f"{channel_name} channel: {zero_bins} zero bins — comb-like histogram")
            score += 0.1

    details = {
        "channels": channel_stats,
        "issues": issues,
    }
    return round(min(score, 1.0), 4), details


def run_edge_analysis(image_path: str) -> Tuple[float, Dict[str, Any]]:
    """
    Detects double-edge artifacts (halos, sharpening rings) typical of
    copy-pasted regions or composited elements.
    """
    try:
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return 0.0, {"error": "Cannot read image"}
    except Exception as e:
        return 0.0, {"error": str(e)}

    # Canny edges on original
    edges_low = cv2.Canny(img, 50, 100)
    edges_high = cv2.Canny(img, 100, 200)

    # Double-edge = strong edges at low threshold NOT at high threshold
    double_edges = cv2.bitwise_and(edges_low, cv2.bitwise_not(edges_high))
    total_pixels = img.shape[0] * img.shape[1]
    strong_edge_ratio = float(np.sum(edges_high > 0)) / total_pixels
    double_edge_ratio = float(np.sum(double_edges > 0)) / total_pixels
    suspicious_ratio = double_edge_ratio / (strong_edge_ratio + 1e-10)

    score = min(1.0, suspicious_ratio * 0.5)
    print(f"      >> EDGE_ARTIFACTS: Ratio={suspicious_ratio:.4f}")
    details = {
        "strong_edge_ratio": round(strong_edge_ratio, 4),
        "double_edge_ratio": round(double_edge_ratio, 4),
        "suspicious_ratio": round(suspicious_ratio, 4),
    }
    return round(score, 4), details


def run_shadow_analysis(image_path: str) -> Tuple[float, Dict[str, Any]]:
    """
    Detects lighting/shadow inconsistencies by analyzing gradient direction
    distributions across the image. Inconsistent light source directions
    indicate compositing.
    """
    try:
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return 0.0, {"error": "Cannot read image"}
    except Exception as e:
        return 0.0, {"error": str(e)}

    # Divide image into 4 quadrants and compute dominant gradient direction
    h, w = img.shape
    regions = [
        img[:h//2, :w//2],
        img[:h//2, w//2:],
        img[h//2:, :w//2],
        img[h//2:, w//2:],
    ]
    dominant_angles = []
    for region in regions:
        if region.size == 0:
            continue
        sobelx = cv2.Sobel(region, cv2.CV_64F, 1, 0, ksize=3)
        sobely = cv2.Sobel(region, cv2.CV_64F, 0, 1, ksize=3)
        angle = np.arctan2(np.mean(np.abs(sobely)), np.mean(np.abs(sobelx)))
        dominant_angles.append(float(np.degrees(angle)))

    if len(dominant_angles) < 2:
        return 0.0, {"dominant_angles": dominant_angles}

    angle_std = float(np.std(dominant_angles))
    score = min(1.0, angle_std / 90.0)
    print(f"      >> LIGHTING_CONSISTENCY: AngleStdDev={angle_std:.2f}°")

    details = {
        "quadrant_angles": [round(a, 2) for a in dominant_angles],
        "angle_std_deg": round(angle_std, 2),
        "interpretation": "consistent" if score < 0.3 else "inconsistent lighting detected",
    }
    return round(score, 4), details
