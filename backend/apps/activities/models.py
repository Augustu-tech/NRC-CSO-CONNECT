from django.db import models


class ActivityCategory(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(unique=True, max_length=100)
    description = models.TextField(blank=True)
    is_scoreable = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "activities_activitycategory"
        verbose_name_plural = "Activity categories"

    def __str__(self):
        return self.name


class Activity(models.Model):
    ELIGIBILITY_ALL = "ALL"
    ELIGIBILITY_AFFILIATE = "AFFILIATE"
    ELIGIBILITY_CHOICES = [
        (ELIGIBILITY_ALL, "All active members"),
        (ELIGIBILITY_AFFILIATE, "Members of selected affiliates only"),
    ]

    id = models.BigAutoField(primary_key=True)
    title = models.CharField(max_length=200)
    date = models.DateField()
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    location = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    responsible_person = models.CharField(max_length=200, blank=True)
    max_participants = models.PositiveIntegerField(null=True, blank=True)
    is_required = models.BooleanField(default=False)
    contribution_required = models.BooleanField(default=False)
    contributes_to_score = models.BooleanField(default=True)
    is_cancelled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    eligibility_type = models.CharField(
        max_length=20, choices=ELIGIBILITY_CHOICES, default=ELIGIBILITY_ALL
    )
    eligible_affiliates = models.ManyToManyField(
        "organizations.Affiliate", blank=True, related_name="eligible_activities"
    )
    affiliate = models.ForeignKey(
        "organizations.Affiliate",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="activities",
    )
    mphakati = models.ForeignKey(
        "organizations.Mphakati",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="activities",
    )
    semester = models.ForeignKey(
        "organizations.Semester",
        on_delete=models.PROTECT,
        related_name="activities",
    )
    category = models.ForeignKey(
        ActivityCategory, on_delete=models.PROTECT, related_name="activities"
    )

    class Meta:
        managed = True
        db_table = "activities_activity"
        verbose_name_plural = "Activities"

    def __str__(self):
        return f"{self.title} — {self.date}"

class Participation(models.Model):
    id = models.BigAutoField(primary_key=True)
    status = models.CharField(max_length=20)
    recorded_at = models.DateTimeField()
    notes = models.TextField(blank=True)
    activity = models.ForeignKey(
        Activity, on_delete=models.PROTECT, related_name="participations"
    )
    member = models.ForeignKey(
        "members.Member",
        on_delete=models.PROTECT,
        related_name="participations",
    )

    class Meta:
        managed = True
        db_table = "activities_participation"
        unique_together = (("activity", "member"),)

    def __str__(self):
        return f"{self.member} → {self.activity} ({self.status})"


class ScoringConfiguration(models.Model):
    id = models.BigAutoField(primary_key=True)
    month = models.DateField()
    status = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    finalized_at = models.DateTimeField(null=True, blank=True)
    semester = models.ForeignKey(
        "organizations.Semester",
        on_delete=models.PROTECT,
        related_name="scoring_configurations",
    )

    class Meta:
        managed = True
        db_table = "activities_scoringconfiguration"
        unique_together = (("semester", "month"),)

    def __str__(self):
        return f"Scoring {self.month} ({self.status})"


class ScoringRule(models.Model):
    id = models.BigAutoField(primary_key=True)
    weight = models.DecimalField(max_digits=5, decimal_places=2)
    category = models.ForeignKey(
        ActivityCategory, on_delete=models.PROTECT, related_name="scoring_rules"
    )
    configuration = models.ForeignKey(
        ScoringConfiguration,
        on_delete=models.PROTECT,
        related_name="scoring_rules",
    )

    class Meta:
        managed = True
        db_table = "activities_scoringrule"
        unique_together = (("configuration", "category"),)

    def __str__(self):
        return f"{self.category.name} → {self.weight}%"


class AffiliateScoringComponent(models.Model):
    id = models.BigAutoField(primary_key=True)
    component_type = models.CharField(max_length=20)
    weight = models.DecimalField(max_digits=5, decimal_places=2)
    affiliate = models.ForeignKey("organizations.Affiliate", on_delete=models.PROTECT)
    configuration = models.ForeignKey(
        ScoringConfiguration,
        on_delete=models.PROTECT,
        related_name="affiliate_components",
    )

    class Meta:
        managed = True
        db_table = "activities_affiliatescoringcomponent"
        unique_together = (("configuration", "affiliate", "component_type"),)


class MonthlyMphakatiAward(models.Model):
    id = models.BigAutoField(primary_key=True)
    winning_score = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True
    )
    status = models.CharField(max_length=20)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    finalized_at = models.DateTimeField(null=True, blank=True)
    configuration = models.OneToOneField(
        ScoringConfiguration, on_delete=models.PROTECT, related_name="award"
    )

    class Meta:
        managed = True
        db_table = "activities_monthlymphakatiaward"


class MonthlyMphakatiAwardWinner(models.Model):
    id = models.BigAutoField(primary_key=True)
    rank = models.IntegerField()
    score = models.DecimalField(max_digits=6, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    award = models.ForeignKey(
        MonthlyMphakatiAward, on_delete=models.CASCADE, related_name="winners"
    )
    mphakati = models.ForeignKey("organizations.Mphakati", on_delete=models.PROTECT)

    class Meta:
        managed = True
        db_table = "activities_monthlymphakatiawardwinner"
        unique_together = (("award", "mphakati"),)
        ordering = ("rank",)
