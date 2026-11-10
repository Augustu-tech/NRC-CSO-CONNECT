import { FormEvent, useEffect, useState } from "react";
import { Plus, Search, ArrowRightLeft } from "lucide-react";
import { api, getMiphakati, getSemesters, transferMember, type Mphakati, type Semester } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { hasPerm } from "../config/permissions";
import { Card } from "../ui/Card";
import { PageHeader } from "../ui/PageHeader";
import { EmptyState } from "../ui/EmptyState";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

type Member = {
  id: number;
  student_id: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  gender: string;
  phone: string;
  email: string;
  status: string;
};

export default function MembersPage() {
  const { me } = useAuth();
  const [rows, setRows] = useState<Member[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [miphakatiList, setMiphakatiList] = useState<Mphakati[]>([]);
  const [semestersList, setSemestersList] = useState<Semester[]>([]);
  
  // Add member modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Transfer modal
  const [transferMemberObj, setTransferMemberObj] = useState<Member | null>(null);
  const [transferSaving, setTransferSaving] = useState(false);
  const [transferError, setTransferError] = useState("");

  const canManage = hasPerm(me, "members.manage");

  const loadMembers = () => {
    setLoading(true);
    api.get("/members/members/?page_size=200")
      .then((r) => setRows(r.data.results || r.data || []))
      .catch(() => setError("You do not have access to the member directory."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMembers();
    if (canManage) {
      getMiphakati().then(r => setMiphakatiList(r.data.results || r.data || [])).catch(() => {});
      getSemesters().then(r => setSemestersList(r.data.results || r.data || [])).catch(() => {});
    }
  }, [canManage]);

  const handleAddMember = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const formData = new FormData(e.currentTarget);
    
    try {
      const res = await api.post("/members/members/", {
        student_id: formData.get("student_id"),
        first_name: formData.get("first_name"),
        middle_name: formData.get("middle_name") || "",
        last_name: formData.get("last_name"),
        gender: formData.get("gender"),
        phone: formData.get("phone") || "",
        email: formData.get("email") || "",
        status: formData.get("status") || "ACTIVE",
        date_joined: new Date().toISOString().split("T")[0],
      });

      await api.post("/members/mphakati-memberships/", {
        member: res.data.id,
        mphakati: Number(formData.get("mphakati_id")),
        semester: Number(formData.get("semester_id")),
        start_date: new Date().toISOString().split("T")[0],
        is_current: true,
      });

      setIsModalOpen(false);
      loadMembers();
    } catch (err: any) {
      const data = err.response?.data;
      setFormError(data ? (typeof data === "string" ? data : Object.entries(data).map(([k, v]) => `${k}: ${v}`).join("\n")) : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleTransfer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!transferMemberObj) return;
    setTransferSaving(true);
    setTransferError("");
    const formData = new FormData(e.currentTarget);
    
    try {
      await transferMember(transferMemberObj.id, {
        mphakati_id: Number(formData.get("mphakati_id")),
        semester_id: Number(formData.get("semester_id")),
      });
      setTransferMemberObj(null);
      loadMembers();
    } catch (err: any) {
      setTransferError(err.response?.data?.detail || "Transfer failed.");
    } finally {
      setTransferSaving(false);
    }
  };

  const filtered = rows.filter((m) => {
    if (!q) return true;
    const blob = `${m.first_name} ${m.last_name} ${m.student_id}`.toLowerCase();
    return blob.includes(q.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        subtitle={`${rows.length} member${rows.length === 1 ? "" : "s"} in your scope`}
        action={
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name or ID"
                className="pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg w-56 focus:outline-none focus:ring-2 focus:ring-faith-500"
              />
            </div>
            {canManage && (
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus size={16} /> Add Member
              </Button>
            )}
          </div>
        }
      />

      {loading && <Card className="p-5 text-sm text-slate-500">Loading…</Card>}
      {error && <Card className="p-5 text-sm text-slate-500">{error}</Card>}

      {!loading && !error && filtered.length === 0 && (
        <Card><EmptyState title="No members found" description={q ? "Try a different search term." : undefined} /></Card>
      )}

      {!loading && filtered.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Student ID</th>
                  <th className="text-left px-4 py-3 font-medium">Phone</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  {canManage && <th className="text-right px-4 py-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-900">{m.first_name} {m.last_name}</td>
                    <td className="px-4 py-3 text-slate-600">{m.student_id}</td>
                    <td className="px-4 py-3 text-slate-600">{m.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs uppercase tracking-wide text-slate-500">{m.status}</span>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setTransferMemberObj(m)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-faith-600 hover:text-faith-900 px-2 py-1 rounded hover:bg-faith-50 transition"
                        >
                          <ArrowRightLeft size={14} /> Transfer
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Member Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Member">
        <form onSubmit={handleAddMember} className="space-y-4">
          {formError && <div className="text-sm text-red-600 bg-red-50 p-3 rounded whitespace-pre-wrap">{formError}</div>}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">First Name</label>
              <input name="first_name" required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Last Name</label>
              <input name="last_name" required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Middle Name</label>
            <input name="middle_name" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Student ID</label>
              <input name="student_id" required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Gender</label>
              <select name="gender" required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500">
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
              <input name="phone" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
              <input name="email" type="email" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
            <select name="status" required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500">
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="GRADUATED">Graduated</option>
              <option value="TRANSFERRED">Transferred</option>
            </select>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-700 mb-3 uppercase tracking-wide">Membership</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Mphakati</label>
                <select name="mphakati_id" required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500">
                  <option value="">Select...</option>
                  {miphakatiList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Semester</label>
                <select name="semester_id" required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500">
                  <option value="">Select...</option>
                  {semestersList.map(s => <option key={s.id} value={s.id}>{s.academic_year?.name || "Unknown"} — Sem {s.number}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Member"}</Button>
          </div>
        </form>
      </Modal>

      {/* Transfer Modal */}
      <Modal isOpen={!!transferMemberObj} onClose={() => setTransferMemberObj(null)} title={`Transfer ${transferMemberObj?.first_name || ""}`}>
        <form onSubmit={handleTransfer} className="space-y-4">
          {transferError && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{transferError}</div>}
          <p className="text-sm text-slate-600">
            This will move <strong>{transferMemberObj?.first_name} {transferMemberObj?.last_name}</strong> 
            out of their current Mphakati and into a new one.
          </p>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">New Mphakati</label>
            <select name="mphakati_id" required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500">
              <option value="">Select...</option>
              {miphakatiList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">For Semester</label>
            <select name="semester_id" required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500">
              <option value="">Select...</option>
              {semestersList.map(s => <option key={s.id} value={s.id}>{s.academic_year?.name || "Unknown"} — Sem {s.number}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setTransferMemberObj(null)}>Cancel</Button>
            <Button type="submit" disabled={transferSaving}>{transferSaving ? "Transferring…" : "Confirm Transfer"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
