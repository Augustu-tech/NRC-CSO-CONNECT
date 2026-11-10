import base64
from io import BytesIO
from decimal import Decimal
from django.core import signing
from django.db.models import Sum
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
import qrcode

from apps.accounts.audit import log
from apps.accounts.audit_mixin import AuditMixin
from apps.accounts.permissions import (
    RoleBasedPermissionsMixin, CanReadActivities, CanManageActivities,
    CanReadScoring, CanManageScoring,
)
from .models import (
    Activity, ActivityCategory, Participation, ScoringConfiguration, ScoringRule,
    AffiliateScoringComponent, MonthlyMphakatiAward, MonthlyMphakatiAwardWinner,
)
from .serializers import (
    ActivitySerializer, ActivityCategorySerializer, ParticipationSerializer,
    ScoringConfigurationSerializer, ScoringRuleSerializer,
    AffiliateScoringComponentSerializer, MonthlyMphakatiAwardSerializer, MonthlyMphakatiAwardWinnerSerializer,
)
from .scoring import calculate_leaderboard


class ActivityCategoryViewSet(AuditMixin, RoleBasedPermissionsMixin, viewsets.ModelViewSet):
    read_permission_classes = [CanReadActivities]
    write_permission_classes = [CanManageScoring]
    queryset = ActivityCategory.objects.all()
    serializer_class = ActivityCategorySerializer


class ActivityViewSet(AuditMixin, RoleBasedPermissionsMixin, viewsets.ModelViewSet):
    read_permission_classes = [CanReadActivities]
    write_permission_classes = [CanManageActivities]
    queryset = Activity.objects.all().order_by("-date")
    serializer_class = ActivitySerializer

    def get_permissions(self):
        # Anyone logged in can check in via QR — they're only marking THEMSELVES present
        if getattr(self, "action", None) == "checkin":
            from rest_framework.permissions import IsAuthenticated
            return [IsAuthenticated()]
        return super().get_permissions()

    @action(detail=True, methods=["get"])
    def qr_code(self, request, pk=None):
        """Generate a base64 QR code image that expires in 2 hours."""
        activity = self.get_object()
        token = signing.dumps({"activity_id": activity.id})
        
        checkin_url = f"http://localhost:5173/checkin?token={token}"
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(checkin_url)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return Response({
            "token": token,
            "image": f"data:image/png;base64,{img_str}",
            "expires_in": 7200
        })

    @action(detail=False, methods=["post"])
    def checkin(self, request):
        """Endpoint for members to scan and mark themselves present."""
        token = request.data.get("token")
        if not token:
            return Response({"detail": "Token is required."}, status=400)
            
        try:
            data = signing.loads(token, max_age=7200)
            activity_id = data.get("activity_id")
        except signing.SignatureExpired:
            return Response({"detail": "This QR code has expired."}, status=400)
        except signing.BadSignature:
            return Response({"detail": "Invalid QR code."}, status=400)
            
        if not getattr(request.user, "member_id", None):
            return Response({"detail": "Your account is not linked to a member profile."}, status=400)
            
        activity = Activity.objects.filter(id=activity_id).first()
        if not activity or activity.is_cancelled:
            return Response({"detail": "Activity not found or cancelled."}, status=400)
            
        p, created = Participation.objects.update_or_create(
            activity=activity,
            member_id=request.user.member_id,
            defaults={
                "status": "PRESENT",
                "recorded_at": timezone.now()
            }
        )
        
        return Response({
            "detail": "Attendance recorded successfully!",
            "activity": activity.title,
            "status": "PRESENT"
        })

    @action(detail=True, methods=["get", "post"])
    def attendance(self, request, pk=None):
        activity = self.get_object()
        
        if activity.eligibility_type == "AFFILIATE" and activity.eligible_affiliates.exists():
            aff_ids = activity.eligible_affiliates.values_list("id", flat=True)
            from apps.organizations.models import AffiliateMembership
            member_ids = AffiliateMembership.objects.filter(
                affiliate_id__in=aff_ids, is_active=True, semester=activity.semester
            ).values_list("member_id", flat=True)
            from apps.members.models import Member
            members = Member.objects.filter(id__in=member_ids, status__iexact="ACTIVE")
        else:
            from apps.members.models import Member
            members = Member.objects.filter(
                mphakati_memberships__semester=activity.semester,
                mphakati_memberships__is_current=True,
                status__iexact="ACTIVE"
            ).distinct()
            
        if request.method == "GET":
            existing = {p.member_id: p.status for p in Participation.objects.filter(activity=activity)}
            roster = []
            for m in members.order_by("last_name", "first_name"):
                roster.append({
                    "id": m.id,
                    "name": f"{m.first_name} {m.last_name}",
                    "student_id": m.student_id,
                    "status": existing.get(m.id, "ABSENT")
                })
            return Response({
                "activity": activity.id, 
                "title": activity.title, 
                "date": activity.date,
                "roster": roster
            })
            
        elif request.method == "POST":
            data = request.data.get("records", [])
            for rec in data:
                Participation.objects.update_or_create(
                    activity=activity,
                    member_id=rec["member_id"],
                    defaults={"status": rec["status"], "recorded_at": timezone.now()}
                )
            return Response({"detail": f"Saved {len(data)} records."})


