"""
Clone and copy-paste detection using SIFT/ORB feature matching.
Detects duplicated regions within the same document image.
"""
import numpy as np
import cv2
from typing import Tuple, Dict, Any, List


def run_clone_detection(image_path: str) -> Tuple[float, List[Dict], Dict[str, Any], np.ndarray]:
    """
    Uses ORB feature matching to find copy-pasted regions.

    Returns:
        score: float
        matched_regions: list
        details: dict
        viz_image: np.ndarray (OpenCV image with highlights)
    """
    try:
        img = cv2.imread(image_path)
        if img is None:
            return 0.0, [], {"error": "Could not read image"}, np.zeros((100, 100, 3), dtype=np.uint8)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        viz_img = img.copy()
    except Exception as e:
        return 0.0, [], {"error": str(e)}, np.zeros((100, 100, 3), dtype=np.uint8)

    # ORB detector
    orb = cv2.ORB_create(nfeatures=1000)
    keypoints, descriptors = orb.detectAndCompute(gray, None)
    print(f"      >> FEATURE_ORB_DETECTION: {len(keypoints)} keypoints found")

    if descriptors is None or len(keypoints) < 10:
        return 0.0, [], {"keypoints": 0, "matches": 0}, viz_img

    # Self-matching: detect duplicate feature clusters
    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)
    matches = bf.knnMatch(descriptors, descriptors, k=3)

    suspicious_pairs = []
    DIST_THRESHOLD = 30   # pixel min distance to be considered different region

    for match_group in matches:
        for m in match_group[1:]:  # skip self-match
            if m.distance < 35:
                pt1 = keypoints[m.queryIdx].pt
                pt2 = keypoints[m.trainIdx].pt
                pixel_dist = np.sqrt((pt1[0] - pt2[0])**2 + (pt1[1] - pt2[1])**2)
                if pixel_dist > DIST_THRESHOLD:
                    suspicious_pairs.append({
                        "region_a": {"x": int(pt1[0]), "y": int(pt1[1])},
                        "region_b": {"x": int(pt2[0]), "y": int(pt2[1])},
                        "descriptor_distance": int(m.distance),
                        "pixel_distance": round(pixel_dist, 1),
                    })
                    
                    # Draw visual evidence on viz_img
                    color = (0, 0, 255) if m.distance < 20 else (0, 255, 255)
                    cv2.line(viz_img, (int(pt1[0]), int(pt1[1])), (int(pt2[0]), int(pt2[1])), color, 1)
                    cv2.circle(viz_img, (int(pt1[0]), int(pt1[1])), 4, color, -1)
                    cv2.circle(viz_img, (int(pt2[0]), int(pt2[1])), 4, color, -1)

    # Deduplicate/limit
    matched_regions = suspicious_pairs[:20]
    total_kp = len(keypoints)
    print(f"      >> CROSS_MATCHING_CLUSTERS: {len(suspicious_pairs)} suspicious pairs identified")
    score = min(1.0, len(suspicious_pairs) / max(total_kp, 1) * 5)

    details = {
        "total_keypoints": total_kp,
        "suspicious_pairs_found": len(suspicious_pairs),
    }

    return round(score, 4), matched_regions, details, viz_img


def score_label(score: float) -> str:
    if score < 0.15:
        return "Clean"
    elif score < 0.3:
        return "Low Risk"
    elif score < 0.55:
        return "Moderate Risk"
    return "High Risk"
