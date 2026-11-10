import { useEffect, useState } from "react";
import { Trophy, ChevronDown, ChevronUp } from "lucide-react";
import { getLeaderboard, getScoringConfigs } from "../api/client";
import { Card } from "../ui/Card";
import { PageHeader } from "../ui/PageHeader";
import { EmptyState } from "../ui/EmptyState";

export default function LeaderboardPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<number | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    getScoringConfigs().then((r) => {
      const list = r.data.results || r.data || [];
      setConfigs(list);
      if (list.length > 0) setSelectedConfig(list[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedConfig) return;
    setLoading(true);
    getLeaderboard(selectedConfig)
      .then((r) => setData(r.data))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [selectedConfig]);

  const sorted = [...data].sort((a, b) => {
    if (a.final_score === null) return 1;
    if (b.final_score === null) return -1;
    return b.final_score - a.final_score;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leaderboard"
        subtitle="Mphakati performance ranking"
        action={
          <select
            value={selectedConfig || ""}
            onChange={(e) => setSelectedConfig(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
          >
            {configs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.month} ({c.status})
              </option>
            ))}
          </select>
        }
      />

      {loading && <Card className="p-5 text-sm text-slate-500">Loading…</Card>}
      {!loading && sorted.length === 0 && <Card><EmptyState title="No data for this month" /></Card>}

      {!loading && sorted.length > 0 && (
        <div className="space-y-3">
          {sorted.map((row, index) => (
            <Card key={row.mphakati_id} className="overflow-hidden">
              {/* Header Row */}
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition"
                onClick={() => setExpanded(expanded === row.mphakati_id ? null : row.mphakati_id)}
              >
                <div className="flex items-center gap-3">
                  <span className="h-9 w-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{row.mphakati_name}</p>
                    {index === 0 && row.final_score !== null && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <Trophy size={12} /> Current champion
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-semibold text-faith-700">
                      {row.final_score !== null ? `${row.final_score}%` : "N/A"}
                    </p>
                  </div>
                  {expanded === row.mphakati_id ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </div>
              </div>

              {/* Expanded Breakdown */}
              {expanded === row.mphakati_id && (
                <div className="border-t border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-2 font-semibold">How this score was calculated</p>
                  {row.categories.length === 0 ? (
                    <p className="text-sm text-slate-500">No categories configured for this period.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="text-slate-500 text-xs uppercase">
                        <tr>
                          <th className="text-left py-2">Category</th>
                          <th className="text-right py-2">Participation %</th>
                          <th className="text-right py-2">Weight</th>
                          <th className="text-right py-2">Weighted Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {row.categories.map((c: any) => (
                          <tr key={c.category_id} className="border-t border-slate-200">
                            <td className="py-2 text-slate-700">{c.category}</td>
                            <td className="py-2 text-right">
                              {c.score !== null ? (
                                <span className={c.score > 0 ? "text-emerald-600 font-medium" : "text-red-500"}>
                                  {c.score}%
                                </span>
                              ) : "N/A"}
                            </td>
                            <td className="py-2 text-right text-slate-500">{c.weight}%</td>
                            <td className="py-2 text-right font-medium">{c.weighted ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <p className="text-xs text-slate-400 mt-3">
                    * Participation % = (Members Present / Eligible Members). If it is 0%, no attendance was recorded for this category.
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
