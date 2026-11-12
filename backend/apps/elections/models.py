from django.db import models
from apps.members.models import Member


class Election(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    is_active = models.BooleanField(default=False)
    results_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "elections_election"
        ordering = ["-start_time"]

    def __str__(self):
        return self.title


class Position(models.Model):
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name="positions")
    title = models.CharField(max_length=100, help_text="e.g. Chairperson, Treasurer")
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0, help_text="Display order (0 = first)")

    class Meta:
        db_table = "elections_position"
        ordering = ["order", "title"]
        unique_together = ("election", "title")

    def __str__(self):
        return f"{self.title} · {self.election.title}"


class Candidate(models.Model):
    position = models.ForeignKey(Position, on_delete=models.CASCADE, related_name="candidates")
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="candidacies")
    manifesto = models.TextField(blank=True, help_text="Why are you running?")

    class Meta:
        db_table = "elections_candidate"
        unique_together = ("position", "member")

    def __str__(self):
        return f"{self.member.first_name} {self.member.last_name} — {self.position.title}"


class Vote(models.Model):
    position = models.ForeignKey(Position, on_delete=models.CASCADE, related_name="votes")
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name="votes")
    voter = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="votes_cast")
    cast_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "elections_vote"
        unique_together = ("position", "voter")
        ordering = ["-cast_at"]

    def __str__(self):
        return f"{self.voter.first_name} voted for {self.candidate.member.first_name} for {self.position.title}"



class BallotSubmission(models.Model):
    """Marks that a member has finished voting. Once submitted, no more changes."""
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name="submissions")
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="ballot_submissions")
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "elections_ballotsubmission"
        unique_together = ("election", "member")

    def __str__(self):
        return f"{self.member} — {self.election}"
