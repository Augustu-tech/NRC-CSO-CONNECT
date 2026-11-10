from django.contrib import admin
from .models import (
    Activity, ActivityCategory, Participation, ScoringConfiguration, 
    ScoringRule, AffiliateScoringComponent, MonthlyMphakatiAward, MonthlyMphakatiAwardWinner
)

@admin.register(ActivityCategory)
class ActivityCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "is_scoreable", "is_active")

@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ("title", "date", "category", "semester", "is_cancelled")
    list_filter = ("category", "semester", "is_cancelled")

@admin.register(Participation)
class ParticipationAdmin(admin.ModelAdmin):
    list_display = ("member", "activity", "status", "recorded_at")
    list_filter = ("status",)

@admin.register(ScoringConfiguration)
class ScoringConfigurationAdmin(admin.ModelAdmin):
    list_display = ("semester", "month", "status", "finalized_at")

@admin.register(ScoringRule)
class ScoringRuleAdmin(admin.ModelAdmin):
    list_display = ("configuration", "category", "weight")

@admin.register(AffiliateScoringComponent)
class AffiliateScoringComponentAdmin(admin.ModelAdmin):
    list_display = ("configuration", "affiliate", "component_type", "weight")

@admin.register(MonthlyMphakatiAward)
class MonthlyMphakatiAwardAdmin(admin.ModelAdmin):
    list_display = ("configuration", "winning_score", "status")

@admin.register(MonthlyMphakatiAwardWinner)
class MonthlyMphakatiAwardWinnerAdmin(admin.ModelAdmin):
    list_display = ("award", "rank", "mphakati", "score")
