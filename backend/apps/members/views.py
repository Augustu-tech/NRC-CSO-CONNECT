from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.audit_mixin import AuditMixin
from apps.accounts.permissions import (
    RoleBasedPermissionsMixin, CanReadMembers, CanManageMembers,
)
from apps.organizations.models import Mphakati, Semester
from .models import Member, MphakatiMembership
from .serializers import MemberSerializer, MphakatiMembershipSerializer


class MemberViewSet(AuditMixin, RoleBasedPermissionsMixin, viewsets.ModelViewSet):
    read_permission_classes = [CanReadMembers]
    write_permission_classes = [CanManageMembers]
    queryset = Member.objects.all().order_by("last_name")
    serializer_class = MemberSerializer

    ADMIN_ROLES = (
        "super_admin", "chairperson", "vice_chairperson",
        "secretary", "vice_secretary", "treasurer", "vice_treasurer",
        "auditor", "organizing_secretary",
    )

    def get_queryset(self):
        qs = Member.objects.all().order_by("last_name")
        user = self.request.user
        if not user or not user.is_authenticated:
            return qs.none()
        if user.is_superuser or user.role in self.ADMIN_ROLES:
            return qs
        if user.role == "mphakati_leader" and user.member_id:
            my_mph = MphakatiMembership.objects.filter(
                member_id=user.member_id, is_current=True
            ).values_list("mphakati_id", flat=True)
            return qs.filter(
                mphakati_memberships__mphakati_id__in=my_mph,
                mphakati_memberships__is_current=True,
            ).distinct()
        if user.role == "affiliate_coordinator" and user.member_id:
            from apps.organizations.models import AffiliateMembership
            my_aff = AffiliateMembership.objects.filter(
                member_id=user.member_id, is_active=True
            ).values_list("affiliate_id", flat=True)
            return qs.filter(
                affiliate_memberships__affiliate_id__in=my_aff,
                affiliate_memberships__is_active=True,
            ).distinct()
        return qs.none()

    @action(detail=True, methods=["post"])
    def transfer(self, request, pk=None):
        member = self.get_object()
        new_mphakati_id = request.data.get("mphakati_id")
        semester_id = request.data.get("semester_id")
        
        if not new_mphakati_id or not semester_id:
            return Response({"detail": "mphakati_id and semester_id required."}, status=400)
            
        try:
            new_mphakati = Mphakati.objects.get(id=new_mphakati_id)
            semester = Semester.objects.get(id=semester_id)
        except (Mphakati.DoesNotExist, Semester.DoesNotExist):
            return Response({"detail": "Invalid Mphakati or Semester."}, status=400)
            
        today = timezone.now().date()
        
        # Check if they are already in this semester
        existing = MphakatiMembership.objects.filter(member=member, semester=semester).first()
        
        if existing:
            # Update the existing record (same semester transfer)
            existing.mphakati = new_mphakati
            existing.save()
        else:
            # Create a new record (different semester transfer)
            MphakatiMembership.objects.create(
                member=member,
                mphakati=new_mphakati,
                semester=semester,
                start_date=today,
                is_current=True,
            )
            # Mark old memberships as not current
            MphakatiMembership.objects.filter(member=member).exclude(semester=semester).update(is_current=False)
        
        # Log the change via AuditMixin
        from apps.accounts.audit import log
        log(request, "UPDATE", model=Member, obj=member, 
            reason=f"Transferred to {new_mphakati.name}")
        
        return Response({"detail": f"Transferred to {new_mphakati.name}."})


class MphakatiMembershipViewSet(AuditMixin, RoleBasedPermissionsMixin, viewsets.ModelViewSet):
    read_permission_classes = [CanReadMembers]
    write_permission_classes = [CanManageMembers]
    queryset = MphakatiMembership.objects.all()
    serializer_class = MphakatiMembershipSerializer

    ADMIN_ROLES = (
        "super_admin", "chairperson", "vice_chairperson",
        "secretary", "vice_secretary", "treasurer", "vice_treasurer",
        "auditor", "organizing_secretary",
    )

    def get_queryset(self):
        qs = MphakatiMembership.objects.all()
        user = self.request.user
        if not user or not user.is_authenticated:
            return qs.none()
        if user.is_superuser or user.role in self.ADMIN_ROLES:
            return qs
        if user.role == "mphakati_leader" and user.member_id:
            my_mph = MphakatiMembership.objects.filter(
                member_id=user.member_id, is_current=True
            ).values_list("mphakati_id", flat=True)
            return qs.filter(mphakati_id__in=my_mph)
        return qs.none()
