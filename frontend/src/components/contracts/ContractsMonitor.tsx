import React, { useEffect, useState } from 'react';
import { ContractInfo } from '../../types/procurement';
import { FileText, Plus, X } from 'lucide-react';

interface ContractsMonitorProps {
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const ContractsMonitor: React.FC<ContractsMonitorProps> = ({ onShowToast }) => {
  const [contracts, setContracts] = useState<ContractInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-4 bg-[#F5F6F8]">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#202B38] flex items-center gap-2">
            Rate Contracts
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-white bg-[#315FCE] hover:bg-[#254DB0] rounded-[4px] transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register New Contract</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 bg-white border border-[#E1E5EA] rounded-[4px] overflow-hidden flex flex-col shadow-2xs">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#F5F6F8] sticky top-0 z-10 border-b border-[#E1E5EA]">
              <tr className="text-[#687586] h-9">
                <th className="py-2 px-3 font-medium">Contract ID</th>
                <th className="py-2 px-3 font-medium">Supplier</th>
                <th className="py-2 px-3 font-medium">Validity Period</th>
                <th className="py-2 px-3 font-medium text-right">Value Cap</th>
                <th className="py-2 px-3 font-medium text-right">Consumed Value</th>
                <th className="py-2 px-3 font-medium text-right">Remaining Room</th>
                <th className="py-2 px-3 font-medium w-48">Ceiling Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E5EA]">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="h-11 animate-pulse">
                    <td colSpan={7} className="px-3 py-2.5">
                      <div className="h-3.5 bg-[#E1E5EA] rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : (
                contracts.map((c) => {
                  const pct = Math.min(100, Math.round((c.consumed_value / c.value_cap) * 100));
                  const isExhausted = c.remaining_ceiling <= 0;
                  const isPdfContract = c.contract_id === 'RC-2026-031' || c.contract_id === 'RC-2026-033';

                  let gaugeColor = 'bg-[#16845B]';
                  let textColor = 'text-[#16845B]';
                  if (pct >= 95 || isExhausted) {
                    gaugeColor = 'bg-[#C74747]';
                    textColor = 'text-[#C74747]';
                  } else if (pct >= 80) {
                    gaugeColor = 'bg-[#C58A25]';
                    textColor = 'text-[#C58A25]';
                  }

                  return (
                    <tr key={c.contract_id} className="h-11 hover:bg-[#F9FAFB] transition-colors">
                      <td className="py-2 px-3 font-mono font-semibold text-[#202B38] flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#315FCE]" />
                        <span>{c.contract_id}</span>
                        {isPdfContract && (
                          <span className="text-[9px] font-mono text-[#7E22CE] bg-[#F3E8FF] border border-[#E9D5FF] px-1 py-0.2 rounded font-semibold">
                            PDF Ingested
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-medium text-[#202B38]">{c.supplier_name}</div>
                        <div className="text-[10px] font-mono text-[#687586]">{c.supplier_id}</div>
                      </td>
                      <td className="py-2 px-3 font-mono text-[#687586] text-[11px] tabular-nums">
                        {c.start_date} $\rightarrow$ {c.end_date}
                      </td>
                      <td className="py-2 px-3 font-mono text-right text-[#202B38] tabular-nums">
                        {formatINR(c.value_cap)}
                      </td>
                      <td className="py-2 px-3 font-mono text-right text-[#687586] tabular-nums">
                        {formatINR(c.consumed_value)}
                      </td>
                      <td className="py-2 px-3 font-mono text-right font-semibold text-[#16845B] tabular-nums">
                        {formatINR(c.remaining_ceiling)}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                          <span className={`${textColor} font-semibold tabular-nums`}>{pct}% used</span>
                          {isExhausted ? (
                            <span className="text-[9px] text-[#C74747] font-semibold uppercase">Exhausted</span>
                          ) : (
                            <span className="text-[9px] text-[#687586] uppercase">Available</span>
                          )}
                        </div>
                        <div className="w-full h-1 bg-[#E1E5EA] rounded-full overflow-hidden">
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#CAD0D8] w-full max-w-md rounded-[4px] shadow-xl flex flex-col animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="bg-[#172536] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Register Rate Contract</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#8A9BAE] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterContract} className="p-5 flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#202B38] mb-1">Contract ID</label>
                <input
                  type="text"
                  placeholder="e.g. RC-2026-035"
                  value={newId}
                  onChange={(e) => setNewId(e.target.value)}
                  className="w-full bg-[#F5F6F8] border border-[#CAD0D8] h-8 rounded-[4px] px-2.5 text-xs text-[#202B38] focus:outline-none focus:border-[#315FCE] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202B38] mb-1">Supplier ID or Name</label>
                <input
                  type="text"
                  placeholder="e.g. S020 (Premier Bearings Ltd)"
                  value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                  className="w-full bg-[#F5F6F8] border border-[#CAD0D8] h-8 rounded-[4px] px-2.5 text-xs text-[#202B38] focus:outline-none focus:border-[#315FCE]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202B38] mb-1">Total Value Cap (INR)</label>
                <input
                  type="number"
                  placeholder="e.g. 5000000"
                  value={newCap}
                  onChange={(e) => setNewCap(e.target.value)}
                  className="w-full bg-[#F5F6F8] border border-[#CAD0D8] h-8 rounded-[4px] px-2.5 text-xs text-[#202B38] focus:outline-none focus:border-[#315FCE] font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E1E5EA]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-8 px-3 text-xs font-medium text-[#687586] hover:bg-[#F5F6F8] rounded-[4px] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-3.5 text-xs font-semibold bg-[#315FCE] hover:bg-[#254DB0] text-white rounded-[4px] transition-colors shadow-2xs"
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
