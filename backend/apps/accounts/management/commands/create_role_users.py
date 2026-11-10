from django.core.management.base import BaseCommand
from apps.accounts.models import User

ROLES = [
    ("chairperson", "chairperson"),
    ("secretary", "secretary"),
    ("treasurer", "treasurer"),
    ("publicity", "publicity_secretary"),
    ("patron", "patron"),
    ("auditor", "auditor"),
    ("member1", "member"),
]


class Command(BaseCommand):
    help = "Create one test user per role with password TestPass123!"

    def handle(self, *args, **opts):
        for username, role in ROLES:
            u, created = User.objects.get_or_create(
                username=username,
                defaults={"role": role, "email": f"{username}@nrc.test"},
            )
            u.set_password("TestPass123!")
            u.role = role
            u.save()
            self.stdout.write(
                f"{username:<14} role={role:<20} {'created' if created else 'updated'}"
            )
