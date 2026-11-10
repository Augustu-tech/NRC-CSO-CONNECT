from django.conf import settings
from django.db import models


class Announcement(models.Model):
    PRIORITY = [("LOW","Low"),("NORMAL","Normal"),("HIGH","High"),("URGENT","Urgent")]
    AUDIENCE = [("ALL","Everyone"),("MIPHAKATI","Specific Mphakati"),("AFFILIATE","Specific Affiliate")]

    id = models.BigAutoField(primary_key=True)
    title = models.CharField(max_length=200)
    content = models.TextField()
    priority = models.CharField(max_length=10, choices=PRIORITY, default="NORMAL")
    target_audience = models.CharField(max_length=20, choices=AUDIENCE, default="ALL")
    mphakati = models.ForeignKey(
        "organizations.Mphakati", on_delete=models.SET_NULL, null=True, blank=True,
    )
    affiliate = models.ForeignKey(
        "organizations.Affiliate", on_delete=models.SET_NULL, null=True, blank=True,
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name="announcements_authored",
    )
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "engagement_announcement"
        ordering = ("-published_at", "-created_at")

    def __str__(self):
        return self.title


class PrayerIntention(models.Model):
    STATUS = [("PENDING","Pending"),("APPROVED","Approved"),("REJECTED","Rejected")]

    id = models.BigAutoField(primary_key=True)
    content = models.TextField()
    submitter_name = models.CharField(max_length=120, blank=True)
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="prayer_intentions",
    )
    status = models.CharField(max_length=10, choices=STATUS, default="PENDING")
    moderated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="moderated_prayer_intentions",
    )
    moderated_at = models.DateTimeField(null=True, blank=True)
    moderation_note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = "engagement_prayerintention"
        ordering = ("-created_at",)

    def __str__(self):
        return f"Prayer #{self.pk} ({self.status})"


class Notification(models.Model):
    KIND = [
        ("GENERAL","General"),("MASS","Mass"),("CHOIR","Choir"),
        ("FINANCE","Finance"),("SCORING","Scoring"),("ANNOUNCEMENT","Announcement"),
    ]

    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="notifications",
    )
    kind = models.CharField(max_length=20, choices=KIND, default="GENERAL")
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    link = models.CharField(max_length=300, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = "engagement_notification"
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.kind}: {self.title}"
