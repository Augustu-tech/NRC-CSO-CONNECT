import { useEffect, useState } from "react";
import { FileSpreadsheet, FileText, Lock } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { hasPerm } from "../config/permissions";
import { downloadFile, getScoringConfigs } from "../api/client";
import { Card } from "../ui/Card";
import { PageHeader } from "../ui/PageHeader";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

export default function ReportsPage() {
  const { me } = useAuth();
  const canFinance = hasPerm(me, "finance.view_detail");
  const canScoring = hasPerm(me, "scoring.view");

  const [finalizedCerts, setFinalizedCerts] = useState<{ label: string; href: string }[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<{ label: string; href: string }[]>([]);

  useEffect(() => {
    if (!canScoring) return;
    getScoringConfigs().then((res) => {
      const configs = res.data.results || res.data || [];
      
      // Map Monthly Performance Reports for ALL configurations
      const mReports = configs.map((c: any) => {
        const dateObj = new Date(c.month);
        const monthName = dateObj.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        return {
          label: `${monthName} (${c.status}) (.xlsx)`,
          href: `${API}/reports/monthly/${c.id}/`
        };
      });
      setMonthlyReports(mReports);

      // Map Certificates for FINALIZED configurations only
      const finalized = configs.filter((c: any) => c.status === "FINALIZED");
      const certLinks = finalized.map((c: any) => {
        const dateObj = new Date(c.month);
        const monthName = dateObj.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        return {
          label: `${monthName} (.pdf)`,
          href: `${API}/reports/certificate/${c.id}/`
        };
      });
      setFinalizedCerts(certLinks);
    });
  }, [canScoring]);

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Reports"
        subtitle="Download official reports for printing and archiving"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {canScoring && (
          <ReportCard
            icon={FileText}
            title="Monthly Performance Report"
            description="Full category breakdown for all Miphakati."
            hrefs={monthlyReports}
            emptyMessage="No configurations available."
          />
        )}
        
        {canFinance && (
          <ReportCard
            icon={FileSpreadsheet}
            title="Financial Report"
            description="Income, expenses, and transaction logs. Download by semester or specific month."
            hrefs={[
              { label: "Full Semester 1 (.xlsx)", href: `${API}/reports/financial/1/` },
              { label: "September 2026 (.xlsx)", href: `${API}/reports/financial/1/2026/9/` },
              { label: "October 2026 (.xlsx)", href: `${API}/reports/financial/1/2026/10/` },
              { label: "November 2026 (.xlsx)", href: `${API}/reports/financial/1/2026/11/` },
              { label: "December 2026 (.xlsx)", href: `${API}/reports/financial/1/2026/12/` },
            ]}
          />
        )}

        {canScoring && (
          <ReportCard
            icon={FileText}
            title="Award Certificates"
            description="Official PDF certificates for the champions of finalized months."
            hrefs={finalizedCerts}
            emptyMessage="No certificates available. Finalize a scoring month to generate them."
          />
        )}
      </div>

      <p className="text-xs text-slate-400">
        Downloads use your current session token. If a link returns an error, either the
        scoring period is not finalized or your role does not have access.
      </p>
    </div>
  );
}

function ReportCard({
  icon: Icon, title, description, hrefs, emptyMessage,
}: {
  icon: typeof FileText;
  title: string;
  description: string;
  hrefs: { label: string; href: string }[];
  emptyMessage?: string;
}) {
  const handleDownload = (href: string, label: string) => {
    const path = href.replace("http://127.0.0.1:8000/api", "");
    const isPdf = label.includes("(pdf)") || label.includes("(.pdf)");
    const filename = label.replace(/\s|\(|\)/g, "_") + (isPdf ? ".pdf" : ".xlsx");
    downloadFile(path, filename);
  };

  return (
    <Card className="p-5 flex flex-col h-full">
      <div className="flex items-start gap-4 mb-4">
        <div className="h-10 w-10 rounded-lg bg-faith-50 text-faith-700 flex items-center justify-center flex-shrink-0">
          <Icon size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500 mt-1">{description}</p>
        </div>
      </div>
      
      <div className="flex-1 mt-2">
        {hrefs.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <Lock size={14} />
            {emptyMessage || "No files available."}
          </div>
        ) : (
          <ul className="space-y-2">
            {hrefs.map((h) => (
              <li key={h.href}>
                <button
                  onClick={() => handleDownload(h.href, h.label)}
                  className="text-sm text-faith-700 hover:text-faith-900 hover:underline text-left transition"
                >
                  {h.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
