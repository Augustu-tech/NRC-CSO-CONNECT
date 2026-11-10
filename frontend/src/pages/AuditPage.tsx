import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Card } from "../ui/Card";
import { PageHeader } from "../ui/PageHeader";
import { EmptyState } from "../ui/EmptyState";

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/audit-logs/?page_size=100")
      .then((r) => setLogs(r.data.results || r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Log" subtitle="Immutable record of all system changes" />
      
      {loading && <Card className="p-5 text-sm text-slate-500">Loading logs…</Card>}
      {!loading && logs.length === 0 && <Card><EmptyState title="No audit logs yet" /></Card>}

      {!loading && logs.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Time</th>
                  <th className="text-left px-4 py-3 font-medium">User</th>
                  <th className="text-left px-4 py-3 font-medium">Action</th>
                  <th className="text-left px-4 py-3 font-medium">Model</th>
                  <th className="text-left px-4 py-3 font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-600 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-slate-900">{log.user_name || "System"}</td>
                    <td className="px-4 py-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-faith-700 bg-faith-50 px-2 py-0.5 rounded">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {log.model_name} {log.object_id ? `#${log.object_id}` : ""}
                    </td>
                    <td className="px-4 py-2 text-slate-400 font-mono text-xs">{log.ip_address || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
