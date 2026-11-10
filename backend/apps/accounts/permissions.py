"""
Role-based access control — NRC CSO CONNECT.
Roles are assigned ONLY through Django admin by a super_admin.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS


class HasRole(BasePermission):
    allowed_roles = ()

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return getattr(user, "role", None) in self.allowed_roles


class IsSuperAdmin(HasRole):
    allowed_roles = ("super_admin",)


class CanReadFinanceDetail(HasRole):
    allowed_roles = ("super_admin", "treasurer", "vice_treasurer", "auditor")


class CanReadFinanceAggregate(HasRole):
    allowed_roles = (
        "super_admin", "chairperson", "vice_chairperson",
        "treasurer", "vice_treasurer", "auditor", "patron",
    )


class CanRecordFinance(HasRole):
    allowed_roles = ("super_admin", "treasurer", "vice_treasurer")


class CanApproveFinance(HasRole):
    allowed_roles = ("super_admin", "treasurer")


class CanReadMembers(HasRole):
    allowed_roles = (
        "super_admin", "chairperson", "vice_chairperson",
        "secretary", "vice_secretary", "treasurer", "vice_treasurer",
        "auditor", "organizing_secretary",
        "mphakati_leader", "affiliate_coordinator",
    )


class CanManageMembers(HasRole):
    allowed_roles = (
        "super_admin", "chairperson", "vice_chairperson",
        "secretary", "vice_secretary", "mphakati_leader",
    )


class CanReadActivities(HasRole):
    allowed_roles = (
        "super_admin", "chairperson", "vice_chairperson",
        "secretary", "vice_secretary", "treasurer", "vice_treasurer",
        "auditor", "patron", "organizing_secretary", "publicity_secretary",
        "mphakati_leader", "affiliate_coordinator", "member",
    )


class CanManageActivities(HasRole):
    allowed_roles = (
        "super_admin", "chairperson", "vice_chairperson",
        "secretary", "vice_secretary", "organizing_secretary",
        "mphakati_leader", "affiliate_coordinator",
    )


class CanReadAnnouncements(HasRole):
    allowed_roles = (
        "super_admin", "chairperson", "vice_chairperson",
        "secretary", "vice_secretary", "treasurer", "vice_treasurer",
        "auditor", "patron", "organizing_secretary", "publicity_secretary",
        "mphakati_leader", "affiliate_coordinator", "member",
    )


class CanManageAnnouncements(HasRole):
    allowed_roles = (
        "super_admin", "chairperson", "vice_chairperson",
        "secretary", "vice_secretary", "publicity_secretary",
    )


class CanReadScoring(HasRole):
    allowed_roles = (
        "super_admin", "chairperson", "vice_chairperson",
        "secretary", "vice_secretary", "treasurer", "vice_treasurer",
        "auditor", "patron", "organizing_secretary", "publicity_secretary",
        "mphakati_leader", "affiliate_coordinator", "member",
    )


class CanManageScoring(HasRole):
    allowed_roles = ("super_admin",)


class IsSelfOrAdmin(BasePermission):
    admin_roles = (
        "super_admin", "chairperson", "vice_chairperson",
        "secretary", "vice_secretary", "treasurer", "vice_treasurer", "auditor",
    )

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser or getattr(user, "role", None) in self.admin_roles:
            return True
        return getattr(user, "member_id", None) in (
            getattr(obj, "id", None),
            getattr(obj, "member_id", None),
        )


class RoleBasedPermissionsMixin:
    read_permission_classes = []
    write_permission_classes = []

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [p() for p in self.read_permission_classes]
        return [p() for p in self.write_permission_classes]


class CanModeratePrayer(HasRole):
    allowed_roles = (
        "super_admin", "chairperson", "vice_chairperson",
        "secretary", "vice_secretary",
    )


class CanReadAffiliates(HasRole):
    allowed_roles = (
        "super_admin", "chairperson", "vice_chairperson",
        "secretary", "vice_secretary", "auditor", 
        "affiliate_coordinator", "member"
    )

class CanManageAffiliates(HasRole):
    allowed_roles = (
        "super_admin", "chairperson", "vice_chairperson",
        "affiliate_coordinator"
    )
