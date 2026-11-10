from rest_framework import serializers
from .models import Member, MphakatiMembership


class MemberSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    current_mphakati = serializers.SerializerMethodField()

    class Meta:
        model = Member
        fields = "__all__"

    def get_current_mphakati(self, obj):
        mship = obj.mphakati_memberships.filter(is_current=True).select_related('mphakati').first()
        return mship.mphakati.name if mship else None


class MphakatiMembershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = MphakatiMembership
        fields = "__all__"
