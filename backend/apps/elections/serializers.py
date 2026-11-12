from rest_framework import serializers
from apps.members.models import Member
from .models import Election, Position, Candidate, Vote


class CandidateSerializer(serializers.ModelSerializer):
    member_name = serializers.SerializerMethodField()
    member_student_id = serializers.CharField(source="member.student_id", read_only=True)
    profile_picture = serializers.ImageField(source="member.profile_picture", read_only=True)
    vote_count = serializers.SerializerMethodField()

    class Meta:
        model = Candidate
        fields = ["id", "position", "member", "member_name", "member_student_id", "profile_picture", "manifesto", "vote_count"]

    def get_member_name(self, obj):
        return f"{obj.member.first_name} {obj.member.last_name}"

    def get_vote_count(self, obj):
        return obj.votes.count()

    def validate(self, data):
        position = data.get("position") or (self.instance.position if self.instance else None)
        member = data.get("member") or (self.instance.member if self.instance else None)
        if position and member:
            qs = Candidate.objects.filter(
                position__election=position.election,
                member=member,
            )
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    "This member is already a candidate for another position in this election. "
                    "A member can only contest for one position per election."
                )
        return data


class PositionSerializer(serializers.ModelSerializer):
    candidates = CandidateSerializer(many=True, read_only=True)

    class Meta:
        model = Position
        fields = ["id", "election", "title", "description", "order", "candidates"]


class ElectionSerializer(serializers.ModelSerializer):
    positions = PositionSerializer(many=True, read_only=True)
    total_votes = serializers.SerializerMethodField()

    class Meta:
        model = Election
        fields = "__all__"

    def get_total_votes(self, obj):
        return Vote.objects.filter(position__election=obj).count()
