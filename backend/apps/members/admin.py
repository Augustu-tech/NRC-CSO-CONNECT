from django.contrib import admin
from .models import Member, MphakatiMembership

@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = ("student_id", "first_name", "last_name", "gender", "status")
    list_filter = ("status", "gender")
    search_fields = ("first_name", "last_name", "student_id")

@admin.register(MphakatiMembership)
class MphakatiMembershipAdmin(admin.ModelAdmin):
    list_display = ("member", "mphakati", "semester", "is_current")
    list_filter = ("mphakati", "semester", "is_current")
