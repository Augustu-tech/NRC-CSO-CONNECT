import { FormEvent, useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { hasPerm } from "../config/permissions";
import { Card } from "../ui/Card";
import { PageHeader } from "../ui/PageHeader";
import { EmptyState } from "../ui/EmptyState";
import { Button } from "../ui/Button";

export default function PrayerPage() {
  const { me } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const canSubmit = hasPerm(me, "prayer.submit");
  const canModerate = hasPerm(me, "prayer.moderate");

  const load = () => {
    setLoading(true);
    api.get("/engagement/prayer-intentions/?page_size=100")
      .then((r) => setRows(r.data.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await api.post("/engagement/prayer-intentions/", { content });
      setContent("");
      load();
    } finally { setSubmitting(false); }
  };

  const moderate = async (id: number, action: "approve" | "reject") => {
    await api.post(`/engagement/prayer-intentions/${id}/${action}/`);
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prayer Intentions"
        subtitle={canModerate
          ? "Moderate member submissions"
          : "Share a prayer — visible after moderation"}
      />

      {canSubmit && (
        <Card className="p-5">
          <form onSubmit={submit} className="space-y-3">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your prayer intention…"
              rows={3}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-faith-500"
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting || !content.trim()}>
                {submitting ? "Submitting…" : "Submit"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading && <Card className="p-5 text-sm text-slate-500">Loading…</Card>}

      {!loading && rows.length === 0 && (
        <Card>
          <EmptyState title="No prayer intentions yet"
                      description="Submitted intentions appear after moderation." />
        </Card>
      )}

      {!loading && rows.map((p) => (
        <Card key={p.id} className="p-5">
          <div className="flex items-start gap-3">
            <Heart size={16} className="text-faith-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{p.content}</p>
              <p className="text-xs text-slate-400 mt-2">
                {p.submitter_name || "Anonymous"} · {p.status}
              </p>
            </div>
            {canModerate && p.status === "PENDING" && (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => moderate(p.id, "reject")}>
                  Reject
                </Button>
                <Button onClick={() => moderate(p.id, "approve")}>Approve</Button>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
