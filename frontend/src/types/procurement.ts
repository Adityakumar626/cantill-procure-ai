export type ProcurementDecision = 'PO' | 'SOURCING_REQUEST';

export type ProcurementRoute =
  | 'CONTRACT_PO'
  | 'SPOT_PO'
  | 'EMERGENCY_PO'
  | 'RFQ'
  | 'RFP'
  | 'CAPEX_SOURCING'
  | 'NEW_ITEM_SOURCING';

export interface Requirement {
  group_id: string;
  resolved_item_code: string;
  plant: string;
  requirement_date: string;
  total_quantity: number;
  decision: ProcurementDecision;
  route: ProcurementRoute;
  supplier_id?: string | null;
  unit_price: number;
  group_value_inr: number;
  suggested_suppliers: string[];
  po_id?: string | null;
  reason: string;
  lines_count: number;
}

export interface SummaryKPIs {
  total_pr_lines: number;
  total_requirements: number;
  direct_pos: number;
  sourcing_requests: number;
  total_spend_inr: number;
  active_policy: string;
}

export interface ContractInfo {
  contract_id: string;
  supplier_id: string;
  supplier_name: string;
  start_date: string;
  end_date: string;
  value_cap: number;
  consumed_value: number;
  remaining_ceiling: number;
  lines_count: number;
}

export interface PreferredSupplierRank {
  rank: number;
  supplier_id: string;
  supplier_name: string;
  score: number;
  reference_price?: number | null;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  draft_pr?: {
    resolved_item_code?: string;
    item_description?: string;
    quantity?: number;
    uom?: string;
    plant?: string;
    need_by_date?: string;
    urgency?: string;
    estimated_unit_price?: number;
    ready_to_submit?: boolean;
  } | null;
}
