import React, { useState } from 'react';
import { Sliders, ShieldCheck, ArrowRight, CheckCircle2, History, AlertTriangle } from 'lucide-react';

interface PolicyManagerProps {
  activePolicy: string;
  onPolicyActivated: (newVersion: string) => void;
}

export const PolicyManager: React.FC<PolicyManagerProps> = ({ activePolicy, onPolicyActivated }) => {
  const [spotLimit, setSpotLimit] = useState<number>(300000);
  const [emergencyLimit, setEmergencyLimit] = useState<number>(750000);
  const [rfqLimit, setRfqLimit] = useState<number>(1500000);
  const [versionName, setVersionName] = useState<string>('v5.1');
  const [effectiveDate, setEffectiveDate] = useState<string>('2026-11-19');

  const [diffChanges, setDiffChanges] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activatedSuccess, setActivatedSuccess] = useState<string | null>(null);

  const handlePreviewDiff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setActivatedSuccess(null);

    const formData = new FormData();
    formData.append('spot_po_limit', spotLimit.toString());
    formData.append('emergency_po_limit', emergencyLimit.toString());
    formData.append('rfq_limit', rfqLimit.toString());
    formData.append('new_version_name', versionName);
    formData.append('effective_date_str', effectiveDate);

    try {
      const res = await fetch('/api/policy/amend', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setDiffChanges(data.changes || []);
    } catch (err) {
      alert('Failed to preview policy amendment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivate = async () => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append('spot_po_limit', spotLimit.toString());
    formData.append('emergency_po_limit', emergencyLimit.toString());
    formData.append('rfq_limit', rfqLimit.toString());
    formData.append('version_name', versionName);
    formData.append('effective_date_str', effectiveDate);

    try {
      const res = await fetch('/api/policy/activate', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setActivatedSuccess(
        `Policy ${data.active_version} has been successfully activated hot in memory! No code change or restart required.`
      );
      setDiffChanges(null);
      onPolicyActivated(data.active_version);
    } catch (err) {
      alert('Failed to activate policy amendment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 gap-6">
      <div className="shrink-0">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          Policy as Data & Dynamic Amendment Engine
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Procurement policy rules and financial thresholds are stored as versioned data, not code. Propose changes, preview plain-language diffs, and activate hot.
        </p>
      </div>

      {activatedSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-400 text-xs">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{activatedSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Active Policy Rules Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                Active Policy Rules ({activePolicy})
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Currently driving all real-time procurement decisions
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
              Active
            </span>
          </div>

          <div className="flex flex-col gap-2 text-xs">
            <div className="p-2.5 bg-slate-850 border border-slate-800 rounded-lg">
              <span className="font-semibold text-white">Rule 5.1 (Capex):</span> Items flagged as Capex always route to{' '}
              <code className="text-blue-400 font-mono">CAPEX_SOURCING</code> (Suggest 5 category suppliers).
            </div>

            <div className="p-2.5 bg-slate-850 border border-slate-800 rounded-lg">
              <span className="font-semibold text-white">Rule 5.2 (Rate Contract):</span> Valid rate contract with available ceiling room $\rightarrow${' '}
              <code className="text-emerald-400 font-mono">CONTRACT_PO</code> at contracted rate.
            </div>

            <div className="p-2.5 bg-slate-850 border border-slate-800 rounded-lg">
              <span className="font-semibold text-white">Rule 5.3 (Emergency PO):</span> Urgent requisition $\le$ ₹5,00,000 with 365d history $\rightarrow${' '}
              <code className="text-rose-400 font-mono">EMERGENCY_PO</code> to 1st preferred supplier.
            </div>

            <div className="p-2.5 bg-slate-850 border border-slate-800 rounded-lg">
              <span className="font-semibold text-white">Rule 5.4 (Spot PO):</span> Requirement value &lt; ₹2,00,000 with 365d history $\rightarrow${' '}
              <code className="text-blue-400 font-mono">SPOT_PO</code> to 1st preferred supplier.
            </div>

            <div className="p-2.5 bg-slate-850 border border-slate-800 rounded-lg">
              <span className="font-semibold text-white">Rule 5.5 (RFQ Sourcing):</span> Value &lt; ₹10,00,000 (or unproven item) $\rightarrow${' '}
              <code className="text-amber-400 font-mono">RFQ</code> (Suggest 3 suppliers).
            </div>

            <div className="p-2.5 bg-slate-850 border border-slate-800 rounded-lg">
              <span className="font-semibold text-white">Rule 5.6 (RFP Tender):</span> Requirement value $\ge$ ₹10,00,000 $\rightarrow${' '}
              <code className="text-purple-400 font-mono">RFP</code> (Suggest 5 suppliers).
            </div>
          </div>
        </div>

        {/* Propose Amendment Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4 shadow-sm">
          <div className="pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" />
              Propose Policy Amendment
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Simulate or hot-activate new thresholds (e.g. for Thursday blind test amendment)
            </p>
          </div>

          <form onSubmit={handlePreviewDiff} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Spot PO Limit (INR)
              </label>
              <input
                type="number"
                value={spotLimit}
                onChange={(e) => setSpotLimit(Number(e.target.value))}
                className="w-full bg-slate-850 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Emergency PO Limit (INR)
              </label>
              <input
                type="number"
                value={emergencyLimit}
                onChange={(e) => setEmergencyLimit(Number(e.target.value))}
                className="w-full bg-slate-850 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                RFQ Upper Sourcing Limit (INR)
              </label>
              <input
                type="number"
                value={rfqLimit}
                onChange={(e) => setRfqLimit(Number(e.target.value))}
                className="w-full bg-slate-850 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  New Version ID
                </label>
                <input
                  type="text"
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  className="w-full bg-slate-850 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Effective Date
                </label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full bg-slate-850 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span>Preview Plain-Language Diff</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Diff Box */}
          {diffChanges && (
            <div className="mt-2 p-4 bg-slate-950 border border-slate-700 rounded-xl flex flex-col gap-3">
              <h4 className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                <History className="w-4 h-4" />
                <span>Plain-Language Amendment Preview</span>
              </h4>
              <ul className="text-xs space-y-1.5 font-mono text-slate-300">
                {diffChanges.map((change, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-sky-400 font-bold">•</span>
                    <span>{change}</span>
                  </li>
                ))}
                {diffChanges.length === 0 && (
                  <li className="text-slate-500">No threshold differences detected against active policy.</li>
                )}
              </ul>

              <button
                onClick={handleActivate}
                disabled={isLoading}
                className="mt-1 w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve & Activate Amendment (No Code Restart)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
