"""
NRC CSO CONNECT — Mphakati Scoring Engine

Pure calculation. No DB writes. Call:
  calculate_score_card(mphakati, config)    -> one mphakati
  calculate_leaderboard(config)             -> all, ranked
"""

from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional

from django.db.models import Q

from apps.activities.models import (
    Activity,
    Participation,
    ScoringRule,
)
from apps.members.models import Member
from apps.organizations.models import Mphakati


PRESENT_STATUSES = frozenset({s.upper() for s in {
    "present", "late", "participated", "served", "contributed",
}})
EXCUSED_STATUSES = frozenset({"EXCUSED"})


@dataclass
class CategoryBreakdown:
    category_id: int
    category_name: str
    weight: Decimal
    score: Optional[Decimal]
    weighted: Optional[Decimal]
    activity_count: int
    note: str = ""


@dataclass
class MphakatiScoreCard:
    mphakati_id: int
    mphakati_name: str
    categories: list = field(default_factory=list)
    final_score: Optional[Decimal] = None
    rank: int = 0
    total_weight: Decimal = Decimal("0")
    scored_weight: Decimal = Decimal("0")

    def to_dict(self):
        return {
            "mphakati_id": self.mphakati_id,
            "mphakati_name": self.mphakati_name,
            "final_score": float(self.final_score) if self.final_score is not None else None,
            "rank": self.rank,
            "total_weight": float(self.total_weight),
            "scored_weight": float(self.scored_weight),
            "categories": [
                {
                    "category_id": c.category_id,
                    "category": c.category_name,
                    "weight": float(c.weight),
                    "score": float(c.score) if c.score is not None else None,
                    "weighted": float(c.weighted) if c.weighted is not None else None,
                    "activities": c.activity_count,
                    "note": c.note,
                }
                for c in self.categories
            ],
        }


def _month_range(month):
    first = month.replace(day=1)
    if first.month == 12:
        nxt = first.replace(year=first.year + 1, month=1, day=1)
    else:
        nxt = first.replace(month=first.month + 1, day=1)
    return first, nxt - timedelta(days=1)


def _eligible_members(mphakati, semester):
    return Member.objects.filter(
        mphakati_memberships__mphakati=mphakati,
        mphakati_memberships__semester=semester,
        mphakati_memberships__is_current=True,
        status__iexact="active",
    ).distinct()


def _activity_eligible_ids(activity, mphakati, semester):
    """Member IDs of `mphakati` who are eligible for this specific activity."""
    from apps.organizations.models import AffiliateMembership

    base_ids = set(
        _eligible_members(mphakati, semester).values_list("id", flat=True)
    )
    if activity.eligibility_type == "AFFILIATE":
        aff_ids = list(activity.eligible_affiliates.values_list("id", flat=True))
        if not aff_ids:
            return set()
        in_aff = set(
            AffiliateMembership.objects.filter(
                affiliate_id__in=aff_ids,
                is_active=True,
                semester=semester,
            ).values_list("member_id", flat=True)
        )
        base_ids = base_ids & in_aff
    return base_ids


def _activity_participation(activity, eligible_ids):
    if activity.is_cancelled:
        return None, None
    if not eligible_ids:
        return 0, 0
    parts = Participation.objects.filter(activity=activity, member_id__in=eligible_ids)
    present = set(parts.filter(status__in=PRESENT_STATUSES).values_list("member_id", flat=True))
    excused = set(parts.filter(status__in=EXCUSED_STATUSES).values_list("member_id", flat=True))
    denom = set(eligible_ids) - excused
    if not denom:
        return 0, 0
    return len(present), len(denom)


def _category_score(category, mphakati, semester, start, end):
    if not category.is_scoreable:
        return None, 0, "Category marked not scoreable"

    acts = Activity.objects.filter(
        category=category,
        semester=semester,
        is_cancelled=False,
        contributes_to_score=True,
        date__gte=start,
        date__lte=end,
    ).filter(Q(mphakati__isnull=True) | Q(mphakati_id=mphakati.id))

    percents = []
    for act in acts:
        eligible_ids = _activity_eligible_ids(act, mphakati, semester)
        if not eligible_ids:
            continue
        present, denom = _activity_participation(act, eligible_ids)
        if present is None or denom == 0:
            continue
        percents.append(Decimal(present) / Decimal(denom) * Decimal(100))

    if not percents:
        return None, 0, "No eligible activities this month"

    avg = (sum(percents) / Decimal(len(percents))).quantize(Decimal("0.01"))
    return avg, len(percents), f"{len(percents)} activity(ies)"


def calculate_score_card(mphakati, config):
    start, end = _month_range(config.month)
    rules = ScoringRule.objects.filter(configuration=config).select_related("category")

    card = MphakatiScoreCard(mphakati_id=mphakati.id, mphakati_name=mphakati.name)
    total_weighted = Decimal("0")

    for rule in rules:
        score, n, note = _category_score(rule.category, mphakati, config.semester, start, end)
        weight = rule.weight
        card.total_weight += weight

        if score is None:
            weighted = None
        else:
            weighted = (score * weight / Decimal(100)).quantize(Decimal("0.01"))
            total_weighted += weighted
            card.scored_weight += weight

        card.categories.append(
            CategoryBreakdown(
                category_id=rule.category.id,
                category_name=rule.category.name,
                weight=weight,
                score=score,
                weighted=weighted,
                activity_count=n,
                note=note,
            )
        )

    if card.scored_weight > 0:
        card.final_score = (total_weighted / card.scored_weight * Decimal(100)).quantize(Decimal("0.01"))

    return card


def calculate_leaderboard(config):
    cards = [calculate_score_card(m, config) for m in Mphakati.objects.filter(is_active=True)]
    cards.sort(key=lambda c: (c.final_score is None, -(c.final_score or Decimal(0))))
    for i, card in enumerate(cards, 1):
        card.rank = i
    return cards
