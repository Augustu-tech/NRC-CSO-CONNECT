"""Scoring engine — math correctness and fairness rules."""
from datetime import date
from decimal import Decimal

import pytest

from apps.activities.models import Activity, Participation, ActivityCategory
from apps.activities.scoring import calculate_score_card
from apps.organizations.models import Affiliate, AffiliateMembership


def _record(activity, members, status="PRESENT"):
    for m in members:
        Participation.objects.create(
            activity=activity, member=m, status=status,
            recorded_at=activity.date,
        )


@pytest.mark.django_db
def test_full_participation_is_100(config, activity, members, mphs):
    _record(activity, members["mary"])
    card = calculate_score_card(mphs["mary"], config)
    assert card.final_score == Decimal("100.00")


@pytest.mark.django_db
def test_partial_participation_is_proportional(config, activity, members, mphs):
    _record(activity, members["mary"][:5])
    card = calculate_score_card(mphs["mary"], config)
    assert card.final_score == Decimal("50.00")


@pytest.mark.django_db
def test_small_mphakati_can_beat_large_mphakati(config, activity, members, mphs):
    _record(activity, members["mary"][:5])
    _record(activity, members["padre"])
    mary = calculate_score_card(mphs["mary"], config)
    padre = calculate_score_card(mphs["padre"], config)
    assert padre.final_score > mary.final_score


@pytest.mark.django_db
def test_excused_members_excluded_from_denominator(config, activity, members, mphs):
    _record(activity, members["mary"][:8])
    _record(activity, members["mary"][8:10], status="EXCUSED")
    card = calculate_score_card(mphs["mary"], config)
    assert card.final_score == Decimal("100.00")


@pytest.mark.django_db
def test_cancelled_activity_is_ignored(config, activity, members, mphs):
    activity.is_cancelled = True
    activity.save()
    _record(activity, members["mary"])
    card = calculate_score_card(mphs["mary"], config)
    assert card.final_score is None


@pytest.mark.django_db
def test_contributes_to_score_false_ignored(config, activity, members, mphs):
    activity.contributes_to_score = False
    activity.save()
    _record(activity, members["mary"])
    card = calculate_score_card(mphs["mary"], config)
    assert card.final_score is None


@pytest.mark.django_db
def test_affiliate_eligibility_limits_denominator(
    config, sem, members, mphs, cat
):
    choir = Affiliate.objects.create(name="Choir")
    for m in members["mary"][:2]:
        AffiliateMembership.objects.create(
            member=m, affiliate=choir, semester=sem,
            start_date=sem.start_date, is_active=True,
        )

    act = Activity.objects.create(
        title="Choir Service", date=date(2026, 9, 15),
        semester=sem, category=cat,
        contributes_to_score=True,
        eligibility_type="AFFILIATE",
    )
    act.eligible_affiliates.add(choir)
    _record(act, members["mary"][:2])

    card = calculate_score_card(mphs["mary"], config)
    assert card.final_score == Decimal("100.00")
