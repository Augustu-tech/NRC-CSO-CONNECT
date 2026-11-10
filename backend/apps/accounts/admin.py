from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        ("NRC CSO Role", {
            "fields": ("role", "member"),
            "description": (
                "Assign organizational roles here. Only a Super Administrator "
                "can change another user's role."
            ),
        }),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("NRC CSO Role", {"fields": ("role",)}),
    )
    list_display = (
        "username", "full_name", "role", "role_badge", "is_staff", "is_active", "member",
    )
    list_filter = BaseUserAdmin.list_filter + ("role",)
    list_editable = ("role",)
    search_fields = ("username", "first_name", "last_name", "email")

    def full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or "—"
    full_name.short_description = "Name"

    def role_badge(self, obj):
        colors = {
            "super_admin": "#7c3aed", "chairperson": "#1d4ed8",
            "vice_chairperson": "#2563eb", "secretary": "#0891b2",
            "vice_secretary": "#0891b2", "treasurer": "#059669",
            "vice_treasurer": "#059669", "organizing_secretary": "#d97706",
            "publicity_secretary": "#db2777", "mphakati_leader": "#65a30d",
            "affiliate_coordinator": "#65a30d", "patron": "#6b7280",
            "auditor": "#dc2626", "member": "#374151",
        }
        color = colors.get(obj.role, "#374151")
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;'
            'border-radius:4px;font-size:11px;">{}</span>',
            color, obj.get_role_display(),
        )
    role_badge.short_description = "Role"

    def get_readonly_fields(self, request, obj=None):
        ro = list(super().get_readonly_fields(request, obj))
        if not request.user.is_superuser:
            ro.append("role")
        return ro

    def save_model(self, request, obj, form, change):
        if change and not request.user.is_superuser:
            old = User.objects.filter(pk=obj.pk).values_list("role", flat=True).first()
            if old and old != obj.role:
                obj.role = old
        super().save_model(request, obj, form, change)


from .models_audit import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("timestamp", "user", "action", "model_name", "object_id", "reason")
    list_filter = ("action", "model_name")
    search_fields = ("object_repr", "object_id", "reason", "user__username")
    date_hierarchy = "timestamp"
    readonly_fields = [f.name for f in AuditLog._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
