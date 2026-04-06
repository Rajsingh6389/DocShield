import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import os

def generate_fraud_viz(
    original_path: str,
    ela_image: np.ndarray,
    clone_viz: np.ndarray,
    ocr_regions: list,
    output_path: str
):
    """
    Generates a 2x2 composite visualization of the fraud analysis.
    """
    # Load original
    orig_img = cv2.imread(original_path)
    if orig_img is None:
        return False
        
    h, w = orig_img.shape[:2]
    target_size = (800, int(800 * h / w))
    
    # 1. Top-Left: Original with OCR Highlights
    panel1 = orig_img.copy()
    for reg in ocr_regions:
        x, y, rw, rh = reg['x'], reg['y'], reg['w'], reg['h']
        cv2.rectangle(panel1, (x, y), (x + rw, y + rh), (0, 165, 255), 2) # Orange for OCR
        
    # 2. Top-Right: ELA Heatmap (convert to 3-channel BGR if needed)
    if len(ela_image.shape) == 2:
        panel2 = cv2.cvtColor(ela_image, cv2.COLOR_GRAY2BGR)
    else:
        panel2 = cv2.cvtColor(ela_image, cv2.COLOR_RGB2BGR) # PIL is RGB, CV2 is BGR
        
    # 3. Bottom-Left: Clone Detection matches
    panel3 = clone_viz
    
    # 4. Bottom-Right: Comparison / Difference panel (Optional, using edge or just summary)
    # Let's make an edge-enhanced version for visual structure comparison
    gray = cv2.cvtColor(orig_img, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 100, 200)
    panel4 = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
    
    # Resize all to target_size
    p1 = cv2.resize(panel1, target_size)
    p2 = cv2.resize(panel2, target_size)
    p3 = cv2.resize(panel3, target_size)
    p4 = cv2.resize(panel4, target_size)
    
    # Add labels
    font = cv2.FONT_HERSHEY_SIMPLEX
    def add_label(img, text):
        cv2.putText(img, text, (20, 40), font, 1, (255, 255, 255), 2, cv2.LINE_AA)
        cv2.putText(img, text, (20, 40), font, 1, (0, 0, 0), 1, cv2.LINE_AA)

    add_label(p1, "OCR ANOMALIES")
    add_label(p2, "ELA HEATMAP")
    add_label(p3, "CLONE DETECTION")
    add_label(p4, "EDGE STRUCTURE")
    
    # Combine into 2x2 grid
    top_row = np.hstack((p1, p2))
    bottom_row = np.hstack((p3, p4))
    composite = np.vstack((top_row, bottom_row))
    
    # Add border
    composite = cv2.copyMakeBorder(composite, 10, 10, 10, 10, cv2.BORDER_CONSTANT, value=(40, 40, 40))
    
    # Save
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    cv2.imwrite(output_path, composite)
    return True

def create_overlay_viz(
    original_path: str,
    ela_image: np.ndarray,
    clone_matches: list,
    ocr_regions: list,
    output_path: str
):
    """
    Creates a single-panel overlay of all fraud indicators.
    """
    img = cv2.imread(original_path)
    if img is None:
        return False
        
    overlay = img.copy()
    
    # 1. Layer ELA (Heatmap style)
    if ela_image is not None:
        # Convert ELA intensity to a red heatmap overlay
        if len(ela_image.shape) == 3:
            ela_gray = cv2.cvtColor(ela_image, cv2.COLOR_RGB2GRAY)
        else:
            ela_gray = ela_image
            
        # Threshold ELA to find "hot" areas
        _, mask = cv2.threshold(ela_gray, 30, 255, cv2.THRESH_BINARY)
        heatmap = cv2.applyColorMap(ela_gray, cv2.COLORMAP_JET)
        
        # Apply heatmap only where intensity is significant
        alpha = 0.4
        img_heatmap = cv2.addWeighted(overlay, 1-alpha, heatmap, alpha, 0)
        overlay[mask > 0] = img_heatmap[mask > 0]

    # 2. Layer Clones (Red bounding boxes or lines)
    for match in clone_matches:
        if isinstance(match, dict) and 'kp1' in match:
            pt1 = tuple(map(int, match['kp1']))
            pt2 = tuple(map(int, match['kp2']))
            cv2.line(overlay, pt1, pt2, (0, 0, 255), 2)
            cv2.circle(overlay, pt1, 5, (0, 0, 255), -1)
            cv2.circle(overlay, pt2, 5, (0, 0, 255), -1)

    # 3. Layer OCR Highlights (Orange)
    for reg in ocr_regions:
        x, y, rw, rh = reg['x'], reg['y'], reg['w'], reg['h']
        cv2.rectangle(overlay, (x, y), (x + rw, y + rh), (0, 165, 255), 2)
        
    # Combine original and overlay for a "glass" effect if needed, 
    # but here we've already modified 'overlay'
    
    # Save
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    cv2.imwrite(output_path, overlay)
    print(f"      [🖼️] FRAUD_MAP_GENERATED: {output_path}")
    return True
