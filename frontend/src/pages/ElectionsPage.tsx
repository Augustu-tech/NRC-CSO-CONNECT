import { FormEvent, useEffect, useState } from "react";
import { Plus, Trash2, BarChart3, Vote as VoteIcon, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import { 
  getElections, createElection, updateElection,
  createPosition, createCandidate, updateCandidate, deleteCandidate, deletePosition,
  api, type Election 
} from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Card } from "../ui/Card";
import { PageHeader } from "../ui/PageHeader";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { EmptyState } from "../ui/EmptyState";

function formatApiError(err: any): string {
  const data = err?.response?.data;
  if (!data) return err?.message || "Something went wrong. Please try again.";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  // Django returns { field: [errors], non_field_errors: [errors] }
  const parts: string[] = [];
  for (const [key, val] of Object.entries(data)) {
    const friendlyField = key === "non_field_errors" ? "" : key.replace(/_/g, " ").replace(/^./, c => c.toUpperCase()) + ": ";
    const messages = Array.isArray(val) ? val.join(", ") : String(val);
    parts.push(`${friendlyField}${messages}`);
  }
  return parts.join(" · ");
}


export default function ElectionsPage() {
  const { me } = useAuth();
  const isAdmin = me?.is_superuser || ["super_admin", "chairperson", "vice_chairperson", "secretary"].includes(me?.role || "");

  const [elections, setElections] = useState<Election[]>([]);
  const [selected, setSelected] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);
  const [allMembers, setAllMembers] = useState<any[]>([]);

  const [isElectionModal, setIsElectionModal] = useState(false);
  const [isPositionModal, setIsPositionModal] = useState(false);
  const [isCandidateModal, setIsCandidateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [targetPositionId, setTargetPositionId] = useState<number | null>(null);
  const [isEditElectionModal, setIsEditElectionModal] = useState(false);
  const [isEditCandidateModal, setIsEditCandidateModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<any>(null);

  const load = () => {
    setLoading(true);
    getElections().then((r) => {
      const list = r.data.results || r.data || [];
      setElections(list);
      if (selected) {
        const updated = list.find((e) => e.id === selected.id);
        if (updated) setSelected(updated);
      } else if (list.length > 0) {
        setSelected(list[0]);
      }
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    if (isAdmin) {
      api.get("/members/members/?page_size=500").then((r) => setAllMembers(r.data.results || r.data || []));
    }
  }, [isAdmin]);

  const handleCreateElection = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const fd = new FormData(e.currentTarget);
    try {
      await createElection({
        title: fd.get("title"),
        description: fd.get("description"),
        start_time: fd.get("start_time"),
        end_time: fd.get("end_time"),
        is_active: false,
      });
      setIsElectionModal(false);
      load();
    } catch (err: any) {
      setFormError(formatApiError(err));
    } finally { setSaving(false); }
  };

  const handleCreatePosition = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await createPosition({
        election: selected.id,
        title: fd.get("title"),
        description: fd.get("description"),
        order: Number(fd.get("order")) || 0,
      });
      setIsPositionModal(false);
      load();
    } catch (err: any) {
      setFormError(formatApiError(err));
    } finally { setSaving(false); }
  };

  const handleCreateCandidate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!targetPositionId) return;
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await createCandidate({
        position: targetPositionId,
        member: Number(fd.get("member_id")),
        manifesto: fd.get("manifesto"),
      });
      setIsCandidateModal(false);
      load();
    } catch (err: any) {
      setFormError(formatApiError(err));
    } finally { setSaving(false); }
  };

  const handleUpdateElection = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await updateElection(selected.id, {
        title: fd.get("title"),
        description: fd.get("description"),
        start_time: fd.get("start_time"),
        end_time: fd.get("end_time"),
      });
      setIsEditElectionModal(false);
      load();
    } catch (err: any) {
      setFormError(formatApiError(err));
    } finally { setSaving(false); }
  };

  const handleUpdateCandidate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCandidate) return;
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await updateCandidate(editingCandidate.id, {
        member: Number(fd.get("member_id")),
        manifesto: fd.get("manifesto"),
      });
      setIsEditCandidateModal(false);
      load();
    } catch (err: any) {
      setFormError(formatApiError(err));
    } finally { setSaving(false); }
  };

  const toggleActive = async () => {
    if (!selected) return;
    try { await updateElection(selected.id, { is_active: !selected.is_active }); load(); }
    catch { alert("Failed to update election."); }
  };

  const publishResults = async () => {
    if (!selected) return;
    if (!confirm("Publish results? Members will see the vote counts.")) return;
    try { await updateElection(selected.id, { results_published: true }); load(); }
    catch { alert("Failed to publish."); }
  };

  const removePosition = async (id: number) => {
    if (!confirm("Delete this position and all its candidates/votes?")) return;
    try { await deletePosition(id); load(); } catch { alert("Failed."); }
  };

  const removeCandidate = async (id: number) => {
    if (!confirm("Remove this candidate?")) return;
    try { await deleteCandidate(id); load(); } catch { alert("Failed."); }
  };

  const removeElection = async (id: number) => {
    if (!confirm("Are you sure you want to delete this ENTIRE election? All positions, candidates, and votes will be permanently deleted.")) return;
    try { 
      await api.delete(`/elections/${id}/`); 
      setSelected(null);
      load(); 
    } catch { 
      alert("Failed to delete election."); 
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading elections…</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Elections"
        subtitle="Manage CSO elections, positions, and candidates"
        action={isAdmin && (
          <Button onClick={() => setIsElectionModal(true)}>
            <Plus size={16} /> New Election
          </Button>
        )}
      />

      {elections.length === 0 ? (
        <Card><EmptyState title="No elections yet" description="Create one to get started." /></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            {elections.map((el) => (
              <button
                key={el.id}
                onClick={() => setSelected(el)}
                className={`w-full text-left p-4 rounded-xl border transition
                  ${selected?.id === el.id ? "bg-faith-50 border-faith-200" : "bg-white border-slate-200 hover:border-faith-200"}`}
              >
                <p className="font-semibold text-slate-900">{el.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  {el.is_active && <span className="text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">Live</span>}
                  {el.results_published && <span className="text-[9px] font-bold uppercase bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">Published</span>}
                  <span className="text-xs text-slate-500">{el.total_votes} votes</span>
                </div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-2">
            {selected && (
              <Card className="overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{selected.title}</h2>
                      <p className="text-sm text-slate-500 mt-1">{selected.description}</p>
                      <p className="text-xs text-slate-400 mt-2">
                        {new Date(selected.start_time).toLocaleString()} → {new Date(selected.end_time).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isAdmin && (
                        <Button variant="secondary" onClick={() => setIsEditElectionModal(true)}>
                          <Pencil size={16} className="mr-1" /> Edit
                        </Button>
                      )}
                      {selected.positions.length > 0 && (
                        <Link to={`/elections/${selected.id}/vote`} className="inline-flex items-center gap-1 px-4 py-2 bg-faith-50 text-faith-700 text-sm font-medium rounded-lg hover:bg-faith-100">
                          <VoteIcon size={16} /> Cast Vote
                        </Link>
                      )}
                      {isAdmin && (
                        <>
                          <Button variant="secondary" onClick={toggleActive}>
                            {selected.is_active ? "Pause" : "Start"}
                          </Button>
                          {!selected.results_published && (
                            <Button onClick={publishResults}>Publish</Button>
                          )}
                          <button 
                            onClick={() => removeElection(selected.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Delete Election"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                      {selected.results_published && (
                        <Link to={`/elections/${selected.id}/results`} className="inline-flex items-center gap-1 px-4 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-100">
                          <BarChart3 size={16} /> Results
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-900">Positions & Candidates</h3>
                    {isAdmin && (
                      <Button variant="secondary" onClick={() => setIsPositionModal(true)}>
                        <Plus size={14} /> Add Position
                      </Button>
                    )}
                  </div>

                  {selected.positions.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6">No positions yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {selected.positions.map((pos: any) => (
                        <div key={pos.id} className="border border-slate-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-medium text-slate-900">{pos.title}</p>
                              {pos.description && <p className="text-xs text-slate-500 mt-0.5">{pos.description}</p>}
                            </div>
                            {isAdmin && (
                              <div className="flex items-center gap-2">
                                <button onClick={() => { setTargetPositionId(pos.id); setIsCandidateModal(true); }}
                                  className="text-xs text-faith-700 font-medium hover:underline">+ Candidate</button>
                                <button onClick={() => removePosition(pos.id)} className="text-red-500 hover:text-red-700">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                          {pos.candidates.length === 0 ? (
                            <p className="text-xs text-slate-400 mt-2">No candidates yet.</p>
                          ) : (
                            <div className="space-y-1 mt-2">
                              {pos.candidates.map((c: any) => (
                                <div key={c.id} className="flex items-center justify-between text-sm py-1 border-t border-slate-50">
                                  <div>
                                    <span className="font-medium text-slate-800">{c.member_name}</span>
                                    <span className="text-xs text-slate-500 ml-2">({c.member_student_id})</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-slate-400">{c.vote_count} votes</span>
                                    {isAdmin && (
                                      <>
                                        <button 
                                          onClick={() => { setEditingCandidate(c); setIsEditCandidateModal(true); }} 
                                          className="text-slate-400 hover:text-faith-600"
                                        >
                                          <Pencil size={12} />
                                        </button>
                                        <button onClick={() => removeCandidate(c.id)} className="text-red-400 hover:text-red-600">
                                          <Trash2 size={12} />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      <Modal isOpen={isElectionModal} onClose={() => setIsElectionModal(false)} title="Create Election">
        <form onSubmit={handleCreateElection} className="space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-4 rounded-lg flex items-start gap-3">
              <span className="text-red-600 text-lg leading-none">⚠</span>
              <div className="flex-1">
                <p className="font-medium">Cannot save</p>
                <p className="text-xs mt-1 text-red-700">{formError}</p>
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Title</label>
            <input name="title" required placeholder="e.g. 2027 CSO Elections" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
            <textarea name="description" rows={2} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Start Time</label>
              <input name="start_time" type="datetime-local" required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">End Time</label>
              <input name="end_time" type="datetime-local" required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsElectionModal(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create"}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isPositionModal} onClose={() => setIsPositionModal(false)} title="Add Position">
        <form onSubmit={handleCreatePosition} className="space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-4 rounded-lg flex items-start gap-3">
              <span className="text-red-600 text-lg leading-none">⚠</span>
              <div className="flex-1">
                <p className="font-medium">Cannot save</p>
                <p className="text-xs mt-1 text-red-700">{formError}</p>
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Position Title</label>
            <input name="title" required placeholder="e.g. Chairperson" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Description (Optional)</label>
            <textarea name="description" rows={2} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Display Order</label>
            <input name="order" type="number" defaultValue={0} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsPositionModal(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Add Position"}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isCandidateModal} onClose={() => setIsCandidateModal(false)} title="Add Candidate">
        <form onSubmit={handleCreateCandidate} className="space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-4 rounded-lg flex items-start gap-3">
              <span className="text-red-600 text-lg leading-none">⚠</span>
              <div className="flex-1">
                <p className="font-medium">Cannot save</p>
                <p className="text-xs mt-1 text-red-700">{formError}</p>
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Select Member</label>
            <select name="member_id" required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg">
              <option value="">Choose...</option>
              {allMembers.map((m: any) => (
                <option key={m.id} value={m.id}>{m.first_name} {m.last_name} ({m.student_id})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Manifesto (Optional)</label>
            <textarea name="manifesto" rows={3} placeholder="Why are you running?" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsCandidateModal(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Add Candidate"}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Election Modal */}
      <Modal isOpen={isEditElectionModal} onClose={() => setIsEditElectionModal(false)} title="Edit Election">
        <form onSubmit={handleUpdateElection} className="space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-4 rounded-lg flex items-start gap-3">
              <span className="text-red-600 text-lg leading-none">⚠</span>
              <div className="flex-1">
                <p className="font-medium">Cannot save</p>
                <p className="text-xs mt-1 text-red-700">{formError}</p>
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Title</label>
            <input name="title" defaultValue={selected?.title} required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
            <textarea name="description" defaultValue={selected?.description} rows={2} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Start Time</label>
              <input 
                name="start_time" 
                type="datetime-local" 
                required 
                defaultValue={selected ? new Date(selected.start_time).toISOString().slice(0, 16) : ""} 
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">End Time</label>
              <input 
                name="end_time" 
                type="datetime-local" 
                required 
                defaultValue={selected ? new Date(selected.end_time).toISOString().slice(0, 16) : ""} 
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" 
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsEditElectionModal(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Candidate Modal */}
      <Modal isOpen={isEditCandidateModal} onClose={() => setIsEditCandidateModal(false)} title="Edit Candidate">
        <form onSubmit={handleUpdateCandidate} className="space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-4 rounded-lg flex items-start gap-3">
              <span className="text-red-600 text-lg leading-none">⚠</span>
              <div className="flex-1">
                <p className="font-medium">Cannot save</p>
                <p className="text-xs mt-1 text-red-700">{formError}</p>
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Select Member</label>
            <select name="member_id" defaultValue={editingCandidate?.member} required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg">
              <option value="">Choose...</option>
              {allMembers.map((m: any) => (
                <option key={m.id} value={m.id}>{m.first_name} {m.last_name} ({m.student_id})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Manifesto (Optional)</label>
            <textarea name="manifesto" defaultValue={editingCandidate?.manifesto} rows={3} placeholder="Why are you running?" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsEditCandidateModal(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Update Candidate"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}