"""Aggregate-only finance summary — no per-member detail."""

from decimal import Decimal

from django.db.models import Sum
from django.db.models.functions import TruncMonth
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.accounts.permissions import CanReadFinanceAggregate
from apps.organizations.models import Mphakati

from .models import FinanceTransaction


@api_view(["GET"])
@permission_classes([CanReadFinanceAggregate])
def finance_summary(request):
    tx = FinanceTransaction.objects.all()

    total_income = tx.filter(transaction_type__iexact="INCOME").aggregate(
        s=Sum("amount")
    )["s"] or Decimal("0")
    total_expense = tx.filter(transaction_type__iexact="EXPENSE").aggregate(
        s=Sum("amount")
    )["s"] or Decimal("0")

    by_source = {}
    for row in tx.values("source_type").annotate(s=Sum("amount")):
        by_source[row["source_type"]] = float(row["s"] or 0)

    by_mphakati = []
    for m in Mphakati.objects.filter(is_active=True):
        rows = tx.filter(mphakati=m)
        income = rows.filter(transaction_type__iexact="INCOME").aggregate(
            s=Sum("amount")
        )["s"] or Decimal("0")
        expense = rows.filter(transaction_type__iexact="EXPENSE").aggregate(
            s=Sum("amount")
        )["s"] or Decimal("0")
        by_mphakati.append({
            "mphakati": m.name,
            "income": float(income),
            "expense": float(expense),
            "net": float(income - expense),
        })

    by_month = []
    for row in (
        tx.annotate(month=TruncMonth("transaction_date"))
        .values("month")
        .annotate(s=Sum("amount"))
        .order_by("month")
    ):
        by_month.append({
            "month": row["month"].isoformat() if row["month"] else None,
            "total": float(row["s"] or 0),
        })

    return Response({
        "totals": {
            "income": float(total_income),
            "expense": float(total_expense),
            "balance": float(total_income - total_expense),
        },
        "by_source": by_source,
        "by_mphakati": by_mphakati,
        "by_month": by_month,
    })
