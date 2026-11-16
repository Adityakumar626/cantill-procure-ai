import React, { useState } from 'react';
import { Requirement, SummaryKPIs, ProcurementRoute, ConstituentPRLine } from '../../types/procurement';
import {
  Search,
  Filter,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  FileSpreadsheet,
} from 'lucide-react';

interface BuyerWorkspaceProps {
  requirements: Requirement[];
  kpis: SummaryKPIs | null;
  isLoading: boolean;
  onReloadSample: () => void;
  onOverride: (groupId: string, newRoute: ProcurementRoute, comment: string, buyerSignature: string) => Promise<void>;
}

export const BuyerWorkspace: React.FC<BuyerWorkspaceProps> = ({
  requirements,
  kpis,
  isLoading,
  onReloadSample,
  onOverride,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlant, setSelectedPlant] = useState<string>('ALL');
  const [selectedDecision, setSelectedDecision] = useState<string>('ALL');
  const [selectedRoute, setSelectedRoute] = useState<string>('ALL');

  // Expanded rows state
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Override modal state
  const [modalRequirement, setModalRequirement] = useState<Requirement | null>(null);
  const [overrideRoute, setOverrideRoute] = useState<ProcurementRoute>('RFQ');
  const [overrideComment, setOverrideComment] = useState('');
  const [buyerSignature, setBuyerSignature] = useState('Aditya Kumar');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatINR = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return '₹0.00';
    return '₹' + Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getRouteBadge = (route: string) => {
    switch (route) {
      case 'CONTRACT_PO':
        return 'bg-emerald-500/10 text-[#34d399] border-emerald-500/25';
      case 'SPOT_PO':
        return 'bg-sky-500/10 text-[#38bdf8] border-sky-500/25';
      case 'EMERGENCY_PO':
        return 'bg-red-500/15 text-[#f87171] border-red-500/30';
      case 'RFQ':
        return 'bg-amber-500/10 text-[#fbbf24] border-amber-500/25';
      case 'RFP':
        return 'bg-purple-500/10 text-[#a78bfa] border-purple-500/25';
      case 'CAPEX_SOURCING':
        return 'bg-fuchsia-500/10 text-[#e879f9] border-fuchsia-500/25';
      case 'NEW_ITEM_SOURCING':
        return 'bg-slate-500/15 text-[#94a3b8] border-slate-500/30';
      default:
        return 'bg-slate-700/20 text-slate-300 border-slate-700/40';
    }
  };

  const toggleExpand = (groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const filtered = requirements.filter((r) => {
    const matchesSearch =
      r.group_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.resolved_item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.plant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlant = selectedPlant === 'ALL' || r.plant === selectedPlant;
    const matchesDecision = selectedDecision === 'ALL' || r.decision === selectedDecision;
    const matchesRoute = selectedRoute === 'ALL' || r.route === selectedRoute;
    return matchesSearch && matchesPlant && matchesDecision && matchesRoute;
  });

  const handleOpenOverride = (req: Requirement) => {
    setModalRequirement(req);
    setOverrideRoute(req.route);
    setOverrideComment('');
    setBuyerSignature('Aditya Kumar');
  };

  const handleConfirmOverride = async () => {
    if (!overrideComment.trim()) {
      alert('Mandatory written justification required for policy audit compliance.');
      return;
    }
    if (!modalRequirement) return;

    setIsSubmitting(true);
    try {
      await onOverride(modalRequirement.group_id, overrideRoute, overrideComment, buyerSignature);
      setModalRequirement(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-7 gap-6 bg-[#090d16]">
      {/* Page Title & Reload */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Buyer Decision Workspace
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Evaluate automated decisions under Corvo Procurement Policy Clauses 1–8 with full audit transparency.
          </p>
        </div>
        <button
          onClick={onReloadSample}
          className="flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-slate-300 bg-[#111827] hover:bg-white/[0.06] border border-white/[0.08] rounded-[6px] transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>Reload Sample Batch</span>
        </button>
      </div>

      {/* KPI Cards Row (Compact, 4-column) */}
      <div className="grid grid-cols-4 gap-4 shrink-0">
        {/* Total Lines */}
        <div className="bg-[#111827] border border-white/[0.08] p-4 rounded-[10px] flex flex-col justify-between">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Total PR Lines
          </div>
          <div className="text-2xl font-semibold font-mono text-white tabular-nums my-1">
            {isLoading ? <span className="animate-pulse text-slate-600">---</span> : kpis?.total_pr_lines ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Across 2 plants: PUN1 & CHK1
          </div>
        </div>

        {/* Clubbed Requirements */}
        <div className="bg-[#111827] border border-white/[0.08] p-4 rounded-[10px] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Clubbed Requirements
            </span>
            <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.2 rounded">
              Clause 2
            </span>
          </div>
          <div className="text-2xl font-semibold font-mono text-blue-400 tabular-nums my-1">
            {isLoading ? <span className="animate-pulse text-slate-600">---</span> : kpis?.total_requirements ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Anti-split window: 14d / 7d need-by
          </div>
        </div>

        {/* Direct POs */}
        <div className="bg-[#111827] border border-white/[0.08] p-4 rounded-[10px] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Direct POs
            </span>
            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded">
              Automated
            </span>
          </div>
          <div className="text-2xl font-semibold font-mono text-emerald-400 tabular-nums my-1">
            {isLoading ? <span className="animate-pulse text-slate-600">---</span> : kpis?.direct_pos ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Contract, Spot & Emergency routes
          </div>
        </div>

        {/* Sourcing Requests */}
        <div className="bg-[#111827] border border-white/[0.08] p-4 rounded-[10px] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Sourcing Requests
            </span>
            <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded">
              Tenders
            </span>
          </div>
          <div className="text-2xl font-semibold font-mono text-amber-400 tabular-nums my-1">
            {isLoading ? <span className="animate-pulse text-slate-600">---</span> : kpis?.sourcing_requests ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            RFQ, RFP & Capex sourcing tenders
          </div>
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
            className="w-full bg-[#111827] border border-white/[0.08] pl-9 pr-4 h-10 rounded-[6px] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-white/[0.2] transition-colors"
          />
        </div>

        {/* Plant Filter */}
        <div className="flex items-center gap-2 bg-[#111827] border border-white/[0.08] px-3 h-10 rounded-[6px]">
          <span className="text-xs text-slate-400">Plant:</span>
          <select
            value={selectedPlant}
            onChange={(e) => setSelectedPlant(e.target.value)}
            className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Plants</option>
            <option value="PUN1">PUN1 (Bhosari)</option>
            <option value="CHK1">CHK1 (Chakan)</option>
          </select>
        </div>

        {/* Decision Filter */}
        <div className="flex items-center gap-2 bg-[#111827] border border-white/[0.08] px-3 h-10 rounded-[6px]">
          <span className="text-xs text-slate-400">Decision:</span>
          <select
            value={selectedDecision}
            onChange={(e) => setSelectedDecision(e.target.value)}
            className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Decisions</option>
            <option value="PO">PO Only</option>
            <option value="SOURCING_REQUEST">Sourcing Only</option>
          </select>
        </div>

        {/* Route Filter */}
        <div className="flex items-center gap-2 bg-[#111827] border border-white/[0.08] px-3 h-10 rounded-[6px]">
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

      {/* Primary Data Table */}
      <div className="flex-1 bg-[#111827] border border-white/[0.08] rounded-[10px] overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#161f30] sticky top-0 z-10 border-b border-white/[0.08]">
              <tr className="text-slate-400 h-10">
                <th className="py-2.5 px-3 font-medium w-8"></th>
                <th className="py-2.5 px-3 font-medium">Group ID</th>
                <th className="py-2.5 px-3 font-medium">Item Code</th>
                <th className="py-2.5 px-3 font-medium">Plant</th>
                <th className="py-2.5 px-3 font-medium text-right">Total Qty</th>
                <th className="py-2.5 px-3 font-medium text-right">Requirement Value</th>
                <th className="py-2.5 px-3 font-medium">Route & Decision</th>
                <th className="py-2.5 px-3 font-medium">Awarded / Suggested Supplier</th>
                <th className="py-2.5 px-3 font-medium max-w-[260px]">Policy Justification</th>
                <th className="py-2.5 px-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading ? (
                // Skeleton Screen Rows
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="h-14 animate-pulse">
                    <td colSpan={10} className="px-4 py-3">
                      <div className="h-4 bg-white/[0.04] rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : (
                filtered.map((req) => {
                  const isExpanded = !!expandedGroups[req.group_id];
                  const hasLines = req.lines && req.lines.length > 0;

                  return (
                    <React.Fragment key={req.group_id}>
                      <tr className="h-14 hover:bg-white/[0.02] transition-colors group">
                        {/* Expand Trigger */}
                        <td className="py-3 px-3">
                          {hasLines && (
                            <button
                              onClick={() => toggleExpand(req.group_id)}
                              className="text-slate-500 hover:text-slate-200 transition-colors"
                              title={isExpanded ? 'Collapse constituent PRs' : 'Expand constituent PRs'}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </td>

                        {/* Group ID */}
                        <td className="py-3 px-3 font-mono font-medium text-slate-300 tabular-nums">
                          {req.group_id}
                          {hasLines && req.lines!.length > 1 && (
                            <span className="ml-1.5 text-[10px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1 py-0.2 rounded">
                              {req.lines!.length} lines
                            </span>
                          )}
                        </td>

                        {/* Resolved Item Code */}
                        <td className="py-3 px-3 font-mono font-semibold text-white">
                          {req.resolved_item_code || 'UNMATCHED'}
                        </td>

                        {/* Plant */}
                        <td className="py-3 px-3 font-medium text-slate-300">{req.plant}</td>

                        {/* Total Qty (Right Aligned) */}
                        <td className="py-3 px-3 font-mono text-slate-300 text-right tabular-nums">
                          {req.total_quantity}
                        </td>

                        {/* Requirement Value (Right Aligned) */}
                        <td className="py-3 px-3 font-mono font-semibold text-white text-right tabular-nums">
                          {formatINR(req.group_value_inr)}
                        </td>

                        {/* Route Badge */}
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${getRouteBadge(
                              req.route
                            )}`}
                          >
                            {req.route}
                          </span>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {req.decision} {req.po_id ? `· ${req.po_id}` : ''}
                          </div>
                        </td>

                        {/* Suppliers */}
                        <td className="py-3 px-3">
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

                        {/* Justification */}
                        <td
                          className="py-3 px-3 text-slate-400 text-[11px] max-w-[280px] truncate"
                          title={req.reason}
                        >
                          {req.reason}
                        </td>

                        {/* Action (Revealed on row hover or permanent) */}
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleOpenOverride(req)}
                            className="h-[30px] px-2.5 text-[11px] font-medium bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] rounded-[6px] transition-colors"
                          >
                            Override
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Sub-Row showing Constituent PR lines */}
                      {isExpanded && req.lines && (
                        <tr className="bg-[#0b101c]/80 border-b border-white/[0.04]">
                          <td colSpan={10} className="px-6 py-3">
                            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                              <span>Constituent Purchase Requisitions Clubbed in {req.group_id}:</span>
                            </div>
                            <div className="bg-[#111827] border border-white/[0.06] rounded-[6px] overflow-hidden">
                              <table className="w-full text-left text-[11px]">
                                <thead className="bg-[#161f30] text-slate-400 border-b border-white/[0.06]">
                                  <tr>
                                    <th className="py-1.5 px-3 font-medium">PR Number</th>
                                    <th className="py-1.5 px-3 font-medium">Line</th>
                                    <th className="py-1.5 px-3 font-medium">Requester</th>
                                    <th className="py-1.5 px-3 font-medium">Department</th>
                                    <th className="py-1.5 px-3 font-medium text-right">Quantity</th>
                                    <th className="py-1.5 px-3 font-medium">Created Date</th>
                                    <th className="py-1.5 px-3 font-medium">Need-By Date</th>
                                    <th className="py-1.5 px-3 font-medium">Urgency</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.04]">
                                  {req.lines.map((line, idx) => (
                                    <tr key={idx} className="hover:bg-white/[0.02]">
                                      <td className="py-1.5 px-3 font-mono font-medium text-blue-400">{line.pr_no}</td>
                                      <td className="py-1.5 px-3 font-mono">{line.pr_line}</td>
                                      <td className="py-1.5 px-3 text-slate-300">{line.requester}</td>
                                      <td className="py-1.5 px-3 text-slate-400">{line.department}</td>
                                      <td className="py-1.5 px-3 font-mono text-right text-slate-200">
                                        {line.quantity} {line.uom}
                                      </td>
                                      <td className="py-1.5 px-3 font-mono text-slate-400">{line.created_at}</td>
                                      <td className="py-1.5 px-3 font-mono text-slate-400">{line.need_by_date}</td>
                                      <td className="py-1.5 px-3">
                                        <span
                                          className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                                            line.urgency === 'Emergency'
                                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                              : 'text-slate-400'
                                          }`}
                                        >
                                          {line.urgency}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}

              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-500 text-xs">
                    No requirements match the active filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Buyer Decision Override Modal */}
      {modalRequirement && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <div className="bg-[#161f30] border border-white/[0.14] w-full max-w-lg rounded-[10px] p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Buyer Policy Override & Audit Authorization</span>
                </h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Requirement: {modalRequirement.group_id} ({modalRequirement.resolved_item_code}) · Current Route: {modalRequirement.route}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                New Target Route
              </label>
              <select
                value={overrideRoute}
                onChange={(e) => setOverrideRoute(e.target.value as ProcurementRoute)}
                className="w-full bg-[#111827] border border-white/[0.1] h-10 rounded-[6px] px-3 text-xs text-white focus:outline-none focus:border-white/[0.2]"
              >
                <option value="CONTRACT_PO">CONTRACT_PO (Direct Order under Rate Contract)</option>
                <option value="SPOT_PO">SPOT_PO (Spot PO to Preferred Supplier)</option>
                <option value="EMERGENCY_PO">EMERGENCY_PO (Fast-Track Emergency PO)</option>
                <option value="RFQ">RFQ (Competitive Quotation Sourcing - 3 Suppliers)</option>
                <option value="RFP">RFP (Formal Tender Sourcing - 5 Suppliers)</option>
                <option value="CAPEX_SOURCING">CAPEX_SOURCING (Capital Equipment Tender)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Mandatory Written Justification (Permanent Audit Log)
              </label>
              <textarea
                rows={3}
                placeholder="State the commercial or operational necessity for departing from automated procurement policy rules..."
                value={overrideComment}
                onChange={(e) => setOverrideComment(e.target.value)}
                className="w-full bg-[#111827] border border-white/[0.1] rounded-[6px] p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-white/[0.2]"
              ></textarea>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Authorizing Buyer Signature
              </label>
              <div className="flex items-center gap-2 bg-[#111827] border border-white/[0.1] h-10 px-3 rounded-[6px]">
                <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                <input
                  type="text"
                  value={buyerSignature}
                  onChange={(e) => setBuyerSignature(e.target.value)}
                  className="bg-transparent text-xs text-white flex-1 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setModalRequirement(null)}
                className="h-9 px-3.5 text-xs font-medium text-slate-300 hover:bg-white/[0.06] rounded-[6px] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmOverride}
                disabled={isSubmitting}
                className="h-9 px-4 text-xs font-medium bg-red-600 hover:bg-red-500 text-white rounded-[6px] transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Recording Audit...' : 'Confirm Authorization'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
