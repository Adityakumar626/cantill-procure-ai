import React, { useEffect, useState } from 'react';
import { Award, Download, Calendar, Search, Filter, ShieldCheck, Star, Clock, CheckCircle } from 'lucide-react';
import { PreferredSupplierRank } from '../../types/procurement';

interface PreferredSuppliersProps {
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const PreferredSuppliers: React.FC<PreferredSuppliersProps> = ({ onShowToast }) => {
  const [asOfDate, setAsOfDate] = useState('2026-11-01');
  const [summary, setSummary] = useState<Record<string, PreferredSupplierRank[]>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedItemDetail, setSelectedItemDetail] = useState<string | null>(null);

  const fetchRankings = async (dateVal: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/suppliers/preferred?as_of_date=${dateVal}`);
      const data = await res.json();
      setSummary(data.summary || {});
    } catch (err) {
      onShowToast('error', 'Fetch Error', 'Failed to retrieve preferred supplier matrix.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings(asOfDate);
  }, [asOfDate]);

  const handleExportCSV = () => {
    window.location.href = `/api/suppliers/preferred?format=csv&as_of_date=${asOfDate}`;
    onShowToast('success', 'Export Started', 'Downloading aditya_kumar__preferred.csv');
  };

  const formatINR = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '-';
    return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const items = Object.keys(summary).filter((code) =>
    code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-7 gap-6 bg-[#090d16]">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
            Clause 6: Preferred Supplier Matrix & Score Inspector
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Dynamically evaluated based on 548d PO history, exponential recency (90d / 365d), active contract bonuses, on-time delivery %, and quality rating.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#111827] border border-white/[0.08] px-3 h-10 rounded-[6px]">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-400">As of Date:</span>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none font-mono"
            />
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 h-10 px-3.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-[6px] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export aditya_kumar__preferred.csv</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Item Code (e.g. ITM-1048, ITM-1036, ITM-1016)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#111827] border border-white/[0.08] pl-9 pr-4 h-10 rounded-[6px] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-white/[0.2]"
          />
        </div>
      </div>

      {/* Main Ranking Table */}
      <div className="flex-1 bg-[#111827] border border-white/[0.08] rounded-[10px] overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#161f30] sticky top-0 z-10 border-b border-white/[0.08]">
              <tr className="text-slate-400 h-10">
                <th className="py-2.5 px-4 font-medium w-36">Item Code</th>
                <th className="py-2.5 px-4 font-medium">Rank 1 (1st Preferred)</th>
                <th className="py-2.5 px-4 font-medium">Rank 2 (2nd Preferred)</th>
                <th className="py-2.5 px-4 font-medium">Rank 3 (3rd Preferred)</th>
                <th className="py-2.5 px-4 font-medium text-right">Reference Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                Array.from({ length: 12 }).map((_, i) => (
                  <tr key={i} className="h-14 animate-pulse">
                    <td colSpan={5} className="px-4 py-3">
                      <div className="h-4 bg-white/[0.04] rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : (
                items.map((itemCode) => {
                  const ranks = summary[itemCode] || [];
                  const r1 = ranks[0];
                  const r2 = ranks[1];
                  const r3 = ranks[2];

                  return (
                    <tr key={itemCode} className="h-14 hover:bg-white/[0.02] transition-colors">
                      {/* Item Code */}
                      <td className="py-3 px-4 font-mono font-bold text-white flex items-center gap-2">
                        <Award className="w-3.5 h-3.5 text-amber-400" />
                        <span>{itemCode}</span>
                      </td>

                      {/* Rank 1 */}
                      <td className="py-3 px-4">
                        {r1 ? (
                          <div className="flex items-center gap-2 font-mono">
                            <span className="font-bold text-emerald-400">{r1.supplier_id}</span>
                            <span className="text-[11px] text-slate-400">({r1.name})</span>
                            <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-mono">
                              Score: {r1.score.toFixed(1)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">None</span>
                        )}
                      </td>

                      {/* Rank 2 */}
                      <td className="py-3 px-4">
                        {r2 ? (
                          <div className="flex items-center gap-2 font-mono">
                            <span className="font-semibold text-slate-200">{r2.supplier_id}</span>
                            <span className="text-[11px] text-slate-400">({r2.name})</span>
                            <span className="text-[10px] bg-white/[0.04] border border-white/[0.08] text-slate-400 px-1.5 py-0.2 rounded font-mono">
                              Score: {r2.score.toFixed(1)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">-</span>
                        )}
                      </td>

                      {/* Rank 3 */}
                      <td className="py-3 px-4">
                        {r3 ? (
                          <div className="flex items-center gap-2 font-mono">
                            <span className="font-semibold text-slate-300">{r3.supplier_id}</span>
                            <span className="text-[11px] text-slate-400">({r3.name})</span>
                            <span className="text-[10px] bg-white/[0.04] border border-white/[0.08] text-slate-400 px-1.5 py-0.2 rounded font-mono">
                              Score: {r3.score.toFixed(1)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">-</span>
                        )}
                      </td>

                      {/* Reference Price (Right Aligned) */}
                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-100 tabular-nums">
                        {formatINR(r1?.reference_price)}
                      </td>
                    </tr>
                  );
                })
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-500 text-xs">
                    No supplier rankings found for the active query.
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
