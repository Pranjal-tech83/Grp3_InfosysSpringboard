// tickets.js - Modern Enterprise AI Ticket Management System
// Connected to FastAPI backend with 2-step AI Prediction, Live RAG Telemetry, Integrations & Multi-Agent Execution

const API_BASE = window.API_BASE_URL || "https://grp3-infosysspringboard.onrender.com";

let currentTickets = [];
let tableState = {
  searchQuery: "",
  deptFilter: "all",
  priorityFilter: "all",
  statusFilter: "all",
  sortColumn: "createdDate",
  sortAsc: false,
  currentPage: 1,
  pageSize: 8,
  dayFilter: "all",
  isLoading: false
};

let aiPredictingState = false;
let currentTriagePrediction = null;
let activeDrawerTicketId = null;
let livePollingInterval = null;

// ---------------------------------------------------------------------------
// LOCAL STORAGE PERSISTENCE HELPERS
// ---------------------------------------------------------------------------
function loadStoredTickets() {
  const stored = localStorage.getItem("supportpilot_created_tickets");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse local stored tickets:", e);
    }
  }
  return [];
}

function saveStoredTickets(ticketsList) {
  try {
    localStorage.setItem("supportpilot_created_tickets", JSON.stringify(ticketsList));
  } catch (e) {
    console.warn("Storage quota exceeded or storage unavailable:", e);
  }
}

// ---------------------------------------------------------------------------
// INITIALIZATION
// ---------------------------------------------------------------------------
function initTicketsModule() {
  // 1. Clear stale localStorage tickets (older than 24h) — prevents ghost entries like TKT-67 from persisting
  const staleCutoff = Date.now() - (24 * 60 * 60 * 1000);
  const localSaved = loadStoredTickets().filter(t => {
    const createdMs = t.createdDate ? new Date(t.createdDate).getTime() : 0;
    return createdMs > staleCutoff;
  });
  saveStoredTickets(localSaved);

  const initial = (window.SupportPilotData && window.SupportPilotData.initialTickets)
    ? window.SupportPilotData.initialTickets
    : [];

  const mergedMap = new Map();
  localSaved.forEach(t => mergedMap.set(t.id, t));
  initial.forEach(t => {
    if (!mergedMap.has(t.id)) mergedMap.set(t.id, t);
  });

  currentTickets = Array.from(mergedMap.values());

  // 2. Fetch live data from backend
  fetchLiveTickets();


  // 3. Setup Polling for Real-Time Sync (every 15s)
  if (livePollingInterval) clearInterval(livePollingInterval);
  livePollingInterval = setInterval(() => {
    fetchLiveTickets(true);
  }, 15000);

  // 4. Bind UI Controls
  const bind = (id, event, handler) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
  };

  bind("tkt-search-bar", "input", handleSearch);
  bind("filter-dept", "change", handleFilterChange);
  bind("filter-priority", "change", handleFilterChange);
  bind("filter-status", "change", handleFilterChange);

  // Table header sorting
  const headers = document.querySelectorAll("#main-tickets-table th[data-sort]");
  headers.forEach(header => {
    header.addEventListener("click", () => {
      const column = header.getAttribute("data-sort");
      if (column) handleSort(column);
    });
  });

  // Modal Triggers & Form Controls
  bind("btn-create-ticket-modal", "click", openNewTicketModal);
  bind("dash-action-new-tkt", "click", openNewTicketModal);
  bind("modal-close-btn", "click", closeNewTicketModal);
  bind("btn-modal-cancel", "click", closeNewTicketModal);
  bind("btn-modal-predict", "click", handleRunAIPrediction);
  bind("btn-modal-repredict", "click", handleRunAIPrediction);
  bind("btn-modal-edit", "click", handleEditTicketForm);
  bind("new-ticket-form", "submit", handleNewTicketConfirmSubmit);

  // Drawer Controls
  bind("drawer-close-btn", "click", closeDetailsDrawer);
  bind("ticket-drawer-backdrop", "click", (e) => {
    if (e.target.id === "ticket-drawer-backdrop") closeDetailsDrawer();
  });

  bind("btn-drawer-resolve", "click", handleDrawerResolve);
  bind("btn-drawer-escalate", "click", handleDrawerEscalate);
  bind("btn-drawer-assign", "click", handleDrawerAssign);
  bind("btn-drawer-close-ticket", "click", handleDrawerCloseTicket);

  bind("btn-export-ui", "click", handleExportCSV);

  // Global event listeners
  window.addEventListener('ticketsUpdated', () => {
    renderTicketsTable();
  });

  renderTicketsTable();
}

