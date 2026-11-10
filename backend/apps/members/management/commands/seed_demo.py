import random
from datetime import date
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.organizations.models import Mphakati, Semester, Affiliate
from apps.members.models import Member, MphakatiMembership
from apps.activities.models import Activity, ActivityCategory, Participation
from apps.finance.models import FinanceCategory, FinanceTransaction
from apps.accounts.models import User

random.seed(42)

FIRST = ["Chisomo","Tadala","Mphatso","Yamikani","Tawonga","Alinafe","Limbani","Madalitso",
         "Thoko","Kelvin","Grace","Blessings","Precious","Faith","Emmanuel","Ruth","Isaac",
         "Memory","Gift","Isaac","Lucy","Peter","Mary","Joseph","Martha","Daniel","Agnes",
         "Francis","Teresa","Patrick","Cecilia","Vincent","Rita","George","Beatrice"]
LAST = ["Banda","Phiri","Mwale","Tembo","Chirwa","Zulu","Kachale","Mhango","Nkhoma","Kumwenda",
        "Gondwe","Msiska","Sibande","Chikuni","Ndlovu","Moyo","Daka","Jere","Lungu","Sakala"]
PROGRAMS = ["Computer Science","Nursing","Education","Business","Engineering","Law","Medicine","Agriculture"]


class Command(BaseCommand):
    help = "Seed realistic demo data for NRC CSO CONNECT"

    @transaction.atomic
    def handle(self, *args, **opts):
        sem = Semester.objects.filter(is_active=True).first()
        if not sem:
            self.stderr.write("No active semester — abort.")
            return

        # Ensure the 3 real miphakati exist and are active
        for name in ["St. Mary's", "St. Padre Pio", "St. Joseph"]:
            Mphakati.objects.update_or_create(
                name=name, defaults={"is_active": True, "description": f"{name} Mphakati"}
            )
        Mphakati.objects.filter(name="RBAC Test Mphakati").update(is_active=False)

        # Ensure affiliates
        for name in ["Choir", "YCS", "Charismatic", "Drama Group"]:
            Affiliate.objects.get_or_create(
                name=name, defaults={"is_active": True, "description": f"{name} affiliate"}
            )

        mphs = list(Mphakati.objects.filter(name__in=["St. Mary's","St. Padre Pio","St. Joseph"]))
        admin = User.objects.filter(is_superuser=True).first()

        # --- MEMBERS: 21 per mphakati = 63 total ---
        created = 0
        for i in range(63):
            mph = mphs[i % 3]
            sid = f"NRC{2500+i:04d}"
            if Member.objects.filter(student_id=sid).exists():
                continue
            m = Member.objects.create(
                student_id=sid,
                first_name=random.choice(FIRST),
                middle_name="",
                last_name=random.choice(LAST),
                gender=random.choice("MF"),
                phone=f"0999{random.randint(100000,999999)}",
                email=f"{sid.lower()}@nrc.ac.mw",
                date_joined=date(2026, 9, 1),
                status="ACTIVE",
            )
            MphakatiMembership.objects.create(
                member=m, mphakati=mph, semester=sem,
                start_date=sem.start_date, is_current=True,
            )
            created += 1
        self.stdout.write(f"Members created: {created}")

        # --- ACTIVITIES: fill every category for Sept + Oct ---
        cats = {c.name: c for c in ActivityCategory.objects.all()}
        for cname in ["YCS", "Thanksgiving Novena", "Drama Group", "Charismatic", "Other CSO Activities"]:
            if cname not in cats:
                c, _ = ActivityCategory.objects.get_or_create(
                    name=cname, defaults={"is_scoreable": True, "is_active": True}
                )
                cats[cname] = c

        plans = [
            ("Tuesday Mass",     date(2026, 9, 8),  "Tuesday Mass"),
            ("Tuesday Mass",     date(2026, 9, 15), "Tuesday Mass"),
            ("Tuesday Mass",     date(2026, 9, 22), "Tuesday Mass"),
            ("Choir",            date(2026, 9, 10), "Choir Rehearsal"),
            ("Choir",            date(2026, 9, 17), "Choir Rehearsal"),
            ("Choir",            date(2026, 9, 24), "Choir Service"),
            ("Thanksgiving Novena", date(2026, 9, 12), "Novena Day 1"),
            ("YCS",              date(2026, 9, 14), "YCS Meeting"),
            ("Drama Group",      date(2026, 9, 19), "Drama Rehearsal"),
            ("Charismatic",      date(2026, 9, 21), "Prayer Meeting"),
            ("Other CSO Activities", date(2026, 9, 28), "CSO General Meeting"),
        ]
        new_acts = []
        for cname, d, title in plans:
            a, _ = Activity.objects.get_or_create(
                title=title, date=d, semester=sem,
                defaults={"description": "", "is_cancelled": False, "category": cats[cname]},
            )
            new_acts.append(a)
        self.stdout.write(f"Activities ensured: {len(new_acts)}")

        # --- PARTICIPATION: realistic per-mphakati attendance ---
        # St. Mary's ~92%, St. Padre Pio ~88%, St. Joseph ~85%
        rate = {"St. Mary's": 0.92, "St. Padre Pio": 0.88, "St. Joseph": 0.85}
        pcount = 0
        for a in new_acts:
            for mph in mphs:
                members = Member.objects.filter(
                    mphakati_memberships__mphakati=mph,
                    mphakati_memberships__semester=sem,
                    mphakati_memberships__is_current=True,
                ).distinct()
                r = rate[mph.name]
                for mem in members:
                    if Participation.objects.filter(activity=a, member=mem).exists():
                        continue
                    roll = random.random()
                    if roll < r:
                        status = "PRESENT"
                    elif roll < r + 0.05:
                        status = "EXCUSED"
                    else:
                        status = "ABSENT"
                    Participation.objects.create(
                        activity=a, member=mem, status=status,
                        recorded_at=a.date, notes="",
                    )
                    pcount += 1
        self.stdout.write(f"Participation records created: {pcount}")

        # --- FINANCE: a few contributions per mphakati ---
        fc, _ = FinanceCategory.objects.get_or_create(
            name="Semester Membership Contribution",
            transaction_type="INCOME",
            defaults={"description": "K1000 per semester", "is_active": True},
        )
        tcount = 0
        for mph in mphs:
            members = Member.objects.filter(
                mphakati_memberships__mphakati=mph,
                mphakati_memberships__semester=sem,
            ).distinct()[:18]
            for mem in members:
                if FinanceTransaction.objects.filter(member=mem, category=fc).exists():
                    continue
                FinanceTransaction.objects.create(
                    transaction_type="INCOME",
                    amount=Decimal("1000.00"),
                    transaction_date=date(2026, 9, 5),
                    description="Semester contribution",
                    reference_number=f"RCP-{mem.student_id}",
                    category=fc, member=mem, mphakati=mph,
                    recorded_by=admin, semester=sem,
                    approval_status="APPROVED",
                )
                tcount += 1
        self.stdout.write(f"Finance transactions created: {tcount}")
        self.stdout.write(self.style.SUCCESS("Seed complete."))
