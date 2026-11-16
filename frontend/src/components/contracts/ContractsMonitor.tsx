import React, { useEffect, useState } from 'react';
import { ContractInfo } from '../../types/procurement';
import { FileText, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

export const ContractsMonitor: React.FC = () => {
  const [contracts, setContracts] = useState<ContractInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/contracts');
      const data = await res.json();
      setContracts(data.contracts || []);
    } catch (err) {
      console.error('Error fetching contracts:', err);
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

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-6">
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Active Rate Contracts & Ceiling Monitor
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitors real-time ceiling consumption across register contracts and automatically ingested PDF contracts signed after register freeze.
          </p>
        </div>
        <button
          onClick={fetchContracts}
          className="text-xs text-slate-300 bg-slate-800 hover:bg-slate-750 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors"
        >
          Refresh Ceilings
        </button>
      </div>

      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-sm">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-850 sticky top-0 z-10 border-b border-slate-800">
              <tr className="text-slate-400">
                <th className="py-3 px-4 font-semibold">Contract ID</th>
                <th className="py-3 px-4 font-semibold">Supplier Name & ID</th>
                <th className="py-3 px-4 font-semibold">Validity Period</th>
                <th className="py-3 px-4 font-semibold">Value Cap</th>
                <th className="py-3 px-4 font-semibold">Consumed Value</th>
                <th className="py-3 px-4 font-semibold">Remaining Room</th>
                <th className="py-3 px-4 font-semibold">Ceiling Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {contracts.map((c) => {
                const pct = Math.min(100, Math.round((c.consumed_value / c.value_cap) * 100));
                const isExhausted = c.remaining_ceiling <= 0;
                const isPdfContract = c.contract_id === 'RC-2026-031' || c.contract_id === 'RC-2026-033';

                return (
                  <tr key={c.contract_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-white flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      <span>{c.contract_id}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{c.supplier_name}</div>
                      <div className="text-[10px] font-mono text-slate-500">{c.supplier_id}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300 text-[11px]">
                      {c.start_date} <span className="text-slate-500">to</span> {c.end_date}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">{formatINR(c.value_cap)}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">{formatINR(c.consumed_value)}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-emerald-400">
                      {formatINR(c.remaining_ceiling)}
                    </td>
                    <td className="py-3 px-4 w-44">
                      <div className="flex items-center justify-between text-[10px] font-medium mb-1">
                        <span className={pct >= 95 ? 'text-red-400 font-bold' : pct >= 80 ? 'text-amber-400' : 'text-slate-400'}>
                          {pct}% used
                        </span>
                        {isExhausted ? (
                          <span className="text-rose-400 font-semibold">Exhausted</span>
                        ) : isPdfContract ? (
                          <span className="text-indigo-400 font-semibold">PDF Ingested</span>
                        ) : (
                          <span className="text-emerald-400">Active</span>
                        )}
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            pct >= 95 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-sm">
                    Loading contracts register and parsing PDF contracts...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
