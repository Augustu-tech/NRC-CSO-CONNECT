import { useEffect, useState } from "react";
import { Search, Shield, User } from "lucide-react";
import { getUsers, updateUser, api } from "../api/client";
import { Card } from "../ui/Card";
import { PageHeader } from "../ui/PageHeader";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

const ROLES = [
  { value: "member", label: "Member" },
  { value: "chairperson", label: "Chairperson" },
  { value: "vice_chairperson", label: "Vice Chairperson" },
  { value: "secretary", label: "Secretary" },
  { value: "vice_secretary", label: "Vice Secretary" },
  { value: "treasurer", label: "Treasurer" },
  { value: "vice_treasurer", label: "Vice Treasurer" },
  { value: "organizing_secretary", label: "Organizing Secretary" },
  { value: "publicity_secretary", label: "Publicity Secretary" },
  { value: "mphakati_leader", label: "Mphakati Leader" },
  { value: "affiliate_coordinator", label: "Affiliate Coordinator" },
  { value: "auditor", label: "Auditor" },
  { value: "patron", label: "Patron" },
];

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      getUsers(),
      api.get("/members/members/?page_size=500")
    ]).then(([uRes, mRes]) => {
      setUsers(uRes.data.results || uRes.data || []);
      setMembers(mRes.data.results || mRes.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await updateUser(editingUser.id, {
        role: fd.get("role"),
        member: fd.get("member") ? Number(fd.get("member")) : null,
      });
      setEditingUser(null);
      load();
    } catch {
      alert("Failed to update user.");
    } finally {
      setSaving(false);
    }
  };

  const filtered = users.filter(u => 
    `${u.username} ${u.first_name} ${u.last_name}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader 
        title="User Management" 
        subtitle="Assign system roles and link accounts to member profiles" 
        action={
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search users..." className="pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg w-56" />
          </div>
        }
      />

      {loading ? <Card className="p-5 text-sm text-slate-500">Loading users…</Card> : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-left px-4 py-3 font-medium">Linked Member</th>
                <th className="text-right px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{u.username}</p>
                    <p className="text-xs text-slate-500">{u.first_name} {u.last_name} ({u.email})</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] uppercase font-bold bg-faith-50 text-faith-700 px-2 py-1 rounded">
                      {u.role.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {u.member_name || <span className="text-slate-400 italic">Not linked</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setEditingUser(u)} className="text-xs font-medium text-faith-600 hover:underline">
                      Edit Role
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="Edit User Permissions">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">System Role</label>
            <select name="role" defaultValue={editingUser?.role} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg">
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Linked Member Profile</label>
            <select name="member" defaultValue={editingUser?.member || ""} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg">
              <option value="">-- None (Admin-only account) --</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name} ({m.student_id})</option>)}
            </select>
            <p className="text-xs text-slate-500 mt-1">Required for members, treasurers, leaders, etc. to have a profile.</p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
