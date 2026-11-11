"""Generate a Finalist Certificate PDF for the farewell dinner."""

import os
from io import BytesIO
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor, white
from reportlab.pdfgen.canvas import Canvas


def _draw_border(c, width, height):
    faith_blue = HexColor("#1e1b4b")
    gold = HexColor("#d4a017")

    c.setStrokeColor(gold)
    c.setLineWidth(5)
    c.rect(1.0 * cm, 1.0 * cm, width - 2.0 * cm, height - 2.0 * cm)
    c.setStrokeColor(faith_blue)
    c.setLineWidth(1.5)
    c.rect(1.5 * cm, 1.5 * cm, width - 3.0 * cm, height - 3.0 * cm)


def build_finalist_certificate(
    *,
    member_name,
    student_id,
    mphakati_name,
    program,
    year_of_study,
    semester_label,
    chaplain_name,
):
    buf = BytesIO()
    size = landscape(A4)
    c = Canvas(buf, pagesize=size)
    w, h = size

    faith_blue = HexColor("#1e1b4b")
    gold = HexColor("#d4a017")
    slate = HexColor("#334155")

    _draw_border(c, w, h)

    # Header background
    header_height = 3.5 * cm
    header_y = h - 1.5 * cm - header_height
    c.setFillColor(faith_blue)
    c.rect(1.5 * cm, header_y, w - 3.0 * cm, header_height, fill=1, stroke=0)
    c.setStrokeColor(gold)
    c.setLineWidth(2)
    c.line(1.5 * cm, header_y, w - 1.5 * cm, header_y)

    # Logo badge
    logo_cx = 4.3 * cm
    logo_cy = header_y + (header_height / 2)
    logo_radius = 1.4 * cm
    c.setFillColor(faith_blue)
    c.setStrokeColor(gold)
    c.setLineWidth(2)
    c.circle(logo_cx, logo_cy, logo_radius, stroke=1, fill=1)

    logo_path = "assets/logo-white.png"
    if os.path.exists(logo_path):
        logo_size = logo_radius * 1.9
        c.drawImage(
            logo_path,
            logo_cx - (logo_size / 2),
            logo_cy - (logo_size / 2),
            width=logo_size,
            height=logo_size,
            preserveAspectRatio=True,
            mask="auto",
        )

    # Header text
    c.setFillColor(white)
    c.setFont("Times-Bold", 22)
    c.drawCentredString(w / 2 + 1.3 * cm, header_y + 2.2 * cm, "NRC CATHOLIC STUDENTS' ORGANIZATION")
    c.setFont("Times-Italic", 12)
    c.setFillColor(gold)
    c.drawCentredString(w / 2 + 1.3 * cm, header_y + 1.3 * cm, "Faith · Community · Service · Excellence")

    # Certificate title
    c.setFillColor(slate)
    c.setFont("Times-Roman", 16)
    c.drawCentredString(w / 2, h - 6.5 * cm, "Certificate of Completion & Farewell")

    c.setFillColor(gold)
    c.setFont("Times-Bold", 34)
    c.drawCentredString(w / 2, h - 7.8 * cm, "FINALIST CERTIFICATE")

    # Presentation text
    c.setFillColor(slate)
    c.setFont("Times-Roman", 14)
    c.drawCentredString(w / 2, h - 9.5 * cm, "This certifies that")

    # Member name
    c.setFillColor(faith_blue)
    c.setFont("Times-Bold", 40)
    c.drawCentredString(w / 2, h - 11.5 * cm, member_name)

    # Details
    c.setFillColor(slate)
    c.setFont("Times-Roman", 13)
    detail_line = f"Student ID: {student_id}  ·  {mphakati_name} Mphakati"
    c.drawCentredString(w / 2, h - 12.8 * cm, detail_line)

    c.setFont("Times-Roman", 13)
    c.drawCentredString(w / 2, h - 13.8 * cm, f"has completed a {program} program (Year {year_of_study})")
    c.drawCentredString(w / 2, h - 14.8 * cm, f"during {semester_label}")

    c.setFillColor(slate)
    c.setFont("Times-Italic", 11)
    c.drawCentredString(
        w / 2,
        h - 16.0 * cm,
        "in recognition of faithful participation in the NRC CSO community and its spiritual,"
    )
    c.drawCentredString(
        w / 2,
        h - 16.6 * cm,
        "social, and service-oriented activities throughout their academic journey."
    )

    # Signature lines
    c.setStrokeColor(slate)
    c.setLineWidth(1)
    sig_y = 4.0 * cm

    # Chaplain (centered, more prominent)
    c.line(w / 2 - 3.5 * cm, sig_y, w / 2 + 3.5 * cm, sig_y)
    c.setFont("Times-Bold", 11)
    c.setFillColor(faith_blue)
    c.drawCentredString(w / 2, sig_y - 0.6 * cm, chaplain_name or "CSO Chaplain")
    c.setFont("Times-Roman", 9)
    c.setFillColor(slate)
    c.drawCentredString(w / 2, sig_y - 1.1 * cm, "CSO Chaplain")

    # Chairperson (left)
    c.line(4 * cm, sig_y, 9 * cm, sig_y)
    c.setFont("Times-Roman", 10)
    c.drawCentredString(6.5 * cm, sig_y - 0.5 * cm, "CSO Chairperson")

    # Secretary (right)
    c.line(w - 9 * cm, sig_y, w - 4 * cm, sig_y)
    c.setFont("Times-Roman", 10)
    c.drawCentredString(w - 6.5 * cm, sig_y - 0.5 * cm, "CSO Secretary")

    # Gold seal (bottom-left, off-center for visual balance)
    seal_cx = 3.5 * cm
    seal_cy = 4.5 * cm
    seal_radius = 1.6 * cm
    c.setFillColor(HexColor("#fdf6e3"))
    c.setStrokeColor(gold)
    c.setLineWidth(2)
    c.circle(seal_cx, seal_cy, seal_radius, stroke=1, fill=1)
    c.setStrokeColor(gold)
    c.setLineWidth(0.5)
    c.circle(seal_cx, seal_cy, seal_radius - 0.2 * cm, stroke=1, fill=0)
    c.setFillColor(gold)
    c.setFont("Times-Bold", 7)
    c.drawCentredString(seal_cx, seal_cy + 0.2 * cm, "NRC CSO")
    c.drawCentredString(seal_cx, seal_cy - 0.2 * cm, "FINALIST")

    c.showPage()
    c.save()
    buf.seek(0)
    return buf
