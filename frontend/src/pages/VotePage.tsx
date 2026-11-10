import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, User } from "lucide-react";
import { getMyBallot, castVote, getMediaUrl } from "../api/client";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

export default function VotePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [success, setSuccess] = useState<string>("");

  const load = () => {
    setLoading(true);
    getMyBallot(Number(id))
      .then((r) => setData(r.data))
      .catch((e) => setError(e.response?.data?.detail || "Failed to load ballot."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const vote = async (positionId: number, candidateId: number) => {
    setSubmitting(positionId);
    setSuccess("");
    try {
      const res = await castVote(Number(id), positionId, candidateId);
      setSuccess(res.data.detail + " You can click a different name to change your vote until the election ends.");
      load(); // refresh ballot to show voted state
    } catch (e: any) {
      alert(e.response?.data?.detail || JSON.stringify(e.response?.data) || "Failed to cast vote.");
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading ballot…</div>;
  if (error) return <Card className="p-8 text-center text-red-600">{error}</Card>;
  if (!data) return null;

  const allVoted = data.ballot.length > 0 && data.ballot.every((p: any) => p.my_vote);

  return (
    <div className="space-y-6">
      <Link to="/elections" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft size={16} /> Back to Elections
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{data.election}</h1>
        <p className="text-sm text-slate-500 mt-1">Cast one vote per position. Your vote is final.</p>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-3 rounded-lg flex items-center gap-2">
          <CheckCircle2 size={16} /> {success}
        </div>
      )}

      {allVoted && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm p-4 rounded-lg">
          <p className="font-semibold mb-1">🎉 You've voted in every position!</p>
          <p className="text-xs">Thank you for participating. Results will be published by the CSO leadership when the election ends.</p>
          {data.results_published && (
            <Link to={`/elections/${id}/results`} className="inline-block mt-3 text-sm font-medium text-blue-700 underline">
              View Results →
            </Link>
          )}
        </div>
      )}

      {data.ballot.map((pos: any) => {
        const voted = !!pos.my_vote;
        return (
          <Card key={pos.position_id} className="overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">{pos.position}</h2>
                {pos.description && <p className="text-xs text-slate-500 mt-0.5">{pos.description}</p>}
              </div>
              {voted && (
                <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-1 rounded flex items-center gap-1">
                  <CheckCircle2 size={12} /> Voted
                </span>
              )}
            </div>

            <div className="p-5 space-y-3">
              {pos.candidates.length === 0 ? (
                <p className="text-sm text-slate-500">No candidates registered for this position.</p>
              ) : (
                pos.candidates.map((c: any) => {
                  const isMyVote = pos.my_vote === c.id;
                  // Only disable if we are currently submitting, or if election is over/inactive
                  const disabled = submitting === pos.position_id || !data.is_active || data.results_published;
                  const imageUrl = getMediaUrl(c.profile_picture);
                  return (
                    <button
                      key={c.id}
                      disabled={disabled}
                      onClick={() => vote(pos.position_id, c.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition text-left
                        ${isMyVote ? "border-faith-600 bg-faith-50" : "border-slate-200 bg-white hover:border-faith-300"}
                        ${disabled && !isMyVote ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="h-14 w-14 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center flex-shrink-0">
                        {imageUrl ? (
                          <img src={imageUrl} alt={c.member_name} className="h-full w-full object-cover" />
                        ) : (
                          <User size={20} className="text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900">{c.member_name}</p>
                        <p className="text-xs text-slate-500">{c.student_id}</p>
                        {c.manifesto && <p className="text-xs text-slate-600 mt-1 italic line-clamp-2">"{c.manifesto}"</p>}
                      </div>
                      {isMyVote && <CheckCircle2 className="text-faith-600 flex-shrink-0" size={24} />}
                    </button>
                  );
                })
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
