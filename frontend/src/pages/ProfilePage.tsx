import { FormEvent, useEffect, useState, useRef } from "react";
import { User, CheckCircle2, XCircle, MinusCircle, Edit2, Camera, Trophy } from "lucide-react";
import { 
  getMyProfile, getMyParticipation, getMyContributions, getMyRank, 
  updateMyProfile, uploadProfilePicture, getMediaUrl, type MemberProfile 
} from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Card } from "../ui/Card";
import { PageHeader } from "../ui/PageHeader";
import { EmptyState } from "../ui/EmptyState";
import { Stat } from "../ui/Stat";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

export default function ProfilePage() {
  const { me } = useAuth();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [participation, setParticipation] = useState<any>(null);
  const [contributions, setContributions] = useState<any>(null);
  const [rank, setRank] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notLinked, setNotLinked] = useState(false);
  const [error, setError] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    setError("");
    setNotLinked(false);
    
    Promise.allSettled([
      getMyProfile(),
      getMyParticipation(),
      getMyContributions(),
      getMyRank()
    ]).then(([pRes, ptRes, coRes, rRes]) => {
      // Profile is the critical one — if it fails, we can't show much
      if (pRes.status === "rejected") {
        const err: any = pRes.reason;
        if (err?.response?.status === 403) {
          setNotLinked(true);
        } else {
          setError(err?.response?.data?.detail || "Failed to load your profile.");
        }
        setLoading(false);
        return;
      }
      
      setProfile(pRes.value.data);
      if (ptRes.status === "fulfilled") setParticipation(ptRes.value.data);
      if (coRes.status === "fulfilled") setContributions(coRes.value.data);
      if (rRes.status === "fulfilled") setRank(rRes.value.data);
      setLoading(false);
    }).catch((err) => {
      console.error("Profile load failed:", err);
      setError("An unexpected error occurred.");
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const handleEdit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    try {
      await updateMyProfile({
        phone: formData.get("phone") as string,
        email: formData.get("email") as string,
      });
      setIsModalOpen(false);
      load();
    } catch {
      alert("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5MB.");
      return;
    }
    setUploading(true);
    try {
      await uploadProfilePicture(file);
      load();
    } catch {
      alert("Failed to upload image.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading profile…</div>;

  // Not linked to a member profile
  if (notLinked) {
    const isAdminStaff = me?.is_superuser || 
      ["secretary", "vice_secretary", "publicity_secretary", "treasurer", "vice_treasurer", "chairperson", "vice_chairperson"].includes(me?.role || "");
    
    return (
      <div className="p-8 max-w-xl mx-auto">
        <Card className="p-8 text-center">
          {isAdminStaff ? (
            <>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Your account is for CSO administration</h2>
              <p className="text-sm text-slate-600">
                You do not have a member profile linked. This is expected for pure admin roles.
              </p>
              <p className="text-sm text-slate-500 mt-3">
                If you also want to appear as a member with participation scores, ask the Super Admin to link your account to a member record in User Management.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Profile not set up yet</h2>
              <p className="text-sm text-slate-600">
                Your account hasn't been linked to a member profile yet.
              </p>
              <p className="text-sm text-slate-500 mt-3">
                Please contact the CSO Secretary or Super Admin.
              </p>
            </>
          )}
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <Card className="p-8 text-center">
          <h2 className="text-lg font-bold text-red-600 mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-600">{error}</p>
          <Button variant="secondary" onClick={load} className="mt-4">
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  // Profile is loaded — safe to render
  if (!profile) {
    return <div className="p-8 text-center text-slate-500">No profile data.</div>;
  }

  const imageUrl = getMediaUrl((profile as any)?.profile_picture);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        subtitle="Your personal participation, rank, and financial history"
        action={
          <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
            <Edit2 size={16} className="mr-2" /> Edit Contact
          </Button>
        }
      />

      <Card className="p-6">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="h-24 w-24 rounded-full overflow-hidden bg-faith-100 flex items-center justify-center border-4 border-white shadow-md">
              {imageUrl ? (
                <img src={imageUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <User size={40} className="text-faith-700" />
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 bg-black/50 text-white rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:opacity-100 disabled:bg-black/70"
            >
              <Camera size={20} className="mb-1" />
              <span className="text-[10px] font-medium">{uploading ? "Uploading..." : "Change"}</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900">{profile.full_name}</h2>
            <p className="text-sm text-slate-500 font-medium">
              {profile.student_id} · {profile.current_mphakati?.name || "No Mphakati"}
            </p>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wide">
              {profile.current_semester?.label || "No active semester"}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {rank && rank.rank !== null && rank.rank !== undefined ? (
          <Stat 
            label="Your Personal Rank" 
            value={`#${rank.rank} of ${rank.out_of}`} 
            hint={`${rank.mphakati} · ${rank.final_score}%`} 
            tone="accent" 
          />
        ) : (
          <Stat label="Your Personal Rank" value="Not yet scored" hint="Waiting for first finalized month" />
        )}
        {participation && (
          <Stat 
            label="Your Participation Rate" 
            value={`${participation.participation_rate}%`} 
            hint={`${participation.present} present · ${participation.absent} absent`} 
            tone="positive" 
          />
        )}
        {contributions && (
          <Stat 
            label="Your Total Contributed" 
            value={`K${(contributions.total_contributed || 0).toFixed(2)}`} 
            hint={`${contributions.record_count} payment(s)`} 
          />
        )}
      </div>

      {rank && rank.rank !== null && rank.rank !== undefined && (
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
              <Trophy size={22} />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">Your Mphakati's CSO Position</p>
              <p className="text-lg font-semibold text-slate-900">{rank.mphakati}</p>
            </div>
            <p className="text-2xl font-bold text-faith-700">
              #{rank.rank} <span className="text-sm text-slate-500 font-normal">of {rank.out_of}</span>
            </p>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Recent Participation</h3>
          </div>
          {!participation || participation.history?.length === 0 ? (
            <EmptyState title="No participation records yet" />
          ) : (
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {participation.history.map((h: any) => (
                <div key={h.activity_id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{h.title}</p>
                    <p className="text-xs text-slate-500">{h.date} · {h.category}</p>
                  </div>
                  <div>
                    {h.status === "PRESENT" && <CheckCircle2 className="text-emerald-500" size={18} />}
                    {h.status === "ABSENT" && <XCircle className="text-red-500" size={18} />}
                    {h.status === "EXCUSED" && <MinusCircle className="text-amber-500" size={18} />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Contribution History</h3>
          </div>
          {!contributions || contributions.history?.length === 0 ? (
            <EmptyState title="No contributions recorded yet" />
          ) : (
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {contributions.history.map((h: any) => (
                <div key={h.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{h.category}</p>
                    <p className="text-xs text-slate-500">{h.date} · Ref: {h.reference || "N/A"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">K{(h.amount || 0).toFixed(2)}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">{h.approval_status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Edit Contact Info">
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
            <input name="phone" defaultValue={(profile as any)?.phone || ""} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
            <input name="email" type="email" defaultValue={(profile as any)?.email || ""} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
