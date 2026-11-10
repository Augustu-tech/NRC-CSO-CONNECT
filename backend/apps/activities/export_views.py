from datetime import date
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.accounts.permissions import CanReadScoring, CanReadFinanceDetail
from apps.activities.models import ScoringConfiguration
from apps.activities.scoring import calculate_leaderboard
from apps.activities.exports.certificate import build_certificate
from apps.activities.exports.excel import build_monthly_report, build_financial_report
from apps.organizations.models import Semester


@api_view(["GET"])
@permission_classes([CanReadScoring])
def certificate_pdf(request, config_id):
    config = get_object_or_404(ScoringConfiguration, pk=config_id)
    if config.status != "FINALIZED":
        return Response({"detail": "Award certificates can only be generated for FINALIZED months."}, status=400)
    
    cards = calculate_leaderboard(config)
    champion = next((c for c in cards if c.final_score is not None), None)
    if not champion:
        return Response({"detail": "No champion could be determined."}, status=400)

    buf = build_certificate(
        mphakati_name=champion.mphakati_name,
        score=float(champion.final_score),
        month_label=config.month.strftime("%B %Y"),
        semester_label=str(config.semester),
    )
    resp = HttpResponse(buf.getvalue(), content_type="application/pdf")
    resp["Content-Disposition"] = f'attachment; filename="award_{config.month:%Y_%m}.pdf"'
    return resp


@api_view(["GET"])
@permission_classes([CanReadScoring])
def monthly_report_xlsx(request, config_id):
    config = get_object_or_404(ScoringConfiguration, pk=config_id)
    buf = build_monthly_report(config)
    resp = HttpResponse(
        buf.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    resp["Content-Disposition"] = f'attachment; filename="monthly_{config.month:%Y_%m}.xlsx"'
    return resp


@api_view(["GET"])
@permission_classes([CanReadFinanceDetail])
def financial_report_xlsx(request, semester_id, year=None, month=None):
    semester = get_object_or_404(Semester, pk=semester_id)
    
    if year and month:
        report_month = date(int(year), int(month), 1)
        buf = build_financial_report(semester, month=report_month)
        filename = f"financial_{year}_{int(month):02d}.xlsx"
    else:
        buf = build_financial_report(semester)
        filename = f"financial_semester_{semester_id}.xlsx"
        
    resp = HttpResponse(
        buf.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    resp["Content-Disposition"] = f'attachment; filename="{filename}"'
    return resp
