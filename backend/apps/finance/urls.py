from rest_framework.routers import DefaultRouter
from django.urls import path

from . import views, summary_views

router = DefaultRouter()
router.register("finance-categories", views.FinanceCategoryViewSet)
router.register("finance-transactions", views.FinanceTransactionViewSet)

urlpatterns = router.urls + [
    path("summary/", summary_views.finance_summary, name="finance-summary"),
]
