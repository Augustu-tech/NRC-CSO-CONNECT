from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("announcements", views.AnnouncementViewSet)
router.register("prayer-intentions", views.PrayerIntentionViewSet)
router.register("notifications", views.NotificationViewSet, basename="notification")

urlpatterns = router.urls
