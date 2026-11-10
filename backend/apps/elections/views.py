from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.accounts.audit import log
from .models import Election, Position, Candidate, Vote
from .serializers import ElectionSerializer, PositionSerializer, CandidateSerializer


class IsAdminOrReadOnly(IsAuthenticated):
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return request.user.is_superuser or request.user.role in (
            "super_admin", "chairperson", "vice_chairperson", "secretary"
        )


class ElectionViewSet(viewsets.ModelViewSet):
    queryset = Election.objects.all()
    serializer_class = ElectionSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_permissions(self):
        # Allow any logged-in user to cast a vote and view their ballot
        if self.action in ["cast_vote", "my_ballot"]:
            return [IsAuthenticated()]
        return super().get_permissions()

    @action(detail=True, methods=["post"])
    def cast_vote(self, request, pk=None):
        election = self.get_object()
        member = getattr(request.user, "member", None)
        if not member:
            raise PermissionDenied("Your account is not linked to a member profile.")

        now = timezone.now()
        if not election.is_active:
            raise ValidationError("This election is not currently active.")
        if now < election.start_time or now > election.end_time:
            raise ValidationError("Voting is not open right now.")

        position_id = request.data.get("position_id")
        candidate_id = request.data.get("candidate_id")
        if not position_id or not candidate_id:
            raise ValidationError("Both position_id and candidate_id are required.")

        try:
            position = Position.objects.get(id=position_id, election=election)
            candidate = Candidate.objects.get(id=candidate_id, position=position)
        except (Position.DoesNotExist, Candidate.DoesNotExist):
            raise ValidationError("Invalid position or candidate.")

        # Use update_or_create to allow changing a vote if the election is still active
        vote, created = Vote.objects.update_or_create(
            position=position,
            voter=member,
            defaults={"candidate": candidate}
        )
        
        action = "CREATE" if created else "UPDATE"
        log(request, action, model=Vote, obj_repr=f"{member} -> {candidate}")

        msg = "Vote recorded successfully." if created else "Vote changed successfully."
        return Response({
            "detail": msg,
            "position": position.title,
            "candidate": f"{candidate.member.first_name} {candidate.member.last_name}",
        })

    @action(detail=True, methods=["get"])
    def my_ballot(self, request, pk=None):
        election = self.get_object()
        member = getattr(request.user, "member", None)

        my_votes = {}
        if member:
            for v in Vote.objects.filter(position__election=election, voter=member).select_related("position"):
                my_votes[v.position_id] = v.candidate_id

        ballot = []
        for pos in election.positions.prefetch_related("candidates__member").order_by("order", "title"):
            ballot.append({
                "position_id": pos.id,
                "position": pos.title,
                "description": pos.description,
                "candidates": [
                    {
                        "id": c.id,
                        "member_name": f"{c.member.first_name} {c.member.last_name}",
                        "student_id": c.member.student_id,
                        "profile_picture": c.member.profile_picture.url if c.member.profile_picture else None,
                        "manifesto": c.manifesto,
                    }
                    for c in pos.candidates.all()
                ],
                "my_vote": my_votes.get(pos.id),
            })

        return Response({
            "election": election.title,
            "is_active": election.is_active,
            "start_time": election.start_time,
            "end_time": election.end_time,
            "results_published": election.results_published,
            "ballot": ballot,
        })

    @action(detail=True, methods=["get"])
    def results(self, request, pk=None):
        election = self.get_object()
        is_admin = request.user.is_superuser or request.user.role in (
            "super_admin", "chairperson", "vice_chairperson"
        )
        if not election.results_published and not is_admin:
            raise PermissionDenied("Results have not been published yet.")

        data = []
        for pos in election.positions.prefetch_related("candidates__member", "votes").order_by("order", "title"):
            total = pos.votes.count()
            candidates = []
            for c in pos.candidates.all():
                count = c.votes.count()
                pct = round((count / total) * 100, 1) if total else 0
                candidates.append({
                    "id": c.id,
                    "member_name": f"{c.member.first_name} {c.member.last_name}",
                    "vote_count": count,
                    "percentage": pct,
                })
            candidates.sort(key=lambda x: x["vote_count"], reverse=True)
            winner = candidates[0] if candidates else None
            data.append({
                "position_id": pos.id,
                "position": pos.title,
                "total_votes": total,
                "candidates": candidates,
                "winner": winner["member_name"] if winner and winner["vote_count"] > 0 else None,
            })

        return Response({"election": election.title, "results": data})


class PositionViewSet(viewsets.ModelViewSet):
    queryset = Position.objects.all()
    serializer_class = PositionSerializer
    permission_classes = [IsAdminOrReadOnly]


class CandidateViewSet(viewsets.ModelViewSet):
    queryset = Candidate.objects.all()
    serializer_class = CandidateSerializer
    permission_classes = [IsAdminOrReadOnly]
