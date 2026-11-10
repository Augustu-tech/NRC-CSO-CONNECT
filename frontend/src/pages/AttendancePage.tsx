import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, MinusCircle, QrCode } from "lucide-react";
import { getActivityQR } from "../api/client";
import { Modal } from "../ui/Modal";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { hasPerm } from "../config/permissions";
import { Card } from "../ui/Card";
import { PageHeader } from "../ui/PageHeader";
import { Button } from "../ui/Button";

type RosterMember = { id: number; name: string; student_id: string; status: string };

export default function AttendancePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { me } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activity, setActivity] = useState<any>(null);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [error, setError] = useState("");
  const [qrModal, setQrModal] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);

  const canManage = hasPerm(me, "activities.manage");

  useEffect(() => {
    api.get(`/activities/activities/${id}/attendance/`)
      .then((res) => {
        setActivity({ title: res.data.title, date: res.data.date });
        setRoster(res.data.roster);
      })
      .catch(() => setError("Could not load attendance roster."))
      .finally(() => setLoading(false));
  }, [id]);

  const setStatus = (memberId: number, status: string) => {
    setRoster((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, status } : m))
    );
  };

  const showQR = async () => {
    setQrModal(true);
    setQrData(null);
    try {
      const res = await getActivityQR(Number(id));
      setQrData(res.data.image);
    } catch {
      alert("Failed to generate QR code.");
      setQrModal(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.post(`/activities/activities/${id}/attendance/`, {
        records: roster.map((m) => ({ member_id: m.id, status: m.status })),
      });
      navigate("/activities");
    } catch {
      alert("Failed to save attendance.");
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) return <div className="p-8 text-center text-slate-500">You do not have permission to manage attendance.</div>;

  return (
    <div className="space-y-6">
      <button 
        onClick={() => navigate("/activities")}
        className="flex items-center text-sm text-slate-500 hover:text-slate-900 transition"
      >
        <ArrowLeft size={16} className="mr-1" /> Back to Activities
      </button>

      <PageHeader
        title="Record Attendance"
        subtitle={activity ? `${activity.title} · ${activity.date}` : "Loading…"}
        action={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={showQR} disabled={loading}>
              <QrCode size={16} className="mr-2" /> Show QR
            </Button>
            <Button onClick={save} disabled={saving || loading}>
              {saving ? "Saving…" : "Save Attendance"}
            </Button>
          </div>
        }
      />

      {error && <Card className="p-5 text-sm text-red-600">{error}</Card>}
      {loading && <Card className="p-5 text-sm text-slate-500">Loading roster…</Card>}

      {!loading && !error && (
        <Card className="divide-y divide-slate-100">
          {roster.map((m) => (
            <div key={m.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-900">{m.name}</p>
                <p className="text-xs text-slate-500">{m.student_id}</p>
              </div>
              
              <div className="flex items-center bg-slate-100 rounded-lg p-1 w-full sm:w-auto">
                <button
                  onClick={() => setStatus(m.id, "PRESENT")}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition
                    ${m.status === "PRESENT" ? "bg-emerald-500 text-white shadow-sm" : "text-slate-600 hover:bg-slate-200"}`}
                >
                  <CheckCircle2 size={14} /> Present
                </button>
                <button
                  onClick={() => setStatus(m.id, "ABSENT")}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition
                    ${m.status === "ABSENT" ? "bg-red-500 text-white shadow-sm" : "text-slate-600 hover:bg-slate-200"}`}
                >
                  <XCircle size={14} /> Absent
                </button>
                <button
                  onClick={() => setStatus(m.id, "EXCUSED")}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition
                    ${m.status === "EXCUSED" ? "bg-amber-500 text-white shadow-sm" : "text-slate-600 hover:bg-slate-200"}`}
                >
                  <MinusCircle size={14} /> Excused
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* QR Code Modal */}
      <Modal isOpen={qrModal} onClose={() => setQrModal(false)} title="Scan to Check-in">
        <div className="flex flex-col items-center justify-center p-6 space-y-4">
          {qrData ? (
            <>
              <img src={qrData} alt="QR Code" className="w-64 h-64 border-4 border-slate-900 rounded-xl" />
              <p className="text-sm text-slate-500 text-center max-w-xs">
                Members can scan this code using their phone cameras to instantly mark themselves present. Expires in 2 hours.
              </p>
            </>
          ) : (
            <div className="text-slate-500">Generating QR code...</div>
          )}
        </div>
      </Modal>
    </div>
  );
}
