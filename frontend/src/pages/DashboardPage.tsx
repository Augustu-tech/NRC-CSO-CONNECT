import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, Users, CalendarDays, Wallet } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { hasPerm } from "../config/permissions";
import { api } from "../api/client";
import { Card } from "../ui/Card";
import { Stat } from "../ui/Stat";
import { PageHeader } from "../ui/PageHeader";

export default function DashboardPage() {
  const { me } = useAuth();
  const [overview, setOverview] = useState<any>(null);
  const [champion, setChampion] = useState<any>(null);
  const [myRank, setMyRank] = useState<any>(null);
  const [finance, setFinance] = useState<any>(null);

  const canSeeFinance = hasPerm(me, "finance.view_aggregate");
  const isMember = me?.role === "member" && me?.has_member_profile;

  useEffect(() => {
    api.get("/dashboard/overview/").then((r) => setOverview(r.data)).catch(() => {});
    api.get("/dashboard/current-champion/").then((r) => setChampion(r.data)).catch(() => {});
    if (isMember) {
      api.get("/members/me/rank/").then((r) => setMyRank(r.data)).catch(() => {});
    }
    if (canSeeFinance) {
      api.get("/finance/summary/").then((r) => setFinance(r.data)).catch(() => {});
    }
  }, [canSeeFinance, isMember]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${me?.full_name || me?.username}`}
        subtitle={
          me?.role === "member"
            ? "Your participation, rank, and community snapshot."
            : "A live snapshot of the community."
        }
      />

      {/* Champion — visible to all */}
      {champion?.champion && (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                <Trophy size={20} strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Mphakati of the Month · {champion.month}
                </p>
                <p className="text-lg font-semibold text-slate-900">
                  {champion.champion.mphakati}
                </p>
              </div>
            </div>
            <p className="text-3xl font-bold text-faith-700">
              {champion.champion.score}%
            </p>
          </div>
        </Card>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overview && (
          <Stat
            label="Total Members"
            value={overview.total_members}
            hint={overview.semester}
          />
        )}
        {myRank && (
          <Stat
            label="Your Rank"
            value={`#${myRank.rank} / ${myRank.out_of}`}
            hint={`${myRank.mphakati} · ${myRank.final_score}%`}
            tone="accent"
          />
        )}
        {canSeeFinance && finance && (
          <Stat
            label="Balance"
            value={`K${finance.totals.balance.toFixed(2)}`}
            hint="Community funds"
            tone="positive"
          />
        )}
        {overview?.activities_this_month !== undefined && (
          <Stat
            label="Activities This Month"
            value={overview.activities_this_month}
            hint={overview.current_month}
          />
        )}
      </div>

      {/* Quick links — only those user can access */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickLink to="/leaderboard" icon={Trophy} label="Leaderboard"
                   text="See current Mphakati rankings" />
        {hasPerm(me, "activities.view") && (
          <QuickLink to="/activities" icon={CalendarDays} label="Activities"
                     text="Browse upcoming and past events" />
        )}
        {hasPerm(me, "members.view") && (
          <QuickLink to="/members" icon={Users} label="Members"
                     text="Directory of NRC CSO members" />
        )}
        {canSeeFinance && (
          <QuickLink to="/finance" icon={Wallet} label="Finance"
                     text="Income, expenses, and balance" />
        )}
      </div>

      {/* Community breakdown */}
      {overview?.per_mphakati && (
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500 mb-3">
            Community Breakdown
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(overview.per_mphakati).map(([name, count]) => (
              <div key={name}>
                <p className="text-2xl font-semibold text-slate-900">
                  {count as number}
                </p>
                <p className="text-xs text-slate-500">{name}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function QuickLink({
  to, icon: Icon, label, text,
}: { to: string; icon: typeof Trophy; label: string; text: string }) {
  return (
    <Link to={to}>
      <Card className="p-4 hover:border-faith-300 transition">
        <Icon size={18} className="text-faith-700" />
        <p className="text-sm font-medium text-slate-900 mt-2">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{text}</p>
      </Card>
    </Link>
  );
}
