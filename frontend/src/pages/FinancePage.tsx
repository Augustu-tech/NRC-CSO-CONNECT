import { FormEvent, useEffect, useState } from "react";
import { Plus, Wallet } from "lucide-react";
import { 
  api, getFinanceCategories, getMembersList, getMiphakati,
  type FinanceCategory, type Mphakati
} from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { hasPerm } from "../config/permissions";
import { Card } from "../ui/Card";
import { Stat } from "../ui/Stat";
import { PageHeader } from "../ui/PageHeader";
import { EmptyState } from "../ui/EmptyState";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

export default function FinancePage() {
  const { me } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [detail, setDetail] = useState<any[] | null>(null);
  const [error, setError] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  
  // Dropdown Data
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [miphakati, setMiphakati] = useState<Mphakati[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  
  // Form State for dynamic fields
  const [txType, setTxType] = useState("INCOME");
  const [sourceType, setSourceType] = useState("MEMBER");

  const canSeeDetail = hasPerm(me, "finance.view_detail");
  const canManage = hasPerm(me, "finance.manage");

  const loadData = () => {
    api.get("/finance/summary/").then((r) => setSummary(r.data)).catch(() => setError("You do not have access to finance."));
    if (canSeeDetail) {
      api.get("/finance/finance-transactions/?page_size=100").then((r) => setDetail(r.data.results || r.data || [])).catch(() => setDetail([]));
    }
  };

  useEffect(() => {
    loadData();
    if (canManage) {
      getFinanceCategories().then(r => setCategories(r.data.results || r.data || []));
      getMiphakati().then(r => setMiphakati(r.data.results || r.data || []));
      getMembersList().then(r => setMembers(r.data.results || r.data || []));
    }
  }, [canManage, canSeeDetail]);

  const handleRecord = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const formData = new FormData(e.currentTarget);

    const payload: any = {
      transaction_type: txType,
      amount: formData.get("amount"),
      transaction_date: formData.get("date"),
      description: formData.get("description"),
      category: Number(formData.get("category")),
      semester: 1, // Hardcoded for now, should be dynamic based on active semester
      source_type: txType === "EXPENSE" ? "OTHER" : sourceType,
      approval_status: "APPROVED", // Auto-approve for now
      reference_number: formData.get("reference") || "",
    };

    if (formData.get("mphakati")) payload.mphakati = Number(formData.get("mphakati"));
    
    if (sourceType === "MEMBER" && formData.get("member")) {
      payload.member = Number(formData.get("member"));
    }
    
    if (sourceType === "DONOR") {
      payload.donor_name = formData.get("donor_name");
      payload.donor_anonymous = formData.get("donor_anonymous") === "on";
    }

    if (sourceType === "CLIENT") {
      payload.project_name = formData.get("project_name");
    }

    try {
      await api.post("/finance/finance-transactions/", payload);
      setIsModalOpen(false);
      loadData(); // Refresh table and summary
    } catch (err: any) {
      const data = err.response?.data;
      let msg = "Failed to save transaction.";
      if (data) {
        msg = typeof data === "string" ? data : Object.entries(data).map(([k, v]) => `${k}: ${v}`).join("\n");
      }
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        subtitle={canSeeDetail ? "Full financial detail" : "Aggregate financial overview"}
        action={
          canManage && (
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus size={16} /> Record Transaction
            </Button>
          )
        }
      />

      {error && <Card className="p-5 text-sm text-slate-500">{error}</Card>}

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Stat label="Income"  value={`K${summary.totals.income.toFixed(2)}`}  tone="positive" />
          <Stat label="Expense" value={`K${summary.totals.expense.toFixed(2)}`} tone="negative" />
          <Stat label="Balance" value={`K${summary.totals.balance.toFixed(2)}`} tone="accent" />
        </div>
      )}

      {summary?.by_mphakati && (
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500 mb-3">By Mphakati</p>
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left py-2">Mphakati</th>
                <th className="text-right py-2">Income</th>
                <th className="text-right py-2">Expense</th>
                <th className="text-right py-2">Net</th>
              </tr>
            </thead>
            <tbody>
              {summary.by_mphakati.map((m: any) => (
                <tr key={m.mphakati} className="border-t border-slate-100">
                  <td className="py-2">{m.mphakati}</td>
                  <td className="py-2 text-right">K{m.income.toFixed(2)}</td>
                  <td className="py-2 text-right">K{m.expense.toFixed(2)}</td>
                  <td className="py-2 text-right font-medium">K{m.net.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {canSeeDetail && detail && (
        <Card className="overflow-hidden">
          <p className="text-xs uppercase tracking-wide text-slate-500 px-5 pt-5">Recent Transactions</p>
          {detail.length === 0 ? (
            <EmptyState title="No transactions recorded yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm mt-3">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Date</th>
                    <th className="text-left px-4 py-2 font-medium">Type</th>
                    <th className="text-left px-4 py-2 font-medium">Category</th>
                    <th className="text-left px-4 py-2 font-medium">Source</th>
                    <th className="text-right px-4 py-2 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detail.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-700">{t.transaction_date}</td>
                      <td className="px-4 py-2">
                        <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded
                          ${t.transaction_type === "INCOME" ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"}`}>
                          {t.transaction_type}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-slate-700">{t.category_name}</td>
                      <td className="px-4 py-2 text-slate-600">{t.donor_display || t.source_type}</td>
                      <td className="px-4 py-2 text-right font-medium">
                        K{Number(t.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Record Transaction Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record Transaction">
        <form onSubmit={handleRecord} className="space-y-4">
          {formError && <div className="text-sm text-red-600 bg-red-50 p-3 rounded whitespace-pre-wrap">{formError}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
              <select 
                value={txType} 
                onChange={(e) => setTxType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500"
              >
                <option value="INCOME">Income (Money In)</option>
                <option value="EXPENSE">Expense (Money Out)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
              <input name="date" type="date" required defaultValue={new Date().toISOString().split("T")[0]} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Amount (K)</label>
              <input name="amount" type="number" step="0.01" required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
              <select name="category" required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500">
                <option value="">Select...</option>
                {categories.filter(c => c.transaction_type === txType).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {txType === "INCOME" && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Source</label>
              <select 
                value={sourceType} 
                onChange={(e) => setSourceType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500"
              >
                <option value="MEMBER">Member Contribution</option>
                <option value="DONOR">Donation / Well-wisher</option>
                <option value="CLIENT">Piecework / Service</option>
                <option value="FUNDRAISING">Fundraising</option>
              </select>
            </div>
          )}

          {sourceType === "MEMBER" && txType === "INCOME" && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Select Member</label>
              <select name="member" required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500">
                <option value="">Select Member...</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name} ({m.student_id})</option>)}
              </select>
            </div>
          )}

          {sourceType === "DONOR" && txType === "INCOME" && (
            <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Donor Name</label>
                <input name="donor_name" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" name="donor_anonymous" id="anon" className="rounded text-faith-600" />
                <label htmlFor="anon" className="text-sm text-slate-700">Anonymous</label>
              </div>
            </div>
          )}

          {sourceType === "CLIENT" && txType === "INCOME" && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Project Name</label>
              <input name="project_name" required placeholder="e.g. Church Decoration" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Mphakati (Optional)</label>
              <select name="mphakati" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500">
                <option value="">General (None)</option>
                {miphakati.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Reference / Receipt #</label>
              <input name="reference" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Description {txType === "EXPENSE" && "(Required for expenses)"}</label>
            <textarea name="description" required={txType === "EXPENSE"} rows={2} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-faith-500" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Transaction"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
