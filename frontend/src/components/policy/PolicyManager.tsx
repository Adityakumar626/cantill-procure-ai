import React, { useState } from 'react';
import { Sliders, ShieldCheck, ArrowRight, CheckCircle2, History } from 'lucide-react';

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
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 gap-4 bg-[#F5F6F8]">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#202B38]">
            Policy Studio
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left Column (5 Cols): Active Baseline Rules */}
        <div className="col-span-5 flex flex-col gap-3">
          <div className="bg-white border border-[#E1E5EA] rounded-[4px] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E1E5EA]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#16845B]" />
                <span className="text-xs font-semibold text-[#202B38] uppercase tracking-wider">
                  Active Baseline Policy ({activePolicy})
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#16845B] bg-[#E8F5EE] border border-[#B6E2CC] px-1.5 py-0.2 rounded">
                Governing
              </span>
            </div>

            {/* Threshold Metric Pill Badges */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-[#F5F6F8] p-2 rounded-[3px] border border-[#E1E5EA]">
                <span className="text-[9px] text-[#687586] block uppercase">Spot PO Limit</span>
                <span className="text-[#202B38] font-bold text-xs">₹2,00,000</span>
              </div>
              <div className="bg-[#F5F6F8] p-2 rounded-[3px] border border-[#E1E5EA]">
                <span className="text-[9px] text-[#687586] block uppercase">Emergency Limit</span>
                <span className="text-[#202B38] font-bold text-xs">₹5,00,000</span>
              </div>
              <div className="bg-[#F5F6F8] p-2 rounded-[3px] border border-[#E1E5EA]">
                <span className="text-[9px] text-[#687586] block uppercase">RFQ Threshold</span>
                <span className="text-[#202B38] font-bold text-xs">₹10,00,000</span>
              </div>
              <div className="bg-[#F5F6F8] p-2 rounded-[3px] border border-[#E1E5EA]">
                <span className="text-[9px] text-[#687586] block uppercase">Clubbing Window</span>
                <span className="text-[#202B38] font-bold text-xs">14 Days (±7d)</span>
              </div>
            </div>

            {/* Clause Breakdown */}
            <div className="flex flex-col gap-2 text-xs">
              <div className="p-2 bg-[#F5F6F8] border border-[#E1E5EA] rounded-[3px]">
                <span className="font-semibold text-[#202B38]">Clause 5.1 (Capex):</span> Items flagged as Capex always route to{' '}
                <code className="text-[#BE185D] font-mono font-semibold">CAPEX_SOURCING</code> (Suggest 5 category suppliers).
              </div>
              <div className="p-2 bg-[#F5F6F8] border border-[#E1E5EA] rounded-[3px]">
                <span className="font-semibold text-[#202B38]">Clause 5.2 (Contract PO):</span> Valid rate contract with available ceiling room $\rightarrow${' '}
                <code className="text-[#16845B] font-mono font-semibold">CONTRACT_PO</code> at contracted rate.
              </div>
              <div className="p-2 bg-[#F5F6F8] border border-[#E1E5EA] rounded-[3px]">
                <span className="font-semibold text-[#202B38]">Clause 5.3 (Emergency PO):</span> Urgent requisition $\le$ ₹5,00,000 with 365d history $\rightarrow${' '}
                <code className="text-[#C74747] font-mono font-semibold">EMERGENCY_PO</code> to 1st preferred supplier.
              </div>
              <div className="p-2 bg-[#F5F6F8] border border-[#E1E5EA] rounded-[3px]">
                <span className="font-semibold text-[#202B38]">Clause 5.4 (Spot PO):</span> Requirement value &lt; ₹2,00,000 with 365d history $\rightarrow${' '}
                <code className="text-[#315FCE] font-mono font-semibold">SPOT_PO</code> to 1st preferred supplier.
              </div>
              <div className="p-2 bg-[#F5F6F8] border border-[#E1E5EA] rounded-[3px]">
                <span className="font-semibold text-[#202B38]">Clause 5.5 & 5.6 (Sourcing):</span> Value &lt; ₹10L routes to <code className="text-[#C58A25] font-mono font-semibold">RFQ</code> (3 suppliers); $\ge$ ₹10L routes to <code className="text-[#7E22CE] font-mono font-semibold">RFP</code> (5 suppliers).
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols): Amendment Composer & Two-Pane Diff */}
        <div className="col-span-7 flex flex-col gap-3">
          <div className="bg-white border border-[#E1E5EA] rounded-[4px] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E1E5EA]">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#315FCE]" />
                <span className="text-xs font-semibold text-[#202B38] uppercase tracking-wider">
                  Propose Policy Amendment
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#687586]">
                Hot In-Memory Persist
              </span>
            </div>

            <form onSubmit={handlePreviewDiff} className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#202B38] mb-1">
                    Spot PO Limit (INR)
                  </label>
                  <input
                    type="number"
                    value={spotLimit}
                    onChange={(e) => setSpotLimit(Number(e.target.value))}
                    className="w-full bg-[#F5F6F8] border border-[#CAD0D8] h-8 rounded-[4px] px-2.5 text-xs text-[#202B38] focus:outline-none focus:border-[#315FCE] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#202B38] mb-1">
                    Emergency PO Limit (INR)
                  </label>
                  <input
                    type="number"
                    value={emergencyLimit}
                    onChange={(e) => setEmergencyLimit(Number(e.target.value))}
                    className="w-full bg-[#F5F6F8] border border-[#CAD0D8] h-8 rounded-[4px] px-2.5 text-xs text-[#202B38] focus:outline-none focus:border-[#315FCE] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#202B38] mb-1">
                    RFQ Upper Limit (INR)
                  </label>
                  <input
                    type="number"
                    value={rfqLimit}
                    onChange={(e) => setRfqLimit(Number(e.target.value))}
                    className="w-full bg-[#F5F6F8] border border-[#CAD0D8] h-8 rounded-[4px] px-2.5 text-xs text-[#202B38] focus:outline-none focus:border-[#315FCE] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#202B38] mb-1">
                    New Version Tag
                  </label>
                  <input
                    type="text"
                    value={versionName}
                    onChange={(e) => setVersionName(e.target.value)}
                    className="w-full bg-[#F5F6F8] border border-[#CAD0D8] h-8 rounded-[4px] px-2.5 text-xs text-[#202B38] focus:outline-none focus:border-[#315FCE] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#202B38] mb-1">
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full bg-[#F5F6F8] border border-[#CAD0D8] h-8 rounded-[4px] px-2.5 text-xs text-[#202B38] focus:outline-none focus:border-[#315FCE] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#202B38] mb-1">
                  Optional: Policy Amendment Text / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Increase spot PO threshold to ₹3,00,000 for plant CHK1 and emergency limit to ₹7,50,000..."
                  value={clauseText}
                  onChange={(e) => setClauseText(e.target.value)}
                  className="w-full bg-[#F5F6F8] border border-[#CAD0D8] rounded-[4px] p-2 text-xs text-[#202B38] placeholder-[#8D99A8] focus:outline-none focus:border-[#315FCE]"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#F5F6F8] hover:bg-[#E1E5EA] text-[#202B38] border border-[#CAD0D8] text-xs font-semibold h-8 rounded-[4px] transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <span>Preview Plain-Language Diff</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Two-Pane Diff Viewer */}
            {diffChanges && (
              <div className="p-3 bg-[#F5F6F8] border border-[#CAD0D8] rounded-[4px] flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#315FCE] flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    <span>Plain-Language Diff Analysis ({activePolicy} $\rightarrow$ {versionName})</span>
                  </h4>
                  <span className="text-[10px] font-mono text-[#16845B] bg-[#E8F5EE] border border-[#B6E2CC] px-1.5 py-0.2 rounded font-semibold">
                    Ready to Activate
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-white p-2.5 rounded-[3px] border border-[#E1E5EA]">
                    <div className="text-[9px] text-[#687586] uppercase mb-1 font-semibold">Baseline Active ({activePolicy})</div>
                    <div className="text-[#687586]">Spot Limit: ₹2,00,000</div>
                    <div className="text-[#687586]">Emergency: ₹5,00,000</div>
                    <div className="text-[#687586]">RFQ Upper: ₹10,00,000</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-[3px] border border-[#C7D7F9]">
                    <div className="text-[9px] text-[#315FCE] uppercase mb-1 font-semibold">Proposed Version ({versionName})</div>
                    <div className="text-[#16845B] font-bold">Spot Limit: {formatINR(spotLimit)}</div>
                    <div className="text-[#16845B] font-bold">Emergency: {formatINR(emergencyLimit)}</div>
                    <div className="text-[#16845B] font-bold">RFQ Upper: {formatINR(rfqLimit)}</div>
                  </div>
                </div>

                <ul className="text-xs space-y-1 font-mono text-[#202B38] pt-2 border-t border-[#E1E5EA]">
                  {diffChanges.map((change, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-[#315FCE] font-bold">•</span>
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={handleActivate}
                  disabled={isLoading}
                  className="w-full bg-[#16845B] hover:bg-[#126B49] text-white text-xs font-semibold h-9 rounded-[4px] transition-colors flex items-center justify-center gap-1.5 shadow-2xs mt-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
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
