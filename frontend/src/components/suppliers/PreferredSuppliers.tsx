import React, { useEffect, useState } from 'react';
import { Award, Download, Calendar, Search } from 'lucide-react';

export const PreferredSuppliers: React.FC = () => {
  const [asOfDate, setAsOfDate] = useState('2026-11-01');
  const [summary, setSummary] = useState<Record<string, any[]>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchRankings = async (dateVal: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/suppliers/preferred?as_of_date=${dateVal}`);
      const data = await res.json();
      setSummary(data.summary || {});
    } catch (err) {
      console.error('Error fetching preferred suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings(asOfDate);
  }, [asOfDate]);

  const handleExportCSV = () => {
    window.location.href = `/api/suppliers/preferred?format=csv&as_of_date=${asOfDate}`;
  };

  const formatINR = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '-';
    return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const items = Object.keys(summary).filter((code) =>
    code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-6">
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Clause 6: Preferred Supplier Rankings
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Dynamically evaluated based on 548d PO history, exponential recency weighting, active contract bonuses, on-time delivery %, and quality rating.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export aditya_kumar__preferred.csv</span>
          </button>
        </div>
      </div>

      <div className="shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Item Code (e.g. ITM-1048, ITM-1036)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 pl-9 pr-4 py-2 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-sm">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-850 sticky top-0 z-10 border-b border-slate-800">
              <tr className="text-slate-400">
                <th className="py-3 px-4 font-semibold">Item Code</th>
                <th className="py-3 px-4 font-semibold">Rank 1 (1st Preferred)</th>
                <th className="py-3 px-4 font-semibold">Rank 2 (2nd Preferred)</th>
                <th className="py-3 px-4 font-semibold">Rank 3 (3rd Preferred)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {items.map((itemCode) => {
                const ranks = summary[itemCode] || [];
                const r1 = ranks[0];
                const r2 = ranks[1];
                const r3 = ranks[2];

                return (
                  <tr key={itemCode} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-white flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      <span>{itemCode}</span>
                    </td>
                    <td className="py-3 px-4">
                      {r1 ? (
                        <div className="font-mono">
                          <span className="font-bold text-emerald-400">{r1.supplier_id}</span>{' '}
                          <span className="text-[11px] text-slate-400">({formatINR(r1.reference_price)})</span>
                          <span className="text-[10px] text-slate-500 block">Score: {r1.score.toFixed(1)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {r2 ? (
                        <div className="font-mono">
                          <span className="font-bold text-slate-200">{r2.supplier_id}</span>{' '}
                          <span className="text-[11px] text-slate-400">({formatINR(r2.reference_price)})</span>
                          <span className="text-[10px] text-slate-500 block">Score: {r2.score.toFixed(1)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {r3 ? (
                        <div className="font-mono">
                          <span className="font-bold text-slate-300">{r3.supplier_id}</span>{' '}
                          <span className="text-[11px] text-slate-400">({formatINR(r3.reference_price)})</span>
                          <span className="text-[10px] text-slate-500 block">Score: {r3.score.toFixed(1)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {loading && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500 text-sm">
                    Evaluating dynamic supplier ranking matrix...
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
