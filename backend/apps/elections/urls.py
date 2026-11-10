from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("elections", views.ElectionViewSet)
router.register("positions", views.PositionViewSet)
router.register("candidates", views.CandidateViewSet)

urlpatterns = router.urls
