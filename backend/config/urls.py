from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView, TokenRefreshView, TokenBlacklistView,
)
from rest_framework.routers import DefaultRouter

from apps.accounts import me_views as mev
from apps.accounts.audit_views import AuditLogViewSet
from apps.activities import dashboard_views as dash
from apps.activities import export_views as exp

# API Router for isolated ViewSets (like Audit Logs)
router = DefaultRouter()
router.register("audit-logs", AuditLogViewSet, basename="audit-log")

urlpatterns = [
    path("admin/", admin.site.urls),
    
    # Auth
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/token/blacklist/", TokenBlacklistView.as_view(), name="token_blacklist"),
    path("api/auth/me/", mev.me, name="auth-me"),
    
    # App APIs
    path("api/organizations/", include("apps.organizations.urls")),
    path("api/members/", include("apps.members.urls")),
    path("api/activities/", include("apps.activities.urls")),
    path("api/finance/", include("apps.finance.urls")),
    path("api/engagement/", include("apps.engagement.urls")),
    
    # Dashboards
    path("api/dashboard/overview/", dash.overview, name="dashboard-overview"),
    path("api/dashboard/mphakati/<int:pk>/", dash.mphakati_detail, name="dashboard-mphakati"),
    path("api/dashboard/current-champion/", dash.current_champion, name="dashboard-champion"),
    
    # Reports
    path("api/reports/certificate/<int:config_id>/", exp.certificate_pdf, name="report-cert"),
    path("api/reports/monthly/<int:config_id>/", exp.monthly_report_xlsx, name="report-monthly"),
    path("api/reports/financial/<int:semester_id>/", exp.financial_report_xlsx, name="report-financial"),
    path("api/reports/financial/<int:semester_id>/<int:year>/<int:month>/", exp.financial_report_xlsx, name="report-financial-monthly"),
]

# Add router URLs (Audit Logs)
urlpatterns += router.urls
