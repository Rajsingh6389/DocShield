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

        # ⚡ OPTIMIZED: Resize for faster ORB if giant
        h, w = img.shape[:2]
        if w > 1200:
            scale = 1200 / w
            img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        viz_img = img.copy()
    except Exception as e:
        return 0.0, [], {"error": str(e)}, np.zeros((100, 100, 3), dtype=np.uint8)

    # SIFT detector (More robust to scale/rotation than ORB)
    sift = cv2.SIFT_create(nfeatures=2000)
    keypoints, descriptors = sift.detectAndCompute(gray, None)
    print(f"      >> FEATURE_SIFT_DETECTION: {len(keypoints)} keypoints found")

    if descriptors is None or len(keypoints) < 10:
        return 0.0, [], {"keypoints": 0, "matches": 0}, viz_img

    # Self-matching: detect duplicate feature clusters using FLANN (much faster than BFMatcher)
    FLANN_INDEX_KDTREE = 1
    index_params = dict(algorithm=FLANN_INDEX_KDTREE, trees=5)
    search_params = dict(checks=50) # higher is more accurate but slower
    
    flann = cv2.FlannBasedMatcher(index_params, search_params)
    # k=3 because matches[0] is often the identity match (point to itself)
    matches = flann.knnMatch(descriptors, descriptors, k=3)

    suspicious_pairs = []
    DIST_THRESHOLD = 30   # pixel min distance to be considered a different region

    # Lowe's ratio test for good matches
    good_matches = []
    for match_group in matches:
        if len(match_group) >= 3:
            # m1 is usually self, m2 is best match, m3 is second best
            m1, m2, m3 = match_group[0], match_group[1], match_group[2]
            
            # If distance to self isn't zero, it means self might be m2
            target_match = m2 if m1.distance < 1e-5 else m1
            secondary_match = m3 if target_match == m2 else m2

            if target_match.distance < 0.7 * secondary_match.distance:
                pt1 = keypoints[target_match.queryIdx].pt
                pt2 = keypoints[target_match.trainIdx].pt
                pixel_dist = np.sqrt((pt1[0] - pt2[0])**2 + (pt1[1] - pt2[1])**2)
                
                if pixel_dist > DIST_THRESHOLD:
                    good_matches.append(target_match)

    for m in good_matches:
        pt1 = keypoints[m.queryIdx].pt
        pt2 = keypoints[m.trainIdx].pt
        suspicious_pairs.append({
            "region_a": {"x": int(pt1[0]), "y": int(pt1[1])},
            "region_b": {"x": int(pt2[0]), "y": int(pt2[1])},
            "descriptor_distance": round(m.distance, 2),
            "pixel_distance": round(np.sqrt((pt1[0] - pt2[0])**2 + (pt1[1] - pt2[1])**2), 1),
        })
        
        # Draw visual evidence on viz_img
        color = (0, 0, 255) if m.distance < 150 else (0, 255, 255)
        cv2.line(viz_img, (int(pt1[0]), int(pt1[1])), (int(pt2[0]), int(pt2[1])), color, 1)
        cv2.circle(viz_img, (int(pt1[0]), int(pt1[1])), 4, color, -1)
        cv2.circle(viz_img, (int(pt2[0]), int(pt2[1])), 4, color, -1)

    # Deduplicate/limit
    matched_regions = suspicious_pairs[:20]
    total_kp = len(keypoints)
    print(f"      >> CROSS_MATCHING_CLUSTERS: {len(suspicious_pairs)} valid suspicious pairs identified")
    
    # Require at least 4 valid matches to consider it a real clone (reduces single-point false positives)
    if len(suspicious_pairs) >= 4:
        score = min(1.0, len(suspicious_pairs) / 20.0) # Highly suspicious if more than 20
    else:
        score = 0.0

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
