from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("activity-categories", views.ActivityCategoryViewSet)
router.register("activities", views.ActivityViewSet)
router.register("participation", views.ParticipationViewSet)
router.register("scoring-configurations", views.ScoringConfigurationViewSet)
router.register("scoring-rules", views.ScoringRuleViewSet)
router.register("affiliate-scoring", views.AffiliateScoringComponentViewSet)
router.register("awards", views.MonthlyMphakatiAwardViewSet)
router.register("award-winners", views.MonthlyMphakatiAwardWinnerViewSet)

urlpatterns = router.urls
