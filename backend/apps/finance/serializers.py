from rest_framework import serializers
from .models import FinanceCategory, FinanceTransaction


class FinanceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FinanceCategory
        fields = "__all__"


class FinanceTransactionSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    source_display = serializers.CharField(source="get_source_type_display", read_only=True)
    donor_display = serializers.SerializerMethodField()

    class Meta:
        model = FinanceTransaction
        fields = "__all__"
        read_only_fields = ("created_at", "updated_at", "recorded_by", "approved_by", "approved_at")

    def get_donor_display(self, obj):
        if obj.source_type != "DONOR":
            return ""
        if obj.donor_anonymous:
            return "Anonymous Well-Wisher"
        return obj.donor_name or "Unknown Donor"

    def validate(self, data):
        tt = (data.get("transaction_type") or "").upper()
        desc = (data.get("description") or "").strip()
        if tt == "EXPENSE" and len(desc) < 5:
            raise serializers.ValidationError({
                "description": "Expenses require a description of at least 5 characters "
                               "explaining what the money was used for."
            })
        return data
