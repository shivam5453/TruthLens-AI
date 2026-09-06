import io
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from fastapi import APIRouter, HTTPException, status, Depends, Response
from bson import ObjectId
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable

from .models_auth import SaveAnalysisRequest, SavedAnalysisResponse
from .auth import get_current_user
from .database import analysis_collection, saved_collection

router = APIRouter(prefix="/api/user", tags=["User Workspace"])


# ============================================================
# USER-SPECIFIC ANALYSIS HISTORY
# ============================================================

@router.get("/history")
def get_user_history(current_user: Dict[str, Any] = Depends(get_current_user)):
    if analysis_collection is None:
        return {"success": False, "count": 0, "history": [], "error": "Database unavailable."}

    user_id = current_user["id"]

    try:
        records = list(
            analysis_collection
            .find({"user_id": user_id})
            .sort("created_at", -1)
            .limit(100)
        )

        formatted = []
        for r in records:
            created = r.get("created_at")
            iso_date = created.isoformat() if isinstance(created, datetime) else str(created or "")
            formatted.append({
                "id": str(r["_id"]),
                "_id": str(r["_id"]),
                "title": r.get("title", ""),
                "text": r.get("text", ""),
                "prediction": r.get("prediction", 0),
                "label": r.get("label", "Potentially Fake"),
                "risk_level": r.get("risk_level", "High Risk"),
                "confidence": r.get("confidence", 0.0),
                "created_at": iso_date,
                "evidence_status": (r.get("evidence") or {}).get("status", "none")
            })

        return {
            "success": True,
            "count": len(formatted),
            "history": formatted
        }
    except Exception as e:
        print(f"Error fetching user history: {e}")
        return {"success": False, "count": 0, "history": [], "error": "Failed to fetch your history."}


