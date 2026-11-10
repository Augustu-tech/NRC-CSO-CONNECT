import pytest
from decimal import Decimal
from datetime import date

from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.organizations.models import (
    AcademicYear, Semester, Mphakati, Affiliate,
)
from apps.members.models import Member, MphakatiMembership
from apps.activities.models import (
    ActivityCategory, Activity, Participation,
    ScoringConfiguration, ScoringRule,
)


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def ay(db):
    return AcademicYear.objects.create(
        name="2026/2027", start_date=date(2026, 9, 1),
        end_date=date(2027, 6, 30), is_active=True,
    )


@pytest.fixture
def sem(ay):
    return Semester.objects.create(
        number=1, start_date=date(2026, 9, 1),
        end_date=date(2026, 12, 18), is_active=True, academic_year=ay,
    )


@pytest.fixture
def mphs(db):
    return {
        "mary": Mphakati.objects.create(name="St. Mary's"),
        "padre": Mphakati.objects.create(name="St. Padre Pio"),
        "joseph": Mphakati.objects.create(name="St. Joseph"),
    }


@pytest.fixture
def members(sem, mphs):
    out = {"mary": [], "padre": [], "joseph": []}
    for key, size in [("mary", 10), ("padre", 5), ("joseph", 6)]:
        for i in range(size):
            m = Member.objects.create(
                student_id=f"{key[0].upper()}{i:03d}",
                first_name=key.title(), middle_name="", last_name=f"T{i}",
                gender="M", status="ACTIVE", date_joined=date(2026, 9, 1),
            )
            MphakatiMembership.objects.create(
                member=m, mphakati=mphs[key], semester=sem,
                start_date=sem.start_date, is_current=True,
            )
            out[key].append(m)
    return out


@pytest.fixture
def cat(db):
    return ActivityCategory.objects.create(
        name="Choir", is_scoreable=True, is_active=True,
    )


@pytest.fixture
def activity(sem, cat):
    return Activity.objects.create(
        title="Choir Rehearsal", date=date(2026, 9, 10),
        semester=sem, category=cat,
        contributes_to_score=True, eligibility_type="ALL",
    )


@pytest.fixture
def config(sem, cat):
    cfg = ScoringConfiguration.objects.create(
        month=date(2026, 9, 1), semester=sem, status="DRAFT",
    )
    ScoringRule.objects.create(
        weight=Decimal("100.00"), category=cat, configuration=cfg,
    )
    return cfg


def _make_user(username, role, member=None):
    u = User.objects.create_user(
        username=username, password="TestPass123!", role=role,
    )
    if member:
        u.member = member
        u.save()
    return u


@pytest.fixture
def user_treasurer(db):
    return _make_user("treasurer_t", "treasurer")


@pytest.fixture
def user_secretary(db):
    return _make_user("secretary_t", "secretary")


@pytest.fixture
def user_patron(db):
    return _make_user("patron_t", "patron")


@pytest.fixture
def user_member(db, members):
    return _make_user("member_t", "member", member=members["mary"][0])


@pytest.fixture
def user_super(db):
    return User.objects.create_superuser(
        username="super_t", password="TestPass123!", email="s@t.test",
    )
