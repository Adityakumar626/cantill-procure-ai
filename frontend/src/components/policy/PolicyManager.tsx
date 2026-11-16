import React, { useState } from 'react';
import { Sliders, ShieldCheck, ArrowRight, CheckCircle2, History, AlertTriangle, FileText, Sparkles } from 'lucide-react';

interface PolicyManagerProps {
  activePolicy: string;
  onPolicyActivated: (newVersion: string) => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const PolicyManager: React.FC<PolicyManagerProps> = ({
  activePolicy,
  onPolicyActivated,
  onShowToast,
}) => {
  const [spotLimit, setSpotLimit] = useState<number>(300000);
  const [emergencyLimit, setEmergencyLimit] = useState<number>(750000);
  const [rfqLimit, setRfqLimit] = useState<number>(1500000);
  const [versionName, setVersionName] = useState<string>('v5.1');
  const [effectiveDate, setEffectiveDate] = useState<string>('2026-11-19');
  const [clauseText, setClauseText] = useState<string>('');

  const [diffChanges, setDiffChanges] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const formatINR = (val: number) => {
    return '₹' + val.toLocaleString('en-IN');
  };

  const handlePreviewDiff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

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
      onShowToast('info', 'Amendment Preview Generated', `Generated plain-language diff for Policy ${versionName}.`);
    } catch (err) {
      onShowToast('error', 'Preview Error', 'Failed to generate amendment diff.');
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
      onShowToast(
        'success',
        `Policy ${data.active_version} Activated`,
        `New policy thresholds are now actively governing all decisions without server restart.`
      );
      setDiffChanges(null);
      onPolicyActivated(data.active_version);
    } catch (err) {
      onShowToast('error', 'Activation Error', 'Failed to activate proposed policy.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-7 gap-6 bg-[#090d16]">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Policy as Data & Dynamic Amendment Studio
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Procurement rules and spend thresholds are stored as structured versioned schemas, not code. Propose changes, preview plain-language diffs, and activate hot.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Column (5 Cols): Active Policy Rules Card */}
        <div className="col-span-5 flex flex-col gap-4">
          <div className="bg-[#111827] border border-white/[0.08] rounded-[10px] p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-white uppercase tracking-wider">
                  Active Baseline Policy ({activePolicy})
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                Governing
              </span>
            </div>

            {/* Threshold Metric Pill Badges */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-[#161f30] p-2.5 rounded-[6px] border border-white/[0.06]">
                <span className="text-[10px] text-slate-400 block uppercase">Spot PO Limit</span>
                <span className="text-white font-semibold text-sm">₹2,00,000</span>
              </div>
              <div className="bg-[#161f30] p-2.5 rounded-[6px] border border-white/[0.06]">
                <span className="text-[10px] text-slate-400 block uppercase">Emergency Limit</span>
                <span className="text-white font-semibold text-sm">₹5,00,000</span>
              </div>
              <div className="bg-[#161f30] p-2.5 rounded-[6px] border border-white/[0.06]">
                <span className="text-[10px] text-slate-400 block uppercase">RFQ Threshold</span>
                <span className="text-white font-semibold text-sm">₹10,00,000</span>
              </div>
              <div className="bg-[#161f30] p-2.5 rounded-[6px] border border-white/[0.06]">
                <span className="text-[10px] text-slate-400 block uppercase">Clubbing Window</span>
                <span className="text-white font-semibold text-sm">14 Days (±7d)</span>
              </div>
            </div>

            {/* Clause Breakdown */}
            <div className="flex flex-col gap-2 text-xs">
              <div className="p-2.5 bg-[#161f30] border border-white/[0.06] rounded-[6px]">
                <span className="font-semibold text-white">Clause 5.1 (Capex):</span> Items flagged as Capex always route to{' '}
                <code className="text-fuchsia-400 font-mono">CAPEX_SOURCING</code> (Suggest 5 category suppliers).
              </div>
              <div className="p-2.5 bg-[#161f30] border border-white/[0.06] rounded-[6px]">
                <span className="font-semibold text-white">Clause 5.2 (Contract PO):</span> Valid rate contract with available ceiling room $\rightarrow${' '}
                <code className="text-emerald-400 font-mono">CONTRACT_PO</code> at contracted rate.
              </div>
              <div className="p-2.5 bg-[#161f30] border border-white/[0.06] rounded-[6px]">
                <span className="font-semibold text-white">Clause 5.3 (Emergency PO):</span> Urgent requisition $\le$ ₹5,00,000 with 365d history $\rightarrow${' '}
                <code className="text-red-400 font-mono">EMERGENCY_PO</code> to 1st preferred supplier.
              </div>
              <div className="p-2.5 bg-[#161f30] border border-white/[0.06] rounded-[6px]">
                <span className="font-semibold text-white">Clause 5.4 (Spot PO):</span> Requirement value &lt; ₹2,00,000 with 365d history $\rightarrow${' '}
                <code className="text-sky-400 font-mono">SPOT_PO</code> to 1st preferred supplier.
              </div>
              <div className="p-2.5 bg-[#161f30] border border-white/[0.06] rounded-[6px]">
                <span className="font-semibold text-white">Clause 5.5 & 5.6 (Sourcing):</span> Value &lt; ₹10L routes to <code className="text-amber-400 font-mono">RFQ</code> (3 suppliers); $\ge$ ₹10L routes to <code className="text-purple-400 font-mono">RFP</code> (5 suppliers).
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols): Amendment Composer & Two-Pane Diff */}
        <div className="col-span-7 flex flex-col gap-4">
          <div className="bg-[#111827] border border-white/[0.08] rounded-[10px] p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-semibold text-white uppercase tracking-wider">
                  Propose Policy Amendment
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Hot In-Memory Persist
              </span>
            </div>

            <form onSubmit={handlePreviewDiff} className="flex flex-col gap-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Spot PO Limit (INR)
                  </label>
                  <input
                    type="number"
                    value={spotLimit}
                    onChange={(e) => setSpotLimit(Number(e.target.value))}
                    className="w-full bg-[#161f30] border border-white/[0.1] h-10 rounded-[6px] px-3 text-xs text-white focus:outline-none focus:border-white/[0.2] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Emergency PO Limit (INR)
                  </label>
                  <input
                    type="number"
                    value={emergencyLimit}
                    onChange={(e) => setEmergencyLimit(Number(e.target.value))}
                    className="w-full bg-[#161f30] border border-white/[0.1] h-10 rounded-[6px] px-3 text-xs text-white focus:outline-none focus:border-white/[0.2] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    RFQ Upper Sourcing (INR)
                  </label>
                  <input
                    type="number"
                    value={rfqLimit}
                    onChange={(e) => setRfqLimit(Number(e.target.value))}
                    className="w-full bg-[#161f30] border border-white/[0.1] h-10 rounded-[6px] px-3 text-xs text-white focus:outline-none focus:border-white/[0.2] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    New Version Tag
                  </label>
                  <input
                    type="text"
                    value={versionName}
                    onChange={(e) => setVersionName(e.target.value)}
                    className="w-full bg-[#161f30] border border-white/[0.1] h-10 rounded-[6px] px-3 text-xs text-white focus:outline-none focus:border-white/[0.2] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full bg-[#161f30] border border-white/[0.1] h-10 rounded-[6px] px-3 text-xs text-white focus:outline-none focus:border-white/[0.2] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Optional: Natural Language Amendment Text
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Increase spot PO threshold to ₹3,00,000 and emergency limit to ₹7,50,000 effective Thursday..."
                  value={clauseText}
                  onChange={(e) => setClauseText(e.target.value)}
                  className="w-full bg-[#161f30] border border-white/[0.1] rounded-[6px] p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-white/[0.2]"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-white/[0.05] hover:bg-white/[0.08] text-slate-200 border border-white/[0.08] text-xs font-semibold h-10 rounded-[6px] transition-colors flex items-center justify-center gap-2"
              >
                <span>Preview Plain-Language Diff</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Two-Pane Diff Viewer */}
            {diffChanges && (
              <div className="p-4 bg-[#090d16] border border-white/[0.1] rounded-[8px] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-sky-400 flex items-center gap-1.5">
                    <History className="w-4 h-4" />
                    <span>Plain-Language Diff Analysis ({activePolicy} $\rightarrow$ {versionName})</span>
                  </h4>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                    Ready to Activate
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="bg-[#111827] p-3 rounded-[6px] border border-white/[0.06]">
                    <div className="text-[10px] text-slate-500 uppercase mb-1">Baseline Active ({activePolicy})</div>
                    <div className="text-slate-400">Spot Limit: ₹2,00,000</div>
                    <div className="text-slate-400">Emergency: ₹5,00,000</div>
                    <div className="text-slate-400">RFQ Upper: ₹10,00,000</div>
                  </div>
                  <div className="bg-[#161f30] p-3 rounded-[6px] border border-sky-500/30">
                    <div className="text-[10px] text-sky-400 uppercase mb-1">Proposed Version ({versionName})</div>
                    <div className="text-emerald-400 font-semibold">Spot Limit: {formatINR(spotLimit)}</div>
                    <div className="text-emerald-400 font-semibold">Emergency: {formatINR(emergencyLimit)}</div>
                    <div className="text-emerald-400 font-semibold">RFQ Upper: {formatINR(rfqLimit)}</div>
                  </div>
                </div>

                <ul className="text-xs space-y-1 font-mono text-slate-300 pt-2 border-t border-white/[0.06]">
                  {diffChanges.map((change, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-sky-400 font-bold">•</span>
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={handleActivate}
                  disabled={isLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold h-10 rounded-[6px] transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve & Hot-Activate {versionName} (Zero Code Restart)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