class ParticipationViewSet(AuditMixin, RoleBasedPermissionsMixin, viewsets.ModelViewSet):
    read_permission_classes = [CanReadActivities]
    write_permission_classes = [CanManageActivities]
    queryset = Participation.objects.all()
    serializer_class = ParticipationSerializer

    ADMIN_ROLES = (
        "super_admin", "chairperson", "vice_chairperson",
        "secretary", "vice_secretary", "treasurer", "vice_treasurer",
        "auditor", "patron", "organizing_secretary",
    )

    def get_queryset(self):
        qs = Participation.objects.all()
        user = self.request.user
        if not user or not user.is_authenticated:
            return qs.none()
        if user.is_superuser or user.role in self.ADMIN_ROLES:
            return qs
        if user.role == "member":
            if not user.member_id:
                return qs.none()
            return qs.filter(member_id=user.member_id)
        if user.role == "mphakati_leader":
            if not user.member_id:
                return qs.none()
            from apps.members.models import MphakatiMembership
            my_ids = MphakatiMembership.objects.filter(
                member_id=user.member_id, is_current=True
            ).values_list("mphakati_id", flat=True)
            return qs.filter(
                member__mphakati_memberships__mphakati_id__in=my_ids,
                member__mphakati_memberships__is_current=True,
            ).distinct()
        if user.role == "affiliate_coordinator":
            if not user.member_id:
                return qs.none()
            from apps.organizations.models import AffiliateMembership
            my_aff = AffiliateMembership.objects.filter(
                member_id=user.member_id, is_active=True
            ).values_list("affiliate_id", flat=True)
            return qs.filter(activity__affiliate_id__in=my_aff)
        return qs.none()