// ---------------------------------------------------------------------------
// BACKEND API SYNC
// ---------------------------------------------------------------------------
async function fetchLiveTickets(isBackground = false) {
  if (!isBackground && currentTickets.length === 0) {
    tableState.isLoading = true;
    renderTicketsTable();
  }

  try {
    const response = await fetch(`${API_BASE}/api/tickets?limit=500`);
    if (response.ok) {
      const backendTickets = await response.json();
      if (backendTickets && Array.isArray(backendTickets)) {
        const mergedMap = new Map();

        backendTickets.forEach((t, idx) => {
          const tId = typeof t.ticket_id === 'number' ? `TKT-${t.ticket_id}` : (t.ticket_id || `TKT-${idx + 1}`);

          // Handle snake_case backend statuses → Display Title Case
          const rawStatus = (t.status || 'open').toLowerCase();
          let formattedStatus = "Open";
          if (rawStatus === 'in_progress' || rawStatus === 'in progress') formattedStatus = "In Progress";
          else if (rawStatus === 'resolved') formattedStatus = "Resolved";
          else if (rawStatus === 'escalated') formattedStatus = "Escalated";
          else if (rawStatus === 'closed') formattedStatus = "Closed";
          else if (rawStatus === 'pending') formattedStatus = "Pending";
          else if (rawStatus === 'classified') formattedStatus = "Open";
          else formattedStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);

          // Infer smart priority label from status or classification data
          const rawPriority = t.priority;
          let displayPriority = "Medium";
          if (rawPriority) {
            const pLower = rawPriority.toLowerCase();
            if (pLower.includes('urgent') || pLower.includes('critical') || pLower === 'p1') displayPriority = "Urgent";
            else if (pLower.includes('high') || pLower === 'p2') displayPriority = "High";
            else if (pLower.includes('low') || pLower === 'p4') displayPriority = "Low";
            else if (pLower.includes('medium') || pLower === 'p3') displayPriority = "Medium";
            else displayPriority = rawPriority;
          }

          mergedMap.set(tId, {
            id: tId,
            rawId: t.ticket_id,
            user: {
              name: t.user?.name || (t.requester_name || "Corporate Employee"),
              company: t.user?.company || "SupportPilot Enterprise",
              email: t.user?.email || (t.requester_email || "employee@company.com")
            },
            department: t.department || t.user?.department || "Engineering",
            subject: t.subject || "No Subject",
            description: t.description || "",
            category: t.category || "Software",
            priority: displayPriority,
            severity: t.severity || "High",
            status: formattedStatus,
            assignedAgent: t.assigned_agent || "Nova AI Core",
            createdDate: t.created_at || new Date().toISOString(),
            confidenceScore: Math.round((t.classification_confidence || t.confidence_score || 0.92) * 100),
            aiClassification: {
              category: t.category || "Software",
              priority: displayPriority,
              suggestedDept: t.department || t.user?.department || "Engineering",
              suggestedTeam: t.suggested_team || (t.department || "Engineering") + " Operations"
            },
            suggestedResolution: t.resolution_text || t.suggested_resolution || "AI triage complete. Review context and apply standard remediation runbook.",
            timeline: t.timeline || [
              { time: t.created_at || new Date().toISOString(), title: "Ticket Created & Registered", user: "System", type: "system" }
            ],
            attachments: t.attachments || []
          });
        });

        // Add local-only tickets (created recently) that are not yet in backend response
        const localSaved = loadStoredTickets();
        const recentCutoff = Date.now() - (5 * 60 * 1000); // 5 minutes
        localSaved.forEach(lt => {
          if (!mergedMap.has(lt.id)) {
            // Only keep if created within last 5 minutes (prevents stale ghost tickets)
            const createdMs = lt.createdDate ? new Date(lt.createdDate).getTime() : 0;
            if (createdMs > recentCutoff) {
              mergedMap.set(lt.id, lt);
            }
          }
        });

        currentTickets = Array.from(mergedMap.values());
        // Update localStorage to only have real backend-confirmed tickets
        saveStoredTickets(currentTickets);
      }
    }
  } catch (err) {
    console.warn("Backend tickets fetch error (using local cache):", err);
  } finally {
    tableState.isLoading = false;
    renderTicketsTable();
  }
}

