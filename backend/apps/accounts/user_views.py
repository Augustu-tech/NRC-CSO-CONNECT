from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import User
from rest_framework import serializers
from .permissions import IsSuperAdmin

class UserAdminSerializer(serializers.ModelSerializer):
    member_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "role", "member", "member_name", "is_active"]
        extra_kwargs = {"password": {"write_only": True}}

    def get_member_name(self, obj):
        if obj.member:
            return f"{obj.member.first_name} {obj.member.last_name}"
        return None

class UserManagementViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("username")
    serializer_class = UserAdminSerializer
    permission_classes = [IsSuperAdmin]

    @action(detail=True, methods=["post"])
    def toggle_active(self, request, pk=None):
        user = self.get_object()
        if user.is_superuser:
            return Response({"detail": "Cannot deactivate a superuser."}, status=400)
        user.is_active = not user.is_active
        user.save()
        return Response({"detail": f"User {'activated' if user.is_active else 'deactivated'}."})
