import React, { useState } from 'react';
import { Requirement, SummaryKPIs, ProcurementRoute } from '../../types/procurement';
import {
  Search,
  Filter,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  UserCheck,
  CheckCircle2,
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

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

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
        return 'bg-[#E8F5EE] text-[#16845B] border-[#B6E2CC]';
      case 'SPOT_PO':
        return 'bg-[#EBF1FD] text-[#315FCE] border-[#C7D7F9]';
      case 'EMERGENCY_PO':
        return 'bg-[#FDF0F0] text-[#C74747] border-[#F7C6C6]';
      case 'RFQ':
        return 'bg-[#FDF7EB] text-[#C58A25] border-[#F6DFB3]';
      case 'RFP':
        return 'bg-[#F3E8FF] text-[#7E22CE] border-[#E9D5FF]';
      case 'CAPEX_SOURCING':
        return 'bg-[#FDF2F8] text-[#BE185D] border-[#FBCFE8]';
      case 'NEW_ITEM_SOURCING':
        return 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]';
      default:
        return 'bg-[#F5F6F8] text-[#687586] border-[#E1E5EA]';
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

  const handleApprove = async (groupId: string) => {
    try {
      const formData = new FormData();
      formData.append('group_id', groupId);
      formData.append('buyer_name', buyerSignature);
      await fetch('/api/approve', {
        method: 'POST',
        body: formData,
      });
      onReloadSample();
    } catch (err) {
      console.error('Approval failed', err);
    }
  };

  const handleApproveAll = async () => {
    try {
      const formData = new FormData();
      formData.append('group_id', 'ALL');
      formData.append('buyer_name', buyerSignature);
      await fetch('/api/approve', {
        method: 'POST',
        body: formData,
      });
      onReloadSample();
    } catch (err) {
      console.error('Approve all failed', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-4 bg-[#F5F6F8]">
      {/* Page Title & Action */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#202B38]">
            Buyer Workspace
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleApproveAll}
            className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-white bg-[#16845B] hover:bg-[#126B49] rounded-[4px] transition-colors shadow-2xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approve All Decisions</span>
          </button>
          <button
            onClick={onReloadSample}
            className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-[#202B38] bg-white hover:bg-[#F5F6F8] border border-[#CAD0D8] rounded-[4px] transition-colors shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#687586]" />
            <span>Reload Sample</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Strip (Compact, High Density) */}
      <div className="grid grid-cols-4 gap-3 shrink-0">
        {/* Total Lines */}
        <div className="bg-white border border-[#E1E5EA] p-3 rounded-[4px] flex flex-col justify-between">
          <div className="text-[10px] font-semibold text-[#687586] uppercase tracking-wider">
            Total Requisition Lines
          </div>
          <div className="text-xl font-bold font-mono text-[#202B38] tabular-nums mt-1">
            {isLoading ? '---' : kpis?.total_pr_lines ?? 0}
          </div>
        </div>

        {/* Clubbed Requirements */}
        <div className="bg-white border border-[#E1E5EA] p-3 rounded-[4px] flex flex-col justify-between">
          <div className="text-[10px] font-semibold text-[#687586] uppercase tracking-wider">
            Clubbed Requirements
          </div>
          <div className="text-xl font-bold font-mono text-[#315FCE] tabular-nums mt-1">
            {isLoading ? '---' : kpis?.total_requirements ?? 0}
          </div>
        </div>

        {/* Direct POs */}
        <div className="bg-white border border-[#E1E5EA] p-3 rounded-[4px] flex flex-col justify-between">
          <div className="text-[10px] font-semibold text-[#687586] uppercase tracking-wider">
            Direct POs
          </div>
          <div className="text-xl font-bold font-mono text-[#16845B] tabular-nums mt-1">
            {isLoading ? '---' : kpis?.direct_pos ?? 0}
          </div>
        </div>

        {/* Sourcing Requests */}
        <div className="bg-white border border-[#E1E5EA] p-3 rounded-[4px] flex flex-col justify-between">
          <div className="text-[10px] font-semibold text-[#687586] uppercase tracking-wider">
            Sourcing Requests
          </div>
          <div className="text-xl font-bold font-mono text-[#C58A25] tabular-nums mt-1">
            {isLoading ? '---' : kpis?.sourcing_requests ?? 0}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-2.5 shrink-0 bg-white border border-[#E1E5EA] p-2 rounded-[4px]">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8D99A8]" />
          <input
            type="text"
            placeholder="Search by Requirement ID, Item Code, Plant or Reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#F5F6F8] border border-[#E1E5EA] pl-8 pr-3 h-8 rounded-[4px] text-xs text-[#202B38] placeholder-[#8D99A8] focus:outline-none focus:border-[#CAD0D8]"
          />
        </div>

        {/* Plant Filter */}
        <div className="flex items-center gap-1.5 px-2 h-8 bg-[#F5F6F8] border border-[#E1E5EA] rounded-[4px]">
          <span className="text-[11px] text-[#687586]">Plant:</span>
          <select
            value={selectedPlant}
            onChange={(e) => setSelectedPlant(e.target.value)}
            className="bg-transparent text-xs text-[#202B38] font-medium focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Plants</option>
            <option value="PUN1">PUN1 (Bhosari)</option>
            <option value="CHK1">CHK1 (Chakan)</option>
          </select>
        </div>

        {/* Decision Filter */}
        <div className="flex items-center gap-1.5 px-2 h-8 bg-[#F5F6F8] border border-[#E1E5EA] rounded-[4px]">
          <span className="text-[11px] text-[#687586]">Decision:</span>
          <select
            value={selectedDecision}
            onChange={(e) => setSelectedDecision(e.target.value)}
            className="bg-transparent text-xs text-[#202B38] font-medium focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Decisions</option>
            <option value="PO">PO Only</option>
            <option value="SOURCING_REQUEST">Sourcing Only</option>
          </select>
        </div>

        {/* Route Filter */}
        <div className="flex items-center gap-1.5 px-2 h-8 bg-[#F5F6F8] border border-[#E1E5EA] rounded-[4px]">
          <Filter className="w-3 h-3 text-[#687586]" />
          <span className="text-[11px] text-[#687586]">Route:</span>
          <select
            value={selectedRoute}
            onChange={(e) => setSelectedRoute(e.target.value)}
            className="bg-transparent text-xs text-[#202B38] font-medium focus:outline-none cursor-pointer"
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

      {/* Table-First Primary Grid */}
      <div className="flex-1 bg-white border border-[#E1E5EA] rounded-[4px] overflow-hidden flex flex-col shadow-2xs">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#F5F6F8] sticky top-0 z-10 border-b border-[#E1E5EA]">
              <tr className="text-[#687586] h-9">
                <th className="py-2 px-2.5 font-medium w-8"></th>
                <th className="py-2 px-2.5 font-medium">Group ID</th>
                <th className="py-2 px-2.5 font-medium">Item Code</th>
                <th className="py-2 px-2.5 font-medium">Plant</th>
                <th className="py-2 px-2.5 font-medium text-right">Total Qty</th>
                <th className="py-2 px-2.5 font-medium text-right">Group Value</th>
                <th className="py-2 px-2.5 font-medium">Route & Decision</th>
                <th className="py-2 px-2.5 font-medium">Awarded / Suggested Supplier</th>
                <th className="py-2 px-2.5 font-medium max-w-[260px]">Policy Clause & Justification</th>
                <th className="py-2 px-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E5EA]">
              {isLoading ? (
                Array.from({ length: 12 }).map((_, i) => (
                  <tr key={i} className="h-11 animate-pulse">
                    <td colSpan={10} className="px-3 py-2.5">
                      <div className="h-3.5 bg-[#E1E5EA] rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : (
                filtered.map((req) => {
                  const isExpanded = !!expandedGroups[req.group_id];
                  const hasLines = req.lines && req.lines.length > 0;

                  return (
                    <React.Fragment key={req.group_id}>
                      <tr className="h-11 hover:bg-[#F9FAFB] transition-colors group">
                        {/* Expand Trigger */}
                        <td className="py-2 px-2.5 text-center">
                          {hasLines && (
                            <button
                              onClick={() => toggleExpand(req.group_id)}
                              className="text-[#8D99A8] hover:text-[#202B38] transition-colors"
                              title={isExpanded ? 'Collapse constituent PRs' : 'Expand constituent PRs'}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </td>

                        {/* Group ID */}
                        <td className="py-2 px-2.5 font-mono font-medium text-[#202B38] tabular-nums">
                          {req.group_id}
                          {hasLines && req.lines!.length > 1 && (
                            <span className="ml-1 text-[9px] font-mono text-[#315FCE] bg-[#EBF1FD] border border-[#C7D7F9] px-1 py-0.2 rounded-[2px]">
                              {req.lines!.length} lines
                            </span>
                          )}
                        </td>

                        {/* Item Code */}
                        <td className="py-2 px-2.5 font-mono font-semibold text-[#202B38]">
                          {req.resolved_item_code || 'UNMATCHED'}
                        </td>

                        {/* Plant */}
                        <td className="py-2 px-2.5 font-medium text-[#202B38]">{req.plant}</td>

                        {/* Total Qty (Right Aligned) */}
                        <td className="py-2 px-2.5 font-mono text-[#202B38] text-right tabular-nums">
                          {req.total_quantity}
                        </td>

                        {/* Requirement Value (Right Aligned) */}
                        <td className="py-2 px-2.5 font-mono font-semibold text-[#202B38] text-right tabular-nums">
                          {formatINR(req.group_value_inr)}
                        </td>

                        {/* Route Badge */}
                        <td className="py-2 px-2.5">
                          <span
                            className={`inline-block px-1.5 py-0.2 rounded-[3px] text-[10px] font-mono font-semibold border ${getRouteBadge(
                              req.route
                            )}`}
                          >
                            {req.route}
                          </span>
                          <span className="text-[10px] text-[#687586] ml-1.5 font-mono">
                            {req.po_id || req.decision}
                          </span>
                        </td>

                        {/* Suppliers */}
                        <td className="py-2 px-2.5">
                          {req.supplier_id ? (
                            <span className="font-semibold text-[#16845B] font-mono text-[11px]">
                              {req.supplier_id} <span className="text-[9px] text-[#687586] font-sans font-normal">(Awarded)</span>
                            </span>
                          ) : req.suggested_suppliers && req.suggested_suppliers.length > 0 ? (
                            <span className="font-mono text-[#202B38] text-[11px]">
                              {req.suggested_suppliers.join(', ')}{' '}
                              <span className="text-[9px] text-[#C58A25] font-sans font-normal">(Suggested)</span>
                            </span>
                          ) : (
                            <span className="text-[#8D99A8] italic text-[11px]">None</span>
                          )}
                        </td>

                        {/* Justification */}
                        <td
                          className="py-2 px-2.5 text-[#687586] text-[11px] max-w-[280px] truncate"
                          title={req.reason}
                        >
                          {req.reason}
                        </td>

                        {/* Action */}
                        <td className="py-2 px-2.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {req.is_approved ? (
                              <span
                                className="px-2 py-0.5 text-[10px] font-semibold bg-[#E8F5EE] text-[#16845B] border border-[#B6E2CC] rounded flex items-center gap-1"
                                title={`Approved by ${req.approved_by || 'Buyer'} at ${req.approved_at || ''}`}
                              >
                                <span>✓</span>
                                <span>Approved</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleApprove(req.group_id)}
                                className="h-7 px-2 text-[11px] font-semibold bg-[#16845B] hover:bg-[#126B49] text-white rounded-[3px] transition-colors"
                              >
                                Approve
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenOverride(req)}
                              className="h-7 px-2 text-[11px] font-medium bg-white hover:bg-[#F5F6F8] text-[#202B38] border border-[#CAD0D8] rounded-[3px] transition-colors"
                            >
                              Override
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Sub-Row showing Constituent PR lines */}
                      {isExpanded && req.lines && (
                        <tr className="bg-[#F9FAFB] border-b border-[#E1E5EA]">
                          <td colSpan={10} className="px-6 py-2.5">
                            <div className="text-[10px] font-semibold text-[#687586] uppercase tracking-wider mb-1.5">
                              Constituent Purchase Requisitions in {req.group_id}:
                            </div>
                            <div className="bg-white border border-[#E1E5EA] rounded-[3px] overflow-hidden">
                              <table className="w-full text-left text-[11px]">
                                <thead className="bg-[#F5F6F8] text-[#687586] border-b border-[#E1E5EA]">
                                  <tr className="h-7">
                                    <th className="py-1 px-2.5 font-medium">PR Number</th>
                                    <th className="py-1 px-2.5 font-medium">Line</th>
                                    <th className="py-1 px-2.5 font-medium">Requester</th>
                                    <th className="py-1 px-2.5 font-medium">Department</th>
                                    <th className="py-1 px-2.5 font-medium text-right">Quantity</th>
                                    <th className="py-1 px-2.5 font-medium">Created Date</th>
                                    <th className="py-1 px-2.5 font-medium">Need-By Date</th>
                                    <th className="py-1 px-2.5 font-medium">Urgency</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E1E5EA]">
                                  {req.lines.map((line, idx) => (
                                    <tr key={idx} className="h-7 hover:bg-[#F9FAFB]">
                                      <td className="py-1 px-2.5 font-mono font-medium text-[#315FCE]">{line.pr_no}</td>
                                      <td className="py-1 px-2.5 font-mono">{line.pr_line}</td>
                                      <td className="py-1 px-2.5 text-[#202B38]">{line.requester}</td>
                                      <td className="py-1 px-2.5 text-[#687586]">{line.department}</td>
                                      <td className="py-1 px-2.5 font-mono text-right text-[#202B38]">
                                        {line.quantity} {line.uom}
                                      </td>
                                      <td className="py-1 px-2.5 font-mono text-[#687586]">{line.created_at}</td>
                                      <td className="py-1 px-2.5 font-mono text-[#687586]">{line.need_by_date}</td>
                                      <td className="py-1 px-2.5">
                                        <span
                                          className={`px-1.5 py-0.2 rounded text-[9px] font-mono ${
                                            line.urgency === 'Emergency'
                                              ? 'bg-[#FDF0F0] text-[#C74747] border border-[#F7C6C6]'
                                              : 'text-[#687586]'
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
                  <td colSpan={10} className="py-12 text-center text-[#8D99A8] text-xs">
                    No purchase requirements match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Buyer Decision Override Modal */}
      {modalRequirement && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#CAD0D8] w-full max-w-lg rounded-[4px] shadow-xl flex flex-col animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="bg-[#172536] text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#F6DFB3]" />
                  <span>Buyer Policy Override Authorization</span>
                </h3>
                <p className="text-[11px] text-[#C7D0DA] font-mono mt-0.5">
                  Requirement: {modalRequirement.group_id} ({modalRequirement.resolved_item_code}) · Current Route: {modalRequirement.route}
                </p>
              </div>
            </div>

            <div className="p-5 flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#202B38] mb-1">
                  New Target Route
                </label>
                <select
                  value={overrideRoute}
                  onChange={(e) => setOverrideRoute(e.target.value as ProcurementRoute)}
                  className="w-full bg-[#F5F6F8] border border-[#CAD0D8] h-9 rounded-[4px] px-2.5 text-xs text-[#202B38] focus:outline-none focus:border-[#315FCE]"
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
                <label className="block text-xs font-semibold text-[#202B38] mb-1">
                  Mandatory Written Justification (Permanent Audit Log)
                </label>
                <textarea
                  rows={3}
                  placeholder="State the commercial or operational necessity for departing from automated procurement policy rules..."
                  value={overrideComment}
                  onChange={(e) => setOverrideComment(e.target.value)}
                  className="w-full bg-[#F5F6F8] border border-[#CAD0D8] rounded-[4px] p-2.5 text-xs text-[#202B38] placeholder-[#8D99A8] focus:outline-none focus:border-[#315FCE]"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202B38] mb-1">
                  Authorizing Buyer Signature
                </label>
                <div className="flex items-center gap-2 bg-[#F5F6F8] border border-[#CAD0D8] h-9 px-2.5 rounded-[4px]">
                  <UserCheck className="w-3.5 h-3.5 text-[#315FCE]" />
                  <input
                    type="text"
                    value={buyerSignature}
                    onChange={(e) => setBuyerSignature(e.target.value)}
                    className="bg-transparent text-xs text-[#202B38] font-mono flex-1 focus:outline-none font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E1E5EA]">
                <button
                  type="button"
                  onClick={() => setModalRequirement(null)}
                  className="h-8 px-3 text-xs font-medium text-[#687586] hover:bg-[#F5F6F8] rounded-[4px] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmOverride}
                  disabled={isSubmitting}
                  className="h-8 px-3.5 text-xs font-semibold bg-[#C74747] hover:bg-[#A83838] text-white rounded-[4px] transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording Audit...' : 'Confirm Authorization'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
