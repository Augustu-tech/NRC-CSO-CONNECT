import { useEffect, useState } from "react";
import { User, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { getMemberProfileData, getMediaUrl } from "../api/client";
import { Modal } from "../ui/Modal";
import { Stat } from "../ui/Stat";

export default function MemberDetailModal({ memberId, onClose }: { memberId: number | null; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!memberId) return;
    setLoading(true);
    setError("");
    getMemberProfileData(memberId)
      .then((r) => setData(r.data))
      .catch(() => setError("Failed to load member details."))
      .finally(() => setLoading(false));
  }, [memberId]);

  if (!memberId) return null;

  const profile = data?.profile;
  const imageUrl = getMediaUrl(profile?.profile_picture);

  return (
    <Modal isOpen={!!memberId} onClose={onClose} title="Member Profile">
      {loading && <div className="p-8 text-center text-slate-500">Loading…</div>}
      {error && <div className="p-8 text-center text-red-600">{error}</div>}
      
      {!loading && !error && profile && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
            <div className="h-20 w-20 rounded-full overflow-hidden bg-faith-100 flex items-center justify-center border-2 border-white shadow-sm">
              {imageUrl ? (
                <img src={imageUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <User size={32} className="text-faith-700" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{profile.full_name}</h2>
              <p className="text-sm text-slate-500 font-medium">
                {profile.student_id} · {profile.current_mphakati?.name || "No Mphakati"}
              </p>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wide">
                Status: {profile.status}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {data.rank ? (
              <Stat label="Rank" value={`#${data.rank.rank} of ${data.rank.out_of}`} hint={`${data.rank.final_score}%`} tone="accent" />
            ) : (
              <Stat label="Rank" value="N/A" hint="Not yet scored" />
            )}
            <Stat label="Participation" value={`${data.participation.participation_rate}%`} hint={`${data.participation.present} present`} tone="positive" />
            <Stat label="Contributed" value={`K${data.contributions.total_contributed.toFixed(0)}`} hint={`${data.contributions.record_count} payments`} />
          </div>

          {/* Recent Participation */}
          <div>
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">Recent Participation</h3>
            {data.participation.history.length === 0 ? (
              <p className="text-sm text-slate-500">No records.</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                {data.participation.history.map((h: any) => (
                  <div key={h.activity_id} className="flex items-center justify-between text-sm py-1 border-b border-slate-50 last:border-0">
                    <div>
                      <p className="text-slate-900 font-medium">{h.title}</p>
                      <p className="text-xs text-slate-500">{h.date} · {h.category}</p>
                    </div>
                    {h.status === "PRESENT" && <CheckCircle2 className="text-emerald-500" size={16} />}
                    {h.status === "ABSENT" && <XCircle className="text-red-500" size={16} />}
                    {h.status === "EXCUSED" && <MinusCircle className="text-amber-500" size={16} />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contact Info */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">Contact</h3>
            <p className="text-sm text-slate-700">📞 {profile.phone || "No phone"}</p>
            <p className="text-sm text-slate-700">✉️ {profile.email || "No email"}</p>
          </div>
        </div>
      )}
    </Modal>
  );
}
