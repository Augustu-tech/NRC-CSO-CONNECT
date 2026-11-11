import { FormEvent, useEffect, useState } from "react";
import { GraduationCap, CheckCircle2, XCircle, Clock } from "lucide-react";
import {
  getFinalistWindow, getFinalists, registerFinalist, approveFinalist, rejectFinalist,
  getMediaUrl
} from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { hasPerm } from "../config/permissions";
import { Card } from "../ui/Card";
import { PageHeader } from "../ui/PageHeader";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";

export default function FinalistsPage() {
  const { me } = useAuth();
  const canManage = hasPerm(me, "members.manage");

  const [window, setWindow] = useState<any>(null);
  const [finalists, setFinalists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([getFinalistWindow(), getFinalists()])
      .then(([wRes, fRes]) => {
        setWindow(wRes.data);
        setFinalists(fRes.data.results || fRes.data || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const fd = new FormData(e.currentTarget);
    try {
      await registerFinalist({
        program: fd.get("program"),
        year_of_study: Number(fd.get("year_of_study")),
        expected_graduation_date: fd.get("expected_graduation_date") || null,
        bio: fd.get("bio"),
        parent_contact: fd.get("parent_contact"),
      });
      load();
    } catch (err: any) {
      const data = err.response?.data;
      let msg = "Registration failed. Please try again.";
      
      if (typeof data === "string") {
        msg = data;
      } else if (data?.detail) {
        msg = data.detail;
      } else if (data && typeof data === "object") {
        // Turn {"field": ["error"]} into readable "Field: error"
        const parts: string[] = [];
        for (const [field, errors] of Object.entries(data)) {
          const friendlyField = field.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
          const errList = Array.isArray(errors) ? errors : [errors];
          parts.push(`${friendlyField}: ${errList.join(", ")}`);
        }
        msg = parts.join(" · ");
      }
      
      setFormError(msg);
    } finally { setSaving(false); }
  };

  const handleApprove = async (id: number) => {
    if (!confirm("Approve this finalist?")) return;
    await approveFinalist(id);
    load();
  };

  const handleReject = async (id: number) => {
    if (!confirm("Reject this finalist?")) return;
    await rejectFinalist(id);
    load();
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading…</div>;

  const myReg = window?.my_registration;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finalists"
        subtitle="Semester farewell registration"
      />

      {/* Member view — status of registration */}
      {!canManage && (
        <>
          {!window?.open && !myReg && (
            <Card className="p-6 text-center">
              <GraduationCap size={48} className="text-slate-300 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-900">Finalist Registration Closed</h3>
              <p className="text-sm text-slate-500 mt-1">
                {window?.deadline_passed 
                  ? "The registration deadline has passed." 
                  : "Registration is not open yet. Please wait for the CSO leadership to open it."}
              </p>
            </Card>
          )}

          {window?.open && !myReg && (
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <GraduationCap size={24} className="text-faith-700" />
                <div>
                  <h3 className="font-semibold text-slate-900">Register as a Finalist</h3>
                  <p className="text-xs text-slate-500">For the {window?.semester} farewell celebration</p>
                </div>
              </div>
              <form onSubmit={submit} className="space-y-4">
                {formError && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{formError}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Program / Course</label>
                    <input name="program" required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Year of Study</label>
                    <input name="year_of_study" type="number" defaultValue={4} required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Expected Graduation Date</label>
                  <input name="expected_graduation_date" type="date" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Short Bio (for farewell booklet)</label>
                  <textarea name="bio" rows={3} placeholder="A short message from you..." className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Parent Contact (for farewell dinner coordination)</label>
                  <input name="parent_contact" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={saving}>{saving ? "Registering…" : "Submit Registration"}</Button>
                </div>
              </form>
            </Card>
          )}

          {myReg && (
            <Card className="p-6">
              <div className="flex items-center gap-3">
                {myReg.status === "PENDING" && <Clock className="text-amber-500" size={24} />}
                {myReg.status === "APPROVED" && <CheckCircle2 className="text-emerald-500" size={24} />}
                {myReg.status === "REJECTED" && <XCircle className="text-red-500" size={24} />}
                <div>
                  <h3 className="font-semibold text-slate-900">Registration Status: {myReg.status}</h3>
                  <p className="text-sm text-slate-500">
                    {myReg.status === "PENDING" && "Your registration is awaiting approval from the Secretary."}
                    {myReg.status === "APPROVED" && "You are confirmed as a finalist. See you at the farewell!"}
                    {myReg.status === "REJECTED" && "Your registration was rejected. Contact the Secretary for details."}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Program: {myReg.program}</p>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Admin view — approve/reject finalists */}
      {canManage && (
        <>
          <Card className="p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Registration Window</p>
            <p className="text-sm text-slate-700">
              {window?.open 
                ? <span className="text-emerald-700 font-medium">✓ Open for {window.semester}</span>
                : <span className="text-red-600 font-medium">✗ Closed</span>}
            </p>
            {window?.deadline && <p className="text-xs text-slate-500 mt-1">Deadline: {new Date(window.deadline).toLocaleString()}</p>}
            <p className="text-xs text-slate-400 mt-2">Toggle the window from Settings → Semester.</p>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">All Finalists ({finalists.length})</h3>
            </div>
            {finalists.length === 0 ? (
              <EmptyState title="No finalists yet" />
            ) : (
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {finalists.map((f) => (
                  <div key={f.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{f.member_name}</p>
                      <p className="text-xs text-slate-500">{f.member_student_id} · {f.member_mphakati}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{f.program} · Year {f.year_of_study}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                        f.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" :
                        f.status === "REJECTED" ? "bg-red-100 text-red-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>{f.status}</span>
                      {f.status === "PENDING" && (
                        <>
                          <button onClick={() => handleApprove(f.id)} className="text-emerald-600 hover:text-emerald-800 text-xs font-medium">Approve</button>
                          <button onClick={() => handleReject(f.id)} className="text-red-600 hover:text-red-800 text-xs font-medium">Reject</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
