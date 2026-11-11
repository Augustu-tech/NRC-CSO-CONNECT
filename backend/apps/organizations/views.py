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
        if semester.end_date < timezone.now().date():
            return Response(
                {"detail": "Cannot activate a semester that has already ended. Please edit the dates first."},
                status=400
            )

        Semester.objects.filter(is_active=True).update(is_active=False)
        semester.is_active = True
        semester.save()
        return Response({"detail": f"Semester {semester} activated."})


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