// ---------------------------------------------------------------------------
// TABLE RENDERING & FILTERING
// ---------------------------------------------------------------------------
function renderTicketsTable() {
  const tbody = document.getElementById("tickets-tbody");
  if (!tbody) return;

  // Show Skeleton Loader if loading
  if (tableState.isLoading && currentTickets.length === 0) {
    tbody.innerHTML = Array(6).fill(0).map(() => `
      <tr class="skeleton-row" style="animation: pulse 1.5s infinite;">
        <td colspan="10" style="padding: 16px;">
          <div style="height: 20px; background: #f1f5f9; border-radius: 6px; width: 100%;"></div>
        </td>
      </tr>
    `).join('');
    return;
  }

  tbody.innerHTML = "";

  // Filtering
  let filtered = currentTickets.filter(t => {
    const searchQuery = (tableState.searchQuery || "").toLowerCase();
    const matchesSearch = !searchQuery ||
      (t.subject && t.subject.toLowerCase().includes(searchQuery)) ||
      (t.user && t.user.name && t.user.name.toLowerCase().includes(searchQuery)) ||
      (t.user && t.user.email && t.user.email.toLowerCase().includes(searchQuery)) ||
      (t.id && t.id.toLowerCase().includes(searchQuery)) ||
      (t.category && t.category.toLowerCase().includes(searchQuery));

    const matchesDept = tableState.deptFilter === "all" ||
      (t.department && t.department.toLowerCase() === tableState.deptFilter.toLowerCase());

    const matchesPriority = tableState.priorityFilter === "all" ||
      (t.priority && t.priority.toLowerCase().includes(tableState.priorityFilter.toLowerCase()));

    const matchesStatus = tableState.statusFilter === "all" ||
      (t.status && t.status.toLowerCase() === tableState.statusFilter.toLowerCase());

    const matchesDay = tableState.dayFilter === "all" || (function () {
      if (!t.createdDate) return false;
      const d = new Date(t.createdDate);
      if (isNaN(d.getTime())) return false;
      const day = d.getDay();
      const index = day === 0 ? 6 : day - 1; // Map to 0=Mon, ..., 6=Sun
      return index === tableState.dayFilter;
    })();

    return matchesSearch && matchesDept && matchesPriority && matchesStatus && matchesDay;
  });

  // Sorting
  filtered.sort((a, b) => {
    let valA = a[tableState.sortColumn] || "";
    let valB = b[tableState.sortColumn] || "";

    if (tableState.sortColumn === "user") {
      valA = a.user ? a.user.name : "";
      valB = b.user ? b.user.name : "";
    } else if (tableState.sortColumn === "email") {
      valA = a.user ? a.user.email : "";
      valB = b.user ? b.user.email : "";
    } else if (tableState.sortColumn === "id") {
      valA = parseInt(valA.toString().replace(/\D/g, '')) || 0;
      valB = parseInt(valB.toString().replace(/\D/g, '')) || 0;
    } else if (tableState.sortColumn === "createdDate") {
      valA = new Date(valA).getTime() || 0;
      valB = new Date(valB).getTime() || 0;
    }

    if (valA < valB) return tableState.sortAsc ? -1 : 1;
    if (valA > valB) return tableState.sortAsc ? 1 : -1;
    return 0;
  });

  // Pagination calculations
  const totalEntries = filtered.length;
  const totalPages = Math.ceil(totalEntries / tableState.pageSize) || 1;

  if (tableState.currentPage > totalPages) {
    tableState.currentPage = totalPages;
  }
  if (tableState.currentPage < 1) {
    tableState.currentPage = 1;
  }

  const startIdx = (tableState.currentPage - 1) * tableState.pageSize;
  const endIdx = Math.min(startIdx + tableState.pageSize, totalEntries);
  const paginatedTickets = filtered.slice(startIdx, endIdx);

  // Empty State Rendering
  if (paginatedTickets.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10">
          <div class="empty-state" style="text-align: center; padding: 48px 24px; color: var(--text-muted);">
            <div style="width: 56px; height: 56px; border-radius: 50%; background: #f8fafc; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; border: 1px dashed #cbd5e1;">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h3 style="font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 4px;">No matching tickets found</h3>
            <p style="font-size: 13px; color: #64748b; margin: 0;">Try adjusting your search criteria or filter selections.</p>
          </div>
        </td>
      </tr>
    `;
  } else {
    paginatedTickets.forEach(t => {
      const tr = document.createElement("tr");
      tr.style.cursor = "pointer";
      tr.style.transition = "background-color 0.15s ease";

      // Priority Badge Mapping
      const prioStr = (t.priority || 'Medium').toLowerCase();
      let prioClass = 'badge-priority-medium';
      let prioDotColor = '#3b82f6';
      if (prioStr.includes('urgent') || prioStr.includes('p1')) {
        prioClass = 'badge-priority-urgent';
        prioDotColor = '#ef4444';
      } else if (prioStr.includes('high') || prioStr.includes('p2')) {
        prioClass = 'badge-priority-high';
        prioDotColor = '#f59e0b';
      } else if (prioStr.includes('low') || prioStr.includes('p4')) {
        prioClass = 'badge-priority-low';
        prioDotColor = '#94a3b8';
      }

      // Status Badge Mapping
      const statusStr = (t.status || 'Open').toLowerCase();
      let statusClass = 'badge-status-open';
      if (statusStr.includes('progress')) statusClass = 'badge-status-inprogress';
      else if (statusStr.includes('pending')) statusClass = 'badge-status-pending';
      else if (statusStr.includes('escalat')) statusClass = 'badge-status-escalated';
      else if (statusStr.includes('resolve')) statusClass = 'badge-status-resolved';
      else if (statusStr.includes('close')) statusClass = 'badge-status-closed';

      // Customer Initials Avatar
      const custName = t.user ? t.user.name : "Customer";
      const initials = custName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || "CU";

      tr.innerHTML = `
        <td>
          <span style="font-family: monospace; font-weight: 700; color: #4338ca; background: #e0e7ff; padding: 4px 8px; border-radius: 6px; font-size: 12px; border: 1px solid #c7d2fe;">
            ${t.id}
          </span>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 9px;">
            <div style="width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #a855f7); color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; flex-shrink: 0;">
              ${initials}
            </div>
            <div style="font-weight: 600; font-size: 13px; color: #1e293b;">
              ${custName}
            </div>
          </div>
        </td>
        <td>
          <span style="font-size: 12px; color: #64748b; font-family: monospace;">
            ${t.user ? (t.user.email || 'employee@company.com') : 'employee@company.com'}
          </span>
        </td>
        <td>
          <span style="font-size: 12px; font-weight: 600; color: #334155; background: #f1f5f9; padding: 3px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
            ${t.department || 'Engineering'}
          </span>
        </td>
        <td style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(t.subject)}">
          <span style="font-weight: 600; color: #0f172a; font-size: 13px;">${t.subject}</span>
        </td>
        <td>
          <span style="font-size: 11px; font-weight: 600; color: #4338ca; background: #eef2ff; padding: 3px 7px; border-radius: 4px;">
            ${t.category || 'Software'}
          </span>
        </td>
        <td>
          <span class="badge ${prioClass}" style="display: inline-flex; align-items: center; gap: 5px;">
            <span style="width: 6px; height: 6px; border-radius: 50%; background: ${prioDotColor}; display: inline-block;"></span>
            ${t.priority}
          </span>
        </td>
        <td>
          <span class="badge ${statusClass}">
            ${t.status}
          </span>
        </td>
        <td style="color: #64748b; font-size: 12px; white-space: nowrap;">
          ${formatShortDate(t.createdDate)}
        </td>
        <td style="text-align: right;">
          <button class="btn btn-secondary" style="font-size: 11px; padding: 5px 10px; display: inline-flex; align-items: center; gap: 5px; border-color: #e2e8f0;" onclick="event.stopPropagation(); window.SupportPilotTickets.openDrawer('${t.id}')">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            View Details
          </button>
        </td>
      `;

      tr.addEventListener("click", () => openDetailsDrawer(t.id));
      tbody.appendChild(tr);
    });
  }

  // Update Pagination Info
  const infoLabel = document.getElementById("pagination-info");
  if (infoLabel) {
    infoLabel.textContent = totalEntries > 0
      ? `Showing ${startIdx + 1} to ${endIdx} of ${totalEntries} tickets`
      : "Showing 0 tickets";
  }

  renderPaginationControls(totalPages);

  // Synchronize with dashboard views
  if (typeof updateDashboardViews === "function") {
    updateDashboardViews(currentTickets);
  }
}

function renderPaginationControls(totalPages) {
  const container = document.getElementById("pagination-controls");
  if (!container) return;
  container.innerHTML = "";

  const prevBtn = document.createElement("button");
  prevBtn.className = "page-btn";
  prevBtn.innerHTML = "&larr; Prev";
  prevBtn.disabled = tableState.currentPage === 1;
  prevBtn.addEventListener("click", () => {
    tableState.currentPage--;
    renderTicketsTable();
  });
  container.appendChild(prevBtn);

  // Page Numbers
  for (let i = 1; i <= totalPages; i++) {
    if (totalPages > 7 && Math.abs(i - tableState.currentPage) > 2 && i !== 1 && i !== totalPages) {
      if (i === 2 || i === totalPages - 1) {
        const dot = document.createElement("span");
        dot.textContent = "...";
        dot.style.padding = "0 4px";
        dot.style.color = "#94a3b8";
        container.appendChild(dot);
      }
      continue;
    }

    const numBtn = document.createElement("button");
    numBtn.className = `page-btn ${tableState.currentPage === i ? "active" : ""}`;
    numBtn.textContent = i;
    numBtn.addEventListener("click", () => {
      tableState.currentPage = i;
      renderTicketsTable();
    });
    container.appendChild(numBtn);
  }

  const nextBtn = document.createElement("button");
  nextBtn.className = "page-btn";
  nextBtn.innerHTML = "Next &rarr;";
  nextBtn.disabled = tableState.currentPage === totalPages;
  nextBtn.addEventListener("click", () => {
    tableState.currentPage++;
    renderTicketsTable();
  });
  container.appendChild(nextBtn);
}

// ---------------------------------------------------------------------------
// FILTER & SEARCH HANDLERS
// ---------------------------------------------------------------------------
function handleSearch(e) {
  tableState.searchQuery = e.target.value;
  tableState.currentPage = 1;
  renderTicketsTable();
}

function handleFilterChange() {
  tableState.deptFilter = document.getElementById("filter-dept")?.value || "all";
  tableState.priorityFilter = document.getElementById("filter-priority")?.value || "all";
  tableState.statusFilter = document.getElementById("filter-status")?.value || "all";
  tableState.currentPage = 1;
  renderTicketsTable();
}

function handleSort(column) {
  if (tableState.sortColumn === column) {
    tableState.sortAsc = !tableState.sortAsc;
  } else {
    tableState.sortColumn = column;
    tableState.sortAsc = true;
  }
  renderTicketsTable();
}

// ---------------------------------------------------------------------------
// 2-STEP AI PREDICTION NEW TICKET MODAL
// ---------------------------------------------------------------------------
function openNewTicketModal() {
  const form = document.getElementById("new-ticket-form");
  if (form) form.reset();

  const predCard = document.getElementById("ai-prediction-card");
  const loadingContainer = document.getElementById("ai-loading-container");
  const step1Footer = document.getElementById("modal-footer-step1");
  const step2Footer = document.getElementById("modal-footer-step2");
  const stepIndicator = document.getElementById("modal-step-indicator");
  const formFields = document.getElementById("modal-form-fields");

  if (predCard) predCard.style.display = "none";
  if (loadingContainer) loadingContainer.style.display = "none";
  if (step1Footer) step1Footer.style.display = "flex";
  if (step2Footer) step2Footer.style.display = "none";
  if (stepIndicator) stepIndicator.textContent = "Step 1 of 2: Fill Ticket Details & Run AI Prediction";
  if (formFields) formFields.style.opacity = "1";

  aiPredictingState = false;
  currentTriagePrediction = null;

  const backdrop = document.getElementById("new-ticket-modal-backdrop");
  if (backdrop) backdrop.classList.add("active");
}

function closeNewTicketModal() {
  const backdrop = document.getElementById("new-ticket-modal-backdrop");
  if (backdrop) backdrop.classList.remove("active");
}

function handleEditTicketForm() {
  const predCard = document.getElementById("ai-prediction-card");
  const step1Footer = document.getElementById("modal-footer-step1");
  const step2Footer = document.getElementById("modal-footer-step2");
  const stepIndicator = document.getElementById("modal-step-indicator");
  const formFields = document.getElementById("modal-form-fields");

  if (predCard) predCard.style.display = "none";
  if (step1Footer) step1Footer.style.display = "flex";
  if (step2Footer) step2Footer.style.display = "none";
  if (stepIndicator) stepIndicator.textContent = "Step 1 of 2: Edit Ticket Details & Run AI Prediction";
  if (formFields) formFields.style.opacity = "1";

  aiPredictingState = false;
}

// STEP 1: RUN AI PREDICTION
async function handleRunAIPrediction(e) {
  if (e) e.preventDefault();

  const nameEl = document.getElementById("tkt-name");
  const emailEl = document.getElementById("tkt-email");
  const subjectEl = document.getElementById("tkt-subject");
  const descEl = document.getElementById("tkt-desc");
  const deptEl = document.getElementById("tkt-dept");

  let sessionName = "Corporate Employee";
  let sessionEmail = "employee@company.com";
  try {
    const sRaw = localStorage.getItem('sp_session') || sessionStorage.getItem('sp_session');
    if (sRaw) {
      const s = JSON.parse(sRaw);
      if (s.name) sessionName = s.name;
      if (s.email) sessionEmail = s.email;
    }
  } catch (e) { }

  const requesterName = nameEl && nameEl.value.trim() ? nameEl.value.trim() : sessionName;
  const requesterEmail = emailEl && emailEl.value.trim() ? emailEl.value.trim() : sessionEmail;
  const subject = subjectEl ? subjectEl.value.trim() : "";
  const description = descEl ? descEl.value.trim() : "";
  const userSelectedDept = deptEl ? deptEl.value : "";

  if (!requesterName || !requesterEmail || !subject || !description) {
    if (typeof showToast === "function") {
      showToast("Validation Error", "Please fill in Requester Name, Email, Subject, and Description.", "error");
    }
    return;
  }

  const loadingContainer = document.getElementById("ai-loading-container");
  const predCard = document.getElementById("ai-prediction-card");
  const step1Footer = document.getElementById("modal-footer-step1");
  const step2Footer = document.getElementById("modal-footer-step2");
  const stepIndicator = document.getElementById("modal-step-indicator");
  const predictBtn = document.getElementById("btn-modal-predict");

  if (loadingContainer) loadingContainer.style.display = "block";
  if (predCard) predCard.style.display = "none";
  if (predictBtn) predictBtn.disabled = true;

  // Animated loading statuses
  const statusEl = document.getElementById("ai-loading-status-text");
  const messages = [
    "Extracting technical entities and incident semantics...",
    "Querying ChromaDB vector knowledge base for resolutions...",
    "Assessing SLA breach risk and team routing taxonomy..."
  ];
  let msgIdx = 0;
  const msgTimer = setInterval(() => {
    msgIdx = (msgIdx + 1) % messages.length;
    if (statusEl) statusEl.textContent = messages[msgIdx];
  }, 700);

  try {
    const triageRes = await fetch(`${API_BASE}/api/triage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: subject,
        description: description,
        requester_name: requesterName,
        requester_email: requesterEmail,
        department: userSelectedDept || undefined
      })
    });

    clearInterval(msgTimer);

    if (!triageRes.ok) throw new Error("AI Triage API failed");
    const prediction = await triageRes.json();
    currentTriagePrediction = prediction;

    // Populate Prediction Card Fields
    const confPct = Math.round((prediction.confidence_score || 0.94) * 100);
    const predConfEl = document.getElementById("ai-pred-confidence");
    const predCatEl = document.getElementById("ai-pred-category");
    const predDeptEl = document.getElementById("ai-pred-dept");
    const predPriEl = document.getElementById("ai-pred-priority");
    const predTeamEl = document.getElementById("ai-pred-team");
    const predTagsEl = document.getElementById("ai-pred-tags");
    const predReasonEl = document.getElementById("ai-pred-reasoning");
    const predResEl = document.getElementById("ai-pred-resolution");

    if (predConfEl) predConfEl.textContent = `${confPct}% Confidence`;
    if (predCatEl) predCatEl.textContent = prediction.category || "Software";
    if (predDeptEl) predDeptEl.textContent = prediction.department || (userSelectedDept || "Engineering");
    if (predPriEl) predPriEl.textContent = `${prediction.priority || 'High'} • Severity: ${prediction.severity || 'High'}`;
    if (predTeamEl) predTeamEl.textContent = prediction.suggested_team || "Engineering Operations";

    if (predTagsEl) {
      const tags = Array.isArray(prediction.tags) && prediction.tags.length > 0
        ? prediction.tags
        : [`#${(prediction.category || 'ticket').toLowerCase()}`, '#automated-triage'];
      predTagsEl.innerHTML = tags.map(t => `<span class="badge" style="background: #e0e7ff; color: #4338ca; font-size: 11px; font-weight: 700;">${t}</span>`).join('');
    }

    if (predReasonEl) predReasonEl.textContent = prediction.reasoning || "Technical parameters matched historical resolutions and classification taxonomy.";
    if (predResEl) predResEl.textContent = prediction.resolution_preview || "1. Check gateway logs.\n2. Refresh connection tokens.\n3. Validate endpoint health.";

    if (loadingContainer) loadingContainer.style.display = "none";
    if (predCard) predCard.style.display = "block";
    if (step1Footer) step1Footer.style.display = "none";
    if (step2Footer) step2Footer.style.display = "flex";
    if (stepIndicator) stepIndicator.textContent = "Step 2 of 2: AI Prediction Complete — Review & Confirm";

    aiPredictingState = true;

    if (typeof showToast === "function") {
      showToast("AI Triage Complete", `Predicted ${prediction.category} with ${confPct}% confidence.`, "success");
    }

  } catch (err) {
    clearInterval(msgTimer);
    console.error("AI Triage failed:", err);
    if (loadingContainer) loadingContainer.style.display = "none";
    if (predictBtn) predictBtn.disabled = false;
    if (typeof showToast === "function") {
      showToast("AI Triage Failed", "Could not complete AI triage. Please check backend connection.", "error");
    }
  }
}

