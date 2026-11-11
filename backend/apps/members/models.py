from django.db import models


class Member(models.Model):
    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("INACTIVE", "Inactive"),
        ("GRADUATED", "Graduated"),
        ("TRANSFERRED", "Transferred"),
        ("SUSPENDED", "Suspended"),
        ("FORMER", "Former Member"),
    ]
    GENDER_CHOICES = [("M", "Male"), ("F", "Female")]

    id = models.BigAutoField(primary_key=True)
    student_id = models.CharField(unique=True, max_length=50)
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    phone = models.CharField(max_length=30, blank=True)
    email = models.CharField(max_length=254, blank=True)
    date_joined = models.DateField()
    profile_picture = models.ImageField(upload_to="profiles/", null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "members_member"

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.student_id})"

    @property
    def full_name(self):
        return " ".join(
            p for p in [self.first_name, self.middle_name, self.last_name] if p
        )


class MphakatiMembership(models.Model):
    id = models.BigAutoField(primary_key=True)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_current = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    member = models.ForeignKey(
        Member, on_delete=models.PROTECT, related_name="mphakati_memberships"
    )
    mphakati = models.ForeignKey(
        "organizations.Mphakati",
        on_delete=models.PROTECT,
        related_name="memberships",
    )
    semester = models.ForeignKey(
        "organizations.Semester",
        on_delete=models.PROTECT,
        related_name="mphakati_memberships",
    )

    class Meta:
        managed = True
        db_table = "members_mphakatimembership"
        unique_together = (("member", "semester"),)


class FinalistRegistration(models.Model):
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
    ]

    member = models.OneToOneField(
        Member,
        on_delete=models.CASCADE,
        related_name="finalist_registration",
    )
    semester = models.ForeignKey(
        "organizations.Semester",
        on_delete=models.PROTECT,
        related_name="finalist_registrations",
    )
    program = models.CharField(max_length=200, blank=True)
    year_of_study = models.PositiveIntegerField(default=4)
    expected_graduation_date = models.DateField(null=True, blank=True)
    bio = models.TextField(blank=True, help_text="Brief bio for the farewell booklet")
    parent_contact = models.CharField(max_length=100, blank=True, help_text="For farewell dinner coordination")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    registered_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="approved_finalists",
    )

    class Meta:
        db_table = "members_finalistregistration"
        ordering = ["-registered_at"]

    def __str__(self):
        return f"{self.member.full_name} — {self.semester}"
