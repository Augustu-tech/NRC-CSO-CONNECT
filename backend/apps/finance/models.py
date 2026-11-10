from django.db import models


class FinanceCategory(models.Model):
    SCORE_IMPACT_CHOICES = [
        ("NONE", "No score impact (default)"),
        ("MEMBER_CONTRIBUTION", "Member contribution — counts in participation rate"),
        ("CONFIGURABLE", "Configurable per event"),
    ]

    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=100)
    transaction_type = models.CharField(max_length=10)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    score_impact = models.CharField(
        max_length=30,
        choices=SCORE_IMPACT_CHOICES,
        default="NONE",
        help_text=(
            "Only MEMBER_CONTRIBUTION may influence the Mphakati score, "
            "and only via participation rate — never via amount."
        ),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "finance_financecategory"
        unique_together = (("name", "transaction_type"),)
        verbose_name_plural = "Finance categories"

    def __str__(self):
        return f"{self.name} ({self.transaction_type})"


class FinanceTransaction(models.Model):
    SOURCE_CHOICES = [
        ("MEMBER", "Member"),
        ("DONOR", "Donor / Well-wisher"),
        ("CLIENT", "Client (piecework)"),
        ("FUNDRAISING", "Fundraising"),
        ("INSTITUTION", "Institution"),
        ("OTHER", "Other"),
    ]

    id = models.BigAutoField(primary_key=True)
    transaction_type = models.CharField(max_length=10)
    source_type = models.CharField(
        max_length=20, choices=SOURCE_CHOICES, default="MEMBER"
    )
    donor_name = models.CharField(max_length=200, blank=True)
    donor_anonymous = models.BooleanField(default=False)
    project_name = models.CharField(max_length=200, blank=True)
    project_description = models.TextField(blank=True)
    piecework_members = models.ManyToManyField(
        "members.Member",
        blank=True,
        related_name="piecework_transactions",
        help_text="Members who actually participated in this piecework.",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    transaction_date = models.DateField()
    description = models.TextField(blank=True)
    reference_number = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    category = models.ForeignKey(
        FinanceCategory, on_delete=models.PROTECT, related_name="transactions"
    )
    member = models.ForeignKey(
        "members.Member",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="finance_transactions",
    )
    mphakati = models.ForeignKey(
        "organizations.Mphakati",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="finance_transactions",
    )
    recorded_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="recorded_transactions",
    )
    semester = models.ForeignKey(
        "organizations.Semester",
        on_delete=models.PROTECT,
        related_name="finance_transactions",
    )
    approval_status = models.CharField(max_length=10)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="approved_transactions",
    )
    rejection_reason = models.TextField(blank=True)

    class Meta:
        managed = True
        db_table = "finance_financetransaction"
        ordering = ("-transaction_date", "-id")

    def __str__(self):
        return f"{self.transaction_type} K{self.amount} on {self.transaction_date}"