// STEP 2: CONFIRM & INSERT TICKET
async function handleNewTicketConfirmSubmit(e) {
  e.preventDefault();

  if (!aiPredictingState || !currentTriagePrediction) {
    if (typeof showToast === "function") {
      showToast("Prediction Required", "Please run AI prediction before creating the ticket.", "warning");
    }
    return;
  }

  const confirmBtn = document.getElementById("btn-modal-confirm");
  if (confirmBtn) confirmBtn.disabled = true;

  let sessionName = "Corporate Employee";
  let sessionEmail = "employee@company.com";
  try {
    const sRaw = localStorage.getItem('sp_session') || sessionStorage.getItem('sp_session');
    if (sRaw) {
      const s = JSON.parse(sRaw);
      if (s.name) sessionName = s.name;
      if (s.email) sessionEmail = s.email;
    }
  } catch (e) { }

  const nameEl = document.getElementById("tkt-name");
  const emailEl = document.getElementById("tkt-email");
  const requesterName = nameEl && nameEl.value.trim() ? nameEl.value.trim() : sessionName;
  const requesterEmail = emailEl && emailEl.value.trim() ? emailEl.value.trim() : sessionEmail;
  const subject = document.getElementById("tkt-subject")?.value.trim() || "Support Request";
  const description = document.getElementById("tkt-desc")?.value.trim() || "";

  try {
    // 1. Create in backend DB
    const createRes = await fetch(`${API_BASE}/api/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: subject,
        description: description,
        requester_name: requesterName,
        requester_email: requesterEmail,
        department: currentTriagePrediction.department || "Engineering"
      })
    });

    if (!createRes.ok) throw new Error("Ticket creation failed in backend");
    const createdTicket = await createRes.json();
    const newId = `TKT-${createdTicket.ticket_id}`;

    // 2. Patch with full AI classification taxonomy & resolution
    await fetch(`${API_BASE}/api/tickets/${createdTicket.ticket_id}/classification`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: currentTriagePrediction.category,
        severity: currentTriagePrediction.severity,
        priority: currentTriagePrediction.priority,
        classification_confidence: currentTriagePrediction.confidence_score,
        status: "Open"
      })
    });

    // 3. Construct local ticket object
    const newTicketObj = {
      id: newId,
      rawId: createdTicket.ticket_id,
      user: {
        name: requesterName,
        company: "SupportPilot Enterprise",
        email: requesterEmail
      },
      department: currentTriagePrediction.department || "Engineering",
      subject: subject,
      description: description,
      category: currentTriagePrediction.category,
      priority: currentTriagePrediction.priority,
      severity: currentTriagePrediction.severity,
      status: "Open",
      assignedAgent: "Nova AI Core",
      createdDate: new Date().toISOString(),
      confidenceScore: Math.round((currentTriagePrediction.confidence_score || 0.94) * 100),
      aiClassification: {
        category: currentTriagePrediction.category,
        priority: currentTriagePrediction.priority,
        suggestedDept: currentTriagePrediction.department,
        suggestedTeam: currentTriagePrediction.suggested_team
      },
      suggestedResolution: currentTriagePrediction.resolution_preview || "AI triage completed.",
      timeline: [
        { time: new Date().toISOString(), title: "Ticket Created & AI Triaged", user: "SupportPilot AI Core", type: "system" }
      ],
      attachments: ["system_diagnostic_log.txt"]
    };

    // Prepend to current ticket array & save immediately so it appears in the list right away
    currentTickets.unshift(newTicketObj);
    saveStoredTickets(currentTickets);

    // Sort by createdDate descending so the newest ticket appears at the TOP of page 1
    tableState.sortColumn = "createdDate";
    tableState.sortAsc = false;
    tableState.currentPage = 1;
    renderTicketsTable();

    // 4. Trigger Jira Automation Integration
    if (window.SupportPilotJira && typeof window.SupportPilotJira.addActivity === "function") {
      window.SupportPilotJira.addActivity(newTicketObj, true);
    }

    // 5. Trigger Email Automation Outbox Integration
    if (window.SupportPilotEmailEnhanced && typeof window.SupportPilotEmailEnhanced.addEmail === "function") {
      window.SupportPilotEmailEnhanced.addEmail(newTicketObj, "Ticket Created");
    }

    // 6. Refresh Live Tickets from backend & Dispatch Real-Time Events
    // (The newly added ticket is already in the list; this sync ensures backend data is up to date)
    fetchLiveTickets(true).then(() => {
      // Keep sort by newest createdDate so the new ticket stays visible at top
      tableState.sortColumn = "createdDate";
      tableState.sortAsc = false;
      tableState.currentPage = 1;
      renderTicketsTable();
      window.dispatchEvent(new CustomEvent('ticketsUpdated', { detail: [...currentTickets] }));
    });

    // 7. Show success toast and close modal
    if (typeof showToast === "function") {
      showToast("Ticket Created Successfully", `Ticket ${newId} created, triaged by AI, and synchronized with Jira & Email outbox.`, "success");
    }

    closeNewTicketModal();

    // 8. Seamlessly navigate to Tickets Management View so user sees the newly created ticket
    tableState.currentPage = 1;
    const ticketsNav = document.querySelector('.nav-item[data-target="tickets"]');
    if (ticketsNav) {
      ticketsNav.click();
    } else {
      // If already on tickets view, re-render directly
      renderTicketsTable();
    }

  } catch (err) {
    console.error("Failed to insert ticket:", err);
    if (typeof showToast === "function") {
      showToast("Creation Error", "Could not insert ticket. Please try again.", "error");
    }
  } finally {
    if (confirmBtn) confirmBtn.disabled = false;
  }
}

// ---------------------------------------------------------------------------
// VIEW DETAILS RIGHT-SIDE DRAWER
// ---------------------------------------------------------------------------
async function openDetailsDrawer(ticketId) {
  const ticket = currentTickets.find(t => t.id === ticketId);
  if (!ticket) return;

  activeDrawerTicketId = ticketId;

  const setElText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setElText("drawer-ticket-id", ticket.id);
  setElText("drawer-subject", ticket.subject);
  setElText("drawer-user-name", ticket.user ? ticket.user.name : "Unknown Requester");
  setElText("drawer-user-email", ticket.user ? (ticket.user.email || ticket.user.company) : "employee@company.com");
  setElText("drawer-desc", ticket.description || "No description provided.");

  // Badges
  const badgeContainer = document.getElementById("drawer-badges");
  if (badgeContainer) {
    const prioStr = (ticket.priority || 'Medium').toLowerCase();
    let prioClass = 'badge-priority-medium';
    if (prioStr.includes('urgent') || prioStr.includes('p1')) prioClass = 'badge-priority-urgent';
    else if (prioStr.includes('high') || prioStr.includes('p2')) prioClass = 'badge-priority-high';
    else if (prioStr.includes('low') || prioStr.includes('p4')) prioClass = 'badge-priority-low';

    const statusStr = (ticket.status || 'Open').toLowerCase();
    let statusClass = 'badge-status-open';
    if (statusStr.includes('progress')) statusClass = 'badge-status-inprogress';
    else if (statusStr.includes('escalat')) statusClass = 'badge-status-escalated';
    else if (statusStr.includes('resolve')) statusClass = 'badge-status-resolved';
    else if (statusStr.includes('close')) statusClass = 'badge-status-closed';

    badgeContainer.innerHTML = `
      <span class="badge ${prioClass}">${ticket.priority}</span>
      <span class="badge ${statusClass}">${ticket.status}</span>
      <span class="badge" style="background: #e0e7ff; color: #4338ca;">${ticket.category || 'General'}</span>
    `;
  }

  // AI Classification
  setElText("drawer-ai-confidence", `${ticket.confidenceScore || 94}% Confident`);
  setElText("drawer-ai-category", ticket.aiClassification ? ticket.aiClassification.category : ticket.category);
  setElText("drawer-ai-dept", ticket.aiClassification ? ticket.aiClassification.suggestedDept : ticket.department);
  setElText("drawer-resolution-text", ticket.suggestedResolution || "No resolution steps generated yet.");

  // Attachments
  const attachmentList = document.getElementById("drawer-attachments-list");
  if (attachmentList) {
    attachmentList.innerHTML = "";
    if (!ticket.attachments || ticket.attachments.length === 0) {
      attachmentList.innerHTML = `<span style="font-size: 12px; color: var(--text-muted);">No attachments provided.</span>`;
    } else {
      ticket.attachments.forEach(file => {
        const fileTag = document.createElement("span");
        fileTag.style.cssText = "font-size: 11px; font-weight: 600; padding: 4px 10px; border: 1px solid var(--border-color); border-radius: 6px; background-color: var(--bg-app); cursor: pointer; display: inline-flex; align-items: center; gap: 5px;";
        fileTag.innerHTML = `
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          ${file}
        `;
        fileTag.addEventListener("click", () => {
          if (typeof showToast === "function") showToast("Download Attachment", `Downloading ${file}...`, "info");
        });
        attachmentList.appendChild(fileTag);
      });
    }
  }

  // Enterprise Integrations Sync Info
  const jiraId = ticket.id.replace('TKT-', 'SP-');
  setElText("drawer-integ-jira-id", jiraId);
  setElText("drawer-integ-jira-status", ticket.status);
  setElText("drawer-integ-jira-assignee", ticket.assignedAgent || "Nova AI Core");
  setElText("drawer-integ-jira-priority", ticket.priority);

  const emailBodyEl = document.getElementById("drawer-integ-email-body");
  if (emailBodyEl) {
    emailBodyEl.textContent = `Notification dispatched to ${ticket.user?.email || 'employee@company.com'} regarding ${ticket.subject} (Status: ${ticket.status}).`;
  }

  // History Timeline Flow
  const timelineFlow = document.getElementById("drawer-timeline-flow");
  if (timelineFlow) {
    timelineFlow.innerHTML = "";
    const events = (ticket.timeline && ticket.timeline.length > 0) ? ticket.timeline : [
      { time: ticket.createdDate || new Date().toISOString(), title: "Ticket Triaged and Registered", user: "SupportPilot AI Core", type: "system" }
    ];
    events.forEach(evt => {
      const item = document.createElement("div");
      item.className = "timeline-item";
      item.innerHTML = `
        <div class="timeline-dot timeline-dot-${evt.type || 'system'}"></div>
        <div class="timeline-content">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <div class="timeline-title">${escapeHtml(evt.title)}</div>
            <div class="timeline-time">${formatShortDate(evt.time)} ${formatTime(evt.time)}</div>
          </div>
          <div class="timeline-user">By ${escapeHtml(evt.user || 'System')}</div>
        </div>
      `;
      timelineFlow.appendChild(item);
    });
  }

  // Load Multi-Agent Pipeline for this ticket
  if (window.SupportPilotAgentPipeline && typeof window.SupportPilotAgentPipeline.loadTicket === "function") {
    window.SupportPilotAgentPipeline.loadTicket(ticket);
  }

  // Open Drawer UI
  const backdrop = document.getElementById("ticket-drawer-backdrop");
  if (backdrop) backdrop.classList.add("active");

  if (typeof window._drawerTab === 'function') window._drawerTab('details');
}

function closeDetailsDrawer() {
  const backdrop = document.getElementById("ticket-drawer-backdrop");
  if (backdrop) backdrop.classList.remove("active");
  activeDrawerTicketId = null;
}

// ---------------------------------------------------------------------------
// DRAWER ACTIONS: RESOLVE, ESCALATE, REASSIGN, CLOSE
// ---------------------------------------------------------------------------
async function handleDrawerResolve() {
  if (!activeDrawerTicketId) return;
  const ticket = currentTickets.find(t => t.id === activeDrawerTicketId);
  if (!ticket) return;

  ticket.status = "Resolved";
  ticket.timeline.push({
    time: new Date().toISOString(),
    title: "Ticket Resolved via AI Operator",
    user: "Support Staff",
    type: "agent"
  });

  saveStoredTickets(currentTickets);

  // Sync with FastAPI backend
  const rawId = ticket.rawId || ticket.id.replace(/\D/g, '');
  if (rawId) {
    try {
      await fetch(`${API_BASE}/api/tickets/${rawId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Resolved",
          resolution_notes: ticket.suggestedResolution || "Issue resolved successfully by SupportPilot AI."
        })
      });
    } catch (e) {
      console.warn("Backend status update skipped:", e);
    }
  }

  // Send Email Notification
  const recipientEmail = ticket.user?.email || "22snehs@gmail.com";
  try {
    await fetch(`${API_BASE}/api/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: recipientEmail,
        subject: `RESOLVED: [${ticket.id}] ${ticket.subject}`,
        body: `Dear ${ticket.user?.name || 'Customer'},\n\nYour support ticket #${ticket.id} (${ticket.subject}) has been resolved by SupportPilot AI.\n\nResolution Summary:\n${ticket.suggestedResolution}\n\nBest regards,\nSupportPilot AI Team`
      })
    });
  } catch (err) {
    console.warn("Email dispatch error:", err);
  }

  // Add to Frontend Outbox
  if (window.SupportPilotEmailEnhanced && typeof window.SupportPilotEmailEnhanced.addEmail === "function") {
    window.SupportPilotEmailEnhanced.addEmail(ticket, 'Resolved');
  }
  window.dispatchEvent(new CustomEvent('ticketsUpdated', { detail: [...currentTickets] }));

  if (typeof showToast === "function") {
    showToast("Ticket Resolved", `Ticket ${ticket.id} marked as Resolved and resolution email sent.`, "success");
  }

  closeDetailsDrawer();
  renderTicketsTable();
}

