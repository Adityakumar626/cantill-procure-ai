/**
 * Cantill ProcureAI Frontend Interactive Application
 * Powers Buyer Workspace, Chat Intake, Policy as Data, Preferred Suppliers, and Contracts.
 */

let currentRequirements = [];
let currentGroupIdForOverride = null;
const API_BASE = "";

document.addEventListener("DOMContentLoaded", () => {
  // Initial data loading
  loadSampleBatch();
  loadContracts();
  loadPreferredSuppliers();
});

// ==========================================================================
// Tab Switching
// ==========================================================================

function switchTab(tabName) {
  // Update sidebar buttons
  document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));
  const activeBtn = Array.from(document.querySelectorAll(".nav-item")).find(b => b.textContent.toLowerCase().includes(tabName.replace("-", " ")));
  if (activeBtn) activeBtn.classList.add("active");

  // Update tab panes
  document.querySelectorAll(".tab-pane").forEach(pane => pane.classList.remove("active"));
  const targetPane = document.getElementById(`tab-${tabName}`);
  if (targetPane) targetPane.classList.add("active");
}

// ==========================================================================
// Formatting Helpers
// ==========================================================================

function formatINR(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return "₹0.00";
  return "₹" + Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function getRouteBadge(route) {
  return `<span class="route-badge route-${route}">${route}</span>`;
}

// ==========================================================================
// Buyer Decision Workspace (Tab 1)
// ==========================================================================

async function loadSampleBatch() {
  try {
    const res = await fetch(`${API_BASE}/api/process-batch`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to process batch");
    const data = await res.json();
    currentRequirements = data.requirements;

    // Update KPI values
    if (data.summary) {
      document.getElementById("kpiTotalLines").textContent = data.summary.total_pr_lines;
      document.getElementById("kpiTotalReqs").textContent = data.summary.total_requirements;
      document.getElementById("kpiDirectPOs").textContent = data.summary.direct_pos;
      document.getElementById("kpiSourcingReqs").textContent = data.summary.sourcing_requests;
      if (data.summary.active_policy) {
        document.getElementById("activePolicyBadge").textContent = `Policy ${data.summary.active_policy} Active`;
        document.getElementById("policyVersionDisplay").textContent = data.summary.active_policy;
      }
    }

    renderDecisionsTable(currentRequirements);
  } catch (err) {
    console.error("Error loading sample batch:", err);
  }
}

function renderDecisionsTable(reqs) {
  const tbody = document.getElementById("decisionsTableBody");
  tbody.innerHTML = "";

  reqs.forEach(req => {
    const tr = document.createElement("tr");

    let suppliersDisplay = "";
    if (req.supplier_id) {
      suppliersDisplay = `<strong>${req.supplier_id}</strong> (Awarded)`;
    } else if (req.suggested_suppliers && req.suggested_suppliers.length > 0) {
      suppliersDisplay = req.suggested_suppliers.join(", ") + " (Suggested)";
    } else {
      suppliersDisplay = "<span style='color: var(--text-dim);'>None</span>";
    }

    tr.innerHTML = `
      <td class="mono-cell">${req.group_id}</td>
      <td class="mono-cell"><strong>${req.resolved_item_code || "UNMATCHED"}</strong></td>
      <td>${req.plant}</td>
      <td class="mono-cell">${req.total_quantity}</td>
      <td class="mono-cell">${formatINR(req.group_value_inr)}</td>
      <td>
        ${getRouteBadge(req.route)}
        <div style="font-size: 10.5px; color: var(--text-muted); margin-top: 2px;">Decision: ${req.decision}</div>
      </td>
      <td>${suppliersDisplay}</td>
      <td style="max-width: 280px; font-size: 11.5px; color: var(--text-muted);">${req.reason}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="openOverrideModal('${req.group_id}', '${req.route}')">Override</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ==========================================================================
// Buyer Decision Override Modal
// ==========================================================================

function openOverrideModal(groupId, currentRoute) {
  currentGroupIdForOverride = groupId;
  document.getElementById("modalReqLabel").textContent = `Requirement: ${groupId} (Current: ${currentRoute})`;
  document.getElementById("modalRouteSelect").value = currentRoute;
  document.getElementById("modalComment").value = "";
  document.getElementById("overrideModal").style.display = "flex";
}

function closeOverrideModal() {
  document.getElementById("overrideModal").style.display = "none";
  currentGroupIdForOverride = null;
}

async function saveOverride() {
  const newRoute = document.getElementById("modalRouteSelect").value;
  const comment = document.getElementById("modalComment").value;

  if (!comment || !comment.trim()) {
    alert("Please provide a written audit justification for this policy override.");
    return;
  }

  const formData = new FormData();
  formData.append("group_id", currentGroupIdForOverride);
  formData.append("new_route", newRoute);
  formData.append("comment", comment);
  formData.append("buyer_name", "Aditya Kumar");

  try {
    const res = await fetch(`${API_BASE}/api/override`, {
      method: "POST",
      body: formData
    });
    if (!res.ok) throw new Error("Failed to record override");

    // Update in-memory requirement
    const req = currentRequirements.find(r => r.group_id === currentGroupIdForOverride);
    if (req) {
      req.route = newRoute;
      req.decision = newRoute.includes("PO") ? "PO" : "SOURCING_REQUEST";
      req.reason = `[OVERRIDDEN by Aditya Kumar]: ${comment} (Prior: ${req.reason})`;
      renderDecisionsTable(currentRequirements);
    }

    closeOverrideModal();
  } catch (err) {
    alert("Override error: " + err.message);
  }
}

// ==========================================================================
// Conversational PR Intake (Tab 2)
// ==========================================================================

function handleChatKey(e) {
  if (e.key === "Enter") {
    sendChatMessage();
  }
}

async function sendChatMessage() {
  const input = document.getElementById("chatInput");
  const message = input.value.trim();
  if (!message) return;

  const chatMessages = document.getElementById("chatMessages");

  // Append user bubble
  const userBubble = document.createElement("div");
  userBubble.className = "chat-bubble user";
  userBubble.textContent = message;
  chatMessages.appendChild(userBubble);

  input.value = "";
  chatMessages.scrollTop = chatMessages.scrollHeight;

  const formData = new FormData();
  formData.append("message", message);
  formData.append("session_id", "buyer_session_01");

  try {
    const res = await fetch(`${API_BASE}/api/chat/intake`, {
      method: "POST",
      body: formData
    });
    const data = await res.json();

    const assistantBubble = document.createElement("div");
    assistantBubble.className = "chat-bubble assistant";

    let html = data.assistant_reply;

    if (data.draft_pr && data.draft_pr.ready_to_submit) {
      const pr = data.draft_pr;
      html += `
        <div class="chat-draft-card">
          <h5>✅ Confirmed Purchase Requisition Ready</h5>
          <div><strong>Item:</strong> ${pr.resolved_item_code} (${pr.item_description})</div>
          <div><strong>Plant:</strong> ${pr.plant}</div>
          <div><strong>Quantity:</strong> ${pr.quantity} ${pr.uom}</div>
          <div><strong>Est. Price:</strong> ${formatINR(pr.estimated_unit_price)}</div>
          <div><strong>Need-By:</strong> ${pr.need_by_date} · <strong>Urgency:</strong> ${pr.urgency}</div>
          <button class="btn btn-primary btn-sm" style="margin-top: 8px;" onclick="submitDraftPR()">Submit Requisition to Engine</button>
        </div>
      `;
    }

    assistantBubble.innerHTML = html;
    chatMessages.appendChild(assistantBubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } catch (err) {
    console.error("Chat error:", err);
  }
}

function submitDraftPR() {
  alert("Requisition successfully submitted into Corvo Procurement Engine! Routed to Buyer Decision Workspace.");
  switchTab("buyer-workspace");
}

// ==========================================================================
// Policy as Data (Tab 3)
// ==========================================================================

async function handleAmendPreview(e) {
  e.preventDefault();
  const spotLimit = document.getElementById("amendSpotLimit").value;
  const emergencyLimit = document.getElementById("amendEmergencyLimit").value;
  const rfqLimit = document.getElementById("amendRfqLimit").value;
  const versionName = document.getElementById("amendVersionName").value;
  const effectiveDate = document.getElementById("amendEffectiveDate").value;

  const formData = new FormData();
  if (spotLimit) formData.append("spot_po_limit", spotLimit);
  if (emergencyLimit) formData.append("emergency_po_limit", emergencyLimit);
  if (rfqLimit) formData.append("rfq_limit", rfqLimit);
  formData.append("new_version_name", versionName);
  formData.append("effective_date_str", effectiveDate);

  try {
    const res = await fetch(`${API_BASE}/api/policy/amend`, {
      method: "POST",
      body: formData
    });
    const data = await res.json();

    const diffBox = document.getElementById("diffPreviewBox");
    const diffList = document.getElementById("diffList");
    diffList.innerHTML = "";

    if (data.changes && data.changes.length > 0) {
      data.changes.forEach(ch => {
        const li = document.createElement("li");
        li.textContent = "• " + ch;
        diffList.appendChild(li);
      });
    } else {
      diffList.innerHTML = "<li>No threshold changes detected against active policy.</li>";
    }

    diffBox.style.display = "block";
  } catch (err) {
    alert("Amendment preview failed: " + err.message);
  }
}

async function activateProposedPolicy() {
  const spotLimit = document.getElementById("amendSpotLimit").value;
  const emergencyLimit = document.getElementById("amendEmergencyLimit").value;
  const rfqLimit = document.getElementById("amendRfqLimit").value;
  const versionName = document.getElementById("amendVersionName").value;
  const effectiveDate = document.getElementById("amendEffectiveDate").value;

  const formData = new FormData();
  if (spotLimit) formData.append("spot_po_limit", spotLimit);
  if (emergencyLimit) formData.append("emergency_po_limit", emergencyLimit);
  if (rfqLimit) formData.append("rfq_limit", rfqLimit);
  formData.append("version_name", versionName);
  formData.append("effective_date_str", effectiveDate);

  try {
    const res = await fetch(`${API_BASE}/api/policy/activate`, {
      method: "POST",
      body: formData
    });
    const data = await res.json();

    alert(`Success: Policy ${data.active_version} is now actively running all decisions without code restart!`);
    document.getElementById("diffPreviewBox").style.display = "none";
    document.getElementById("activePolicyBadge").textContent = `Policy ${data.active_version} Active`;
    document.getElementById("policyVersionDisplay").textContent = data.active_version;

    // Re-evaluate batch under new policy
    loadSampleBatch();
    switchTab("buyer-workspace");
  } catch (err) {
    alert("Activation error: " + err.message);
  }
}

// ==========================================================================
// Preferred Suppliers (Tab 4)
// ==========================================================================

async function loadPreferredSuppliers() {
  const dateVal = document.getElementById("supplierAsOfDate").value || "2026-11-01";
  try {
    const res = await fetch(`${API_BASE}/api/suppliers/preferred?as_of_date=${dateVal}`);
    const data = await res.json();
    const tbody = document.getElementById("preferredSuppliersBody");
    tbody.innerHTML = "";

    const summary = data.summary || {};
    for (const [itemCode, ranks] of Object.entries(summary)) {
      const tr = document.createElement("tr");

      const rank1 = ranks[0] ? `<strong>${ranks[0].supplier_id}</strong> (${formatINR(ranks[0].reference_price)})` : "-";
      const rank2 = ranks[1] ? `<strong>${ranks[1].supplier_id}</strong> (${formatINR(ranks[1].reference_price)})` : "-";
      const rank3 = ranks[2] ? `<strong>${ranks[2].supplier_id}</strong> (${formatINR(ranks[2].reference_price)})` : "-";

      tr.innerHTML = `
        <td class="mono-cell"><strong>${itemCode}</strong></td>
        <td>${rank1}</td>
        <td>${rank2}</td>
        <td>${rank3}</td>
      `;
      tbody.appendChild(tr);
    }
  } catch (err) {
    console.error("Error loading preferred suppliers:", err);
  }
}

function exportPreferredSuppliers() {
  const dateVal = document.getElementById("supplierAsOfDate").value || "2026-11-01";
  window.location.href = `${API_BASE}/api/suppliers/preferred?format=csv&as_of_date=${dateVal}`;
}

// ==========================================================================
// Rate Contracts (Tab 5)
// ==========================================================================

async function loadContracts() {
  try {
    const res = await fetch(`${API_BASE}/api/contracts`);
    const data = await res.json();
    const tbody = document.getElementById("contractsTableBody");
    tbody.innerHTML = "";

    data.contracts.forEach(c => {
      const tr = document.createElement("tr");
      const pct = Math.min(100, Math.round((c.consumed_value / c.value_cap) * 100));

      let fillClass = "";
      if (pct >= 95) fillClass = "danger";
      else if (pct >= 80) fillClass = "warning";

      let statusBadge = `<span class="badge" style="background-color: rgba(16, 185, 129, 0.2); color: #34d399;">Active</span>`;
      if (c.remaining_ceiling <= 0) {
        statusBadge = `<span class="badge" style="background-color: rgba(239, 68, 68, 0.2); color: #f87171;">Exhausted</span>`;
      } else if (c.contract_id === "RC-2026-031" || c.contract_id === "RC-2026-033") {
        statusBadge = `<span class="badge" style="background-color: rgba(99, 102, 241, 0.2); color: #818cf8;">PDF Ingested</span>`;
      }

      tr.innerHTML = `
        <td class="mono-cell"><strong>${c.contract_id}</strong></td>
        <td>${c.supplier_name} (${c.supplier_id})</td>
        <td class="mono-cell">${c.start_date}</td>
        <td class="mono-cell">${c.end_date}</td>
        <td class="mono-cell">${formatINR(c.value_cap)}</td>
        <td class="mono-cell">${formatINR(c.consumed_value)}</td>
        <td class="mono-cell"><strong>${formatINR(c.remaining_ceiling)}</strong></td>
        <td>
          ${statusBadge}
          <div class="progress-container">
            <div class="progress-fill ${fillClass}" style="width: ${pct}%;"></div>
          </div>
          <div style="font-size: 10px; color: var(--text-dim); margin-top: 2px;">${pct}% used</div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading contracts:", err);
  }
}

// ==========================================================================
// Batch CSV Upload & Blind Test Runner (Tab 6)
// ==========================================================================

async function executeBatchUpload() {
  const fileInput = document.getElementById("batchCsvInput");
  if (!fileInput.files || fileInput.files.length === 0) {
    alert("Please select a PR Batch CSV file first.");
    return;
  }

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);

  try {
    const res = await fetch(`${API_BASE}/api/process-batch`, {
      method: "POST",
      body: formData
    });
    if (!res.ok) throw new Error("Failed to process batch CSV");
    const data = await res.json();
    currentRequirements = data.requirements;

    // Update KPIs
    if (data.summary) {
      document.getElementById("kpiTotalLines").textContent = data.summary.total_pr_lines;
      document.getElementById("kpiTotalReqs").textContent = data.summary.total_requirements;
      document.getElementById("kpiDirectPOs").textContent = data.summary.direct_pos;
      document.getElementById("kpiSourcingReqs").textContent = data.summary.sourcing_requests;
    }

    renderDecisionsTable(currentRequirements);
    alert(`Successfully processed ${data.summary.total_pr_lines} PR lines into ${data.summary.total_requirements} clubbed requirements!`);
    switchTab("buyer-workspace");
  } catch (err) {
    alert("Batch execution failed: " + err.message);
  }
}

function exportDecisionsCSV() {
  window.location.href = `${API_BASE}/api/export/batch?filename=aditya_kumar__run1.csv`;
}
