"""Generate the Mphakati-of-the-Month award certificate as PDF."""

import os
from io import BytesIO

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor, white
from reportlab.pdfgen.canvas import Canvas


def _draw_border(c, width, height):
    """Elegant double border: Thick gold outer, thin blue inner."""
    faith_blue = HexColor("#1e1b4b")
    gold = HexColor("#d4a017")
    
    # Outer Gold Border
    c.setStrokeColor(gold)
    c.setLineWidth(4)
    c.rect(1.0 * cm, 1.0 * cm, width - 2.0 * cm, height - 2.0 * cm)
    
    # Inner Blue Border
    c.setStrokeColor(faith_blue)
    c.setLineWidth(1.5)
    c.rect(1.4 * cm, 1.4 * cm, width - 2.8 * cm, height - 2.8 * cm)


def build_certificate(*, mphakati_name, score, month_label, semester_label):
    buf = BytesIO()
    size = landscape(A4)
    c = Canvas(buf, pagesize=size)
    w, h = size

    faith_blue = HexColor("#1e1b4b")
    gold = HexColor("#d4a017")
    slate = HexColor("#334155")
    
    # 1. Draw Borders
    _draw_border(c, w, h)

    # 2. Header Background Ribbon
    header_height = 4.0 * cm
    header_y = h - 1.4 * cm - header_height
    c.setFillColor(faith_blue)
    c.rect(1.4 * cm, header_y, w - 2.8 * cm, header_height, fill=1, stroke=0)
    
    # Gold separator line under header
    c.setStrokeColor(gold)
    c.setLineWidth(2)
    c.line(1.4 * cm, header_y, w - 1.4 * cm, header_y)

    # 3. Seamless Logo Badge
    # Center of the logo circle
    logo_cx = 4.5 * cm
    logo_cy = header_y + (header_height / 2)
    logo_radius = 1.6 * cm
    
    # Draw the dark blue circle (matches header, avoiding distinct margin)
    c.setFillColor(faith_blue)
    c.setStrokeColor(gold)
    c.setLineWidth(2)
    c.circle(logo_cx, logo_cy, logo_radius, stroke=1, fill=1)
    
    # Draw the white logo inside the circle
    logo_path = "assets/logo-white.png"
    if os.path.exists(logo_path):
        logo_size = logo_radius * 1.9
        c.drawImage(
            logo_path, 
            logo_cx - (logo_size/2), 
            logo_cy - (logo_size/2), 
            width=logo_size, 
            height=logo_size, 
            preserveAspectRatio=True, 
            mask='auto'
        )

    # 4. Header Typography (Shifted right to balance logo)
    c.setFillColor(white)
    c.setFont("Times-Bold", 24)
    c.drawCentredString(w / 2 + 1.5 * cm, header_y + 2.4 * cm, "NRC CATHOLIC STUDENTS' ORGANIZATION")
    c.setFont("Times-Italic", 14)
    c.setFillColor(gold)
    c.drawCentredString(w / 2 + 1.5 * cm, header_y + 1.4 * cm, "Faith · Community · Service · Excellence")

    # 5. Certificate Title
    c.setFillColor(slate)
    c.setFont("Times-Roman", 18)
    c.drawCentredString(w / 2, h - 7.5 * cm, "This certificate is proudly presented to")

    c.setFillColor(gold)
    c.setFont("Times-Bold", 38)
    c.drawCentredString(w / 2, h - 8.8 * cm, "MPHAKATI OF THE MONTH")

    # 6. Winner Name
    c.setFillColor(faith_blue)
    c.setFont("Times-Bold", 48)
    c.drawCentredString(w / 2, h - 11.0 * cm, mphakati_name)

    # 7. Details
    c.setFillColor(slate)
    c.setFont("Times-Roman", 16)
    c.drawCentredString(w / 2, h - 12.8 * cm, f"for demonstrating outstanding participation and service during {month_label}")
    
    # 8. Score Badge (Centered below name)
    score_y = h - 15.0 * cm
    c.setFillColor(gold)
    c.setFont("Times-Bold", 24)
    c.drawCentredString(w / 2, score_y, f"Achieving a Final Score of {score:.2f}%")

    # 9. Signature Lines
    c.setStrokeColor(slate)
    c.setLineWidth(1)
    sig_y = 3.8 * cm
    
    # Chairperson
    c.line(5 * cm, sig_y, 10 * cm, sig_y)
    c.setFont("Times-Roman", 11)
    c.drawCentredString(7.5 * cm, sig_y - 0.5 * cm, "CSO Chairperson")
    
    # Secretary
    c.line(w/2 - 2.5 * cm, sig_y, w/2 + 2.5 * cm, sig_y)
    c.drawCentredString(w / 2, sig_y - 0.5 * cm, "CSO Secretary")
    
    # Treasurer
    c.line(w - 10 * cm, sig_y, w - 5 * cm, sig_y)
    c.drawCentredString(w - 7.5 * cm, sig_y - 0.5 * cm, "CSO Treasurer")

    # 10. Official Gold Seal (Bottom Right corner, above border)
    seal_cx = w - 3.5 * cm
    seal_cy = 4.5 * cm
    seal_radius = 1.8 * cm
    c.setFillColor(HexColor("#fdf6e3")) # Soft gold tint
    c.setStrokeColor(gold)
    c.setLineWidth(2)
    c.circle(seal_cx, seal_cy, seal_radius, stroke=1, fill=1)
    c.setStrokeColor(gold)
    c.setLineWidth(0.5)
    c.circle(seal_cx, seal_cy, seal_radius - 0.2*cm, stroke=1, fill=0)
    c.setFillColor(gold)
    c.setFont("Times-Bold", 8)
    c.drawCentredString(seal_cx, seal_cy + 0.2*cm, "OFFICIAL")
    c.drawCentredString(seal_cx, seal_cy - 0.2*cm, "AWARD")
    
    # Date on seal
    c.setFont("Times-Roman", 7)
    c.drawCentredString(seal_cx, seal_cy - 0.6*cm, semester_label)

    c.showPage()
    c.save()
    buf.seek(0)
    return buf