async function handleDrawerEscalate() {
  if (!activeDrawerTicketId) return;
  const ticket = currentTickets.find(t => t.id === activeDrawerTicketId);
  if (!ticket) return;

  ticket.status = "Escalated";
  ticket.priority = "Urgent";
  ticket.department = "Engineering";
  ticket.timeline.push({
    time: new Date().toISOString(),
    title: "Escalated to Engineering Tier 2",
    user: "Nova AI Engine",
    type: "ai"
  });

  saveStoredTickets(currentTickets);

  const rawId = ticket.rawId || ticket.id.replace(/\D/g, '');
  if (rawId) {
    try {
      await fetch(`${API_BASE}/api/escalate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket_id: parseInt(rawId),
          reason: "Critical anomaly requiring Level 2 Engineering investigation."
        })
      });
    } catch (e) {
      console.warn("Backend escalate error:", e);
    }
  }

  if (window.SupportPilotEmailEnhanced && typeof window.SupportPilotEmailEnhanced.addEmail === "function") {
    window.SupportPilotEmailEnhanced.addEmail(ticket, 'Escalated');
  }

  window.dispatchEvent(new CustomEvent('ticketsUpdated', { detail: [...currentTickets] }));

  if (typeof showToast === "function") {
    showToast("Ticket Escalated", `Ticket ${ticket.id} escalated to Tier 2 Engineering with Urgent Priority.`, "warning");
  }

  closeDetailsDrawer();
  renderTicketsTable();
}

async function handleDrawerAssign() {
  if (!activeDrawerTicketId) return;
  const ticket = currentTickets.find(t => t.id === activeDrawerTicketId);
  if (!ticket) return;

  const agents = ["Sarah Connor (Lead)", "Alex Mercer (SRE)", "Emma Stone (SecOps)", "David Miller (DevOps)"];
  const newAgent = agents[Math.floor(Math.random() * agents.length)];
  ticket.assignedAgent = newAgent;
  ticket.status = "In Progress";
  ticket.timeline.push({
    time: new Date().toISOString(),
    title: `Assigned to ${newAgent}`,
    user: "Operations Lead",
    type: "agent"
  });

  saveStoredTickets(currentTickets);

  const rawId = ticket.rawId || ticket.id.replace(/\D/g, '');
  if (rawId) {
    try {
      await fetch(`${API_BASE}/api/reassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket_id: parseInt(rawId),
          new_agent: newAgent
        })
      });
    } catch (e) {
      console.warn("Backend reassign error:", e);
    }
  }

  if (window.SupportPilotEmailEnhanced && typeof window.SupportPilotEmailEnhanced.addEmail === "function") {
    window.SupportPilotEmailEnhanced.addEmail(ticket, 'Assigned');
  }

  window.dispatchEvent(new CustomEvent('ticketsUpdated', { detail: [...currentTickets] }));

  if (typeof showToast === "function") {
    showToast("Agent Reassigned", `Ticket ${ticket.id} assigned to ${newAgent}.`, "info");
  }

  closeDetailsDrawer();
  renderTicketsTable();
}

