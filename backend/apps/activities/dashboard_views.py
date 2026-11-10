"""Dashboard aggregations — community-level summaries. No per-member finance."""

from decimal import Decimal

from django.db.models import Sum, Count
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.accounts.permissions import CanReadScoring
from apps.finance.models import FinanceTransaction
from apps.members.models import Member
from apps.organizations.models import Mphakati, Semester

from .models import Activity, ScoringConfiguration
from .scoring import calculate_leaderboard, calculate_score_card


def _current_semester():
    return Semester.objects.filter(is_active=True).first()


def _current_config(semester):
    """Latest config that has actual scored activities."""
    from apps.activities.scoring import calculate_leaderboard
    configs = ScoringConfiguration.objects.filter(semester=semester).order_by("-month")
    for cfg in configs:
        cards = calculate_leaderboard(cfg)
        if any(c.final_score is not None for c in cards):
            return cfg
    return configs.first()


def _mphakati_member_counts(semester):
    rows = (
        Mphakati.objects.filter(is_active=True)
        .annotate(
            member_count=Count(
                "memberships__member",
                filter=__import__("django.db.models", fromlist=["Q"]).Q(
                    memberships__is_current=True,
                    memberships__semester=semester,
                ),
                distinct=True,
            )
        )
    )
    return {r.name: r.member_count for r in rows}


def _finance_aggregate():
    tx = FinanceTransaction.objects.all()
    income = tx.filter(transaction_type__iexact="INCOME").aggregate(
        s=Sum("amount")
    )["s"] or Decimal("0")
    expense = tx.filter(transaction_type__iexact="EXPENSE").aggregate(
        s=Sum("amount")
    )["s"] or Decimal("0")
    return float(income), float(expense)


@api_view(["GET"])
@permission_classes([CanReadScoring])
def overview(request):
    semester = _current_semester()
    if not semester:
        return Response({"detail": "No active semester."}, status=404)

    counts = _mphakati_member_counts(semester)
    total_members = sum(counts.values())

    config = _current_config(semester)
    leaderboard = []
    if config:
        for c in calculate_leaderboard(config):
            leaderboard.append({
                "rank": c.rank,
                "mphakati": c.mphakati_name,
                "score": float(c.final_score) if c.final_score is not None else None,
            })

    income, expense = _finance_aggregate()

    activities_this_month = 0
    if config:
        m = config.month
        activities_this_month = Activity.objects.filter(
            semester=semester,
            date__year=m.year,
            date__month=m.month,
        ).count()

    return Response({
        "semester": str(semester),
        "current_month": config.month.isoformat() if config else None,
        "total_members": total_members,
        "per_mphakati": counts,
        "leaderboard": leaderboard,
        "activities_this_month": activities_this_month,
        "finance_aggregate": {
            "income": income,
            "expense": expense,
            "balance": income - expense,
        },
    })


@api_view(["GET"])
@permission_classes([CanReadScoring])
def mphakati_detail(request, pk):
    semester = _current_semester()
    if not semester:
        return Response({"detail": "No active semester."}, status=404)
    try:
        mph = Mphakati.objects.get(pk=pk, is_active=True)
    except Mphakati.DoesNotExist:
        return Response({"detail": "Mphakati not found."}, status=404)

    config = _current_config(semester)
    if not config:
        return Response({"detail": "No scoring configuration."}, status=404)

    # Build full leaderboard so we know this mphakati's rank
    leaderboard = calculate_leaderboard(config)
    card = next(
        (c for c in leaderboard if c.mphakati_id == mph.id),
        None,
    )
    if card is None:
        card = calculate_score_card(mph, config)
    member_count = Member.objects.filter(
        mphakati_memberships__mphakati=mph,
        mphakati_memberships__is_current=True,
        mphakati_memberships__semester=semester,
        status__iexact="active",
    ).distinct().count()

    # aggregate finance for this mphakati (no member detail)
    tx = FinanceTransaction.objects.filter(mphakati=mph)
    income = tx.filter(transaction_type__iexact="INCOME").aggregate(
        s=Sum("amount")
    )["s"] or Decimal("0")
    expense = tx.filter(transaction_type__iexact="EXPENSE").aggregate(
        s=Sum("amount")
    )["s"] or Decimal("0")

    return Response({
        "mphakati": mph.name,
        "semester": str(semester),
        "current_month": config.month.isoformat(),
        "member_count": member_count,
        "score_card": card.to_dict(),
        "finance_aggregate": {
            "income": float(income),
            "expense": float(expense),
            "balance": float(income - expense),
        },
    })


@api_view(["GET"])
@permission_classes([CanReadScoring])
def current_champion(request):
    semester = _current_semester()
    if not semester:
        return Response({"detail": "No active semester."}, status=404)

    # Walk configs newest → oldest until we find a month with a scored leader
    configs = ScoringConfiguration.objects.filter(semester=semester).order_by("-month")
    chosen = None
    for cfg in configs:
        cards = calculate_leaderboard(cfg)
        top = next((c for c in cards if c.final_score is not None), None)
        if top:
            chosen = (cfg, top, cards)
            break

    if not chosen:
        return Response({"detail": "No scored month available yet."}, status=404)

    cfg, top, cards = chosen

    # "Why are they leading?" — transparent breakdown
    breakdown = [
        {
            "category": cat.category_name,
            "score": float(cat.score) if cat.score is not None else None,
            "weight": float(cat.weight),
            "weighted": float(cat.weighted) if cat.weighted is not None else None,
        }
        for cat in top.categories
    ]

    return Response({
        "month": cfg.month.isoformat(),
        "semester": str(semester),
        "champion": {
            "mphakati": top.mphakati_name,
            "score": float(top.final_score),
            "rank": top.rank,
        },
        "full_ranking": [
            {
                "rank": c.rank,
                "mphakati": c.mphakati_name,
                "score": float(c.final_score) if c.final_score is not None else None,
            }
            for c in cards
        ],
        "why_leading": breakdown,
    })
