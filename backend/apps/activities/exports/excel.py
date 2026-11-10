from io import BytesIO
from decimal import Decimal
from datetime import date
import xlsxwriter
from django.db.models import Sum

from apps.finance.models import FinanceTransaction
from apps.organizations.models import Mphakati
from apps.activities.models import Activity
from apps.activities.scoring import calculate_leaderboard
from apps.members.models import Member

def _sheet_header(wb, ws, title, subtitle=None):
    title_fmt = wb.add_format({
        "bold": True, "font_size": 14, "font_color": "#ffffff", "bg_color": "#1e1b4b",
        "align": "center", "valign": "vcenter",
    })
    sub_fmt = wb.add_format({
        "italic": True, "font_size": 10, "align": "center", "font_color": "#475569",
    })
    ws.merge_range(0, 0, 0, 6, title, title_fmt)
    ws.set_row(0, 28)
    if subtitle:
        ws.merge_range(1, 0, 1, 6, subtitle, sub_fmt)
        ws.set_row(1, 18)

def build_monthly_report(config):
    buf = BytesIO()
    wb = xlsxwriter.Workbook(buf, {"in_memory": True})
    ws = wb.add_worksheet("Performance")

    _sheet_header(
        wb, ws,
        "NRC CSO — Monthly Mphakati Performance",
        f"{config.month.strftime('%B %Y')} · {config.semester} · status: {config.status}",
    )

    header_fmt = wb.add_format({
        "bold": True, "bg_color": "#e2e8f0", "border": 1, "align": "center",
    })
    cell_fmt = wb.add_format({"border": 1})
    pct_fmt = wb.add_format({"border": 1, "num_format": '0.00"%"'})

    row = 3
    ws.write(row, 0, "Rank", header_fmt)
    ws.write(row, 1, "Mphakati", header_fmt)
    ws.write(row, 2, "Final %", header_fmt)

    cards = calculate_leaderboard(config)
    category_names = [c.category_name for c in cards[0].categories] if cards else []

    col = 3
    for cat_name in category_names:
        ws.write(row, col, cat_name, header_fmt)
        col += 1

    for c in cards:
        row += 1
        ws.write(row, 0, c.rank, cell_fmt)
        ws.write(row, 1, c.mphakati_name, cell_fmt)
        ws.write(row, 2, float(c.final_score) if c.final_score is not None else "N/A", pct_fmt)
        for i, cat in enumerate(c.categories):
            ws.write(row, 3 + i,
                     float(cat.score) if cat.score is not None else "N/A",
                     pct_fmt)

    ws.set_column(0, 0, 6)
    ws.set_column(1, 1, 22)
    ws.set_column(2, 2, 10)
    ws.set_column(3, 3 + max(len(category_names), 1), 14)

    ws2 = wb.add_worksheet("Members")
    _sheet_header(wb, ws2, "Member participation summary", str(config.semester))
    ws2.write(3, 0, "Name", header_fmt)
    ws2.write(3, 1, "Student ID", header_fmt)
    ws2.write(3, 2, "Mphakati", header_fmt)
    ws2.write(3, 3, "Status", header_fmt)

    ws2.set_column(0, 0, 28)
    ws2.set_column(1, 1, 16)
    ws2.set_column(2, 2, 18)
    ws2.set_column(3, 3, 12)

    r = 3
    members = Member.objects.filter(
        mphakati_memberships__semester=config.semester,
        mphakati_memberships__is_current=True,
    ).distinct().order_by("last_name")
    for m in members:
        mship = m.mphakati_memberships.filter(
            is_current=True, semester=config.semester
        ).first()
        r += 1
        ws2.write(r, 0, f"{m.first_name} {m.last_name}", cell_fmt)
        ws2.write(r, 1, m.student_id, cell_fmt)
        ws2.write(r, 2, mship.mphakati.name if mship else "", cell_fmt)
        ws2.write(r, 3, m.status, cell_fmt)

    wb.close()
    buf.seek(0)
    return buf

