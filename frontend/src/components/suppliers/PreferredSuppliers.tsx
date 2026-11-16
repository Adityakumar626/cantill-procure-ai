import React, { useEffect, useState } from 'react';
import { Award, Download, Calendar, Search } from 'lucide-react';
import { PreferredSupplierRank } from '../../types/procurement';

interface PreferredSuppliersProps {
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const PreferredSuppliers: React.FC<PreferredSuppliersProps> = ({ onShowToast }) => {
  const [asOfDate, setAsOfDate] = useState('2026-11-01');
  const [summary, setSummary] = useState<Record<string, PreferredSupplierRank[]>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-4 bg-[#F5F6F8]">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#202B38] flex items-center gap-2">
            Preferred Suppliers
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-white border border-[#E1E5EA] px-2.5 h-8 rounded-[4px]">
            <Calendar className="w-3.5 h-3.5 text-[#687586]" />
            <span className="text-xs text-[#687586]">As of Date:</span>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="bg-transparent text-xs text-[#202B38] font-mono font-medium focus:outline-none"
            />
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-white bg-[#315FCE] hover:bg-[#254DB0] rounded-[4px] transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export aditya_kumar__preferred.csv</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="shrink-0 bg-white border border-[#E1E5EA] p-2 rounded-[4px]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8D99A8]" />
          <input
            type="text"
            placeholder="Search by Item Code (e.g. ITM-1048, ITM-1036, ITM-1016)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#F5F6F8] border border-[#E1E5EA] pl-8 pr-3 h-8 rounded-[4px] text-xs text-[#202B38] placeholder-[#8D99A8] focus:outline-none focus:border-[#CAD0D8]"
          />
        </div>
      </div>

      {/* Main Ranking Table */}
      <div className="flex-1 bg-white border border-[#E1E5EA] rounded-[4px] overflow-hidden flex flex-col shadow-2xs">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#F5F6F8] sticky top-0 z-10 border-b border-[#E1E5EA]">
              <tr className="text-[#687586] h-9">
                <th className="py-2 px-3 font-medium w-36">Item Code</th>
                <th className="py-2 px-3 font-medium">Rank 1 (1st Preferred)</th>
                <th className="py-2 px-3 font-medium">Rank 2 (2nd Preferred)</th>
                <th className="py-2 px-3 font-medium">Rank 3 (3rd Preferred)</th>
                <th className="py-2 px-3 font-medium text-right">Reference Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E5EA]">
              {loading ? (
                Array.from({ length: 12 }).map((_, i) => (
                  <tr key={i} className="h-11 animate-pulse">
                    <td colSpan={5} className="px-3 py-2.5">
                      <div className="h-3.5 bg-[#E1E5EA] rounded w-full"></div>
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
                    <tr key={itemCode} className="h-11 hover:bg-[#F9FAFB] transition-colors">
                      {/* Item Code */}
                      <td className="py-2 px-3 font-mono font-bold text-[#202B38] flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-[#C58A25]" />
                        <span>{itemCode}</span>
                      </td>

                      {/* Rank 1 */}
                      <td className="py-2 px-3">
                        {r1 ? (
                          <div className="flex items-center gap-2 font-mono">
                            <span className="font-bold text-[#16845B]">{r1.supplier_id}</span>
                            <span className="text-[11px] text-[#687586]">({r1.name})</span>
                            <span className="text-[9px] bg-[#E8F5EE] border border-[#B6E2CC] text-[#16845B] px-1 py-0.2 rounded font-mono font-semibold">
                              Score: {r1.score.toFixed(1)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#8D99A8] italic text-[11px]">None</span>
                        )}
                      </td>

                      {/* Rank 2 */}
                      <td className="py-2 px-3">
                        {r2 ? (
                          <div className="flex items-center gap-2 font-mono">
                            <span className="font-semibold text-[#202B38]">{r2.supplier_id}</span>
                            <span className="text-[11px] text-[#687586]">({r2.name})</span>
                            <span className="text-[9px] bg-[#F5F6F8] border border-[#E1E5EA] text-[#687586] px-1 py-0.2 rounded font-mono">
                              Score: {r2.score.toFixed(1)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#8D99A8] italic text-[11px]">-</span>
                        )}
                      </td>

                      {/* Rank 3 */}
                      <td className="py-2 px-3">
                        {r3 ? (
                          <div className="flex items-center gap-2 font-mono">
                            <span className="font-semibold text-[#687586]">{r3.supplier_id}</span>
                            <span className="text-[11px] text-[#8D99A8]">({r3.name})</span>
                            <span className="text-[9px] bg-[#F5F6F8] border border-[#E1E5EA] text-[#687586] px-1 py-0.2 rounded font-mono">
                              Score: {r3.score.toFixed(1)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#8D99A8] italic text-[11px]">-</span>
                        )}
                      </td>

                      {/* Reference Price (Right Aligned) */}
                      <td className="py-2 px-3 text-right font-mono font-semibold text-[#202B38] tabular-nums">
                        {formatINR(r1?.reference_price)}
                      </td>
                    </tr>
                  );
                })
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#8D99A8] text-xs">
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
