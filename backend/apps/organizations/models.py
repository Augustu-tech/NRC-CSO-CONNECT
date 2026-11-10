from django.db import models


class AcademicYear(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(unique=True, max_length=20)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)

    class Meta:
        managed = True
        db_table = "organizations_academicyear"

    def __str__(self):
        return self.name


class Semester(models.Model):
    id = models.BigAutoField(primary_key=True)
    number = models.IntegerField()
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)
    academic_year = models.ForeignKey(
        AcademicYear, on_delete=models.PROTECT, related_name="semesters"
    )

    class Meta:
        managed = True
        db_table = "organizations_semester"
        unique_together = (("academic_year", "number"),)

    def __str__(self):
        return f"{self.academic_year.name} — Semester {self.number}"


class Mphakati(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(unique=True, max_length=100)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        managed = True
        db_table = "organizations_mphakati"
        verbose_name_plural = "Miphakati"

    def __str__(self):
        return self.name


class Affiliate(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(unique=True, max_length=100)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    scoring_method = models.CharField(max_length=20, default="participation")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "organizations_affiliate"

    def __str__(self):
        return self.name


class AffiliateMembership(models.Model):
    id = models.BigAutoField(primary_key=True)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    affiliate = models.ForeignKey(
        Affiliate, on_delete=models.PROTECT, related_name="memberships"
    )
    member = models.ForeignKey(
        "members.Member",
        on_delete=models.PROTECT,
        related_name="affiliate_memberships",
    )
    semester = models.ForeignKey(
        Semester, on_delete=models.PROTECT, related_name="affiliate_memberships"
    )

    class Meta:
        managed = True
        db_table = "organizations_affiliatemembership"
        unique_together = (("member", "affiliate", "semester"),)
