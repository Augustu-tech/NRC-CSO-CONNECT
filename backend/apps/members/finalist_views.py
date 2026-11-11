from django.utils import timezone
from rest_framework import serializers, viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied

from apps.accounts.audit import log
from apps.accounts.permissions import HasRole
from apps.organizations.models import Semester
from .models import FinalistRegistration


class CanManageFinalists(HasRole):
    allowed_roles = ("super_admin", "chairperson", "vice_chairperson", "secretary", "vice_secretary")


class FinalistRegistrationSerializer(serializers.ModelSerializer):
    member_name = serializers.SerializerMethodField()
    member_student_id = serializers.CharField(source="member.student_id", read_only=True)
    member_mphakati = serializers.SerializerMethodField()
    semester_label = serializers.CharField(source="semester.__str__", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.username", read_only=True)

    class Meta:
        model = FinalistRegistration
        fields = "__all__"
        read_only_fields = ("member", "semester", "status", "registered_at", "approved_at", "approved_by")

    def get_member_name(self, obj):
        return f"{obj.member.first_name} {obj.member.last_name}"

    def get_member_mphakati(self, obj):
        mship = obj.member.mphakati_memberships.filter(is_current=True).select_related("mphakati").first()
        return mship.mphakati.name if mship else None


class FinalistRegistrationViewSet(viewsets.ModelViewSet):
    serializer_class = FinalistRegistrationSerializer
    permission_classes = [IsAuthenticated]
    queryset = FinalistRegistration.objects.all().select_related("member", "semester", "approved_by")

    def get_queryset(self):
        qs = FinalistRegistration.objects.all().select_related("member", "semester")
        user = self.request.user
        # Admin/staff see all
        if user.is_superuser or user.role in ("super_admin", "chairperson", "vice_chairperson", "secretary", "vice_secretary"):
            return qs
        # Members only see their own
        if user.member_id:
            return qs.filter(member_id=user.member_id)
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        if not user.member_id:
            raise PermissionDenied("Your account is not linked to a member profile.")
        
        semester = Semester.objects.filter(is_active=True).first()
        if not semester:
            raise ValidationError("No active semester.")
        
        if not semester.finalist_registration_open:
            raise ValidationError("Finalist registration is not open right now.")
        
        if semester.finalist_registration_deadline and timezone.now() > semester.finalist_registration_deadline:
            raise ValidationError("The finalist registration deadline has passed.")
        
        if FinalistRegistration.objects.filter(member_id=user.member_id).exists():
            raise ValidationError("You have already registered as a finalist.")
        
        serializer.save(member_id=user.member_id, semester=semester)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        if not (request.user.is_superuser or request.user.role in ("super_admin", "chairperson", "vice_chairperson", "secretary", "vice_secretary")):
            raise PermissionDenied("You cannot approve finalists.")
        reg = self.get_object()
        reg.status = "APPROVED"
        reg.approved_at = timezone.now()
        reg.approved_by = request.user
        reg.save()
        log(request, "APPROVE", model=FinalistRegistration, obj=reg, new={"status": "APPROVED"})
        return Response(FinalistRegistrationSerializer(reg).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        if not (request.user.is_superuser or request.user.role in ("super_admin", "chairperson", "vice_chairperson", "secretary", "vice_secretary")):
            raise PermissionDenied("You cannot reject finalists.")
        reg = self.get_object()
        reg.status = "REJECTED"
        reg.approved_at = timezone.now()
        reg.approved_by = request.user
        reg.save()
        log(request, "VOID", model=FinalistRegistration, obj=reg, new={"status": "REJECTED"})
        return Response(FinalistRegistrationSerializer(reg).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def finalist_window_status(request):
    """Return whether registration is open + the current user's status."""
    semester = Semester.objects.filter(is_active=True).first()
    if not semester:
        return Response({"open": False, "reason": "No active semester."})
    
    user_status = None
    if request.user.member_id:
        reg = FinalistRegistration.objects.filter(member_id=request.user.member_id).first()
        if reg:
            user_status = {
                "status": reg.status,
                "program": reg.program,
                "registered_at": reg.registered_at,
            }
    
    deadline_passed = semester.finalist_registration_deadline and timezone.now() > semester.finalist_registration_deadline
    
    return Response({
        "open": semester.finalist_registration_open and not deadline_passed,
        "semester": str(semester),
        "deadline": semester.finalist_registration_deadline,
        "deadline_passed": deadline_passed,
        "my_registration": user_status,
    })
