"""
XAI Heatmap generation — creates a visual overlay highlighting suspicious
regions using ELA map, edge artifacts, and clone detection results.
Color-coded: red=high risk, yellow=moderate, green=clean.
"""
import os
import base64
import numpy as np
import cv2
from PIL import Image
from typing import Optional, Tuple

from app.core.config import settings


def generate_heatmap(
    image_path: str,
    ela_array: Optional[np.ndarray],
    matched_regions: list,
    output_path: str,
) -> str:
    """
    Generates an annotated heatmap overlay and saves it.
    Returns the file path of the saved heatmap.
    """
    os.makedirs(settings.HEATMAP_DIR, exist_ok=True)

    try:
        img = cv2.imread(image_path)
        if img is None:
            img = np.zeros((400, 600, 3), dtype=np.uint8)
    except Exception:
        img = np.zeros((400, 600, 3), dtype=np.uint8)

    h, w = img.shape[:2]
    overlay = img.copy()

    # ── ELA heat layer ────────────────────────────────────────────────────────
    if ela_array is not None:
        try:
            ela_resized = cv2.resize(ela_array, (w, h))
            ela_gray = cv2.cvtColor(
                ela_resized.astype(np.uint8),
                cv2.COLOR_RGB2GRAY if len(ela_resized.shape) == 3 else cv2.COLOR_GRAY2BGR,
            )
            # Create heat colormap: green→yellow→red
            ela_colored = cv2.applyColorMap(ela_gray, cv2.COLORMAP_JET)
            # Blend only in high-activity regions
            mask = ela_gray > 40
            overlay[mask] = cv2.addWeighted(overlay, 0.4, ela_colored, 0.6, 0)[mask]
        except Exception:
            pass

    # ── Clone region markers ───────────────────────────────────────────────
    for pair in matched_regions[:15]:
        try:
            xa = int(pair["region_a"]["x"])
            ya = int(pair["region_a"]["y"])
            xb = int(pair["region_b"]["x"])
            yb = int(pair["region_b"]["y"])
            # Draw circles at matched regions
            cv2.circle(overlay, (xa, ya), 12, (0, 0, 255), 2)
            cv2.circle(overlay, (xb, yb), 12, (0, 165, 255), 2)
            # Draw line connecting duplicates
            cv2.line(overlay, (xa, ya), (xb, yb), (255, 0, 255), 1)
        except Exception:
            continue

    # ── Legend ────────────────────────────────────────────────────────────────
    legend_items = [
        ((0, 0, 255), "High Risk (ELA)"),
        ((0, 165, 255), "Clone Region"),
        ((255, 0, 255), "Clone Link"),
    ]
    y_pos = 20
    for color, label in legend_items:
        cv2.rectangle(overlay, (10, y_pos - 12), (26, y_pos + 2), color, -1)
        cv2.putText(overlay, label, (32, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
        y_pos += 22

    # ── Watermark ─────────────────────────────────────────────────────────────
    cv2.putText(
        overlay, "DocuShield XAI",
        (w - 160, h - 10),
        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1,
    )

    cv2.imwrite(output_path, overlay)
    return output_path


def image_to_base64(path: str) -> Optional[str]:
    try:
        with open(path, "rb") as f:
            return base64.b64encode(f.read()).decode()
    except Exception:
        return None
