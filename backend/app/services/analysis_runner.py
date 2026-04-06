"""
Synchronous analysis runner for local dev (no Celery/Redis needed).
Called via FastAPI BackgroundTasks.
"""
import os
import time
from datetime import datetime, timezone
from loguru import logger


def run_analysis_sync(document_id: str):
    """Full analysis pipeline, runs in a background thread via FastAPI BackgroundTasks."""
    from app.db.database import SessionLocal
    from app.db.models import (
        Document, AnalysisResult, DocumentStatus, Verdict, Notification,
    )
    from app.services.ela import run_ela
    from app.services.clone_detect import run_clone_detection
    from app.services.ocr_analysis import run_ocr_analysis
    from app.services.metadata_analysis import run_metadata_analysis
    from app.services.visual_signals import run_histogram_analysis, run_edge_analysis, run_shadow_analysis
    from app.services.heatmap import generate_heatmap
    from app.services.ensemble import compute_ensemble_score
    from app.services.classifier import classify_document_type
    from app.services.report import generate_pdf_report
    from app.services.visualizer import generate_fraud_viz, create_overlay_viz
    from app.services.validator import run_field_validation
    from app.services.dit_analysis import run_dit_analysis
    from app.services.qr_analysis import run_qr_analysis
    from app.services.ai_explainer import generate_ai_explanation
    from app.core.config import settings

    db = SessionLocal()
    start_time = time.time()

    try:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            return

        doc.status = DocumentStatus.PROCESSING
        db.commit()

        image_path = doc.file_path
        print("\n" + "="*60)
        print(f" [⚙️] INITIALIZING DOCUSHIELD SECURE ANALYSIS UPLINK")
        print(f" [🆔] TARGET_ID: {document_id}")
        print(f" [📂] FILENAME : {doc.original_filename}")
        print("="*60)

        print(f" [🔍] CLASSIFYING DOCUMENT STRUCTURE...")
        doc_type_enum = classify_document_type(doc.original_filename)
        print(f" [📍] IDENTIFIED_TYPE: {doc_type_enum.value.upper()}")
        
        print(f" [🧬] RUNNING ERROR LEVEL ANALYSIS (ELA)...")
        ela_score, ela_array, ela_details = run_ela(image_path)
        print(f"      >> ELA_CONFIDENCE: {ela_score*100:.2f}%")

        print(f" [👥] SCANNING FOR CLONED REGIONS...")
        clone_score, matched_regions, clone_details, clone_viz = run_clone_detection(image_path)
        print(f"      >> DUPLICATES_FOUND: {len(matched_regions)}")

        print(f" [📄] EXTRACTING DIGITAL FINGERPRINTS (OCR)...")
        ocr_score, ocr_regions, ocr_details, full_text = run_ocr_analysis(image_path)
        
        # Re-classify with OCR text for better accuracy
        doc_type_enum = classify_document_type(doc.original_filename, full_text)
        doc.doc_type = doc_type_enum
        db.commit()
        print(f" [📍] TYPE_REVERIFIED: {doc_type_enum.value.upper()}")

        print(f" [🏷️] VALIDATING MANDATORY FIELDS...")
        val_score, missing_fields = run_field_validation(doc_type_enum, full_text)
        if missing_fields:
            print(f"      [⚠️] MISSING_FIELDS: {', '.join(missing_fields)}")
            ocr_score = min(ocr_score + val_score, 1.0)
            if "issues" not in ocr_details: ocr_details["issues"] = []
            ocr_details["issues"].append(f"Missing mandatory fields: {', '.join(missing_fields)}")
            ocr_details["missing_fields"] = missing_fields

        print(f" [📊] ANALYZING METADATA & VISUAL SIGNALS...")
        metadata_score, metadata_details = run_metadata_analysis(image_path)
        histogram_score, _ = run_histogram_analysis(image_path)
        edge_score, _ = run_edge_analysis(image_path)
        shadow_score, _ = run_shadow_analysis(image_path)

        print(f" [🧠] DOCUMENT_AI :: UPLINK :: ANALYZING STRUCTURE (DiT)...")
        dit_score, dit_details = run_dit_analysis(image_path)
        print(f"      >> DiT_ANOMALY_INDEX: {dit_score:.4f}")

        print(f" [🔳] SCANNING FOR SECURE QR CODES...")
        # Get OCR extracted fields for QR cross-reference
        ocr_ext = ocr_details.get("extracted_fields", {})
        qr_found, qr_data = run_qr_analysis(image_path, ocr_data=ocr_ext)
        qr_score = 0.0
        qr_details = {"found": qr_found, "data": qr_data}

        if qr_found:
            print(f"      >> QR_SIG_DETECTED: {qr_data.get('aadhaar') or qr_data.get('raw_text', 'Generic QR')}")
            # Cross-reference with OCR for consistency
            ocr_ext = ocr_details.get("extracted_fields", {})
            mismatches = []
            
            # Simple field matching
            for field in ["name", "dob", "aadhaar", "pan"]:
                qr_val = qr_data.get(field)
                ocr_val = ocr_ext.get(field)
                if qr_val and ocr_val:
                    if str(qr_val).strip().upper() != str(ocr_val).strip().upper():
                        mismatches.append(field)
            
            if mismatches:
                print(f"      [⚠️] QR_OCR_MISMATCH: {', '.join(mismatches)}")
                qr_score = 0.85 # Critical signal
                qr_details["mismatches"] = mismatches
            else:
                qr_score = 0.0
                print(f"      [✅] QR_DATA_VERIFIED")
        else:
            # If it's an Aadhaar but no QR found, it's suspicious
            if doc_type_enum.value in ["id_card", "passport"]:
                qr_score = 0.25
                qr_details["issue"] = "No secure QR found on identity document"

        # ─── Verification Visuals ─────────────────────────────────────────────
        heatmap_path = None
        try:
            heatmap_filename = f"analysis_{document_id}.jpg"
            heatmap_path = os.path.join(settings.HEATMAP_DIR, heatmap_filename)
            os.makedirs(settings.HEATMAP_DIR, exist_ok=True)
            
            # Generate the 2x2 composite investigation report (Saved separately if needed)
            # generate_fraud_viz(...) 
            
            # Generate the unified Fraud Map overlay (Primary heatmap)
            create_overlay_viz(
                original_path=image_path,
                ela_image=ela_array,
                clone_matches=clone_details.get("matches", []),
                ocr_regions=ocr_regions,
                output_path=heatmap_path
            )
        except Exception as e:
            logger.warning(f"Visualization failed: {e}")
            heatmap_path = None

        # NEW: get confidence from dit_details
        dit_confidence = dit_details.get("confidence", 0.0)

        print(f" [🛡️] AGGREGATING SIGNALS INTO ENSEMBLE ENGINE...")
        fraud_score, verdict, forgery_type, signal_list, extra_info = compute_ensemble_score(
            ela_score=ela_score, clone_score=clone_score, ocr_score=ocr_score,
            metadata_score=metadata_score, histogram_score=histogram_score,
            edge_score=edge_score, shadow_score=shadow_score,
            dit_score=dit_score,
            dit_confidence=dit_confidence,
            qr_score=qr_score,
            doc_type=doc_type_enum.value,
            qr_data=qr_data,
            ocr_data=ocr_ext, # uses ocr_ext as ocr_data
        )
        identity_check = extra_info.get("identity_check")
        
        print(f" [🦾] AI_EXPLAINER :: GENERATING ROBOTIC SUMMARY...")
        ai_explainer = generate_ai_explanation(
            fraud_score=fraud_score,
            verdict=verdict,
            forgery_type=forgery_type,
            scores={
                "ela": ela_score, "clone": clone_score, "ocr": ocr_score,
                "metadata": metadata_score, "histogram": histogram_score,
                "edge": edge_score, "shadow": shadow_score,
                "dit": dit_score, "qr": qr_score
            },
            identity_check=identity_check
        )
        print(f"      >> SUMMARY_LENGTH: {len(ai_explainer)} chars")

        elapsed = round(time.time() - start_time, 2)

        result = db.query(AnalysisResult).filter(AnalysisResult.document_id == document_id).first()
        if not result:
            result = AnalysisResult(document_id=document_id)
            db.add(result)

        result.fraud_score = fraud_score
        result.verdict = verdict
        result.forgery_type = forgery_type
        result.ela_score = ela_score
        result.clone_score = clone_score
        result.ocr_score = ocr_score
        result.metadata_score = metadata_score
        result.histogram_score = histogram_score
        result.edge_score = edge_score
        result.shadow_score = shadow_score
        result.resnet_score = dit_score
        result.vit_score = 0.0 # Legacy hidden
        result.qr_score = qr_score
        result.vit_details = dit_details
        result.qr_details = qr_details
        result.ela_details = ela_details
        result.clone_details = clone_details
        result.ocr_details = ocr_details
        result.metadata_details = metadata_details
        result.ai_explainer = ai_explainer
        result.heatmap_path = heatmap_path
        result.processing_time_seconds = elapsed
        result.analyzed_at = datetime.now(timezone.utc)

        # PDF report
        try:
            os.makedirs(settings.REPORT_DIR, exist_ok=True)
            report_path = os.path.join(settings.REPORT_DIR, f"report_{document_id}.pdf")
            generate_pdf_report(doc=doc, fraud_score=fraud_score, verdict=verdict,
                                forgery_type=forgery_type, signal_list=signal_list,
                                heatmap_path=heatmap_path, output_path=report_path)
            result.report_path = report_path
        except Exception as e:
            logger.warning(f"Report failed: {e}")

        doc.status = DocumentStatus.COMPLETED
        doc.processed_at = datetime.now(timezone.utc)
        db.commit()

        if verdict in (Verdict.SUSPICIOUS, Verdict.FORGED):
            notif = Notification(
                user_id=doc.uploader_id,
                title=f"⚠️ {verdict.value.capitalize()} document detected",
                message=f"'{doc.original_filename}' scored {fraud_score:.0f}% fraud confidence.",
                type="danger" if verdict == Verdict.FORGED else "warning",
                document_id=doc.id,
            )
            db.add(notif)
            db.commit()

        print("="*60)
        print(f" [🚨] ANALYSIS COMPLETE :: {verdict.value.upper()}")
        print(f" [📈] FRAUD_CONFIDENCE: {fraud_score}%")
        print(f" [📂] FORGERY_TYPE   : {forgery_type.value.upper()}")
        print("="*60 + "\n")

    except Exception as e:
        logger.exception(f"[{document_id}] Analysis failed: {e}")
        try:
            doc = db.query(Document).filter(Document.id == document_id).first()
            if doc:
                doc.status = DocumentStatus.FAILED
            result = db.query(AnalysisResult).filter(AnalysisResult.document_id == document_id).first()
            if not result:
                result = AnalysisResult(document_id=document_id)
                db.add(result)
            result.error_message = str(e)
            db.commit()
        except Exception:
            pass
    finally:
        db.close()
