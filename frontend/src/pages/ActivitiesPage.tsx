import { FormEvent, useEffect, useState } from "react";
import { CalendarDays, List, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { 
  api, getSemesters, getActivityCategories, 
  type Semester, type ActivityCategory 
} from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { hasPerm } from "../config/permissions";
import { Card } from "../ui/Card";
import { PageHeader } from "../ui/PageHeader";
import { EmptyState } from "../ui/EmptyState";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import ActivityCalendar from "../components/ActivityCalendar";

export default function ActivitiesPage() {
  const { me } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"list" | "calendar">("list");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categories, setCategories] = useState<ActivityCategory[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const canManage = hasPerm(me, "activities.manage");

  const load = () => {
    setLoading(true);
    api.get("/activities/activities/?page_size=200")
      .then((r) => setRows(r.data.results || r.data || []))
      .catch(() => setError("Could not load activities."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    if (canManage) {
      getSemesters().then(r => setSemesters(r.data.results || r.data || []));
      getActivityCategories().then(r => setCategories(r.data.results || r.data || []));
    }
  }, [canManage]);

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const formData = new FormData(e.currentTarget);
    
    try {
      await api.post("/activities/activities/", {
        title: formData.get("title"),
        date: formData.get("date"),
        start_time: formData.get("start_time") || null,
        location: formData.get("location"),
        category: Number(formData.get("category")),
        semester: Number(formData.get("semester")),
        contributes_to_score: formData.get("contributes_to_score") === "true",
        eligibility_type: "ALL",
      });
      setIsModalOpen(false);
      load();
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || "Failed to create activity.");
    } finally {
      setSaving(false);
    }
  };

  const cancelActivity = async (id: number) => {
    if (!confirm("Are you sure you want to cancel this activity? It will no longer count towards scores.")) return;
    try {
      await api.patch(`/activities/activities/${id}/`, { is_cancelled: true });
      load();
    } catch {
      alert("Failed to cancel activity.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activities"
        subtitle="Masses, rehearsals, meetings, and other CSO events"
        action={
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setView("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition
                  ${view === "list" ? "bg-white shadow-sm text-slate-900" : "text-slate-600"}`}
              >
                <List size={14} /> List
              </button>
              <button
                onClick={() => setView("calendar")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition
                  ${view === "calendar" ? "bg-white shadow-sm text-slate-900" : "text-slate-600"}`}
              >
                <CalendarDays size={14} /> Calendar
              </button>
            </div>

            {canManage && (
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus size={16} /> New Activity
              </Button>
            )}
          </div>
        }
      />

      {loading && <Card className="p-5 text-sm text-slate-500">Loading…</Card>}
      {error && <Card className="p-5 text-sm text-slate-500">{error}</Card>}

      {!loading && !error && rows.length === 0 && (
        <Card><EmptyState title="No activities yet" /></Card>
      )}

      {/* Calendar View */}
      {!loading && !error && rows.length > 0 && view === "calendar" && (
        <ActivityCalendar activities={rows} canManage={canManage} />
      )}

      {/* List View */}
      {!loading && !error && rows.length > 0 && view === "list" && (
        <Card className="divide-y divide-slate-100">
          {rows.map((a) => (
            <div key={a.id} className="p-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
                <CalendarDays size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {a.title}
                    </p>
                    {a.is_cancelled && (
                      <span className="text-[10px] uppercase tracking-wide text-red-600 bg-red-50 px-2 py-0.5 rounded">
                        Cancelled
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {canManage && !a.is_cancelled && (
                      <>
                        <Link 
                          to={`/activities/${a.id}/attendance`}
                          className="text-xs font-medium text-faith-600 hover:text-faith-800"
                        >
                          Record Attendance
                        </Link>
                        <button 
                          onClick={() => cancelActivity(a.id)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {a.date} · {a.category_name}
                  {a.location ? ` · ${a.location}` : ""}
                </p>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Activity">
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{formError}</div>}
          
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Title</label>
            <input name="title" required placeholder="e.g. Tuesday Mass" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
              <input name="date" type="date" required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Time (Optional)</label>
              <input name="start_time" type="time" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
              <select name="category" required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500">
                <option value="">Select Category...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Semester</label>
              <select name="semester" required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500">
                <option value="">Select Semester...</option>
                {semesters.map(s => <option key={s.id} value={s.id}>{s.academic_year?.name || "Unknown"} — Sem {s.number}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Location (Optional)</label>
            <input name="location" placeholder="e.g. Main Church" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500" />
          </div>

          <div className="flex items-center gap-2 mt-2">
            <input type="checkbox" name="contributes_to_score" value="true" defaultChecked id="score-check" className="rounded text-faith-600 focus:ring-faith-500" />
            <label htmlFor="score-check" className="text-sm text-slate-700">Counts towards Mphakati Score</label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create Activity"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
