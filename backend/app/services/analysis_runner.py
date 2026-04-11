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
    from app.services.malware_detection import run_malware_detection
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
        
        # ─── Parallel Analysis Pipeline ──────────────────────────────────────────
        from concurrent.futures import ThreadPoolExecutor

        with ThreadPoolExecutor(max_workers=8) as executor:
            # Independent tasks
            future_ela = executor.submit(run_ela, image_path)
            future_clone = executor.submit(run_clone_detection, image_path)
            future_ocr = executor.submit(run_ocr_analysis, image_path)
            future_metadata = executor.submit(run_metadata_analysis, image_path)
            future_dit = executor.submit(run_dit_analysis, image_path)
            future_hist = executor.submit(run_histogram_analysis, image_path)
            future_edge = executor.submit(run_edge_analysis, image_path)
            future_shadow = executor.submit(run_shadow_analysis, image_path)
            future_malware = executor.submit(run_malware_detection, image_path)

            # Wait for OCR first because QR and DocType re-verification need it
            ela_score, ela_array, ela_details = future_ela.result()
            clone_score, matched_regions, clone_details, clone_viz = future_clone.result()
            ocr_score, ocr_regions, ocr_details, full_text = future_ocr.result()
            metadata_score, metadata_details = future_metadata.result()
            dit_score, dit_details = future_dit.result()
            histogram_score, _ = future_hist.result()
            edge_score, _ = future_edge.result()
            shadow_score, _ = future_shadow.result()
            malware_score, malware_details = future_malware.result()

        print(f"      >> ELA_CONFIDENCE: {ela_score*100:.2f}%")
        print(f"      >> DUPLICATES_FOUND: {len(matched_regions)}")
        
        if metadata_details.get("software"):
            print(f"      [🛠️] METADATA_SIGNATURE: {metadata_details['software']}")
        if metadata_details.get("create_date"):
            print(f"      [📅] ORIGIN_TIMESTAMP : {metadata_details['create_date']}")

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

        print(f"      >> DiT_ANOMALY_INDEX: {dit_score:.4f}")

        print(f" [🔳] SCANNING FOR SECURE QR CODES...")
        ocr_ext = ocr_details.get("extracted_fields", {})
        if ocr_ext:
            fields_str = ", ".join([f"{k}:{v}" for k, v in ocr_ext.items() if v])
            print(f" [📋] EXTRACTED_FIELDS : {fields_str[:80]}...")

        qr_found, qr_data = run_qr_analysis(image_path, ocr_data=ocr_ext)
        qr_score = 0.0
        qr_details = {"found": qr_found, "data": qr_data}

        if qr_found:
            print(f"      >> QR_SIG_DETECTED: {qr_data.get('aadhaar') or qr_data.get('raw_text', 'Generic QR')}")
            mismatches = []
            for field in ["name", "dob", "aadhaar", "pan"]:
                qr_val = qr_data.get(field)
                ocr_val = ocr_ext.get(field)
                if qr_val and ocr_val:
                    if str(qr_val).strip().upper() != str(ocr_val).strip().upper():
                        mismatches.append(field)
            if mismatches:
                print(f"      [⚠️] QR_OCR_MISMATCH: {', '.join(mismatches)}")
                qr_score = 0.85 
                qr_details["mismatches"] = mismatches
            else:
                qr_score = 0.0
                print(f"      [✅] QR_DATA_VERIFIED")
        else:
            if doc_type_enum.value in ["id_card", "passport"]:
                qr_score = 0.25
                qr_details["issue"] = "No secure QR found on identity document"

        # ─── Verification Visuals ─────────────────────────────────────────────
        heatmap_path = None
        try:
            heatmap_filename = f"analysis_{document_id}.jpg"
            heatmap_path = os.path.join(settings.HEATMAP_DIR, heatmap_filename)
            os.makedirs(settings.HEATMAP_DIR, exist_ok=True)
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
            malware_score=malware_score,
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
                "dit": dit_score, "qr": qr_score, "malware": malware_score
            },
            identity_check=identity_check
        )
        print(f"      >> SUMMARY_LENGTH: {len(ai_explainer)} chars")

        elapsed = round(time.time() - start_time, 2)

        result = db.query(AnalysisResult).filter(AnalysisResult.document_id == document_id).first()
        if not result:
            result = AnalysisResult(document_id=document_id)
            db.add(result)

        # Store string values explicitly (columns are now VARCHAR)
        verdict_str = verdict.value if hasattr(verdict, 'value') else str(verdict)
        forgery_str = forgery_type.value if hasattr(forgery_type, 'value') else str(forgery_type)

        result.fraud_score = fraud_score
        result.verdict = verdict_str
        result.forgery_type = forgery_str
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
        result.malware_score = malware_score
        result.vit_details = dit_details
        result.qr_details = qr_details
        result.malware_details = malware_details
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
            generate_pdf_report(doc=doc, fraud_score=fraud_score, verdict=verdict_str,
                                forgery_type=forgery_str, signal_list=signal_list,
                                heatmap_path=heatmap_path, output_path=report_path)
            result.report_path = report_path
        except Exception as e:
            logger.warning(f"Report failed: {e}")

        doc.status = "completed"
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
        print(f" [📂] FORGERY_TYPE   : {forgery_str.upper()}")
        print("="*60 + "\n")

    except Exception as e:
        logger.exception(f"[{document_id}] Analysis failed: {e}")
        try:
            doc = db.query(Document).filter(Document.id == document_id).first()
            if doc:
                doc.status = "failed"
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
