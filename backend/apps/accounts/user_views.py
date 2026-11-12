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

    def validate(self, data):
        role = data.get("role") or (self.instance.role if self.instance else "member")
        member = data.get("member") if "member" in data else (self.instance.member if self.instance else None)
        is_super = data.get("is_superuser", self.instance.is_superuser if self.instance else False)
        # Only Super Admin is exempt from having a member link
        if not is_super and not member:
            raise serializers.ValidationError(
                {"member": "Every account except Super Admin must be linked to a Member profile. "
                           "Create a member first, then link them here."}
            )
        return data

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
