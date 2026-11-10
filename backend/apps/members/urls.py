from rest_framework.routers import DefaultRouter
from django.urls import path

from . import views, me_views

router = DefaultRouter()
router.register("members", views.MemberViewSet)
router.register("mphakati-memberships", views.MphakatiMembershipViewSet)

urlpatterns = router.urls + [
    path("me/profile/", me_views.my_profile, name="me-profile"),
    path("me/participation/", me_views.my_participation, name="me-participation"),
    path("me/contributions/", me_views.my_contributions, name="me-contributions"),
    path("me/rank/", me_views.my_rank, name="me-rank"),
]
