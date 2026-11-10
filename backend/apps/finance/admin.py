from django.contrib import admin
from .models import FinanceCategory, FinanceTransaction

@admin.register(FinanceCategory)
class FinanceCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "transaction_type", "is_active")
    list_filter = ("transaction_type", "is_active")

@admin.register(FinanceTransaction)
class FinanceTransactionAdmin(admin.ModelAdmin):
    list_display = ("transaction_date", "transaction_type", "category", "amount", "member", "approval_status")
    list_filter = ("transaction_type", "approval_status", "category", "semester")
    search_fields = ("description", "reference_number")
