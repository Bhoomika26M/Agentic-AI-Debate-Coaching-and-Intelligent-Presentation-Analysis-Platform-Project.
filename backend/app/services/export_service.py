import os
import io
import openpyxl
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.core.config import settings

class ExportService:
    @staticmethod
    def generate_debate_pdf(debate_data: Dict[str, Any]) -> str:
        filename = f"debate_report_{debate_data.get('id', 'export')}.pdf"
        output_path = os.path.join(settings.UPLOAD_DIR, "exports", filename)

        doc = SimpleDocTemplate(
            output_path,
            pagesize=letter,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40
        )
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            'JustiTalkTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=22,
            textColor=colors.HexColor('#1E242B'),
            spaceAfter=6
        )
        subtitle_style = ParagraphStyle(
            'JustiTalkSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=11,
            textColor=colors.HexColor('#D49B19'),
            spaceAfter=15
        )
        heading2_style = ParagraphStyle(
            'JustiTalkH2',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=14,
            textColor=colors.HexColor('#1E242B'),
            spaceBefore=12,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            'JustiTalkBody',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            textColor=colors.HexColor('#33404D'),
            leading=14
        )

        story = []

        # Header branding
        story.append(Paragraph("JustiTalk - AI Debate & Performance Report", title_style))
        story.append(Paragraph(f"Debate Session #{debate_data.get('id')} | Generated Adjudication Dossier", subtitle_style))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#D49B19'), spaceAfter=15))

        # Meta Table
        meta_data = [
            [Paragraph("<b>Topic:</b>", body_style), Paragraph(str(debate_data.get('topic', 'N/A')), body_style)],
            [Paragraph("<b>Format:</b>", body_style), Paragraph(str(debate_data.get('format', 'AI Debate Simulation')), body_style)],
            [Paragraph("<b>Difficulty:</b>", body_style), Paragraph(str(debate_data.get('difficulty', 'Intermediate')), body_style)],
            [Paragraph("<b>User Stance:</b>", body_style), Paragraph(str(debate_data.get('user_position', 'For')), body_style)],
            [Paragraph("<b>Winner:</b>", body_style), Paragraph(f"<b>{debate_data.get('winner', 'Undecided')}</b>", body_style)]
        ]
        meta_table = Table(meta_data, colWidths=[120, 390])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FAF8F3')),
            ('PADDING', (0,0), (-1,-1), 6),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E0D5')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#EBE5D8')),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 15))

        # Evaluation & Weighted Scores
        eval_data = debate_data.get('evaluation') or {}
        story.append(Paragraph("Adjudication Scoring (Weighted Formula)", heading2_style))
        
        score_rows = [
            ["Dimension", "Weight", "Score / 100"],
            ["Argument Quality", "30%", f"{eval_data.get('argument_quality', 0):.1f}"],
            ["Evidence Usage", "20%", f"{eval_data.get('evidence_usage', 0):.1f}"],
            ["Logical Consistency", "20%", f"{eval_data.get('logical_consistency', 0):.1f}"],
            ["Rebuttal Effectiveness", "15%", f"{eval_data.get('rebuttal_effectiveness', 0):.1f}"],
            ["Communication Skills", "15%", f"{eval_data.get('communication_skills', 0):.1f}"],
            ["Total Weighted Score", "100%", f"{eval_data.get('total_score', 0):.1f} / 100"]
        ]
        score_table = Table(score_rows, colWidths=[230, 100, 180])
        score_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E242B')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#FCF6E5')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E0D5')),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(score_table)
        story.append(Spacer(1, 15))

        # Strengths & Feedback
        if eval_data.get('summary'):
            story.append(Paragraph("Executive Summary", heading2_style))
            story.append(Paragraph(eval_data.get('summary'), body_style))
            story.append(Spacer(1, 10))

        if eval_data.get('strengths'):
            story.append(Paragraph("Key Strengths", heading2_style))
            for s in eval_data.get('strengths', []):
                story.append(Paragraph(f"• {s}", body_style))
            story.append(Spacer(1, 10))

        if eval_data.get('actionable_feedback'):
            story.append(Paragraph("Actionable Improvement Recommendations", heading2_style))
            for f in eval_data.get('actionable_feedback', []):
                story.append(Paragraph(f"• {f}", body_style))
            story.append(Spacer(1, 10))

        # Build PDF
        doc.build(story)
        return output_path

    @staticmethod
    def generate_excel_report(data_list: List[Dict[str, Any]], sheet_name: str = "Debate Analytics") -> str:
        filename = f"report_{sheet_name.lower().replace(' ', '_')}.xlsx"
        output_path = os.path.join(settings.UPLOAD_DIR, "exports", filename)

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = sheet_name[:30]

        if data_list:
            headers = list(data_list[0].keys())
            ws.append(headers)
            for item in data_list:
                ws.append([str(item.get(h, "")) for h in headers])

        wb.save(output_path)
        return output_path

export_service = ExportService()
