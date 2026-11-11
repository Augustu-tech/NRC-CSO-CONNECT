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

    def validate(self, data):
        # Extract dates (handle both creation and updates)
        academic_year = data.get('academic_year') or (self.instance.academic_year if self.instance else None)
        start_date = data.get('start_date') or (self.instance.start_date if self.instance else None)
        end_date = data.get('end_date') or (self.instance.end_date if self.instance else None)

        if academic_year and start_date and end_date:
            if start_date < academic_year.start_date:
                raise serializers.ValidationError(
                    {"start_date": f"Semester start date cannot be before the Academic Year start date ({academic_year.start_date})."}
                )
            if end_date > academic_year.end_date:
                raise serializers.ValidationError(
                    {"end_date": f"Semester end date cannot be after the Academic Year end date ({academic_year.end_date})."}
                )
            if start_date >= end_date:
                raise serializers.ValidationError(
                    {"end_date": "Semester end date must be after the start date."}
                )
        return data


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
