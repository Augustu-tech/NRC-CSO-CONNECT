import { useEffect, useState } from "react";
import { Lock, Plus, Save } from "lucide-react";
import { api, getScoringConfigs, getScoringRules, getCategories, updateScoringRule, createScoringRule, finalizeScoringConfig } from "../api/client";
import { Card } from "../ui/Card";
import { PageHeader } from "../ui/PageHeader";
import { Button } from "../ui/Button";

export default function ScoringSettingsPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<any>(null);
  const [rules, setRules] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load initial data
  useEffect(() => {
    Promise.all([getScoringConfigs(), getCategories()]).then(([confRes, catRes]) => {
      const confs = confRes.data.results || confRes.data || [];
      setConfigs(confs);
      setCategories(catRes.data.results || catRes.data || []);
      if (confs.length > 0) {
        setSelectedConfig(confs[0]);
        loadRules(confs[0].id);
      }
      setLoading(false);
    });
  }, []);

  const loadRules = (configId: number) => {
    getScoringRules(configId).then(r => {
      setRules(r.data.results || r.data || []);
    });
  };

  const handleConfigChange = (e: any) => {
    const conf = configs.find(c => c.id === Number(e.target.value));
    setSelectedConfig(conf);
    loadRules(conf.id);
  };

  const totalWeight = rules.reduce((sum, r) => sum + Number(r.weight), 0);

  const handleWeightChange = async (rule: any, newWeight: string) => {
    // Optimistic UI update
    setRules(rules.map(r => r.id === rule.id ? { ...r, weight: newWeight } : r));
  };

  const saveWeights = async () => {
    setSaving(true);
    try {
      await Promise.all(rules.map(r => updateScoringRule(r.id, Number(r.weight))));
      alert("Weights saved successfully.");
      if (selectedConfig) loadRules(selectedConfig.id);
    } catch {
      alert("Failed to save weights.");
    } finally {
      setSaving(false);
    }
  };

  const addRule = async (catId: string) => {
    if (!catId || !selectedConfig) return;
    try {
      await createScoringRule(selectedConfig.id, Number(catId), 0);
      loadRules(selectedConfig.id);
    } catch {
      alert("Failed to add category. It might already exist in this config.");
    }
  };

  const finalize = async () => {
    if (!selectedConfig) return;
    if (totalWeight !== 100) {
      alert("Total weight must equal exactly 100% before finalizing.");
      return;
    }
    if (!confirm("Are you sure? Once finalized, weights cannot be edited unless unlocked by a Super Admin.")) return;
    try {
      await finalizeScoringConfig(selectedConfig.id);
      alert("Period finalized!");
      // Refresh list
      getScoringConfigs().then(r => {
        const confs = r.data.results || r.data || [];
        setConfigs(confs);
        setSelectedConfig(confs.find((c:any) => c.id === selectedConfig.id));
      });
    } catch (e:any) {
      alert(e.response?.data?.detail || "Failed to finalize.");
    }
  };

  if (loading) return <div className="p-8 text-center">Loading settings...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Scoring Configuration"
        subtitle="Configure Mphakati weights for the monthly award"
      />

      <Card className="p-5">
        <div className="flex items-center justify-between mb-6">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Select Month / Period</label>
            <select 
              value={selectedConfig?.id || ""} 
              onChange={handleConfigChange}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg min-w-[250px]"
            >
              {configs.map(c => (
                <option key={c.id} value={c.id}>
                  {c.month} ({c.status})
                </option>
              ))}
            </select>
          </div>
          
          {selectedConfig?.status === "DRAFT" ? (
            <div className="flex items-center gap-4">
              <div className={`text-sm font-bold ${totalWeight === 100 ? "text-emerald-600" : "text-red-600"}`}>
                Total: {totalWeight}% {totalWeight === 100 ? "✓" : "(Must be 100%)"}
              </div>
              <Button onClick={saveWeights} disabled={saving} variant="secondary">
                <Save size={16} className="mr-2" /> {saving ? "Saving..." : "Save Weights"}
              </Button>
              <Button onClick={finalize} disabled={totalWeight !== 100}>
                <Lock size={16} className="mr-2" /> Finalize Month
              </Button>
            </div>
          ) : (
            <div className="text-sm bg-amber-50 text-amber-700 px-4 py-2 rounded-lg flex items-center gap-2">
              <Lock size={16} /> This period is finalized and locked.
            </div>
          )}
        </div>

        {selectedConfig && (
          <div className="space-y-3">
            {rules.map(rule => (
              <div key={rule.id} className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{rule.category_name || categories.find(c => c.id === rule.category)?.name}</p>
                </div>
                <div className="w-32 flex items-center gap-2">
                  <input 
                    type="number" 
                    value={rule.weight} 
                    onChange={(e) => handleWeightChange(rule, e.target.value)}
                    disabled={selectedConfig.status === "FINALIZED"}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-faith-500 text-right"
                  />
                  <span className="text-sm text-slate-500">%</span>
                </div>
              </div>
            ))}

            {selectedConfig.status === "DRAFT" && (
              <div className="pt-4 flex items-center gap-3">
                <select 
                  onChange={(e) => { addRule(e.target.value); e.target.value = ""; }}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">+ Add Category...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
