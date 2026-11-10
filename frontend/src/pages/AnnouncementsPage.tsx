import { FormEvent, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "../api/client";
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
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const canManage = hasPerm(me, "announcements.manage");

  const load = () => {
    setLoading(true);
    api.get("/engagement/announcements/?page_size=50")
      .then((r) => setRows(r.data.results || r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const formData = new FormData(e.currentTarget);
    
    try {
      const res = await api.post("/engagement/announcements/", {
        title: formData.get("title"),
        content: formData.get("content"),
        priority: formData.get("priority"),
        target_audience: "ALL",
      });
      
      // Auto-publish immediately after creation for simplicity
      await api.post(`/engagement/announcements/${res.data.id}/publish/`);
      
      setIsModalOpen(false);
      load();
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || "Failed to create announcement.");
    } finally {
      setSaving(false);
    }
  };

  const publish = async (id: number) => {
    setBusy(id);
    try {
      await api.post(`/engagement/announcements/${id}/publish/`);
      load();
    } finally { setBusy(null); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        subtitle="Official notices from CSO leadership"
        action={
          canManage && (
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus size={16} /> New Announcement
            </Button>
          )
        }
      />

      {loading && <Card className="p-5 text-sm text-slate-500">Loading…</Card>}

      {!loading && rows.length === 0 && (
        <Card><EmptyState title="No announcements yet" /></Card>
      )}

      {!loading && rows.map((a) => (
        <Card key={a.id} className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                {a.priority !== "NORMAL" && (
                  <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded
                    ${a.priority === "URGENT" ? "bg-red-50 text-red-700"
                    : a.priority === "HIGH" ? "bg-amber-50 text-amber-700"
                    : "bg-slate-100 text-slate-600"}`}>
                    {a.priority}
                  </span>
                )}
                {!a.is_published && (
                  <span className="text-[10px] uppercase tracking-wide bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    Draft
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">
                {a.content}
              </p>
              <p className="text-xs text-slate-400 mt-3">
                {a.author_name} · {a.published_at ? new Date(a.published_at).toLocaleDateString() : "not published"}
              </p>
            </div>
            {canManage && !a.is_published && (
              <Button
                variant="secondary"
                disabled={busy === a.id}
                onClick={() => publish(a.id)}
              >
                {busy === a.id ? "Publishing…" : "Publish"}
              </Button>
            )}
          </div>
        </Card>
      ))}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Announcement">
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{formError}</div>}
          
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Title</label>
            <input name="title" required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500" />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Content</label>
            <textarea name="content" required rows={4} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Priority</label>
            <select name="priority" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500">
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create & Publish"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
