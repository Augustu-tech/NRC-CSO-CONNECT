import { FormEvent, useEffect, useState } from "react";
import { Plus, Calendar, CheckCircle, BookOpen, Pencil, XCircle, AlertCircle } from "lucide-react";
import { api, activateSemester, activateAcademicYear, setSemesterChaplain } from "../api/client";
import { Card } from "../ui/Card";
import { PageHeader } from "../ui/PageHeader";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

export default function SettingsPage() {
  const [years, setYears] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [isSemModalOpen, setIsSemModalOpen] = useState(false);
  const [isEditSemModalOpen, setIsEditSemModalOpen] = useState(false);
  
  const [editingSemester, setEditingSemester] = useState<any>(null);
  const [addingSemesterToYear, setAddingSemesterToYear] = useState<any>(null);
  const [editingChaplain, setEditingChaplain] = useState<any>(null);
  const [chaplainSaving, setChaplainSaving] = useState(false);
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

  const currentYear = years.find(y => y.is_active);
  const currentSemester = semesters.find(s => s.is_active);
  const today = new Date().toISOString().split("T")[0];

  const handleCreateYear = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api.post("/organizations/academic-years/", {
        name: fd.get("name"),
        start_date: fd.get("start_date"),
        end_date: fd.get("end_date"),
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
    const fd = new FormData(e.currentTarget);
    const setActive = fd.get("is_active") === "on";
    try {
      await api.post("/organizations/semesters/", {
        number: Number(fd.get("number")),
        start_date: fd.get("start_date"),
        end_date: fd.get("end_date"),
        academic_year_id: addingSemesterToYear?.id,
        is_active: setActive,
      });
      setIsSemModalOpen(false);
      load();
    } catch (err: any) {
      const data = err.response?.data;
      setError(data ? (typeof data === "string" ? data : JSON.stringify(data)) : "Failed to create semester.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditSemester = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingSemester) return;
    setSaving(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      await api.patch(`/organizations/semesters/${editingSemester.id}/`, {
        start_date: fd.get("start_date"),
        end_date: fd.get("end_date"),
      });
      setIsEditSemModalOpen(false);
      load();
    } catch (err: any) {
      const data = err.response?.data;
      setError(data ? (typeof data === "string" ? data : JSON.stringify(data)) : "Failed to edit semester.");
    } finally {
      setSaving(false);
    }
  };

  const setActiveYear = async (id: number) => {
    if (!confirm("Make this the active Academic Year?")) return;
    try { await activateAcademicYear(id); load(); } catch (e:any) { alert(e.response?.data?.detail || "Failed to activate year."); }
  };

  const saveChaplain = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingChaplain) return;
    setChaplainSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await setSemesterChaplain(editingChaplain.id, fd.get("chaplain") as string);
      setEditingChaplain(null);
      load();
    } catch {
      alert("Failed to update chaplain.");
    } finally {
      setChaplainSaving(false);
    }
  };

  const setActiveSemester = async (id: number) => {
    if (!confirm(
      "Activate this semester?\n\n" +
      "Any APPROVED finalists from the current semester will automatically be marked GRADUATED and excluded from this new semester."
    )) return;
    
    try { 
      const res = await activateSemester(id); 
      const graduated = res.data?.graduated_members || 0;
      if (graduated > 0) {
        alert(`✅ Semester activated.\n\n${graduated} finalist(s) graduated and were excluded from this semester.`);
      } else {
        alert("✅ Semester activated. No finalists to graduate.");
      }
      load(); 
    } catch (e:any) { 
      alert(e.response?.data?.detail || "Failed."); 
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading settings…</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader 
        title="System Settings" 
        subtitle="Manage academic years and the active semester"
      />

      {error && <Card className="p-5 text-sm text-red-600">{error}</Card>}

      {/* Current Active Context Banner */}
      <div className="bg-gradient-to-r from-faith-900 to-faith-700 rounded-2xl p-6 text-white shadow-lg">
        <p className="text-[10px] uppercase tracking-widest text-faith-300 font-bold mb-2">Current Active Context</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
              <BookOpen size={24} className="text-gold-400" />
            </div>
            <div>
              <p className="text-xs text-faith-200">Academic Year</p>
              <h2 className="text-2xl font-bold">{currentYear?.name || "Not Set"}</h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
              <Calendar size={24} className="text-gold-400" />
            </div>
            <div>
              <p className="text-xs text-faith-200">Active Semester</p>
              <h2 className="text-2xl font-bold">
                {currentSemester ? `Semester ${currentSemester.number}` : "Not Set"}
              </h2>
              {currentSemester && (
                <p className="text-xs text-faith-200">
                  {currentSemester.start_date} to {currentSemester.end_date}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {years.map(year => {
          const yearSems = semesters.filter(s => s.academic_year?.id === year.id);
          
          return (
            <Card key={year.id} className="overflow-hidden">
              {/* Year Header */}
              <div className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${year.is_active ? "bg-faith-50/50" : "bg-slate-50"}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">{year.name}</h2>
                    {year.is_active && (
                      <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                        <CheckCircle size={12} /> Active Year
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Runs from {year.start_date} to {year.end_date}</p>
                  {yearSems.length === 0 && (
                    <p className="text-[10px] text-red-500 mt-1 font-medium">* Add a semester to activate this year.</p>
                  )}
                </div>
                {!year.is_active && (
                  <Button 
                    variant="secondary" 
                    onClick={() => setActiveYear(year.id)}
                    disabled={yearSems.length === 0}
                    className={yearSems.length === 0 ? "opacity-50 cursor-not-allowed" : ""}
                  >
                    Set as Active Year
                  </Button>
                )}
              </div>

              {/* Semesters List under this Year */}
              <div className="p-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700">Semesters</h3>
                  {(() => {
                    // Check how many of the 2 standard semesters exist
                    const semNums = yearSems.map(s => s.number);
                    const hasSem1 = semNums.includes(1);
                    const hasSem2 = semNums.includes(2);
                    const isFull = hasSem1 && hasSem2;

                    return (
                      <button 
                        onClick={() => { setAddingSemesterToYear(year); setIsSemModalOpen(true); }} 
                        disabled={isFull}
                        className={`text-xs font-medium flex items-center gap-1 
                          ${isFull ? "text-slate-400 cursor-not-allowed" : "text-faith-600 hover:underline"}`}
                      >
                        <Plus size={14} /> Add Semester
                      </button>
                    );
                  })()}
                </div>

                {yearSems.length === 0 ? (
                  <p className="text-xs text-slate-400">No semesters created for this year.</p>
                ) : (
                  <div className="space-y-2">
                    {yearSems.map(sem => {
                      const isExpired = sem.end_date < today;
                      return (
                        <div key={sem.id} className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3
                          ${sem.is_active ? "border-faith-300 bg-faith-50/30" : "border-slate-200 bg-white"}`}>
                          
                          <div>
                            <div className="flex items-center gap-2">
                              <p className={`font-medium ${sem.is_active ? "text-faith-900" : "text-slate-900"}`}>
                                Semester {sem.number}
                              </p>
                              {sem.is_active && (
                                <span className="text-[9px] uppercase font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <CheckCircle size={10} /> Active
                                </span>
                              )}
                              {isExpired && !sem.is_active && (
                                <span className="text-[9px] uppercase font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <XCircle size={10} /> Expired
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{sem.start_date} to {sem.end_date}</p>
                            
                            {/* Chaplain display + edit — only for active semester */}
                            {sem.is_active && (
                              <div className="flex items-center gap-1 mt-1.5">
                                <span className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Chaplain:</span>
                                <span className="text-xs font-medium text-slate-700">{sem.chaplain_signer || "Not set"}</span>
                                <button
                                  onClick={() => setEditingChaplain(sem)}
                                  className="text-slate-400 hover:text-faith-700 ml-0.5"
                                  title="Change chaplain"
                                >
                                  <Pencil size={10} />
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => { setEditingSemester(sem); setIsEditSemModalOpen(true); }}
                              className="text-xs text-slate-500 hover:text-faith-700 flex items-center gap-1"
                            >
                              <Pencil size={12} /> Edit
                            </button>
                            
                            {!sem.is_active && !isExpired && (
                              <button
                                onClick={() => setActiveSemester(sem.id)}
                                className="text-xs font-semibold text-faith-600 hover:text-faith-800 bg-faith-50 px-3 py-1.5 rounded-md"
                              >
                                Set Active
                              </button>
                            )}
                            {isExpired && !sem.is_active && (
                              <span className="text-xs text-slate-400 italic">Passed</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
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
      <Modal isOpen={isSemModalOpen} onClose={() => { setIsSemModalOpen(false); setAddingSemesterToYear(null); }} title="Add Semester">
        <form onSubmit={handleCreateSemester} className="space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Academic Year</label>
              <input 
                type="text" 
                value={addingSemesterToYear?.name || ""} 
                disabled 
                className="w-full px-3 py-2 text-sm border border-slate-200 bg-slate-50 rounded-lg text-slate-500 cursor-not-allowed" 
              />
              <input type="hidden" name="academic_year" value={addingSemesterToYear?.id} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Semester Number</label>
              <select name="number" required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500">
                {[1, 2].map(num => {
                  const exists = semesters.some(s => s.academic_year?.id === addingSemesterToYear?.id && s.number === num);
                  if (exists) return null;
                  return <option key={num} value={num}>Semester {num}</option>;
                })}
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

      {/* Chaplain Edit Modal */}
      <Modal isOpen={!!editingChaplain} onClose={() => setEditingChaplain(null)} title="Update Chaplain Name">
        <form onSubmit={saveChaplain} className="space-y-4">
          <div className="p-3 bg-faith-50 text-faith-900 text-xs rounded-lg border border-faith-100">
            The chaplain's name appears on all finalist certificates printed for this semester. Update it when a new chaplain is appointed.
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Chaplain Name</label>
            <input
              name="chaplain"
              defaultValue={editingChaplain?.chaplain_signer || ""}
              required
              placeholder="e.g. Fr. Sebastian Malambo"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setEditingChaplain(null)}>Cancel</Button>
            <Button type="submit" disabled={chaplainSaving}>{chaplainSaving ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Semester Modal */}
      <Modal isOpen={isEditSemModalOpen} onClose={() => setIsEditSemModalOpen(false)} title="Edit Semester Dates">
        <form onSubmit={handleEditSemester} className="space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg flex items-start gap-2">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            Ensure the new dates still fall within the Academic Year ({editingSemester?.academic_year?.name}).
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
              <input name="start_date" type="date" defaultValue={editingSemester?.start_date} required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
              <input name="end_date" type="date" defaultValue={editingSemester?.end_date} required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsEditSemModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Update Dates"}</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
