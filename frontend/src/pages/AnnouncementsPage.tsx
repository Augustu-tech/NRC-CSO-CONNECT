import { FormEvent, useEffect, useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { api, getMiphakati, type Mphakati, updateAnnouncement, deleteAnnouncement } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { hasPerm } from "../config/permissions";
import { Card } from "../ui/Card";
import { PageHeader } from "../ui/PageHeader";
import { EmptyState } from "../ui/EmptyState";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

export default function AnnouncementsPage() {
  const { me } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnn, setEditingAnn] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  
  const [miphakatiList, setMiphakatiList] = useState<Mphakati[]>([]);
  const [targetAudience, setTargetAudience] = useState("ALL");

  const canManage = hasPerm(me, "announcements.manage");

  const load = () => {
    setLoading(true);
    api.get("/engagement/announcements/?page_size=50")
      .then((r) => setRows(r.data.results || r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    if (canManage) {
      getMiphakati().then(r => setMiphakatiList(r.data.results || r.data || []));
    }
  }, [canManage]);

  const openCreate = () => {
    setEditingAnn(null);
    setTargetAudience("ALL");
    setFormError("");
    setIsModalOpen(true);
  };

  const openEdit = (a: any) => {
    setEditingAnn(a);
    setTargetAudience(a.target_audience || "ALL");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const formData = new FormData(e.currentTarget);
    
    const payload: any = {
      title: formData.get("title"),
      content: formData.get("content"),
      priority: formData.get("priority"),
      target_audience: targetAudience,
      mphakati: null,
    };
    if (targetAudience === "MIPHAKATI" && formData.get("mphakati")) {
      payload.mphakati = Number(formData.get("mphakati"));
    }

    try {
      if (editingAnn) {
        // Update existing
        await updateAnnouncement(editingAnn.id, payload);
      } else {
        // Create + auto-publish
        const res = await api.post("/engagement/announcements/", payload);
        await api.post(`/engagement/announcements/${res.data.id}/publish/`);
      }
      setIsModalOpen(false);
      load();
    } catch (err: any) {
      const data = err.response?.data;
      let msg = "Failed to save announcement.";
      if (typeof data === "string") msg = data;
      else if (data?.detail) msg = data.detail;
      else if (data && typeof data === "object") {
        msg = Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(" · ");
      }
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: any) => {
    if (!confirm(`Delete "${a.title}" permanently?\n\nThis cannot be undone.`)) return;
    setBusy(a.id);
    try {
      await deleteAnnouncement(a.id);
      load();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete.");
    } finally {
      setBusy(null);
    }
  };

  const publish = async (a: any) => {
    setBusy(a.id);
    try {
      await api.post(`/engagement/announcements/${a.id}/publish/`);
      load();
    } finally {
      setBusy(null);
    }
  };

  const canEdit = (a: any) => 
    me?.is_superuser || ["super_admin", "chairperson"].includes(me?.role || "") || a.author === me?.id;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        subtitle="Official notices from CSO leadership"
        action={
          canManage && (
            <Button onClick={openCreate}>
              <Plus size={16} /> New Announcement
            </Button>
          )
        }
      />

      {loading && <Card className="p-5 text-sm text-slate-500">Loading…</Card>}
      {!loading && rows.length === 0 && <Card><EmptyState title="No announcements yet" /></Card>}

      {!loading && rows.map((a) => (
        <Card key={a.id} className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                {a.priority !== "NORMAL" && (
                  <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded
                    ${a.priority === "URGENT" ? "bg-red-50 text-red-700"
                    : a.priority === "HIGH" ? "bg-amber-50 text-amber-700"
                    : "bg-slate-100 text-slate-600"}`}>
                    {a.priority}
                  </span>
                )}
                {a.target_audience === "MIPHAKATI" && (
                  <span className="text-[10px] uppercase tracking-wide bg-faith-50 text-faith-700 px-2 py-0.5 rounded border border-faith-100">
                    {a.mphakati_name || "Targeted"} Only
                  </span>
                )}
                {!a.is_published && (
                  <span className="text-[10px] uppercase tracking-wide bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    Draft
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{a.content}</p>
              <p className="text-xs text-slate-400 mt-3">
                {a.author_name} · {a.published_at ? new Date(a.published_at).toLocaleDateString() : "not published"}
              </p>
            </div>
            <div className="flex flex-col gap-2 items-end">
              {canManage && !a.is_published && (
                <Button variant="secondary" disabled={busy === a.id} onClick={() => publish(a)}>
                  {busy === a.id ? "…" : "Publish"}
                </Button>
              )}
              {canEdit(a) && (
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(a)}
                    className="p-2 text-slate-500 hover:text-faith-600 hover:bg-faith-50 rounded-lg transition"
                    title="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(a)}
                    disabled={busy === a.id}
                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingAnn ? "Edit Announcement" : "New Announcement"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{formError}</div>}
          
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Title</label>
            <input name="title" defaultValue={editingAnn?.title} required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500" />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Content</label>
            <textarea name="content" defaultValue={editingAnn?.content} required rows={4} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Priority</label>
              <select name="priority" defaultValue={editingAnn?.priority || "NORMAL"} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500">
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Target Audience</label>
              <select 
                value={targetAudience} 
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500"
              >
                <option value="ALL">Everyone</option>
                <option value="MIPHAKATI">Specific Mphakati</option>
              </select>
            </div>
          </div>

          {targetAudience === "MIPHAKATI" && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Select Mphakati</label>
              <select name="mphakati" defaultValue={editingAnn?.mphakati || ""} required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500">
                <option value="">Select...</option>
                {miphakatiList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : editingAnn ? "Save Changes" : "Create & Publish"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
