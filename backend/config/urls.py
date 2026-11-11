from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView, TokenRefreshView, TokenBlacklistView,
)
from rest_framework.routers import DefaultRouter

# View Imports
from apps.accounts import me_views as mev
from apps.accounts.auth_views import CustomTokenObtainPairView, register, forgot_password, reset_password_confirm
from apps.accounts.audit_views import AuditLogViewSet
from apps.accounts.user_views import UserManagementViewSet
from apps.members.finalist_views import FinalistRegistrationViewSet, finalist_window_status, finalist_certificate_pdf
from apps.activities import dashboard_views as dash
from apps.activities import export_views as exp

# API Router specifically for Audit Logs
router = DefaultRouter()
router.register("audit-logs", AuditLogViewSet, basename="audit-log")
router.register("users", UserManagementViewSet, basename="user-management")
router.register("finalists", FinalistRegistrationViewSet, basename="finalist")

urlpatterns = [
    path("admin/", admin.site.urls),
    
    # Auth
    path("api/auth/token/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/token/blacklist/", TokenBlacklistView.as_view(), name="token_blacklist"),
    path("api/auth/me/", mev.me, name="auth-me"),
    path("api/auth/register/", register, name="auth-register"),
    path("api/auth/forgot-password/", forgot_password, name="auth-forgot-password"),
    path("api/auth/reset-password/", reset_password_confirm, name="auth-reset-password"),
    
    # App APIs
    path("api/organizations/", include("apps.organizations.urls")),
    path("api/members/", include("apps.members.urls")),
    path("api/activities/", include("apps.activities.urls")),
    path("api/finance/", include("apps.finance.urls")),
    path("api/engagement/", include("apps.engagement.urls")),
    path("api/", include("apps.elections.urls")),  # Elections
    
    # Dashboards
    path("api/dashboard/overview/", dash.overview, name="dashboard-overview"),
    path("api/dashboard/mphakati/<int:pk>/", dash.mphakati_detail, name="dashboard-mphakati"),
    path("api/dashboard/current-champion/", dash.current_champion, name="dashboard-champion"),
    
    # Reports
    path("api/reports/certificate/<int:config_id>/", exp.certificate_pdf, name="report-cert"),
    path("api/reports/monthly/<int:config_id>/", exp.monthly_report_xlsx, name="report-monthly"),
    path("api/reports/financial/<int:semester_id>/", exp.financial_report_xlsx, name="report-financial"),
    path("api/reports/financial/<int:semester_id>/<int:year>/<int:month>/", exp.financial_report_xlsx, name="report-financial-monthly"),
    
    # Audit Logs (Mounted under /api/)
    path("api/finalists/window/", finalist_window_status, name="finalist-window"),
    path("api/finalists/<int:pk>/certificate/", finalist_certificate_pdf, name="finalist-certificate"),
    path("api/", include(router.urls)),
]

# Serve media files (profile pictures) during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