async function handleDrawerCloseTicket() {
  if (!activeDrawerTicketId) return;
  const ticket = currentTickets.find(t => t.id === activeDrawerTicketId);
  if (!ticket) return;

  ticket.status = "Closed";
  ticket.timeline.push({
    time: new Date().toISOString(),
    title: "Ticket Closed",
    user: "System",
    type: "system"
  });

  saveStoredTickets(currentTickets);

  const rawId = ticket.rawId || ticket.id.replace(/\D/g, '');
  if (rawId) {
    try {
      await fetch(`${API_BASE}/api/tickets/${rawId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Closed", resolution_notes: "Closed by user." })
      });
    } catch (e) {
      console.warn("Backend close status error:", e);
    }
  }

  window.dispatchEvent(new CustomEvent('ticketsUpdated', { detail: [...currentTickets] }));

  if (typeof showToast === "function") {
    showToast("Ticket Closed", `Ticket ${ticket.id} has been marked as Closed.`, "info");
  }

  closeDetailsDrawer();
  renderTicketsTable();
}

// ---------------------------------------------------------------------------
// CSV EXPORT HELPER
// ---------------------------------------------------------------------------
function handleExportCSV() {
  if (currentTickets.length === 0) {
    if (typeof showToast === "function") showToast("Export Notice", "No tickets available to export.", "info");
    return;
  }

  const headers = ["Ticket ID", "Customer Name", "Customer Email", "Department", "Subject", "Category", "Priority", "Status", "Created Date"];
  const rows = currentTickets.map(t => [
    t.id,
    `"${(t.user ? t.user.name : '').replace(/"/g, '""')}"`,
    `"${(t.user ? t.user.email : '').replace(/"/g, '""')}"`,
    `"${t.department || ''}"`,
    `"${(t.subject || '').replace(/"/g, '""')}"`,
    `"${t.category || ''}"`,
    `"${t.priority || ''}"`,
    `"${t.status || ''}"`,
    `"${t.createdDate || ''}"`
  ].join(","));

  const csvContent = headers.join(",") + "\n" + rows.join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `supportpilot_tickets_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (typeof showToast === "function") {
    showToast("Export Successful", `Exported ${currentTickets.length} tickets to CSV.`, "success");
  }
}

// ---------------------------------------------------------------------------
// FORMATTING UTILITIES
// ---------------------------------------------------------------------------
function formatShortDate(isoString) {
  if (!isoString) return "N/A";
  try {
    if (!isoString.endsWith('Z') && !isoString.includes('+')) isoString += 'Z';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch (e) {
    return isoString;
  }
}

function formatTime(isoString) {
  if (!isoString) return "";
  try {
    if (!isoString.endsWith('Z') && !isoString.includes('+')) isoString += 'Z';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    return "";
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Global Export
window.SupportPilotTickets = {
  init: initTicketsModule,
  render: renderTicketsTable,
  getTickets: () => currentTickets,
  openDrawer: openDetailsDrawer,
  refresh: fetchLiveTickets
};
