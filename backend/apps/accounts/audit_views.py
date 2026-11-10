from rest_framework import viewsets
from apps.accounts.audit_mixin import AuditMixin
from apps.accounts.models_audit import AuditLog
from apps.accounts.permissions import RoleBasedPermissionsMixin, IsSuperAdmin
from rest_framework import serializers

class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)
    class Meta:
        model = AuditLog
        fields = "__all__"

class AuditLogViewSet(AuditMixin, RoleBasedPermissionsMixin, viewsets.ReadOnlyModelViewSet):
    read_permission_classes = [IsSuperAdmin]
    queryset = AuditLog.objects.all().order_by("-timestamp")
    serializer_class = AuditLogSerializer