@router.delete("/history/{item_id}")
def delete_user_history_item(item_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    if analysis_collection is None:
        raise HTTPException(status_code=503, detail="Database unavailable.")

    user_id = current_user["id"]
    filter_q = {"_id": ObjectId(item_id), "user_id": user_id} if ObjectId.is_valid(item_id) else {"_id": item_id, "user_id": user_id}

    res = analysis_collection.delete_one(filter_q)
    if res.deleted_count > 0:
        # Also clean up from saved if present
        if saved_collection is not None:
            saved_collection.delete_many({"user_id": user_id, "analysis_id": item_id})

        return {"success": True, "message": "Record deleted successfully.", "deleted_id": item_id}

    raise HTTPException(status_code=404, detail="Record not found or you do not have permission to delete it.")


# ============================================================
# SAVED / BOOKMARKED ANALYSES
# ============================================================

@router.post("/saved")
def save_analysis(request: SaveAnalysisRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    if saved_collection is None or analysis_collection is None:
        raise HTTPException(status_code=503, detail="Database unavailable.")

    user_id = current_user["id"]
    analysis_id = request.analysis_id

    # Verify analysis exists
    filter_q = {"_id": ObjectId(analysis_id)} if ObjectId.is_valid(analysis_id) else {"_id": analysis_id}
    analysis_doc = analysis_collection.find_one(filter_q)

    if not analysis_doc:
        raise HTTPException(status_code=404, detail="Analysis record not found.")

    # Check if already saved
    existing = saved_collection.find_one({"user_id": user_id, "analysis_id": analysis_id})
    now = datetime.now(timezone.utc)

    if existing:
        saved_collection.update_one(
            {"_id": existing["_id"]},
            {"$set": {"notes": request.notes, "saved_at": now}}
        )
        return {"success": True, "message": "Bookmark updated.", "saved_id": str(existing["_id"])}

    saved_doc = {
        "user_id": user_id,
        "analysis_id": analysis_id,
        "title": analysis_doc.get("title") or "Untitled Story",
        "label": analysis_doc.get("label", "Potentially Fake"),
        "risk_level": analysis_doc.get("risk_level", "High Risk"),
        "confidence": analysis_doc.get("confidence", 0.0),
        "notes": request.notes or "",
        "created_at": analysis_doc.get("created_at"),
        "saved_at": now
    }

    insert_res = saved_collection.insert_one(saved_doc)
    return {"success": True, "message": "Analysis saved to your bookmarks.", "saved_id": str(insert_res.inserted_id)}


@router.get("/saved")
def list_saved_analyses(current_user: Dict[str, Any] = Depends(get_current_user)):
    if saved_collection is None:
        return {"success": False, "count": 0, "saved": []}

    user_id = current_user["id"]
    try:
        records = list(saved_collection.find({"user_id": user_id}).sort("saved_at", -1))
        formatted = []
        for r in records:
            created = r.get("created_at")
            saved_time = r.get("saved_at")
            formatted.append({
                "id": str(r["_id"]),
                "analysis_id": r.get("analysis_id", ""),
                "title": r.get("title", ""),
                "label": r.get("label", "Potentially Fake"),
                "risk_level": r.get("risk_level", "High Risk"),
                "confidence": r.get("confidence", 0.0),
                "notes": r.get("notes", ""),
                "created_at": created.isoformat() if isinstance(created, datetime) else str(created or ""),
                "saved_at": saved_time.isoformat() if isinstance(saved_time, datetime) else str(saved_time or "")
            })

        return {"success": True, "count": len(formatted), "saved": formatted}
    except Exception as e:
        print(f"Error listing saved: {e}")
        return {"success": False, "count": 0, "saved": []}


@router.delete("/saved/{saved_id}")
def delete_saved_analysis(saved_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    if saved_collection is None:
        raise HTTPException(status_code=503, detail="Database unavailable.")

    user_id = current_user["id"]
    filter_q = {"_id": ObjectId(saved_id), "user_id": user_id} if ObjectId.is_valid(saved_id) else {"_id": saved_id, "user_id": user_id}

    res = saved_collection.delete_one(filter_q)
    if res.deleted_count > 0:
        return {"success": True, "message": "Bookmark removed."}

    raise HTTPException(status_code=404, detail="Saved item not found.")


# ============================================================
# REPORT EXPORT (JSON & PDF)
# ============================================================

@router.get("/export/json/{analysis_id}")
def export_analysis_json(analysis_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    if analysis_collection is None:
        raise HTTPException(status_code=503, detail="Database unavailable.")

    filter_q = {"_id": ObjectId(analysis_id)} if ObjectId.is_valid(analysis_id) else {"_id": analysis_id}
    record = analysis_collection.find_one(filter_q)

    if not record:
        raise HTTPException(status_code=404, detail="Analysis record not found.")

    created = record.get("created_at")
    created_str = created.isoformat() if isinstance(created, datetime) else str(created or "")

    return {
        "platform": "TruthLens AI",
        "task": "News Credibility Assessment & Risk Analysis",
        "exported_by": current_user["email"],
        "export_time": datetime.now(timezone.utc).isoformat(),
        "analysis_id": str(record["_id"]),
        "headline": record.get("title", ""),
        "article_text": record.get("text", ""),
        "assessment": record.get("label", ""),
        "risk_level": record.get("risk_level", ""),
        "confidence_score": record.get("confidence", 0.0),
        "explanation": record.get("explanation", ""),
        "recommendation": record.get("recommendation", ""),
        "evidence_summary": record.get("evidence") or {},
        "disclaimer": "TruthLens AI provides an automated assessment based on learned patterns. It does not independently verify facts or guarantee factual truth.",
        "created_at": created_str
    }


@router.get("/export/pdf/{analysis_id}")
def export_analysis_pdf(analysis_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    if analysis_collection is None:
        raise HTTPException(status_code=503, detail="Database unavailable.")

    filter_q = {"_id": ObjectId(analysis_id)} if ObjectId.is_valid(analysis_id) else {"_id": analysis_id}
    record = analysis_collection.find_one(filter_q)

    if not record:
        raise HTTPException(status_code=404, detail="Analysis record not found.")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()

    # Custom styles
    brand_style = ParagraphStyle(
        'BrandStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#3b4cca')
    )

    subtitle_style = ParagraphStyle(
        'SubTitleStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#555555')
    )

    h2_style = ParagraphStyle(
        'H2Style',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor('#111827'),
        spaceBefore=12,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=15,
        textColor=colors.HexColor('#374151')
    )

    disclaimer_style = ParagraphStyle(
        'DisclaimerStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=12,
        textColor=colors.HexColor('#6b7280')
    )

    story = []

    # Header
    story.append(Paragraph("TRUTHLENS AI", brand_style))
    story.append(Paragraph("AI-Powered News Credibility & Risk Analysis Platform", subtitle_style))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#3b4cca'), spaceAfter=14))

    # Metadata table
    created = record.get("created_at")
    created_str = created.strftime("%B %d, %Y - %H:%M UTC") if isinstance(created, datetime) else str(created or "")

    meta_data = [
        [Paragraph("<b>Report Generated:</b>", body_style), Paragraph(datetime.now(timezone.utc).strftime("%B %d, %Y - %H:%M UTC"), body_style)],
        [Paragraph("<b>Analysis Date:</b>", body_style), Paragraph(created_str, body_style)],
        [Paragraph("<b>User Account:</b>", body_style), Paragraph(current_user["email"], body_style)],
    ]
    t_meta = Table(meta_data, colWidths=[130, 400])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f9fafb')),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 14))

    # Content section
    story.append(Paragraph("Evaluated Story Content", h2_style))
    headline = record.get("title") or "Untitled Story"
    story.append(Paragraph(f"<b>Headline:</b> {headline}", body_style))
    story.append(Spacer(1, 4))
    content_text = record.get("text") or "No additional article body submitted."
    truncated_content = content_text[:600] + ("..." if len(content_text) > 600 else "")
    story.append(Paragraph(f"<b>Content Excerpt:</b> {truncated_content}", body_style))
    story.append(Spacer(1, 14))

    # Verdict Card
    story.append(Paragraph("Credibility Assessment Verdict", h2_style))
    label = record.get("label", "Potentially Fake")
    risk = record.get("risk_level", "High Risk")
    conf = record.get("confidence", 0.0)

    verdict_color = colors.HexColor('#059669') if record.get("prediction") == 1 else colors.HexColor('#dc2626')

    verdict_data = [
        [Paragraph("<b>Assessment:</b>", body_style), Paragraph(f"<font color='{verdict_color.hexval()}'><b>{label}</b></font>", body_style)],
        [Paragraph("<b>Risk Rating:</b>", body_style), Paragraph(f"<b>{risk}</b>", body_style)],
        [Paragraph("<b>Confidence Score:</b>", body_style), Paragraph(f"<b>{conf}%</b>", body_style)],
    ]
    t_verdict = Table(verdict_data, colWidths=[130, 400])
    t_verdict.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f3f4f6')),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#d1d5db')),
    ]))
    story.append(t_verdict)
    story.append(Spacer(1, 14))

    # Explanations
    story.append(Paragraph("Detailed Assessment Findings", h2_style))
    exp = record.get("explanation") or "The content presents linguistic patterns evaluated against project benchmark datasets."
    rec = record.get("recommendation") or "Cross-reference claims with reliable independent sources."
    story.append(Paragraph(f"<b>What This Means:</b> {exp}", body_style))
    story.append(Spacer(1, 6))
    story.append(Paragraph(f"<b>Our Recommendation:</b> {rec}", body_style))
    story.append(Spacer(1, 14))

    # Evidence sources if present
    evidence = record.get("evidence") or {}
    items = (evidence.get("items") or evidence.get("sources") or []) if isinstance(evidence, dict) else []
    if items:
        story.append(Paragraph(f"Live Evidence Corroboration ({evidence.get('status', 'related').title()})", h2_style))
        story.append(Paragraph(f"<i>{evidence.get('message', '')}</i>", body_style))
        story.append(Spacer(1, 6))

        for idx, it in enumerate(items[:3], start=1):
            source_p = Paragraph(f"<b>{idx}. {it.get('source_name', 'Source')}:</b> {it.get('title', '')}", body_style)
            story.append(source_p)
            story.append(Spacer(1, 3))

        story.append(Spacer(1, 10))

    # Disclaimer footer
    story.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor('#9ca3af'), spaceAfter=8))
    disclaimer_text = (
        "<b>Responsible Use Disclaimer:</b> TruthLens AI provides an automated credibility assessment "
        "based on statistical machine learning models and real-time news retrieval. It is designed as an "
        "assistive evaluation tool and does not independently prove factual truth, verify physical evidence, "
        "or replace authoritative primary sources."
    )
    story.append(Paragraph(disclaimer_text, disclaimer_style))

    doc.build(story)
    pdf_data = buffer.getvalue()
    buffer.close()

    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=truthlens_report_{analysis_id[:8]}.pdf"
        }
    )
