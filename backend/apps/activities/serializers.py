from rest_framework import serializers
from .models import (
    Activity, ActivityCategory, Participation,
    ScoringConfiguration, ScoringRule,
    AffiliateScoringComponent,
    MonthlyMphakatiAward, MonthlyMphakatiAwardWinner,
)


class ActivityCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityCategory
        fields = "__all__"


class ActivitySerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    mphakati_name = serializers.CharField(source="mphakati.name", read_only=True)

    class Meta:
        model = Activity
        fields = "__all__"


class ParticipationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Participation
        fields = "__all__"


class ScoringConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScoringConfiguration
        fields = "__all__"
        read_only_fields = ("status", "finalized_at", "created_at", "updated_at")


class ScoringRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScoringRule
        fields = "__all__"


class AffiliateScoringComponentSerializer(serializers.ModelSerializer):
    class Meta:
        model = AffiliateScoringComponent
        fields = "__all__"


class MonthlyMphakatiAwardSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyMphakatiAward
        fields = "__all__"


class MonthlyMphakatiAwardWinnerSerializer(serializers.ModelSerializer):
    mphakati_name = serializers.CharField(source="mphakati.name", read_only=True)

    class Meta:
        model = MonthlyMphakatiAwardWinner
        fields = "__all__"
