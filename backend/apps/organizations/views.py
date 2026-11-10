from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
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
        AcademicYear.objects.filter(is_active=True).update(is_active=False)
        year.is_active = True
        year.save()
        return Response({"detail": f"Academic Year {year.name} activated."})


class SemesterViewSet(AuditMixin, RoleBasedPermissionsMixin, viewsets.ModelViewSet):
    read_permission_classes = [IsAuthenticated]
    write_permission_classes = [IsSuperAdmin]
    queryset = Semester.objects.all()
    serializer_class = SemesterSerializer

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        semester = self.get_object()
        Semester.objects.filter(is_active=True).update(is_active=False)
        semester.is_active = True
        semester.save()
        return Response({"detail": f"Semester {semester} activated."})


class MphakatiViewSet(AuditMixin, RoleBasedPermissionsMixin, viewsets.ModelViewSet):
    read_permission_classes = [IsAuthenticated]
    write_permission_classes = [IsSuperAdmin]
    queryset = Mphakati.objects.all()
    serializer_class = MphakatiSerializer


class AffiliateViewSet(AuditMixin, RoleBasedPermissionsMixin, viewsets.ModelViewSet):
    read_permission_classes = [CanReadAffiliates]
    write_permission_classes = [CanManageAffiliates]
    queryset = Affiliate.objects.all()
    serializer_class = AffiliateSerializer


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
        if user.is_superuser or user.role in ("super_admin", "chairperson", "vice_chairperson"):
            return qs
        if user.role == "affiliate_coordinator":
            # For simplicity in this version, a coordinator can manage all affiliates.
            # In a stricter production version, you would link a coordinator to a specific affiliate.
            return qs
        return qs.none()
