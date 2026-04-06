"""
PDF audit report generation using ReportLab.
Produces a professional, branded report with fraud score, signal table,
verdict, heatmap image embed, and timestamp.
"""
import os
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, HRFlowable, Image as RLImage,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT


VERDICT_COLORS = {
    "authentic": colors.HexColor("#16a34a"),
    "suspicious": colors.HexColor("#d97706"),
    "forged": colors.HexColor("#dc2626"),
    "pending": colors.HexColor("#6b7280"),
}


def generate_pdf_report(
    doc,
    fraud_score: float,
    verdict,
    forgery_type,
    signal_list: List[Dict[str, Any]],
    heatmap_path: Optional[str],
    output_path: str,
):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    pdf = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    story = []

    # ── Header ────────────────────────────────────────────────────────────────
    title_style = ParagraphStyle(
        "Title",
        parent=styles["Title"],
        fontSize=24,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=4,
    )
    story.append(Paragraph("🛡 DocuShield", title_style))
    story.append(Paragraph(
        "Document Fraud Analysis Report",
        ParagraphStyle("subtitle", parent=styles["Normal"], fontSize=12,
                       textColor=colors.HexColor("#64748b"), spaceAfter=6),
    ))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#3b82f6")))
    story.append(Spacer(1, 0.4 * cm))

    # ── Document Info ─────────────────────────────────────────────────────────
    info_data = [
        ["Document", str(doc.original_filename)],
        ["Document Type", str(doc.doc_type.value).replace("_", " ").title()],
        ["Analyzed At", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")],
        ["Document ID", str(doc.id)],
    ]
    info_table = Table(info_data, colWidths=[4 * cm, 13 * cm])
    info_table.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, -1), "Helvetica", 10),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#374151")),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.HexColor("#f8fafc"), colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 0.5 * cm))

    # ── Verdict Banner ────────────────────────────────────────────────────────
    verdict_str = verdict.value.upper()
    verdict_color = VERDICT_COLORS.get(verdict.value, colors.gray)
    verdict_data = [[
        Paragraph(
            f"<b>VERDICT: {verdict_str}</b>",
            ParagraphStyle("v", parent=styles["Normal"], fontSize=16,
                           textColor=colors.white, alignment=TA_CENTER),
        ),
        Paragraph(
            f"<b>Fraud Score: {fraud_score:.1f}%</b>",
            ParagraphStyle("s", parent=styles["Normal"], fontSize=16,
                           textColor=colors.white, alignment=TA_CENTER),
        ),
    ]]
    verdict_table = Table(verdict_data, colWidths=[8.5 * cm, 8.5 * cm])
    verdict_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), verdict_color),
        ("PADDING", (0, 0), (-1, -1), 12),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [verdict_color]),
    ]))
    story.append(verdict_table)
    story.append(Spacer(1, 0.3 * cm))

    story.append(Paragraph(
        f"<b>Forgery Type:</b> {forgery_type.value.replace('_', ' ').title()}",
        ParagraphStyle("ft", parent=styles["Normal"], fontSize=11,
                       textColor=colors.HexColor("#374151"), spaceAfter=10),
    ))

    # ── Signal Analysis Table ─────────────────────────────────────────────────
    story.append(Paragraph(
        "Signal Analysis Breakdown",
        ParagraphStyle("sh", parent=styles["Heading2"], fontSize=13,
                       textColor=colors.HexColor("#1e293b"), spaceAfter=6),
    ))

    header = ["Signal", "Raw Score", "Weight", "Contribution", "Assessment"]
    sig_data = [header]
    for sig in signal_list:
        sig_data.append([
            sig["name"],
            f"{sig['score'] * 100:.1f}%",
            f"{sig['weight'] * 100:.0f}%",
            f"{sig['weighted_contribution']:.1f}%",
            sig["label"],
        ])

    sig_table = Table(sig_data, colWidths=[5 * cm, 2.5 * cm, 2 * cm, 2.5 * cm, 5 * cm])
    sig_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e40af")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
    ]))
    story.append(sig_table)
    story.append(Spacer(1, 0.5 * cm))

    # ── Heatmap Image ─────────────────────────────────────────────────────────
    if heatmap_path and os.path.exists(heatmap_path):
        story.append(Paragraph(
            "XAI Heatmap — Suspicious Region Overlay",
            ParagraphStyle("sh2", parent=styles["Heading2"], fontSize=12,
                           textColor=colors.HexColor("#1e293b"), spaceAfter=6),
        ))
        try:
            img = RLImage(heatmap_path, width=14 * cm, height=9 * cm, kind="proportional")
            story.append(img)
        except Exception:
            pass
        story.append(Spacer(1, 0.3 * cm))

    # ── Footer ─────────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1")))
    story.append(Paragraph(
        "This report was generated automatically by DocuShield AI. "
        "For legal proceedings, human review is required.",
        ParagraphStyle("footer", parent=styles["Normal"], fontSize=8,
                       textColor=colors.HexColor("#6b7280"), alignment=TA_CENTER),
    ))

    pdf.build(story)
    return output_path
