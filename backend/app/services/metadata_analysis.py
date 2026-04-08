"""
EXIF and metadata analysis — detects editing software, date mismatches,
GPS anomalies, and suspicious modification history.
"""
import os
from datetime import datetime
from typing import Tuple, Dict, Any

try:
    import piexif
    PIEXIF_AVAILABLE = True
except ImportError:
    PIEXIF_AVAILABLE = False

import cv2


SUSPICIOUS_SOFTWARE = [
    "photoshop", "gimp", "lightroom", "affinity", "pixelmator",
    "paint.net", "canva", "photoscape", "fotor", "snapseed",
    "illustrator", "inkscape", "corel",
]


def run_metadata_analysis(image_path: str) -> Tuple[float, Dict[str, Any]]:
    """
    Returns:
        score: 0–1 suspicion score
        details: extracted metadata and findings
    """
    score = 0.0
    issues = []
    metadata = {}

    try:
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError("Could not read image")
        
        h, w = img.shape[:2]
        metadata["format"] = os.path.splitext(image_path)[1].lstrip(".").upper()
        metadata["mode"] = "RGB" if len(img.shape) == 3 else "Grayscale"
        metadata["size"] = [w, h]
    except Exception as e:
        return 0.0, {"error": str(e)}

    # EXIF extraction
    exif_data = {}
    if PIEXIF_AVAILABLE:
        try:
            exif_bytes = piexif.load(image_path)
            for ifd in exif_bytes:
                if not isinstance(exif_bytes[ifd], dict):
                    continue
                for tag_id, value in exif_bytes[ifd].items():
                    tag_name = piexif.TAGS[ifd].get(tag_id, {}).get("name", str(tag_id))
                    if isinstance(value, bytes):
                        try:
                            value = value.decode("utf-8", errors="replace").strip("\x00")
                        except Exception:
                            value = repr(value)
                    exif_data[tag_name] = value
        except Exception:
            pass

    metadata["exif"] = exif_data
    print(f"      >> EXIF_UPLINK: Found {len(exif_data)} tags")

    # Check software field
    software = str(exif_data.get("Software", "")).lower()
    
    # Fallback to raw byte signatures if EXIF is scrubbed
    if not software:
        try:
            with open(image_path, "rb") as f:
                raw_bytes = f.read(40000) # Check first 40KB for header traces
                raw_str = raw_bytes.decode('ascii', errors='ignore').lower()
                for sw in SUSPICIOUS_SOFTWARE:
                    if sw in raw_str:
                        software = f"embedded_{sw}"
                        break
        except Exception:
            pass

    if software:
        print(f"      >> SOFTWARE_SIGNATURE: {software}")
        metadata["software"] = software
        for sw in SUSPICIOUS_SOFTWARE:
            if sw in software:
                print(f"      [!] MALICIOUS_SOFTWARE_DETECTED: {sw.upper()}")
                issues.append(f"Edited with: {software}")
                score += 0.4
                break
    else:
        print(f"      >> SOFTWARE_SIGNATURE: NONE_DETECTED")

    # Date mismatch check
    date_original = exif_data.get("DateTimeOriginal", "")
    date_modified = exif_data.get("DateTime", "")
    file_mtime = datetime.fromtimestamp(os.path.getmtime(image_path))

    if date_original and date_modified:
        try:
            orig_dt = datetime.strptime(str(date_original), "%Y:%m:%d %H:%M:%S")
            mod_dt = datetime.strptime(str(date_modified), "%Y:%m:%d %H:%M:%S")
            diff_days = abs((mod_dt - orig_dt).days)
            metadata["date_original"] = str(date_original)
            metadata["date_modified"] = str(date_modified)
            metadata["date_diff_days"] = diff_days
            if diff_days > 30:
                issues.append(f"Large date gap: original vs modified = {diff_days} days")
                score += 0.25
        except ValueError:
            pass

    # Check for GPS data (unusual for most official documents)
    if "GPSInfo" in exif_data or any("GPS" in k for k in exif_data):
        issues.append("Unexpected GPS metadata found")
        score += 0.1

    # Missing EXIF entirely is mildly suspicious for printed/scanned docs
    if not exif_data:
        metadata["exif_missing"] = True
        # Not penalized — scanned docs often have no EXIF

    # File extension vs actual format mismatch
    ext = os.path.splitext(image_path)[1].lower().lstrip(".")
    fmt = (metadata.get("format") or "").lower()
    format_map = {"jpeg": "jpg", "tiff": "tif"}
    normalized_fmt = format_map.get(fmt, fmt)
    print(f"      >> FORMAT_CONSISTENCY: .{ext} == {fmt}")
    if ext and normalized_fmt and ext != normalized_fmt and not (ext == "jpg" and normalized_fmt == "jpeg"):
        print(f"      [!] EXTENSION_MISMATCH: .{ext} claims to be {fmt}")
        issues.append(f"Extension mismatch: .{ext} but actual format is {fmt}")
        score += 0.15

    details = {
        "software": software or "unknown",
        "issues": issues,
        "metadata": {k: str(v) for k, v in metadata.items() if k not in ("exif",)},
        "exif_keys": list(exif_data.keys()),
    }

    return round(min(score, 1.0), 4), details
