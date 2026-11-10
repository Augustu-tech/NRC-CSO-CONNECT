"""Self-service endpoints — a member sees only their own data."""

from decimal import Decimal
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.activities.models import Participation, ScoringConfiguration
from apps.activities.scoring import calculate_leaderboard
from apps.finance.models import FinanceTransaction
from apps.organizations.models import Mphakati

from .models import Member, MphakatiMembership
from .serializers import MemberSerializer


def _get_member_or_403(request):
    member_id = getattr(request.user, "member_id", None)
    if not member_id:
        return None, Response(
            {"detail": "This account is not linked to a member profile."},
            status=status.HTTP_403_FORBIDDEN,
        )
    try:
        return Member.objects.get(pk=member_id), None
    except Member.DoesNotExist:
        return None, Response(
            {"detail": "Member profile not found."},
            status=status.HTTP_404_NOT_FOUND,
        )


def _current_membership(member):
    return (
        MphakatiMembership.objects
        .filter(member=member, is_current=True)
        .select_related("mphakati", "semester")
        .order_by("-start_date")
        .first()
    )


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def my_profile(request):
    member, err = _get_member_or_403(request)
    if err:
        return err
        
    if request.method == "PATCH":
        # Allow updating only non-critical fields
        allowed_fields = ["phone", "email"]
        for field in allowed_fields:
            if field in request.data:
                setattr(member, field, request.data[field])
        member.save(update_fields=["phone", "email", "updated_at"])
        
    data = MemberSerializer(member).data
    membership = _current_membership(member)
    data["current_mphakati"] = (
        {"id": membership.mphakati.id, "name": membership.mphakati.name}
        if membership else None
    )
    data["current_semester"] = (
        {"id": membership.semester.id, "label": str(membership.semester)}
        if membership else None
    )
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_participation(request):
    member, err = _get_member_or_403(request)
    if err:
        return err

    rows = (
        Participation.objects
        .filter(member=member)
        .select_related("activity", "activity__category")
        .order_by("-activity__date")
    )
    total = rows.count()
    present = rows.filter(status__in=["PRESENT", "LATE", "PARTICIPATED", "SERVED", "CONTRIBUTED"]).count()
    excused = rows.filter(status="EXCUSED").count()
    absent = rows.filter(status="ABSENT").count()
    denom = max(total - excused, 1)
    rate = round((present / denom) * 100, 2) if total else 0.0

    history = [
        {
            "activity_id": r.activity_id,
            "title": r.activity.title,
            "date": r.activity.date.isoformat(),
            "category": r.activity.category.name,
            "status": r.status,
        }
        for r in rows[:100]
    ]
    return Response({
        "total_records": total,
        "present": present,
        "excused": excused,
        "absent": absent,
        "participation_rate": rate,
        "history": history,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_contributions(request):
    member, err = _get_member_or_403(request)
    if err:
        return err

    rows = (
        FinanceTransaction.objects
        .filter(member=member)
        .select_related("category", "semester")
        .order_by("-transaction_date")
    )

    total_income = Decimal("0")
    history = []
    for r in rows:
        if r.transaction_type.upper() == "INCOME":
            total_income += r.amount
        history.append({
            "id": r.id,
            "date": r.transaction_date.isoformat(),
            "type": r.transaction_type,
            "category": r.category.name,
            "amount": float(r.amount),
            "reference": r.reference_number,
            "approval_status": r.approval_status,
        })

    return Response({
        "total_contributed": float(total_income),
        "record_count": rows.count(),
        "history": history,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_rank(request):
    member, err = _get_member_or_403(request)
    if err:
        return err

    membership = _current_membership(member)
    if not membership:
        return Response({"detail": "No active mphakati membership."}, status=404)

    configs = (
        ScoringConfiguration.objects
        .filter(semester=membership.semester)
        .order_by("-month")
    )
    if not configs.exists():
        return Response({"detail": "No scoring configuration for this semester."}, status=404)

    chosen = None
    for cfg in configs:
        cards = calculate_leaderboard(cfg)
        my_card = next(
            (c for c in cards if c.mphakati_id == membership.mphakati_id),
            None,
        )
        if my_card and my_card.final_score is not None:
            chosen = (cfg, my_card, cards)
            break

    if not chosen:
        return Response(
            {"detail": "No scored month available yet for this semester."},
            status=404,
        )

    cfg, my_card, cards = chosen
    return Response({
        "semester": str(membership.semester),
        "month": cfg.month.isoformat(),
        "mphakati": membership.mphakati.name,
        "rank": my_card.rank,
        "final_score": float(my_card.final_score),
        "out_of": len(cards),
    })
