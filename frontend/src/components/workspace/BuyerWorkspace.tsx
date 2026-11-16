import React, { useState } from 'react';
import { Requirement, SummaryKPIs, ProcurementRoute } from '../../types/procurement';
import {
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  FileText,
  RotateCcw,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface BuyerWorkspaceProps {
  requirements: Requirement[];
  kpis: SummaryKPIs | null;
  onReloadSample: () => void;
  onOverride: (groupId: string, newRoute: ProcurementRoute, comment: string) => Promise<void>;
}

export const BuyerWorkspace: React.FC<BuyerWorkspaceProps> = ({
  requirements,
  kpis,
  onReloadSample,
  onOverride,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<string>('ALL');
  const [modalRequirement, setModalRequirement] = useState<Requirement | null>(null);
  const [overrideRoute, setOverrideRoute] = useState<ProcurementRoute>('RFQ');
  const [overrideComment, setOverrideComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatINR = (val: number) => {
    return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getRouteBadgeStyle = (route: string) => {
    switch (route) {
      case 'CONTRACT_PO':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'SPOT_PO':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'EMERGENCY_PO':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'RFQ':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'RFP':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'CAPEX_SOURCING':
        return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30';
      case 'NEW_ITEM_SOURCING':
        return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
      default:
        return 'bg-slate-700 text-slate-300';
    }
  };

  const filtered = requirements.filter((r) => {
    const matchesSearch =
      r.group_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.resolved_item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.plant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRoute = selectedRoute === 'ALL' || r.route === selectedRoute;
    return matchesSearch && matchesRoute;
  });

  const handleOpenOverride = (req: Requirement) => {
    setModalRequirement(req);
    setOverrideRoute(req.route);
    setOverrideComment('');
  };

  const handleSaveOverride = async () => {
    if (!overrideComment.trim()) {
      alert('Please enter a mandatory audit justification for overriding the policy decision.');
      return;
    }
    if (!modalRequirement) return;

    setIsSubmitting(true);
    try {
      await onOverride(modalRequirement.group_id, overrideRoute, overrideComment);
      setModalRequirement(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-6">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Buyer Decision Workspace
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Evaluate automated decisions under Corvo Procurement Policy Clauses 1–8 with full audit transparency.
          </p>
        </div>
        <button
          onClick={onReloadSample}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reload Sample Batch</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 shrink-0">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total PR Lines
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {kpis?.total_pr_lines ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Across PUN1 and CHK1 plants</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Clubbed Requirements
          </div>
          <div className="text-2xl font-bold font-mono text-blue-400 mt-1">
            {kpis?.total_requirements ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Clause 2 Anti-Split 14-day window</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Automated POs
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {kpis?.direct_pos ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Contract, Spot & Emergency POs</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Sourcing Events
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {kpis?.sourcing_requests ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">RFQ, RFP & Capex tenders</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Requirement ID, Item Code, Plant or Reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 pl-9 pr-4 py-2 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs text-slate-400">Route:</span>
          <select
            value={selectedRoute}
            onChange={(e) => setSelectedRoute(e.target.value)}
            className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Routes</option>
            <option value="CONTRACT_PO">CONTRACT_PO</option>
            <option value="SPOT_PO">SPOT_PO</option>
            <option value="EMERGENCY_PO">EMERGENCY_PO</option>
            <option value="RFQ">RFQ</option>
            <option value="RFP">RFP</option>
            <option value="CAPEX_SOURCING">CAPEX_SOURCING</option>
            <option value="NEW_ITEM_SOURCING">NEW_ITEM_SOURCING</option>
          </select>
        </div>
      </div>

      {/* Decisions Table */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-sm">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-850 sticky top-0 z-10 border-b border-slate-800">
              <tr className="text-slate-400">
                <th className="py-3 px-4 font-semibold">Req ID</th>
                <th className="py-3 px-4 font-semibold">Item Code</th>
                <th className="py-3 px-4 font-semibold">Plant</th>
                <th className="py-3 px-4 font-semibold">Qty</th>
                <th className="py-3 px-4 font-semibold">Group Value</th>
                <th className="py-3 px-4 font-semibold">Route & Decision</th>
                <th className="py-3 px-4 font-semibold">Awarded / Suggested Supplier</th>
                <th className="py-3 px-4 font-semibold max-w-[260px]">Policy Justification</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((req) => (
                <tr key={req.group_id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-slate-300">{req.group_id}</td>
                  <td className="py-3 px-4 font-mono font-semibold text-white">
                    {req.resolved_item_code || 'UNMATCHED'}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-300">{req.plant}</td>
                  <td className="py-3 px-4 font-mono text-slate-300">{req.total_quantity}</td>
                  <td className="py-3 px-4 font-mono font-medium text-slate-100">
                    {formatINR(req.group_value_inr)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${getRouteBadgeStyle(
                        req.route
                      )}`}
                    >
                      {req.route}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {req.decision} {req.po_id ? `· ${req.po_id}` : ''}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {req.supplier_id ? (
                      <span className="font-semibold text-emerald-400 font-mono">
                        {req.supplier_id} <span className="text-[10px] text-slate-500">(Awarded)</span>
                      </span>
                    ) : req.suggested_suppliers && req.suggested_suppliers.length > 0 ? (
                      <span className="font-mono text-slate-300">
                        {req.suggested_suppliers.join(', ')}{' '}
                        <span className="text-[10px] text-amber-400/80">(Suggested)</span>
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">None</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11.5px] max-w-[280px] truncate" title={req.reason}>
                    {req.reason}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleOpenOverride(req)}
                      className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded transition-colors"
                    >
                      Override
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 text-sm">
                    No requirements match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Override Modal */}
      {modalRequirement && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in duration-150">
            <div>
              <h3 className="text-base font-bold text-white">Buyer Decision Override</h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Requirement: {modalRequirement.group_id} ({modalRequirement.resolved_item_code})
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">New Target Route</label>
              <select
                value={overrideRoute}
                onChange={(e) => setOverrideRoute(e.target.value as ProcurementRoute)}
                className="w-full bg-slate-850 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="CONTRACT_PO">CONTRACT_PO</option>
                <option value="SPOT_PO">SPOT_PO</option>
                <option value="EMERGENCY_PO">EMERGENCY_PO</option>
                <option value="RFQ">RFQ</option>
                <option value="RFP">RFP</option>
                <option value="CAPEX_SOURCING">CAPEX_SOURCING</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mandatory Written Justification (Audit Log)
              </label>
              <textarea
                rows={3}
                placeholder="Explain the business reason why the policy decision is being overridden..."
                value={overrideComment}
                onChange={(e) => setOverrideComment(e.target.value)}
                className="w-full bg-slate-850 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              ></textarea>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalRequirement(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveOverride}
                disabled={isSubmitting}
                className="px-4 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Confirm Override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
