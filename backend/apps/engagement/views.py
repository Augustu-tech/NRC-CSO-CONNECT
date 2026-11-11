from django.utils import timezone
from django.db.models import Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.audit import log
from apps.accounts.audit_mixin import AuditMixin
from apps.accounts.permissions import (
    RoleBasedPermissionsMixin,
    CanReadAnnouncements, CanManageAnnouncements, CanModeratePrayer,
)

from .models import Announcement, PrayerIntention, Notification
from .serializers import (
    AnnouncementSerializer, PrayerIntentionSerializer, NotificationSerializer,
)


class AnnouncementViewSet(AuditMixin, RoleBasedPermissionsMixin, viewsets.ModelViewSet):
    read_permission_classes = [CanReadAnnouncements]
    write_permission_classes = [CanManageAnnouncements]
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer

    def perform_update(self, serializer):
        # Only the author, a Super Admin, or a Chairperson can edit
        instance = serializer.instance
        user = self.request.user
        if not (user.is_superuser or user.role in ("super_admin", "chairperson") or instance.author_id == user.id):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only edit your own announcements.")
        super().perform_update(serializer)

    def perform_destroy(self, instance):
        # Same rule for deletion
        user = self.request.user
        if not (user.is_superuser or user.role in ("super_admin", "chairperson") or instance.author_id == user.id):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only delete your own announcements.")
        super().perform_destroy(instance)

    def get_queryset(self):
        qs = Announcement.objects.all()
        user = self.request.user
        if not user or not user.is_authenticated:
            return qs.none()
        if not (user.is_superuser or user.role in CanManageAnnouncements.allowed_roles):
            qs = qs.filter(is_published=True).filter(
                Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
            )
        return qs

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        ann = self.get_object()
        if ann.is_published:
            return Response({"detail": "Already published."}, status=400)
        ann.is_published = True
        ann.published_at = timezone.now()
        ann.save(update_fields=["is_published", "published_at", "updated_at"])
        log(request, "APPROVE", model=Announcement, obj=ann, new={"is_published": True})

        # ---------- Create notifications for target users ----------
        from apps.accounts.models import User
        
        target_users = User.objects.filter(is_active=True).exclude(id=request.user.id)
        
        # Filter by audience (for future use when targeting is enabled)
        if ann.target_audience == "MIPHAKATI" and ann.mphakati:
            from apps.members.models import MphakatiMembership
            member_ids = MphakatiMembership.objects.filter(
                mphakati=ann.mphakati, is_current=True
            ).values_list("member_id", flat=True)
            target_users = target_users.filter(member_id__in=member_ids)
        elif ann.target_audience == "AFFILIATE" and ann.affiliate:
            from apps.organizations.models import AffiliateMembership
            member_ids = AffiliateMembership.objects.filter(
                affiliate=ann.affiliate, is_active=True
            ).values_list("member_id", flat=True)
            target_users = target_users.filter(member_id__in=member_ids)
        
        # Bulk create notifications (efficient for 100s of users)
        notifs = [
            Notification(
                user=u,
                kind="ANNOUNCEMENT",
                title=f"New Announcement: {ann.title[:100]}",
                body=ann.content[:200],
                link="/announcements",
            )
            for u in target_users
        ]
        if notifs:
            Notification.objects.bulk_create(notifs)
            print(f"✅ Created {len(notifs)} notifications for announcement '{ann.title}'")
        
        return Response(AnnouncementSerializer(ann).data)


class PrayerIntentionViewSet(AuditMixin, RoleBasedPermissionsMixin, viewsets.ModelViewSet):
    read_permission_classes = [CanReadAnnouncements]
    write_permission_classes = [CanReadAnnouncements]
    queryset = PrayerIntention.objects.all()
    serializer_class = PrayerIntentionSerializer

    def get_queryset(self):
        qs = PrayerIntention.objects.all()
        user = self.request.user
        if not user or not user.is_authenticated:
            return qs.none()
        if user.is_superuser or user.role in CanModeratePrayer.allowed_roles:
            return qs
        return qs.filter(status="APPROVED")

    def perform_create(self, serializer):
        serializer.save(
            submitted_by=self.request.user,
            submitter_name=serializer.validated_data.get("submitter_name")
                or (self.request.user.get_full_name() or self.request.user.username),
        )

    def _moderate(self, request, pk, new_status):
        if not (request.user.is_superuser or request.user.role in CanModeratePrayer.allowed_roles):
            return Response({"detail": "Not allowed."}, status=403)
        pi = self.get_object()
        pi.status = new_status
        pi.moderated_by = request.user
        pi.moderated_at = timezone.now()
        pi.moderation_note = (request.data.get("note") or "")[:255]
        pi.save(update_fields=["status", "moderated_by", "moderated_at", "moderation_note"])
        log(request, "APPROVE" if new_status == "APPROVED" else "VOID",
            model=PrayerIntention, obj=pi, new={"status": new_status})
        return Response(PrayerIntentionSerializer(pi).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        return self._moderate(request, pk, "APPROVED")

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        return self._moderate(request, pk, "REJECTED")


class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Notification.objects.none()
        return Notification.objects.filter(user=user)

    def perform_create(self, serializer):
        if not (self.request.user.is_superuser or self.request.user.role == "super_admin"):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only superuser can send notifications via API.")
        serializer.save()

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        n = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"marked_read": n})

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        n = self.get_object()
        n.is_read = True
        n.save(update_fields=["is_read"])
        return Response(NotificationSerializer(n).data)
