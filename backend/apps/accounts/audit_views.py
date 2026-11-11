from rest_framework import serializers, viewsets
from apps.accounts.audit_mixin import AuditMixin
from apps.accounts.models_audit import AuditLog
from apps.accounts.permissions import RoleBasedPermissionsMixin, HasRole


class CanReadAuditLog(HasRole):
    """Auditor, Chairperson, and Super Admin can read audit logs."""
    allowed_roles = ("super_admin", "chairperson", "vice_chairperson", "auditor")


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)
    class Meta:
        model = AuditLog
        fields = "__all__"


class AuditLogViewSet(AuditMixin, RoleBasedPermissionsMixin, viewsets.ReadOnlyModelViewSet):
    read_permission_classes = [CanReadAuditLog]
    queryset = AuditLog.objects.all().order_by("-timestamp")
    serializer_class = AuditLogSerializer