def build_financial_report(semester, month=None):
    buf = BytesIO()
    wb = xlsxwriter.Workbook(buf, {"in_memory": True})
    ws = wb.add_worksheet("Summary")

    label = f"{semester} · {month.strftime('%B %Y')}" if month else str(semester)
    
    _sheet_header(
        wb, ws,
        "NRC CSO — Financial Summary",
        f"{label} · generated from live records",
    )

    header_fmt = wb.add_format({
        "bold": True, "bg_color": "#e2e8f0", "border": 1, "align": "center",
    })
    money_fmt = wb.add_format({"border": 1, "num_format": '"K"#,##0.00'})

    tx = FinanceTransaction.objects.filter(semester=semester)
    
    if month:
        tx = tx.filter(
            transaction_date__year=month.year, 
            transaction_date__month=month.month
        )

    income = tx.filter(transaction_type__iexact="INCOME").aggregate(s=Sum("amount"))["s"] or Decimal("0")
    expense = tx.filter(transaction_type__iexact="EXPENSE").aggregate(s=Sum("amount"))["s"] or Decimal("0")

    ws.write(3, 0, "Income", header_fmt)
    ws.write(3, 1, float(income), money_fmt)
    ws.write(4, 0, "Expense", header_fmt)
    ws.write(4, 1, float(expense), money_fmt)
    ws.write(5, 0, "Balance", header_fmt)
    ws.write(5, 1, float(income - expense), money_fmt)

    ws.write(7, 0, "Source", header_fmt)
    ws.write(7, 1, "Total", header_fmt)
    r = 7
    for row in tx.values("source_type").annotate(s=Sum("amount")):
        r += 1
        ws.write(r, 0, row["source_type"] or "UNKNOWN")
        ws.write(r, 1, float(row["s"] or 0), money_fmt)

    ws.write(7, 3, "Mphakati", header_fmt)
    ws.write(7, 4, "Income", header_fmt)
    ws.write(7, 5, "Expense", header_fmt)
    ws.write(7, 6, "Net", header_fmt)
    r = 7
    for m in Mphakati.objects.filter(is_active=True):
        mrow = tx.filter(mphakati=m)
        mi = mrow.filter(transaction_type__iexact="INCOME").aggregate(s=Sum("amount"))["s"] or Decimal("0")
        me = mrow.filter(transaction_type__iexact="EXPENSE").aggregate(s=Sum("amount"))["s"] or Decimal("0")
        r += 1
        ws.write(r, 3, m.name)
        ws.write(r, 4, float(mi), money_fmt)
        ws.write(r, 5, float(me), money_fmt)
        ws.write(r, 6, float(mi - me), money_fmt)

    ws.set_column(0, 0, 22)
    ws.set_column(1, 1, 16)
    ws.set_column(3, 3, 18)
    ws.set_column(4, 6, 14)

    ws2 = wb.add_worksheet("Transactions")
    _sheet_header(wb, ws2, "Transactions", label)
    headers = ["Date", "Type", "Category", "Description", "Amount", "Source", "Donor/Project"]
    for i, h in enumerate(headers):
        ws2.write(3, i, h, header_fmt)
    
    ws2.set_column(0, 0, 12)
    ws2.set_column(1, 1, 10)
    ws2.set_column(2, 2, 24)
    ws2.set_column(3, 3, 40)
    ws2.set_column(4, 4, 14)
    ws2.set_column(5, 5, 14)
    ws2.set_column(6, 6, 24)

    r = 3
    for t in tx.order_by("-transaction_date"):
        r += 1
        ws2.write(r, 0, t.transaction_date.isoformat())
        ws2.write(r, 1, t.transaction_type)
        ws2.write(r, 2, t.category.name)
        ws2.write(r, 3, t.description)
        ws2.write(r, 4, float(t.amount), money_fmt)
        ws2.write(r, 5, t.source_type)
        ws2.write(r, 6, t.donor_name or t.project_name or "")

    wb.close()
    buf.seek(0)
    return buf
