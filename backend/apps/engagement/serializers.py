from rest_framework import serializers
from .models import Announcement, PrayerIntention, Notification


class AnnouncementSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)

    class Meta:
        model = Announcement
        fields = "__all__"
        read_only_fields = ("author", "is_published", "published_at", "created_at", "updated_at")

    def get_author_name(self, obj):
        return obj.author.get_full_name() or obj.author.username


class PrayerIntentionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrayerIntention
        fields = "__all__"
        read_only_fields = (
            "submitted_by", "status", "moderated_by", "moderated_at",
            "moderation_note", "created_at",
        )


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = "__all__"
        read_only_fields = ("user", "created_at")
