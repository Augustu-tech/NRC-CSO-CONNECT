from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.audit_mixin import AuditMixin
from apps.accounts.permissions import (
    RoleBasedPermissionsMixin, CanReadMembers, CanManageMembers,
)
from apps.organizations.models import Mphakati, Semester
from .models import Member, MphakatiMembership
from .serializers import MemberSerializer, MphakatiMembershipSerializer


class MemberViewSet(AuditMixin, RoleBasedPermissionsMixin, viewsets.ModelViewSet):
    read_permission_classes = [CanReadMembers]
    write_permission_classes = [CanManageMembers]
    queryset = Member.objects.all().order_by("last_name")
    serializer_class = MemberSerializer

    ADMIN_ROLES = (
        "super_admin", "chairperson", "vice_chairperson",
        "secretary", "vice_secretary", "treasurer", "vice_treasurer",
        "auditor", "organizing_secretary",
    )

    def get_queryset(self):
        qs = Member.objects.all().order_by("last_name")
        user = self.request.user
        if not user or not user.is_authenticated:
            return qs.none()
        if user.is_superuser or user.role in self.ADMIN_ROLES:
            return qs
        if user.role == "mphakati_leader" and user.member_id:
            my_mph = MphakatiMembership.objects.filter(
                member_id=user.member_id, is_current=True
            ).values_list("mphakati_id", flat=True)
            return qs.filter(
                mphakati_memberships__mphakati_id__in=my_mph,
                mphakati_memberships__is_current=True,
            ).distinct()
        if user.role == "affiliate_coordinator":
            # Coordinators need to see all ACTIVE members to be able to add them to their affiliate.
            # Write restrictions are enforced in AffiliateMembershipViewSet.
            return qs.filter(status__iexact="ACTIVE")
        return qs.none()


    @action(detail=True, methods=["get"])
    def profile_data(self, request, pk=None):
        """Return full profile, participation, contribution, and rank data for any member."""
        member = self.get_object()
        
        # 1. Base profile data
        from .serializers import MemberSerializer
        profile_data = MemberSerializer(member).data
        membership = MphakatiMembership.objects.filter(member=member, is_current=True).select_related("mphakati", "semester").first()
        
        if membership:
            profile_data["current_mphakati"] = {"id": membership.mphakati.id, "name": membership.mphakati.name}
            profile_data["current_semester"] = {"id": membership.semester.id, "label": str(membership.semester)}
        else:
            profile_data["current_mphakati"] = None
            profile_data["current_semester"] = None

        # 2. Participation
        from apps.activities.models import Participation
        parts = Participation.objects.filter(member=member).select_related("activity", "activity__category")
        total = parts.count()
        present = parts.filter(status__in=["PRESENT", "LATE", "PARTICIPATED", "SERVED", "CONTRIBUTED"]).count()
        excused = parts.filter(status="EXCUSED").count()
        absent = parts.filter(status="ABSENT").count()
        denom = max(total - excused, 1)
        rate = round((present / denom) * 100, 2) if total else 0.0
        
        participation = {
            "total_records": total,
            "present": present,
            "excused": excused,
            "absent": absent,
            "participation_rate": rate,
            "history": [{"activity_id": p.activity_id, "title": p.activity.title, "date": p.activity.date.isoformat(), "category": p.activity.category.name, "status": p.status} for p in parts.order_by("-activity__date")[:20]]
        }

        # 3. Contributions
        from apps.finance.models import FinanceTransaction
        from decimal import Decimal
        txs = FinanceTransaction.objects.filter(member=member).select_related("category").order_by("-transaction_date")
        total_income = sum((t.amount for t in txs if t.transaction_type.upper() == "INCOME"), Decimal("0"))
        contributions = {
            "total_contributed": float(total_income),
            "record_count": txs.count(),
            "history": [{"id": t.id, "date": t.transaction_date.isoformat(), "type": t.transaction_type, "category": t.category.name, "amount": float(t.amount), "reference": t.reference_number} for t in txs[:20]]
        }

        # 4. Rank (if membership exists)
        rank = None
        if membership:
            from apps.activities.models import ScoringConfiguration
            from apps.activities.scoring import calculate_leaderboard
            configs = ScoringConfiguration.objects.filter(semester=membership.semester).order_by("-month")
            for cfg in configs:
                cards = calculate_leaderboard(cfg)
                my_card = next((c for c in cards if c.mphakati_id == membership.mphakati_id), None)
                if my_card and my_card.final_score is not None:
                    rank = {
                        "semester": str(membership.semester),
                        "month": cfg.month.isoformat(),
                        "mphakati": membership.mphakati.name,
                        "rank": my_card.rank,
                        "final_score": float(my_card.final_score),
                        "out_of": len(cards)
                    }
                    break

        return Response({
            "profile": profile_data,
            "participation": participation,
            "contributions": contributions,
            "rank": rank
        })

    @action(detail=True, methods=["post"])
    def transfer(self, request, pk=None):
        member = self.get_object()
        new_mphakati_id = request.data.get("mphakati_id")
        semester_id = request.data.get("semester_id")
        
        if not new_mphakati_id or not semester_id:
            return Response({"detail": "mphakati_id and semester_id required."}, status=400)
            
        try:
            new_mphakati = Mphakati.objects.get(id=new_mphakati_id)
            semester = Semester.objects.get(id=semester_id)
        except (Mphakati.DoesNotExist, Semester.DoesNotExist):
            return Response({"detail": "Invalid Mphakati or Semester."}, status=400)
            
        today = timezone.now().date()
        
        # Check if they are already in this semester
        existing = MphakatiMembership.objects.filter(member=member, semester=semester, is_current=True).first()
        
        if existing and existing.mphakati == new_mphakati:
            return Response({"detail": f"Member is already in {new_mphakati.name}."}, status=400)
        
        if existing:
            # Update the existing record (same semester transfer)
            existing.mphakati = new_mphakati
            existing.save()
        else:
            # Create a new record (different semester transfer)
            MphakatiMembership.objects.create(
                member=member,
                mphakati=new_mphakati,
                semester=semester,
                start_date=today,
                is_current=True,
            )
            # Mark old memberships as not current
            MphakatiMembership.objects.filter(member=member).exclude(semester=semester).update(is_current=False)
        
        # Log the change via AuditMixin
        from apps.accounts.audit import log
        log(request, "UPDATE", model=Member, obj=member, 
            reason=f"Transferred to {new_mphakati.name}")
        
        return Response({"detail": f"Transferred to {new_mphakati.name}."})


class MphakatiMembershipViewSet(AuditMixin, RoleBasedPermissionsMixin, viewsets.ModelViewSet):
    read_permission_classes = [CanReadMembers]
    write_permission_classes = [CanManageMembers]
    queryset = MphakatiMembership.objects.all()
    serializer_class = MphakatiMembershipSerializer

    ADMIN_ROLES = (
        "super_admin", "chairperson", "vice_chairperson",
        "secretary", "vice_secretary", "treasurer", "vice_treasurer",
        "auditor", "organizing_secretary",
    )

    def get_queryset(self):
        qs = MphakatiMembership.objects.all()
        user = self.request.user
        if not user or not user.is_authenticated:
            return qs.none()
        if user.is_superuser or user.role in self.ADMIN_ROLES:
            return qs
        if user.role == "mphakati_leader" and user.member_id:
            my_mph = MphakatiMembership.objects.filter(
                member_id=user.member_id, is_current=True
            ).values_list("mphakati_id", flat=True)
            return qs.filter(mphakati_id__in=my_mph)
        return qs.none()
