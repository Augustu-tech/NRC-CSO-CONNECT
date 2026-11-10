import { FormEvent, useEffect, useState } from "react";
import { Plus, Calendar, CheckCircle, BookOpen } from "lucide-react";
import { api, activateSemester, activateAcademicYear } from "../api/client";
import { Card } from "../ui/Card";
import { PageHeader } from "../ui/PageHeader";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

export default function SettingsPage() {
  const [years, setYears] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [isSemModalOpen, setIsSemModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get("/organizations/academic-years/?page_size=50"),
      api.get("/organizations/semesters/?page_size=50")
    ]).then(([yRes, sRes]) => {
      setYears(yRes.data.results || yRes.data || []);
      setSemesters(sRes.data.results || sRes.data || []);
    }).catch(() => setError("Failed to load settings."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreateYear = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    try {
      await api.post("/organizations/academic-years/", {
        name: formData.get("name"),
        start_date: formData.get("start_date"),
        end_date: formData.get("end_date"),
        is_active: false,
      });
      setIsYearModalOpen(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create year.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSemester = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    const setActive = formData.get("is_active") === "on";
    
    try {
      // If setting this new one as active, deactivate all others first
      if (setActive) {
        const activeSems = semesters.filter(s => s.is_active);
        for (const s of activeSems) {
          await api.patch(`/organizations/semesters/${s.id}/`, { is_active: false });
        }
      }

      await api.post("/organizations/semesters/", {
        number: Number(formData.get("number")),
        start_date: formData.get("start_date"),
        end_date: formData.get("end_date"),
        academic_year_id: Number(formData.get("academic_year")),
        is_active: setActive,
      });
      setIsSemModalOpen(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || JSON.stringify(err.response?.data) || "Failed to create semester.");
    } finally {
      setSaving(false);
    }
  };

  const setActiveYear = async (id: number) => {
    if (!confirm("This will make the selected academic year the active one. Continue?")) return;
    setLoading(true);
    try {
      await activateAcademicYear(id);
      load();
    } catch {
      alert("Failed to switch year.");
      setLoading(false);
    }
  };

  const setActiveSemester = async (id: number) => {
    if (!confirm("This will make the selected semester the active one for the entire system. Continue?")) return;
    setLoading(true);
    try {
      await activateSemester(id);
      load();
    } catch {
      alert("Failed to switch semester.");
      setLoading(false);
    }
  };

  if (loading && years.length === 0) return <div className="p-8 text-center text-slate-500">Loading settings…</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader 
        title="System Settings" 
        subtitle="Manage academic years and the active semester"
      />

      {error && <Card className="p-5 text-sm text-red-600">{error}</Card>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Academic Years Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <BookOpen size={18} /> Academic Years
            </h2>
            <Button variant="secondary" onClick={() => setIsYearModalOpen(true)}>
              <Plus size={16} /> Add Year
            </Button>
          </div>
          
          <div className="space-y-3">
            {years.map(y => (
              <Card key={y.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{y.name}</p>
                  <p className="text-xs text-slate-500">{y.start_date} to {y.end_date}</p>
                </div>
                {y.is_active ? (
                  <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded flex items-center gap-1">
                    <CheckCircle size={12} /> Active
                  </span>
                ) : (
                  <button
                    onClick={() => setActiveYear(y.id)}
                    className="text-xs font-medium text-faith-600 hover:text-faith-800 border border-faith-200 hover:bg-faith-50 px-3 py-1 rounded transition"
                  >
                    Set Active
                  </button>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Semesters Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Calendar size={18} /> Semesters
            </h2>
            <Button variant="secondary" onClick={() => setIsSemModalOpen(true)}>
              <Plus size={16} /> Add Semester
            </Button>
          </div>
          
          <div className="space-y-3">
            {semesters.map(s => (
              <Card key={s.id} className="p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
                      {s.academic_year?.name} — Semester {s.number}
                    </p>
                    <p className="text-xs text-slate-500">{s.start_date} to {s.end_date}</p>
                  </div>
                  {s.is_active ? (
                    <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded flex items-center gap-1">
                      <CheckCircle size={12} /> Active
                    </span>
                  ) : (
                    <button
                      onClick={() => setActiveSemester(s.id)}
                      className="text-xs font-medium text-faith-600 hover:text-faith-800 border border-faith-200 hover:bg-faith-50 px-3 py-1 rounded transition"
                    >
                      Set Active
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

      </div>

      {/* Add Year Modal */}
      <Modal isOpen={isYearModalOpen} onClose={() => setIsYearModalOpen(false)} title="Add Academic Year">
        <form onSubmit={handleCreateYear} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Year Name (e.g. 2027/2028)</label>
            <input name="name" required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
              <input name="start_date" type="date" required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
              <input name="end_date" type="date" required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsYearModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Year"}</Button>
          </div>
        </form>
      </Modal>

      {/* Add Semester Modal */}
      <Modal isOpen={isSemModalOpen} onClose={() => setIsSemModalOpen(false)} title="Add Semester">
        <form onSubmit={handleCreateSemester} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Academic Year</label>
              <select name="academic_year" required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500">
                <option value="">Select...</option>
                {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Semester Number</label>
              <select name="number" required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500">
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
              <input name="start_date" type="date" required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
              <input name="end_date" type="date" required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500" />
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-faith-50 rounded-lg border border-faith-100">
            <input type="checkbox" name="is_active" id="set-active" className="rounded text-faith-600 focus:ring-faith-500" />
            <label htmlFor="set-active" className="text-sm text-faith-900 font-medium">Set as the current active semester</label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsSemModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Semester"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
