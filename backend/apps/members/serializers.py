from rest_framework import serializers
from .models import Member, MphakatiMembership


class MemberSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    current_mphakati = serializers.SerializerMethodField()

    class Meta:
        model = Member
        fields = "__all__"

    def validate_profile_picture(self, value):
        # 1. Check file size (max 5MB)
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Image size cannot exceed 5MB.")
        
        # 2. Check file type (must be an actual image)
        import imghdr
        # We read the file to check its actual binary signature
        image_type = imghdr.what(value)
        if image_type not in ['jpeg', 'png', 'gif', 'webp']:
            raise serializers.ValidationError("Upload a valid image (JPEG, PNG, GIF, or WEBP).")
        
        return value

    def get_current_mphakati(self, obj):
        mship = obj.mphakati_memberships.filter(is_current=True).select_related('mphakati').first()
        return mship.mphakati.name if mship else None


class MphakatiMembershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = MphakatiMembership
        fields = "__all__"
