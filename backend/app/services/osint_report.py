"""
PDF report generation for OSINT intelligence results.
"""
import os
from datetime import datetime, timezone
from typing import Dict, Any, List

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, HRFlowable, Image as RLImage,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

def generate_osint_pdf(
    data: Dict[str, Any],
    output_path: str,
):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    pdf = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )

    styles = getSampleStyleSheet()
    story = []

    # ── Header ────────────────────────────────────────────────────────────────
    title_style = ParagraphStyle(
        "Title",
        parent=styles["Title"],
        fontSize=26,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=2,
    )
    story.append(Paragraph("🛡 DocuShield OSINT", title_style))
    story.append(Paragraph(
        "Intelligent Threat Dossier",
        ParagraphStyle("subtitle", parent=styles["Normal"], fontSize=12,
                       textColor=colors.HexColor("#64748b"), spaceAfter=10),
    ))
    story.append(HRFlowable(width="100%", thickness=3, color=colors.HexColor("#06b6d4")))
    story.append(Spacer(1, 0.5 * cm))

    # ── Subject Info Banner ───────────────────────────────────────────────────
    subject_name = data.get("name", "UNIDENTIFIED_SUBJECT")
    banner_data = [[
        Paragraph(
            f"<b>SUBJECT: {subject_name}</b>",
            ParagraphStyle("v", parent=styles["Normal"], fontSize=16,
                           textColor=colors.white, alignment=TA_LEFT),
        ),
        Paragraph(
            f"<b>DATE: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}</b>",
            ParagraphStyle("s", parent=styles["Normal"], fontSize=12,
                           textColor=colors.white, alignment=TA_RIGHT),
        ),
    ]]
    banner_table = Table(banner_data, colWidths=[12 * cm, 6 * cm])
    banner_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#0f172a")),
        ("PADDING", (0, 0), (-1, -1), 12),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(banner_table)
    story.append(Spacer(1, 0.8 * cm))

    # ── Core Intelligence Data ───────────────────────────────────────────────
    story.append(Paragraph(
        "Core Intelligence Profile",
        ParagraphStyle("sh", parent=styles["Heading2"], fontSize=14,
                       textColor=colors.HexColor("#0f172a"), spaceAfter=8),
    ))

    core_info = [
        ["Field", "Identification Data"],
        ["Full Name", data.get("name", "N/A")],
        ["Father's Name", data.get("father_name", "N/A")],
        ["Nickname/Alias", data.get("nickname", "N/A")],
        ["Email", data.get("email", "N/A")],
        ["Passport/ID", data.get("passport", "N/A")],
        ["Region", data.get("region", "N/A")],
    ]

    core_table = Table(core_info, colWidths=[4.5 * cm, 13.5 * cm])
    core_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#334155")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("PADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(core_table)
    story.append(Spacer(1, 1 * cm))

    # ── Communication Intercepts ──────────────────────────────────────────────
    phones = data.get("phones", [])
    if phones:
        story.append(Paragraph(
            "Signal Intercept Points (Phones)",
            ParagraphStyle("sh", parent=styles["Heading2"], fontSize=14,
                           textColor=colors.HexColor("#0f172a"), spaceAfter=8),
        ))
        phone_data = [[p] for p in phones]
        phone_table = Table(phone_data, colWidths=[18 * cm])
        phone_table.setStyle(TableStyle([
            ("FONTSIZE", (0, 0), (-1, -1), 11),
            ("FONTNAME", (0, 0), (-1, -1), "Courier-Bold"),
            ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#0369a1")),
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0f9ff")),
            ("PADDING", (0, 0), (-1, -1), 6),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#bae6fd")),
        ]))
        story.append(phone_table)
        story.append(Spacer(1, 1 * cm))

    # ── Geo-Location History ─────────────────────────────────────────────────
    addresses = data.get("addresses", [])
    if addresses:
        story.append(Paragraph(
            "Verified Residence & Mobility History",
            ParagraphStyle("sh", parent=styles["Heading2"], fontSize=14,
                           textColor=colors.HexColor("#0f172a"), spaceAfter=8),
        ))
        
        for idx, addr in enumerate(addresses):
            story.append(Paragraph(
                f"<b>Location {idx+1}:</b>",
                ParagraphStyle("addr_label", parent=styles["Normal"], fontSize=9, textColor=colors.HexColor("#64748b"))
            ))
            story.append(Paragraph(
                addr,
                ParagraphStyle("addr_text", parent=styles["Normal"], fontSize=10, textColor=colors.HexColor("#1e293b"), leftIndent=10, spaceAfter=8)
            ))
        story.append(Spacer(1, 0.5 * cm))

    # ── Raw Intel Source ─────────────────────────────────────────────────────
    if data.get("description") and data.get("description") != "N/A":
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0")))
        story.append(Spacer(1, 0.5 * cm))
        story.append(Paragraph(
            "Source Intelligence Breach Summary",
            ParagraphStyle("sh", parent=styles["Heading3"], fontSize=11, textColor=colors.HexColor("#334155"), spaceAfter=6),
        ))
        story.append(Paragraph(
            data["description"],
            ParagraphStyle("desc", parent=styles["Normal"], fontSize=9, textColor=colors.HexColor("#475569"), leading=12)
        ))

    # ── Footer ─────────────────────────────────────────────────────────────
    story.append(Spacer(1, 2 * cm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1")))
    story.append(Paragraph(
        "CLASSIFIED INFORMATION - CONFIDENTIAL AUDIT REPORT<br/>"
        "This document contains sensitive intelligence data recovered from cellular database leaks. "
        "Unauthorized distribution is strictly prohibited.",
        ParagraphStyle("footer", parent=styles["Normal"], fontSize=8,
                       textColor=colors.HexColor("#94a3b8"), alignment=TA_CENTER),
    ))

    pdf.build(story)
    return output_path
