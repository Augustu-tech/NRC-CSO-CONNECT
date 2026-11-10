from rest_framework import serializers
from .models import AcademicYear, Semester, Mphakati, Affiliate, AffiliateMembership


class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = "__all__"


class SemesterSerializer(serializers.ModelSerializer):
    academic_year = AcademicYearSerializer(read_only=True)
    academic_year_id = serializers.PrimaryKeyRelatedField(
        queryset=AcademicYear.objects.all(),
        source="academic_year",
        write_only=True,
    )

    class Meta:
        model = Semester
        fields = "__all__"


class MphakatiSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mphakati
        fields = "__all__"


class AffiliateSerializer(serializers.ModelSerializer):
    coordinator_name = serializers.SerializerMethodField()

    class Meta:
        model = Affiliate
        fields = "__all__"

    def get_coordinator_name(self, obj):
        if obj.coordinator:
            return f"{obj.coordinator.first_name} {obj.coordinator.last_name}"
        return None


class AffiliateMembershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = AffiliateMembership
        fields = "__all__"
