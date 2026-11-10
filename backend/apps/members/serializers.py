from rest_framework import serializers
from .models import Member, MphakatiMembership


class MemberSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Member
        fields = "__all__"


class MphakatiMembershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = MphakatiMembership
        fields = "__all__"
