from django.contrib import admin
from .models import AcademicYear, Semester, Mphakati, Affiliate, AffiliateMembership

@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ("name", "start_date", "end_date", "is_active")

@admin.register(Semester)
class SemesterAdmin(admin.ModelAdmin):
    list_display = ("academic_year", "number", "start_date", "end_date", "is_active")

@admin.register(Mphakati)
class MphakatiAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active")

@admin.register(Affiliate)
class AffiliateAdmin(admin.ModelAdmin):
    list_display = ("name", "scoring_method", "is_active")

@admin.register(AffiliateMembership)
class AffiliateMembershipAdmin(admin.ModelAdmin):
    list_display = ("member", "affiliate", "semester", "is_active")
    list_filter = ("affiliate", "semester", "is_active")
