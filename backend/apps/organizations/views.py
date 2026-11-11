from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied

from apps.accounts.audit_mixin import AuditMixin
from apps.accounts.permissions import (
    RoleBasedPermissionsMixin, IsSuperAdmin,
    CanReadAffiliates, CanManageAffiliates
)
from .models import AcademicYear, Semester, Mphakati, Affiliate, AffiliateMembership
from .serializers import (
    AcademicYearSerializer, SemesterSerializer, MphakatiSerializer,
    AffiliateSerializer, AffiliateMembershipSerializer,
)


class AcademicYearViewSet(AuditMixin, RoleBasedPermissionsMixin, viewsets.ModelViewSet):
    read_permission_classes = [IsAuthenticated]
    write_permission_classes = [IsSuperAdmin]
    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        year = self.get_object()
        
        # Check if the year has semesters
        from apps.organizations.models import Semester
        sems = Semester.objects.filter(academic_year=year).order_by("-number")
        if not sems.exists():
            return Response({"detail": "Cannot activate a year with no semesters. Please add a semester first."}, status=400)
            
        # Activate the year
        AcademicYear.objects.filter(is_active=True).update(is_active=False)
        year.is_active = True
        year.save()
        
        # Automatically activate the most recent semester in this year
        Semester.objects.filter(is_active=True).update(is_active=False)
        latest_sem = sems.first()
        latest_sem.is_active = True
        latest_sem.save()
        
        return Response({"detail": f"Academic Year {year.name} and Semester {latest_sem.number} activated."})


class SemesterViewSet(AuditMixin, RoleBasedPermissionsMixin, viewsets.ModelViewSet):
    read_permission_classes = [IsAuthenticated]
    write_permission_classes = [IsSuperAdmin]
    queryset = Semester.objects.all()
    serializer_class = SemesterSerializer

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        semester = self.get_object()
        
        from django.utils import timezone
        from apps.members.models import Member, MphakatiMembership, FinalistRegistration
        from apps.accounts.audit import log

        if semester.end_date < timezone.now().date():
            return Response(
                {"detail": "Cannot activate a semester that has already ended. Please edit the dates first."},
                status=400
            )

        # Find the currently active semester BEFORE we switch
        previous_semester = Semester.objects.filter(is_active=True).exclude(pk=semester.pk).first()
        
        graduated_count = 0
        if previous_semester:
            # Find every member whose finalist registration in the previous semester was APPROVED
            approved_finalists = FinalistRegistration.objects.filter(
                semester=previous_semester,
                status="APPROVED",
            ).values_list("member_id", flat=True)
            
            if approved_finalists:
                # 1. Mark them as GRADUATED
                graduated_count = Member.objects.filter(
                    id__in=approved_finalists,
                    status__iexact="ACTIVE",
                ).update(status="GRADUATED")
                
                # 2. Deactivate their Mphakati memberships from the previous semester
                MphakatiMembership.objects.filter(
                    member_id__in=approved_finalists,
                    semester=previous_semester,
                    is_current=True,
                ).update(is_current=False, end_date=previous_semester.end_date)
                
                # 3. Log the automatic action
                log(request, "UPDATE", model=Member, obj_id=0,
                    obj_repr=f"Auto-graduated {graduated_count} finalists from {previous_semester}",
                    reason="Automatic graduation on semester transition")

        # Now switch the active semester
        Semester.objects.filter(is_active=True).update(is_active=False)
        semester.is_active = True
        semester.save()
        
        return Response({
            "detail": f"Semester {semester} activated.",
            "previous_semester": str(previous_semester) if previous_semester else None,
            "graduated_members": graduated_count,
        })

    @action(detail=True, methods=["post"])
    def set_chaplain(self, request, pk=None):
        """Update the chaplain's name for this semester."""
        semester = self.get_object()
        name = (request.data.get("chaplain_signer") or "").strip()
        if not name:
            return Response({"detail": "Chaplain name is required."}, status=400)
        semester.chaplain_signer = name
        semester.save(update_fields=["chaplain_signer"])
        return Response({"detail": f"Chaplain updated to {name}.", "chaplain_signer": name})


class MphakatiViewSet(AuditMixin, RoleBasedPermissionsMixin, viewsets.ModelViewSet):
    read_permission_classes = [AllowAny]
    write_permission_classes = [IsSuperAdmin]
    queryset = Mphakati.objects.all()
    serializer_class = MphakatiSerializer


class AffiliateViewSet(AuditMixin, RoleBasedPermissionsMixin, viewsets.ModelViewSet):
    read_permission_classes = [CanReadAffiliates]
    write_permission_classes = [CanManageAffiliates]
    queryset = Affiliate.objects.all()
    serializer_class = AffiliateSerializer

    def get_queryset(self):
        qs = Affiliate.objects.all()
        user = self.request.user
        if not user or not user.is_authenticated:
            return qs.none()
        if user.is_superuser or user.role in ("super_admin", "chairperson", "vice_chairperson", "secretary", "auditor"):
            return qs
        if user.role == "affiliate_coordinator" and user.member_id:
            # Only show affiliates where THIS member is the officially assigned coordinator
            return qs.filter(coordinator_id=user.member_id)
        return qs.none()


class AffiliateMembershipViewSet(AuditMixin, RoleBasedPermissionsMixin, viewsets.ModelViewSet):
    read_permission_classes = [CanReadAffiliates]
    write_permission_classes = [CanManageAffiliates]
    queryset = AffiliateMembership.objects.all()
    serializer_class = AffiliateMembershipSerializer

    def get_queryset(self):
        qs = AffiliateMembership.objects.all()
        user = self.request.user
        if not user or not user.is_authenticated:
            return qs.none()
        if user.is_superuser or user.role in ("super_admin", "chairperson", "vice_chairperson", "secretary", "auditor"):
            return qs
        if user.role == "affiliate_coordinator" and user.member_id:
            # Only show members in affiliates this user coordinates
            my_coordinated_aff = Affiliate.objects.filter(coordinator_id=user.member_id).values_list("id", flat=True)
            return qs.filter(affiliate_id__in=my_coordinated_aff)
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == "affiliate_coordinator" and user.member_id:
            target_affiliate = serializer.validated_data.get("affiliate")
            if target_affiliate.coordinator_id != user.member_id:
                raise PermissionDenied("You can only manage members in the affiliate you coordinate.")
        super().perform_create(serializer)

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == "affiliate_coordinator" and user.member_id:
            if instance.affiliate.coordinator_id != user.member_id:
                raise PermissionDenied("You can only manage members in the affiliate you coordinate.")
        super().perform_destroy(instance)
