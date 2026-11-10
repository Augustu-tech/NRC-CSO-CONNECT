from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = [
        ("super_admin", "Super Administrator"),
        ("chairperson", "Chairperson"),
        ("vice_chairperson", "Vice Chairperson"),
        ("secretary", "Secretary"),
        ("vice_secretary", "Vice Secretary"),
        ("treasurer", "Treasurer"),
        ("vice_treasurer", "Vice Treasurer"),
        ("organizing_secretary", "Organizing Secretary"),
        ("publicity_secretary", "Publicity Secretary"),
        ("mphakati_leader", "Mphakati Leader"),
        ("affiliate_coordinator", "Affiliate Coordinator"),
        ("patron", "Patron"),
        ("auditor", "Auditor"),
        ("member", "Member"),
    ]

    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default="member")
    email = models.EmailField(unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    member = models.OneToOneField(
        "members.Member",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="user_account",
    )

    class Meta:
        managed = True
        db_table = "accounts_user"

    def __str__(self):
        full = f"{self.first_name} {self.last_name}".strip()
        return full or self.username


# Audit log model — imported so Django registers it
from .models_audit import AuditLog  # noqa: E402,F401
