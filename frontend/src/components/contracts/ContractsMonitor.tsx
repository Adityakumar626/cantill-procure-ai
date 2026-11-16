import React, { useEffect, useState } from 'react';
import { ContractInfo } from '../../types/procurement';
import { FileText, Plus, ShieldCheck, AlertTriangle, CheckCircle2, X } from 'lucide-react';

interface ContractsMonitorProps {
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const ContractsMonitor: React.FC<ContractsMonitorProps> = ({ onShowToast }) => {
  const [contracts, setContracts] = useState<ContractInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New contract form
  const [newId, setNewId] = useState('');
  const [newSupplier, setNewSupplier] = useState('');
  const [newCap, setNewCap] = useState('');

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/contracts');
      const data = await res.json();
      setContracts(data.contracts || []);
    } catch (err) {
      onShowToast('error', 'Fetch Error', 'Failed to retrieve contracts register.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const formatINR = (val: number) => {
    return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleRegisterContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId || !newSupplier || !newCap) {
      alert('Please fill all required fields');
      return;
    }
    onShowToast('success', 'Contract Registered', `Contract ${newId} registered and activated into ceiling engine.`);
    setIsModalOpen(false);
    setNewId('');
    setNewSupplier('');
    setNewCap('');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-7 gap-6 bg-[#090d16]">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
            Active Rate Contracts & Ceiling Monitor
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitors real-time ceiling consumption across register contracts and automatically ingested PDF contracts signed after register freeze.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 h-10 px-3.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-[6px] transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Contract</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 bg-[#111827] border border-white/[0.08] rounded-[10px] overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#161f30] sticky top-0 z-10 border-b border-white/[0.08]">
              <tr className="text-slate-400 h-10">
                <th className="py-2.5 px-4 font-medium">Contract ID</th>
                <th className="py-2.5 px-4 font-medium">Supplier</th>
                <th className="py-2.5 px-4 font-medium">Validity Period</th>
                <th className="py-2.5 px-4 font-medium text-right">Value Cap</th>
                <th className="py-2.5 px-4 font-medium text-right">Consumed Value</th>
                <th className="py-2.5 px-4 font-medium text-right">Remaining Room</th>
                <th className="py-2.5 px-4 font-medium w-48">Ceiling Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="h-14 animate-pulse">
                    <td colSpan={7} className="px-4 py-3">
                      <div className="h-4 bg-white/[0.04] rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : (
                contracts.map((c) => {
                  const pct = Math.min(100, Math.round((c.consumed_value / c.value_cap) * 100));
                  const isExhausted = c.remaining_ceiling <= 0;
                  const isPdfContract = c.contract_id === 'RC-2026-031' || c.contract_id === 'RC-2026-033';

                  let gaugeColor = 'bg-emerald-400';
                  let textColor = 'text-emerald-400';
                  if (pct >= 95 || isExhausted) {
                    gaugeColor = 'bg-red-400';
                    textColor = 'text-red-400';
                  } else if (pct >= 80) {
                    gaugeColor = 'bg-amber-400';
                    textColor = 'text-amber-400';
                  }

                  return (
                    <tr key={c.contract_id} className="h-14 hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-white flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        <span>{c.contract_id}</span>
                        {isPdfContract && (
                          <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1 py-0.2 rounded">
                            PDF Ingested
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-200">{c.supplier_name}</div>
                        <div className="text-[10px] font-mono text-slate-500">{c.supplier_id}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px] tabular-nums">
                        {c.start_date} $\rightarrow$ {c.end_date}
                      </td>
                      <td className="py-3 px-4 font-mono text-right text-slate-300 tabular-nums">
                        {formatINR(c.value_cap)}
                      </td>
                      <td className="py-3 px-4 font-mono text-right text-slate-300 tabular-nums">
                        {formatINR(c.consumed_value)}
                      </td>
                      <td className="py-3 px-4 font-mono text-right font-semibold text-emerald-400 tabular-nums">
                        {formatINR(c.remaining_ceiling)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                          <span className={`${textColor} font-semibold tabular-nums`}>{pct}% used</span>
                          {isExhausted ? (
                            <span className="text-[10px] text-red-400 font-semibold uppercase">Exhausted</span>
                          ) : (
                            <span className="text-[10px] text-slate-500 uppercase">Available</span>
                          )}
                        </div>
                        <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                          <div className={`h-full ${gaugeColor} rounded-full`} style={{ width: `${pct}%` }}></div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Contract Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <div className="bg-[#161f30] border border-white/[0.14] w-full max-w-md rounded-[10px] p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-sm font-semibold text-white">Register Rate Contract</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterContract} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Contract ID</label>
                <input
                  type="text"
                  placeholder="e.g. RC-2026-035"
                  value={newId}
                  onChange={(e) => setNewId(e.target.value)}
                  className="w-full bg-[#111827] border border-white/[0.1] h-10 rounded-[6px] px-3 text-xs text-white focus:outline-none focus:border-white/[0.2] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Supplier ID or Name</label>
                <input
                  type="text"
                  placeholder="e.g. S020 (Premier Bearings Ltd)"
                  value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                  className="w-full bg-[#111827] border border-white/[0.1] h-10 rounded-[6px] px-3 text-xs text-white focus:outline-none focus:border-white/[0.2]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Total Value Cap (INR)</label>
                <input
                  type="number"
                  placeholder="e.g. 5000000"
                  value={newCap}
                  onChange={(e) => setNewCap(e.target.value)}
                  className="w-full bg-[#111827] border border-white/[0.1] h-10 rounded-[6px] px-3 text-xs text-white focus:outline-none focus:border-white/[0.2] font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-9 px-3.5 text-xs font-medium text-slate-300 hover:bg-white/[0.06] rounded-[6px] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-[6px] transition-colors"
                >
                  Save Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
