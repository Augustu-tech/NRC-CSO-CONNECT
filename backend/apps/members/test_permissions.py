"""Role-based and object-level permission tests."""
import pytest


@pytest.mark.django_db
def test_unauthenticated_blocked(api):
    r = api.get("/api/finance/finance-transactions/")
    assert r.status_code == 401


@pytest.mark.django_db
def test_treasurer_can_read_finance(api, user_treasurer):
    api.force_authenticate(user_treasurer)
    assert api.get("/api/finance/finance-transactions/").status_code == 200


@pytest.mark.django_db
def test_secretary_blocked_from_finance(api, user_secretary):
    api.force_authenticate(user_secretary)
    assert api.get("/api/finance/finance-transactions/").status_code == 403


@pytest.mark.django_db
def test_member_blocked_from_finance(api, user_member):
    api.force_authenticate(user_member)
    assert api.get("/api/finance/finance-transactions/").status_code == 403


@pytest.mark.django_db
def test_patron_blocked_from_detail(api, user_patron):
    api.force_authenticate(user_patron)
    assert api.get("/api/finance/finance-transactions/").status_code == 403


@pytest.mark.django_db
def test_patron_can_read_summary(api, user_patron):
    api.force_authenticate(user_patron)
    assert api.get("/api/finance/summary/").status_code == 200


@pytest.mark.django_db
def test_member_sees_only_own_participation(
    api, user_member, activity, members
):
    from apps.activities.models import Participation
    for m in members["mary"]:
        Participation.objects.create(
            activity=activity, member=m, status="PRESENT",
            recorded_at=activity.date,
        )
    api.force_authenticate(user_member)
    r = api.get("/api/activities/participation/")
    assert r.status_code == 200
    data = r.json()
    member_ids = {row["member"] for row in data["results"]}
    assert member_ids == {user_member.member_id}


@pytest.mark.django_db
def test_finalize_requires_100_percent(api, user_super, config):
    from apps.activities.models import ScoringRule
    ScoringRule.objects.filter(configuration=config).delete()
    api.force_authenticate(user_super)
    r = api.post(f"/api/activities/scoring-configurations/{config.id}/finalize/")
    assert r.status_code == 400


@pytest.mark.django_db
def test_finalized_config_rejects_rule_create(api, user_super, config):
    from apps.activities.models import ActivityCategory
    api.force_authenticate(user_super)
    api.post(f"/api/activities/scoring-configurations/{config.id}/finalize/")
    cat2 = ActivityCategory.objects.create(
        name="YCS", is_scoreable=True, is_active=True,
    )
    r = api.post("/api/activities/scoring-rules/", {
        "weight": "10.00", "category": cat2.id, "configuration": config.id,
    })
    assert r.status_code == 403


@pytest.mark.django_db
def test_member_self_profile_requires_link(api, user_member, members):
    api.force_authenticate(user_member)
    r = api.get("/api/members/me/profile/")
    assert r.status_code == 200
    assert r.json()["id"] == user_member.member_id


@pytest.mark.django_db
def test_non_linked_user_gets_403(api, user_treasurer):
    api.force_authenticate(user_treasurer)
    r = api.get("/api/members/me/profile/")
    assert r.status_code == 403