class ScoringConfigurationViewSet(AuditMixin, RoleBasedPermissionsMixin, viewsets.ModelViewSet):
    read_permission_classes = [CanReadScoring]
    write_permission_classes = [CanManageScoring]
    queryset = ScoringConfiguration.objects.all()
    serializer_class = ScoringConfigurationSerializer

    def _total_weight(self, config):
        return (
            ScoringRule.objects.filter(configuration=config)
            .aggregate(s=Sum("weight"))["s"]
            or Decimal("0")
        )

    def perform_update(self, serializer):
        inst = serializer.instance
        if inst.status == "FINALIZED":
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(
                "This scoring period is FINALIZED. Unlock it before editing."
            )
        super().perform_update(serializer)

    def perform_destroy(self, instance):
        if instance.status == "FINALIZED":
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(
                "This scoring period is FINALIZED. Unlock it before deleting."
            )
        super().perform_destroy(instance)

    @action(detail=True, methods=["get"])
    def leaderboard(self, request, pk=None):
        config = self.get_object()
        cards = calculate_leaderboard(config)
        return Response([c.to_dict() for c in cards])

    @action(detail=True, methods=["post"])
    def finalize(self, request, pk=None):
        config = self.get_object()
        if config.status == "FINALIZED":
            return Response({"detail": "Already finalized."},
                            status=status.HTTP_400_BAD_REQUEST)

        total = self._total_weight(config)
        force = bool(request.data.get("force")) and request.user.is_superuser
        if total != Decimal("100") and not force:
            return Response({
                "detail": f"Total weight is {total}%. Must equal 100% before finalizing.",
                "total_weight": float(total),
                "override_hint": "Superuser can pass force=true to override.",
            }, status=status.HTTP_400_BAD_REQUEST)

        config.status = "FINALIZED"
        config.finalized_at = timezone.now()
        config.save(update_fields=["status", "finalized_at", "updated_at"])

        log(request, "APPROVE",
            model=ScoringConfiguration, obj=config,
            new={"status": "FINALIZED",
                 "total_weight": float(total),
                 "forced": force},
            reason=request.data.get("reason", ""))

        return Response(ScoringConfigurationSerializer(config).data)

    @action(detail=True, methods=["post"])
    def unlock(self, request, pk=None):
        if not request.user.is_superuser:
            return Response({"detail": "Only a superuser can unlock a finalized period."},
                            status=status.HTTP_403_FORBIDDEN)
        config = self.get_object()
        if config.status != "FINALIZED":
            return Response({"detail": "Not finalized."},
                            status=status.HTTP_400_BAD_REQUEST)
        reason = (request.data.get("reason") or "").strip()
        if not reason:
            return Response({"detail": "A reason is required to unlock."},
                            status=status.HTTP_400_BAD_REQUEST)

        config.status = "DRAFT"
        config.finalized_at = None
        config.save(update_fields=["status", "finalized_at", "updated_at"])

        log(request, "ROLE_CHANGE",
            model=ScoringConfiguration, obj=config,
            new={"status": "DRAFT"}, reason=reason)

        return Response(ScoringConfigurationSerializer(config).data)


class ScoringRuleViewSet(AuditMixin, RoleBasedPermissionsMixin, viewsets.ModelViewSet):
    read_permission_classes = [CanReadScoring]
    write_permission_classes = [CanManageScoring]
    queryset = ScoringRule.objects.all()
    serializer_class = ScoringRuleSerializer

    def get_queryset(self):
        qs = ScoringRule.objects.all()
        config_id = self.request.query_params.get("configuration")
        if config_id:
            qs = qs.filter(configuration_id=config_id)
        return qs

    def _ensure_not_finalized(self, config):
        if config and config.status == "FINALIZED":
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(
                "This scoring period is FINALIZED. Unlock it before editing rules."
            )

    def perform_create(self, serializer):
        self._ensure_not_finalized(serializer.validated_data.get("configuration"))
        super().perform_create(serializer)

    def perform_update(self, serializer):
        config = serializer.validated_data.get("configuration") or serializer.instance.configuration
        self._ensure_not_finalized(config)
        super().perform_update(serializer)

    def perform_destroy(self, instance):
        self._ensure_not_finalized(instance.configuration)
        super().perform_destroy(instance)


class AffiliateScoringComponentViewSet(AuditMixin, RoleBasedPermissionsMixin, viewsets.ModelViewSet):
    read_permission_classes = [CanReadScoring]
    write_permission_classes = [CanManageScoring]
    queryset = AffiliateScoringComponent.objects.all()
    serializer_class = AffiliateScoringComponentSerializer


class MonthlyMphakatiAwardViewSet(AuditMixin, RoleBasedPermissionsMixin, viewsets.ModelViewSet):
    read_permission_classes = [CanReadScoring]
    write_permission_classes = [CanManageScoring]
    queryset = MonthlyMphakatiAward.objects.all()
    serializer_class = MonthlyMphakatiAwardSerializer


class MonthlyMphakatiAwardWinnerViewSet(AuditMixin, RoleBasedPermissionsMixin, viewsets.ModelViewSet):
    read_permission_classes = [CanReadScoring]
    write_permission_classes = [CanManageScoring]
    queryset = MonthlyMphakatiAwardWinner.objects.all()
    serializer_class = MonthlyMphakatiAwardWinnerSerializer
