import { FormEvent, useEffect, useState } from "react";
import { Users, Plus, Trash2, Shield } from "lucide-react";
import { api, getMiphakati, getSemesters } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { hasPerm } from "../config/permissions";
import { Card } from "../ui/Card";
import { PageHeader } from "../ui/PageHeader";
import { EmptyState } from "../ui/EmptyState";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

function formatApiError(err: any): string {
  const data = err?.response?.data;
  if (!data) return err?.message || "Something went wrong.";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  const parts: string[] = [];
  for (const [key, val] of Object.entries(data)) {
    const friendlyField = key === "non_field_errors" ? "" : key.replace(/_/g, " ").replace(/^./, c => c.toUpperCase()) + ": ";
    const messages = Array.isArray(val) ? val.join(", ") : String(val);
    parts.push(`${friendlyField}${messages}`);
  }
  return parts.join(" · ");
}

export default function AffiliatesPage() {
  const { me } = useAuth();
  const canManage = hasPerm(me, "affiliates.manage");
  const userRole = me?.role;

  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [selectedAff, setSelectedAff] = useState<any>(null);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [updatingCoord, setUpdatingCoord] = useState(false);
  const [loading, setLoading] = useState(true);

  // Add member modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const loadAffiliates = () => {
    api.get("/organizations/affiliates/?page_size=50").then((r) => {
      const list = r.data.results || r.data || [];
      setAffiliates(list);
      if (list.length > 0 && !selectedAff) setSelectedAff(list[0]);
    }).finally(() => setLoading(false));
  };

  const loadMemberships = (affId: number) => {
    api.get(`/organizations/affiliate-memberships/?page_size=200`).then((r) => {
      const all = r.data.results || r.data || [];
      setMemberships(all.filter((m: any) => m.affiliate === affId));
    });
  };

  useEffect(() => {
    loadAffiliates();
    if (canManage) {
      api.get("/members/members/?page_size=300").then((r) => setAllMembers(r.data.results || r.data || []));
    }
  }, [canManage]);

  useEffect(() => {
    if (selectedAff) loadMemberships(selectedAff.id);
  }, [selectedAff]);

  const handleSetCoordinator = async (memberId: number | null) => {
    if (!selectedAff) return;
    setUpdatingCoord(true);
    try {
      await api.patch(`/organizations/affiliates/${selectedAff.id}/`, {
        coordinator: memberId
      });
      // Refresh the selected affiliate data
      const res = await api.get(`/organizations/affiliates/${selectedAff.id}/`);
      setSelectedAff(res.data);
      loadAffiliates(); // Also updates the left sidebar list
    } catch {
      alert("Failed to update coordinator.");
    } finally {
      setUpdatingCoord(false);
    }
  };

  const handleAddMember = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const formData = new FormData(e.currentTarget);
    const memberId = Number(formData.get("member_id"));

    try {
      // Get active semester
      const semRes = await api.get("/organizations/semesters/");
      const sem = (semRes.data.results || semRes.data).find((s: any) => s.is_active);
      
      if (!sem) throw new Error("No active semester found.");

      await api.post("/organizations/affiliate-memberships/", {
        affiliate: selectedAff.id,
        member: memberId,
        semester: sem.id,
        start_date: new Date().toISOString().split("T")[0],
        is_active: true,
      });

      setIsModalOpen(false);
      loadMemberships(selectedAff.id);
    } catch (err: any) {
      setFormError(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (id: number) => {
    if (!confirm("Remove this member from the affiliate?")) return;
    await api.delete(`/organizations/affiliate-memberships/${id}/`);
    loadMemberships(selectedAff.id);
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading affiliates…</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Affiliates"
        subtitle="Manage Choir, YCS, Charismatic, and Drama group memberships"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Affiliate List */}
        <div className="space-y-2">
          {affiliates.map((aff) => (
            <button
              key={aff.id}
              onClick={() => setSelectedAff(aff)}
              className={`w-full text-left p-4 rounded-xl border transition
                ${selectedAff?.id === aff.id 
                  ? "bg-faith-50 border-faith-200" 
                  : "bg-white border-slate-200 hover:border-faith-200"}`}
            >
              <p className={`font-semibold ${selectedAff?.id === aff.id ? "text-faith-900" : "text-slate-900"}`}>
                {aff.name}
              </p>
              <p className="text-xs text-slate-500 mt-1 line-clamp-1">{aff.description}</p>
            </button>
          ))}
        </div>

        {/* Members Panel */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden h-full">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Users size={18} /> {selectedAff?.name} Members
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-slate-500 font-medium">Coordinator:</span>
                  {canManage && userRole !== "affiliate_coordinator" ? (
                    <select 
                      value={selectedAff?.coordinator || ""} 
                      onChange={(e) => handleSetCoordinator(e.target.value ? Number(e.target.value) : null)}
                      disabled={updatingCoord}
                      className="text-xs border border-slate-300 rounded px-2 py-1 bg-white focus:ring-2 focus:ring-faith-500"
                    >
                      <option value="">Unassigned</option>
                      {allMembers.map((m: any) => (
                        <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs font-semibold text-faith-700">
                      {selectedAff?.coordinator_name || "Unassigned"}
                    </span>
                  )}
                </div>
              </div>
              {canManage && (
                <Button onClick={() => setIsModalOpen(true)}>
                  <Plus size={16} /> Add Member
                </Button>
              )}
            </div>

            {memberships.length === 0 ? (
              <EmptyState title="No members assigned" description="Members added to this affiliate will appear here." />
            ) : (
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {memberships.map((m) => {
                  const member = allMembers.find((x: any) => x.id === m.member);
                  return (
                    <div key={m.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {member ? `${member.first_name} ${member.last_name}` : `Member ID: ${m.member}`}
                        </p>
                        <p className="text-xs text-slate-500">
                          Student ID: {member?.student_id || "Unknown"}
                        </p>
                      </div>
                      {canManage && (
                        <button
                          onClick={() => removeMember(m.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="Remove from affiliate"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Add Member to ${selectedAff?.name}`}>
        <form onSubmit={handleAddMember} className="space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-4 rounded-lg flex items-start gap-3">
              <span className="text-red-600 text-lg leading-none">⚠</span>
              <div className="flex-1">
                <p className="font-medium">Cannot add member</p>
                <p className="text-xs mt-1 text-red-700">{formError}</p>
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Select Member</label>
            <select name="member_id" required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500">
              <option value="">Select...</option>
              {allMembers
                .filter((m: any) => !memberships.some((ms: any) => ms.member === m.id))
                .map((m: any) => (
                  <option key={m.id} value={m.id}>{m.first_name} {m.last_name} ({m.student_id})</option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Adding…" : "Add to Affiliate"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
