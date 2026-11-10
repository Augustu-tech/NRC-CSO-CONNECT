from django.contrib import admin
from .models import Announcement, PrayerIntention, Notification

@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ("title", "author", "is_published", "priority", "published_at")
    list_filter = ("is_published", "priority")

@admin.register(PrayerIntention)
class PrayerIntentionAdmin(admin.ModelAdmin):
    list_display = ("content", "submitted_by", "status", "created_at")
    list_filter = ("status",)

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "kind", "is_read", "created_at")
    list_filter = ("kind", "is_read")
