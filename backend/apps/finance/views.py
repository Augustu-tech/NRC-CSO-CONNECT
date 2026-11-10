from rest_framework import viewsets
from apps.accounts.audit_mixin import AuditMixin
from apps.accounts.permissions import (
    RoleBasedPermissionsMixin, CanReadFinanceDetail, CanRecordFinance,
)
from .models import FinanceCategory, FinanceTransaction
from .serializers import FinanceCategorySerializer, FinanceTransactionSerializer


class FinanceCategoryViewSet(AuditMixin, RoleBasedPermissionsMixin, viewsets.ModelViewSet):
    read_permission_classes = [CanReadFinanceDetail]
    write_permission_classes = [CanRecordFinance]
    queryset = FinanceCategory.objects.all()
    serializer_class = FinanceCategorySerializer


class FinanceTransactionViewSet(AuditMixin, RoleBasedPermissionsMixin, viewsets.ModelViewSet):
    read_permission_classes = [CanReadFinanceDetail]
    write_permission_classes = [CanRecordFinance]
    queryset = FinanceTransaction.objects.all().order_by("-transaction_date")
    serializer_class = FinanceTransactionSerializer

    def perform_create(self, serializer):
        # Automatically set recorded_by to the authenticated user
        serializer.save(recorded_by=self.request.user)
        super().perform_create(serializer)
