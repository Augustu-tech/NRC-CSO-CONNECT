from django.core.management.base import BaseCommand, CommandError

from apps.activities.models import ScoringConfiguration
from apps.activities.scoring import calculate_leaderboard


class Command(BaseCommand):
    help = "Preview monthly Mphakati scores without saving."

    def add_arguments(self, parser):
        parser.add_argument("config_id", nargs="?", type=int,
                            help="ScoringConfiguration ID. Omit to list available.")

    def handle(self, *args, **options):
        config_id = options.get("config_id")

        if not config_id:
            self.stdout.write("Available ScoringConfigurations:\n")
            for cfg in ScoringConfiguration.objects.select_related(
                "semester", "semester__academic_year"
            ).order_by("-month"):
                self.stdout.write(
                    f"  id={cfg.id}  month={cfg.month}  "
                    f"semester={cfg.semester}  status={cfg.status}"
                )
            self.stdout.write("\nRe-run:  python manage.py preview_scores <id>")
            return

        try:
            config = ScoringConfiguration.objects.get(pk=config_id)
        except ScoringConfiguration.DoesNotExist:
            raise CommandError(f"ScoringConfiguration {config_id} not found")

        self.stdout.write("")
        self.stdout.write("=" * 78)
        self.stdout.write(f"Scoring preview — month={config.month}  semester={config.semester}")
        self.stdout.write("=" * 78)

        for card in calculate_leaderboard(config):
            medal = {1: "1st", 2: "2nd", 3: "3rd"}.get(card.rank, f"{card.rank}th")
            final = f"{card.final_score}%" if card.final_score is not None else "N/A"
            self.stdout.write(f"\n[{medal}] {card.mphakati_name}  ->  {final}")
            self.stdout.write(
                f"   weight scored: {card.scored_weight}% / {card.total_weight}%"
            )
            for c in card.categories:
                sc = f"{c.score}%" if c.score is not None else "N/A"
                wt = f"{c.weighted}" if c.weighted is not None else "-"
                self.stdout.write(
                    f"     {c.category_name:<25} score={sc:>8}  "
                    f"weight={c.weight:>5}%  -> {wt:>6}   ({c.note})"
                )
