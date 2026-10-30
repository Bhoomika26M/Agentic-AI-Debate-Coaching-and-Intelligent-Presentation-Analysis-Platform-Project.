import html
from typing import Any


def _escape_pdf_text(text: str) -> str:
    return (
        str(text)
        .replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
    )


def create_pdf(title: str, sections: list[tuple[str, list[str]]]) -> bytes:
    """Generate a modern, executive PDF-1.4 report with clean typography and layout."""
    # Process lines into tokens: (type, text)
    tokens: list[tuple[str, str]] = []

    for section_title, content_lines in sections:
        tokens.append(("heading", section_title))
        for line in content_lines:
            line_str = str(line)
            is_bullet = line_str.strip().startswith(("•", "*", "-"))
            prefix = "  • " if is_bullet else ""
            clean_line = line_str.strip()
            if is_bullet:
                clean_line = clean_line.lstrip("•*- ").strip()

            words = clean_line.split(" ")
            current = ""
            limit = 72 if is_bullet else 78
            for w in words:
                if len(current) + len(w) + 1 > limit:
                    if is_bullet and current == "":
                        tokens.append(("bullet", prefix + w))
                    elif is_bullet:
                        tokens.append(("bullet" if not tokens or tokens[-1][0] != "bullet" else "bullet_cont", (prefix if not current else "    ") + current))
                        current = w
                    else:
                        tokens.append(("body", current))
                        current = w
                else:
                    current = f"{current} {w}".strip()
            if current:
                if is_bullet:
                    tokens.append(("bullet", prefix + current))
                else:
                    tokens.append(("body", current))
        tokens.append(("space", ""))

    # Paginate by vertical point height
    # Page size: 612 x 792 pt. Top banner: 730 to 765 pt. Content starts at y = 710 down to y = 55.
    max_height = 650  # 710 - 60
    pages_tokens: list[list[tuple[str, str]]] = []
    current_page: list[tuple[str, str]] = []
    current_h = 0

    token_heights = {
        "heading": 28,
        "body": 14,
        "bullet": 14,
        "bullet_cont": 13,
        "space": 10,
    }

    for idx, (ttype, ttext) in enumerate(tokens):
        h = token_heights.get(ttype, 14)
        # Avoid orphan headings at bottom of page
        if ttype == "heading" and current_h + h + 35 > max_height and current_page:
            pages_tokens.append(current_page)
            current_page = [(ttype, ttext)]
            current_h = h
            continue

        if current_h + h > max_height and current_page:
            pages_tokens.append(current_page)
            current_page = [(ttype, ttext)]
            current_h = h
        else:
            current_page.append((ttype, ttext))
            current_h += h

    if current_page or not pages_tokens:
        pages_tokens.append(current_page)

    num_pages = len(pages_tokens)
    objects: list[bytes] = []

    # Obj 1: Catalog
    objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")

    # Obj 2: Pages
    page_ids = [3 + i * 2 for i in range(num_pages)]
    kids_str = " ".join(f"{pid} 0 R" for pid in page_ids)
    objects.append(f"<< /Type /Pages /Kids [{kids_str}] /Count {num_pages} >>".encode())

    # Build each page
    for idx, page_lines in enumerate(pages_tokens):
        page_num = idx + 1
        page_obj_id = 3 + idx * 2
        content_obj_id = page_obj_id + 1

        cmds: list[str] = [
            "q",
            # Top Banner Background: Dark Navy #0F172A
            "0.059 0.090 0.165 rg",
            "40 735 532 35 re f",
            # Purple Accent stripe #6366F1
            "0.388 0.400 0.945 rg",
            "40 735 532 2 re f",
            # Footer line
            "0.886 0.910 0.941 rg",
            "40 45 532 1 re f",
            "Q",
            # Top banner text
            "BT",
            "/F1 13 Tf",
            "1 1 1 rg",
            "52 748 Td",
            f"({_escape_pdf_text(title[:60])}) Tj",
            "/F2 9 Tf",
            "0.8 0.85 0.95 rg",
            "370 0 Td",
            f"(Page {page_num} of {num_pages}) Tj",
            "ET",
            # Footer text
            "BT",
            "/F2 8 Tf",
            "0.5 0.55 0.65 rg",
            "45 32 Td",
            "(DebateAI Intelligence Platform  *  Confidential Educational Report) Tj",
            "ET",
        ]

        # Content text stream
        cmds.append("BT")
        cmds.append("/F2 9.5 Tf")
        cmds.append("0.1 0.12 0.18 rg")  # Dark Slate body text
        cmds.append("50 710 Td")

        for style, line_text in page_lines:
            safe = _escape_pdf_text(line_text)
            if style == "heading":
                cmds.extend([
                    "/F1 11 Tf",
                    "0.25 0.22 0.70 rg",  # Indigo/Purple heading
                    "0 -18 Td",
                    f"({safe.upper()}) Tj",
                    "/F2 9.5 Tf",
                    "0.1 0.12 0.18 rg",
                    "0 -6 Td",
                ])
            elif style == "space":
                cmds.append("0 -8 Td")
            elif style == "bullet":
                cmds.extend([
                    f"({safe}) Tj",
                    "0 -14 Td",
                ])
            elif style == "bullet_cont":
                cmds.extend([
                    f"({safe}) Tj",
                    "0 -13 Td",
                ])
            else:
                cmds.extend([
                    f"({safe}) Tj",
                    "0 -14 Td",
                ])

        cmds.append("ET")
        stream_bytes = "\n".join(cmds).encode("latin-1", errors="replace")

        page_dict = (
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            f"/Contents {content_obj_id} 0 R "
            f"/Resources << /Font << /F1 {3 + num_pages * 2} 0 R /F2 {4 + num_pages * 2} 0 R >> >> >>"
        ).encode()
        objects.append(page_dict)

        content_stream = (
            f"<< /Length {len(stream_bytes)} >>\nstream\n".encode()
            + stream_bytes
            + b"\nendstream"
        )
        objects.append(content_stream)

    # Fonts
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    body = bytearray(b"%PDF-1.4\n")
    offsets = []
    for i, obj in enumerate(objects, 1):
        offsets.append(len(body))
        body.extend(f"{i} 0 obj\n".encode() + obj + b"\nendobj\n")

    startxref = len(body)
    body.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode())
    for offset in offsets:
        body.extend(f"{offset:010d} 00000 n \n".encode())
    body.extend(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{startxref}\n%%EOF".encode())
    return bytes(body)


def create_excel_xml(
    sheet_name: str,
    headers: list[str],
    rows: list[list[Any]],
    col_widths: list[int] | None = None,
) -> str:
    """Generate standard Microsoft Excel SpreadsheetML XML format with column widths & styling."""
    safe_name = html.escape(sheet_name[:31])

    # Default column widths if not supplied
    if not col_widths:
        col_widths = []
        for idx, h in enumerate(headers):
            h_lower = str(h).lower()
            if "turn" in h_lower or "id" in h_lower:
                col_widths.append(50)
            elif "speaker" in h_lower or "author" in h_lower or "file" in h_lower:
                col_widths.append(140)
            elif "position" in h_lower or "status" in h_lower:
                col_widths.append(85)
            elif "content" in h_lower or "transcript" in h_lower or "argument" in h_lower:
                col_widths.append(450)
            elif "time" in h_lower or "date" in h_lower:
                col_widths.append(120)
            elif "score" in h_lower:
                col_widths.append(80)
            else:
                col_widths.append(130)

    xml_parts = [
        '<?xml version="1.0"?>',
        '<?mso-application progid="Excel.Sheet"?>',
        '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"',
        ' xmlns:o="urn:schemas-microsoft-com:office:office"',
        ' xmlns:x="urn:schemas-microsoft-com:office:excel"',
        ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"',
        ' xmlns:html="http://www.w3.org/TR/REC-html40">',
        ' <Styles>',
        '  <Style ss:ID="Header">',
        '   <Font ss:Bold="1" ss:Color="#FFFFFF" ss:FontName="Segoe UI" ss:Size="10"/>',
        '   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>',
        '   <Alignment ss:Vertical="Center" ss:Horizontal="Left"/>',
        '   <Borders>',
        '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#6366F1"/>',
        '   </Borders>',
        '  </Style>',
        '  <Style ss:ID="DataCell">',
        '   <Font ss:Color="#0F172A" ss:FontName="Segoe UI" ss:Size="9.5"/>',
        '   <Alignment ss:Vertical="Top" ss:WrapText="1"/>',
        '   <Borders>',
        '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>',
        '   </Borders>',
        '  </Style>',
        '  <Style ss:ID="DataCellCenter">',
        '   <Font ss:Color="#0F172A" ss:FontName="Segoe UI" ss:Size="9.5"/>',
        '   <Alignment ss:Vertical="Top" ss:Horizontal="Center"/>',
        '   <Borders>',
        '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>',
        '   </Borders>',
        '  </Style>',
        ' </Styles>',
        f' <Worksheet ss:Name="{safe_name}">',
        '  <Table>',
    ]

    for w in col_widths:
        xml_parts.append(f'   <Column ss:Width="{w}"/>')

    xml_parts.append('   <Row ss:StyleID="Header" ss:Height="24">')
    for h in headers:
        xml_parts.append(f'    <Cell><Data ss:Type="String">{html.escape(str(h))}</Data></Cell>')
    xml_parts.append('   </Row>')

    for row in rows:
        xml_parts.append('   <Row ss:Height="20">')
        for idx, item in enumerate(row):
            is_num = isinstance(item, (int, float)) and not isinstance(item, bool)
            style_id = "DataCellCenter" if (is_num or (isinstance(item, str) and len(item) <= 10)) else "DataCell"
            if item is None:
                xml_parts.append(f'    <Cell ss:StyleID="{style_id}"><Data ss:Type="String"></Data></Cell>')
            elif is_num:
                xml_parts.append(f'    <Cell ss:StyleID="{style_id}"><Data ss:Type="Number">{item}</Data></Cell>')
            else:
                xml_parts.append(f'    <Cell ss:StyleID="{style_id}"><Data ss:Type="String">{html.escape(str(item))}</Data></Cell>')
        xml_parts.append('   </Row>')

    xml_parts.extend([
        '  </Table>',
        ' </Worksheet>',
        '</Workbook>',
    ])
    return "\n".join(xml_parts)
