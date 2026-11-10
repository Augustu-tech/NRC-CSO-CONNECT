import { useEffect, useState } from "react";
import { Trophy, Download, FileSpreadsheet } from "lucide-react";
import { getScoringConfigs, getLeaderboard, downloadFile } from "../api/client";
import { Card } from "../ui/Card";
import { PageHeader } from "../ui/PageHeader";
import { EmptyState } from "../ui/EmptyState";



type AwardRecord = {
  configId: number;
  month: string;
  champion: string;
  score: number;
};

export default function AwardsPage() {
  const [awards, setAwards] = useState<AwardRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all configs, then filter for finalized ones and find their champions
    getScoringConfigs().then(async (res) => {
      const configs = res.data.results || res.data || [];
      const finalized = configs.filter((c: any) => c.status === "FINALIZED");
      
      const records: AwardRecord[] = [];
      for (const config of finalized) {
        try {
          const lbRes = await getLeaderboard(config.id);
          const sorted = (lbRes.data || []).filter((r:any) => r.final_score !== null).sort((a:any, b:any) => b.final_score - a.final_score);
          if (sorted.length > 0) {
            records.push({
              configId: config.id,
              month: config.month,
              champion: sorted[0].mphakati_name,
              score: sorted[0].final_score
            });
          }
        } catch {
          // ignore errors for specific months
        }
      }
      
      // Sort chronologically (newest first)
      records.sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());
      setAwards(records);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Awards History"
        subtitle="Past Mphakati of the Month champions"
      />

      {loading && <Card className="p-5 text-sm text-slate-500">Loading records…</Card>}

      {!loading && awards.length === 0 && (
        <Card>
          <EmptyState 
            title="No finalized awards yet" 
            description="Once a month is finalized by the Chairperson, the winner will appear here." 
          />
        </Card>
      )}

      {!loading && awards.length > 0 && (
        <div className="space-y-4">
          {awards.map((award) => (
            <Card key={award.configId} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-white to-amber-50/30 border-amber-100">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shadow-inner">
                  <Trophy size={24} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-amber-700 font-semibold">
                    {new Date(award.month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </p>
                  <h2 className="text-xl font-bold text-slate-900 mt-0.5">{award.champion}</h2>
                  <p className="text-sm text-slate-500">Winning Score: {award.score}%</p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <button 
                  onClick={() => downloadFile(`/reports/certificate/${award.configId}/`, `certificate_${award.month}.pdf`)}
                  className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-faith-700 hover:bg-faith-800 text-white text-sm font-medium rounded-lg transition"
                >
                  <Download size={16} /> Certificate (PDF)
                </button>
                <button 
                  onClick={() => downloadFile(`/reports/monthly/${award.configId}/`, `report_${award.month}.xlsx`)}
                  className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition"
                >
                  <FileSpreadsheet size={16} /> Report (Excel)
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
