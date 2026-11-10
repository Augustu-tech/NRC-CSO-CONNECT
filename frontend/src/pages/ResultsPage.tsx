import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Trophy, Users } from "lucide-react";
import { getResults } from "../api/client";
import { Card } from "../ui/Card";

export default function ResultsPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getResults(Number(id))
      .then((r) => setData(r.data))
      .catch((e) => setError(e.response?.data?.detail || "Failed to load results."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading results…</div>;
  if (error) return <Card className="p-8 text-center text-red-600">{error}</Card>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <Link to="/elections" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft size={16} /> Back to Elections
      </Link>

      <div className="bg-gradient-to-r from-faith-900 to-faith-700 text-white p-6 rounded-2xl">
        <p className="text-[10px] uppercase tracking-widest text-faith-300">Election Results</p>
        <h1 className="text-2xl font-bold mt-1">{data.election}</h1>
      </div>

      {data.results.map((pos: any) => (
        <Card key={pos.position_id} className="overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">{pos.position}</h2>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                <Users size={12} /> {pos.total_votes} total vote{pos.total_votes !== 1 ? "s" : ""}
              </p>
            </div>
            {pos.winner && (
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide text-amber-600 font-bold flex items-center gap-1 justify-end">
                  <Trophy size={12} /> Winner
                </p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{pos.winner}</p>
              </div>
            )}
          </div>

          <div className="p-5 space-y-3">
            {pos.candidates.length === 0 ? (
              <p className="text-sm text-slate-500">No candidates.</p>
            ) : (
              pos.candidates.map((c: any, idx: number) => (
                <div key={c.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{c.member_name}</span>
                      {idx === 0 && c.vote_count > 0 && (
                        <Trophy size={12} className="text-amber-500" />
                      )}
                    </div>
                    <span className="text-slate-600 font-medium">
                      {c.vote_count} ({c.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        idx === 0 && c.vote_count > 0 ? "bg-gradient-to-r from-amber-400 to-amber-500" : "bg-faith-400"
                      }`}
                      style={{ width: `${c.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
