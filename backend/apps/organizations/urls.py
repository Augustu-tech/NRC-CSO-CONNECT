from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("academic-years", views.AcademicYearViewSet)
router.register("semesters", views.SemesterViewSet)
router.register("miphakati", views.MphakatiViewSet)
router.register("affiliates", views.AffiliateViewSet)
router.register("affiliate-memberships", views.AffiliateMembershipViewSet)

urlpatterns = router.urls
