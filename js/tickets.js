// tickets.js - Tickets View with LocalStorage Persistence

let currentTickets = [];
let tableState = {
  searchQuery: "",
  deptFilter: "all",
  priorityFilter: "all",
  statusFilter: "all",
  sortColumn: "id",
  sortAsc: false,
  currentPage: 1,
  pageSize: 5
};

let aiPredictingState = false;

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
  localStorage.setItem("supportpilot_created_tickets", JSON.stringify(ticketsList));
}

// ---------------------------------------------------------------------------
// INITIALIZATION
// ---------------------------------------------------------------------------
function initTicketsModule() {
  // 1. Get tickets saved from previous sessions in localStorage
  const localSaved = loadStoredTickets();

  // 2. Load mock initial dataset
  const initial = (window.SupportPilotData && window.SupportPilotData.initialTickets) 
    ? window.SupportPilotData.initialTickets 
    : [];

  // Merge unique entries (local user tickets take priority at the top)
  const mergedMap = new Map();
  localSaved.forEach(t => mergedMap.set(t.id, t));
  initial.forEach(t => {
    if (!mergedMap.has(t.id)) mergedMap.set(t.id, t);
  });

  currentTickets = Array.from(mergedMap.values());

  // 3. Attempt async fetch from FastAPI backend to merge backend database items
  fetchLiveTickets();

  // Bind UI Controls
  const bind = (id, event, handler) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
  };

  bind("tkt-search-bar", "input", handleSearch);
  bind("filter-dept", "change", handleFilterChange);
  bind("filter-priority", "change", handleFilterChange);
  bind("filter-status", "change", handleFilterChange);

  const headers = document.querySelectorAll("#main-tickets-table th");
  headers.forEach(header => {
    header.addEventListener("click", () => {
      const column = header.getAttribute("data-sort");
      if (column) handleSort(column);
    });
  });

  bind("btn-create-ticket-modal", "click", openNewTicketModal);
  bind("dash-action-new-tkt", "click", openNewTicketModal);
  bind("modal-close-btn", "click", closeNewTicketModal);
  bind("btn-modal-cancel", "click", closeNewTicketModal);
  bind("new-ticket-form", "submit", handleNewTicketSubmit);

  bind("drawer-close-btn", "click", closeDetailsDrawer);
  bind("ticket-drawer-backdrop", "click", (e) => {
    if (e.target.id === "ticket-drawer-backdrop") closeDetailsDrawer();
  });

  bind("btn-drawer-resolve", "click", handleDrawerResolve);
  bind("btn-drawer-escalate", "click", handleDrawerEscalate);
  bind("btn-drawer-assign", "click", handleDrawerAssign);

  bind("btn-export-ui", "click", handleExportCSV);

  renderTicketsTable();
}

async function fetchLiveTickets() {
  try {
    const response = await fetch("http://127.0.0.1:8000/api/tickets");
    if (response.ok) {
      const backendTickets = await response.json();
      if (backendTickets && backendTickets.length > 0) {
        const localSaved = loadStoredTickets();
        const mergedMap = new Map();

        // Local UI creations take priority
        localSaved.forEach(t => mergedMap.set(t.id, t));

        backendTickets.forEach((t, idx) => {
          const tId = typeof t.id === 'number' ? `TKT-${t.id}` : (t.id || `TKT-${idx + 1}`);
          if (!mergedMap.has(tId)) {
            mergedMap.set(tId, {
              id: tId,
              user: { name: t.user?.name || "Corporate Employee", company: "Local Workspace", email: t.user?.email || "employee@company.com" },
              department: t.department || "Customer Support",
              subject: t.subject || t.title || "No Subject",
              description: t.description || "",
              category: t.category || "Software",
              priority: t.priority || "P3-Medium",
              severity: t.severity || "Medium",
              status: t.status ? (t.status.charAt(0).toUpperCase() + t.status.slice(1)) : "Open",
              assignedAgent: t.assigned_agent || "Nova AI System",
              createdDate: t.created_at || new Date().toISOString(),
              confidenceScore: Math.round((t.classification_confidence || 0.88) * 100),
              aiClassification: { category: t.category || "Software", priority: t.priority || "P3-Medium", suggestedDept: t.department || "Customer Support" },
              suggestedResolution: t.suggested_resolution || "AI triage completed.",
              timeline: [{ time: t.created_at || new Date().toISOString(), title: "Ticket Created", user: "System", type: "system" }],
              attachments: []
            });
          }
        });

        currentTickets = Array.from(mergedMap.values());
        renderTicketsTable();
      }
    }
  } catch (err) {
    console.warn("FastAPI backend offline, using local persistent tickets:", err);
  }
}

// ---------------------------------------------------------------------------
// TABLE RENDERER
// ---------------------------------------------------------------------------
function renderTicketsTable() {
  const tbody = document.getElementById("tickets-tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  let filtered = currentTickets.filter(t => {
    const searchQuery = (tableState.searchQuery || "").toLowerCase();
    const matchesSearch = !searchQuery || 
      (t.subject && t.subject.toLowerCase().includes(searchQuery)) ||
      (t.user && t.user.name && t.user.name.toLowerCase().includes(searchQuery)) ||
      (t.id && t.id.toLowerCase().includes(searchQuery));

    const matchesDept = tableState.deptFilter === "all" || t.department === tableState.deptFilter;
    const matchesPriority = tableState.priorityFilter === "all" || t.priority === tableState.priorityFilter;
    const matchesStatus = tableState.statusFilter === "all" || (t.status && t.status.toLowerCase() === tableState.statusFilter.toLowerCase());

    return matchesSearch && matchesDept && matchesPriority && matchesStatus;
  });

  filtered.sort((a, b) => {
    let valA = a[tableState.sortColumn];
    let valB = b[tableState.sortColumn];

    if (tableState.sortColumn === "user") {
      valA = a.user ? a.user.name : "";
      valB = b.user ? b.user.name : "";
    }

    if (valA < valB) return tableState.sortAsc ? -1 : 1;
    if (valA > valB) return tableState.sortAsc ? 1 : -1;
    return 0;
  });

  const totalEntries = filtered.length;
  const totalPages = Math.ceil(totalEntries / tableState.pageSize) || 1;

  if (tableState.currentPage > totalPages) {
    tableState.currentPage = totalPages;
  }

  const startIdx = (tableState.currentPage - 1) * tableState.pageSize;
  const endIdx = Math.min(startIdx + tableState.pageSize, totalEntries);
  const paginatedTickets = filtered.slice(startIdx, endIdx);

  if (paginatedTickets.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state" style="text-align: center; padding: 40px;">
            <svg viewBox="0 0 24 24" style="width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.5;"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            <h3>No matching tickets found</h3>
            <p>Try refining your search query or adjust your filters.</p>
          </div>
        </td>
      </tr>
    `;
  } else {
    paginatedTickets.forEach(t => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong style="color: var(--accent-primary); font-family: monospace;">${t.id}</strong></td>
        <td>
          <div style="display: flex; flex-direction: column;">
            <span style="font-weight: 600;">${t.user ? t.user.name : 'Unknown'}</span>
            <span style="font-size: 11px; color: var(--text-muted);">${t.user ? t.user.email || t.user.company : 'Workspace'}</span>
          </div>
        </td>
        <td>${t.department || 'General'}</td>
        <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${t.subject}">${t.subject}</td>
        <td><span style="font-size: 12px; color: var(--text-secondary);">${t.category}</span></td>
        <td><span class="badge badge-priority-${(t.priority || 'medium').toLowerCase().replace(/[^a-z]/g, '')}">${t.priority}</span></td>
        <td><span class="badge badge-status-${(t.status || 'open').toLowerCase()}">${t.status}</span></td>
        <td style="color: var(--text-secondary);">${formatShortDate(t.createdDate)}</td>
      `;
      tr.addEventListener("click", () => openDetailsDrawer(t.id));
      tbody.appendChild(tr);
    });
  }

  const infoLabel = document.getElementById("pagination-info");
  if (infoLabel) {
    infoLabel.textContent = totalEntries > 0 
      ? `Showing ${startIdx + 1} to ${endIdx} of ${totalEntries} entries` 
      : "Showing 0 entries";
  }

  renderPaginationControls(totalPages);

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
  prevBtn.innerHTML = "&larr;";
  prevBtn.disabled = tableState.currentPage === 1;
  prevBtn.addEventListener("click", () => {
    tableState.currentPage--;
    renderTicketsTable();
  });
  container.appendChild(prevBtn);

  for (let i = 1; i <= totalPages; i++) {
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
  nextBtn.innerHTML = "&rarr;";
  nextBtn.disabled = tableState.currentPage === totalPages;
  nextBtn.addEventListener("click", () => {
    tableState.currentPage++;
    renderTicketsTable();
  });
  container.appendChild(nextBtn);
}

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
// DRAWER CONTROLLER
// ---------------------------------------------------------------------------
let activeDrawerTicketId = null;

function openDetailsDrawer(ticketId) {
  const ticket = currentTickets.find(t => t.id === ticketId);
  if (!ticket) return;

  activeDrawerTicketId = ticketId;

  const setElText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setElText("drawer-ticket-id", ticket.id);
  setElText("drawer-subject", ticket.subject);
  setElText("drawer-desc", ticket.description);

  const badgeContainer = document.getElementById("drawer-badges");
  if (badgeContainer) {
    badgeContainer.innerHTML = `
      <span class="badge badge-priority-${(ticket.priority || 'medium').toLowerCase().replace(/[^a-z]/g, '')}">${ticket.priority}</span>
      <span class="badge badge-status-${(ticket.status || 'open').toLowerCase()}">${ticket.status}</span>
    `;
  }

  setElText("drawer-ai-confidence", `${ticket.confidenceScore}% Confident`);
  setElText("drawer-ai-category", ticket.aiClassification ? ticket.aiClassification.category : ticket.category);
  setElText("drawer-ai-dept", ticket.aiClassification ? ticket.aiClassification.suggestedDept : ticket.department);

  setElText("drawer-resolution-text", ticket.suggestedResolution);

  const attachmentList = document.getElementById("drawer-attachments-list");
  if (attachmentList) {
    attachmentList.innerHTML = "";
    if (!ticket.attachments || ticket.attachments.length === 0) {
      attachmentList.innerHTML = `<span style="font-size: 12px; color: var(--text-muted);">No attachments provided.</span>`;
    } else {
      ticket.attachments.forEach(file => {
        const fileTag = document.createElement("span");
        fileTag.style.cssText = "font-size: 11px; padding: 4px 8px; border: 1px solid var(--border-color); border-radius: 4px; background-color: var(--bg-app); cursor: pointer;";
        fileTag.textContent = file;
        fileTag.addEventListener("click", () => {
          if (typeof showToast === "function") showToast("Attachment Download", `Downloading ${file} locally...`, "info");
        });
        attachmentList.appendChild(fileTag);
      });
    }
  }

  const jiraId = ticket.id.replace('TKT-', 'IT-2026-');
  setElText("drawer-integ-jira-id", jiraId);
  setElText("drawer-integ-jira-status", ticket.status);
  setElText("drawer-integ-jira-assignee", ticket.assignedAgent || "Unassigned");
  setElText("drawer-integ-jira-priority", ticket.priority);

  const backdrop = document.getElementById("ticket-drawer-backdrop");
  if (backdrop) backdrop.classList.add("active");

  if (typeof window._drawerTab === 'function') window._drawerTab('details');

  if (window.SupportPilotAgentPipeline) {
    window.SupportPilotAgentPipeline.loadTicket(ticket);
  }
}

function closeDetailsDrawer() {
  const backdrop = document.getElementById("ticket-drawer-backdrop");
  if (backdrop) backdrop.classList.remove("active");
  activeDrawerTicketId = null;
}

async function handleDrawerResolve() {
  if (!activeDrawerTicketId) return;

  const ticket = currentTickets.find(t => t.id === activeDrawerTicketId);
  if (ticket) {
    ticket.status = "Resolved";
    ticket.timeline.push({
      time: new Date().toISOString(),
      title: "Ticket Resolved",
      user: "Staff Operator",
      type: "agent"
    });

    saveStoredTickets(currentTickets);

    const recipientEmail = ticket.user?.email || "22snehs@gmail.com";

    // 1. Dispatch real email via FastAPI backend
    try {
      await fetch("http://127.0.0.1:8000/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipientEmail,
          subject: `RESOLVED: [${ticket.id}] ${ticket.subject}`,
          body: `Dear ${ticket.user?.name || 'Customer'},\n\nYour ticket #${ticket.id} (${ticket.subject}) has been resolved by SupportPilot.\n\nResolution:\n${ticket.suggestedResolution}\n\nBest regards,\nSupportPilot AI Team`
        })
      });
      console.log(`Real email API triggered for ${recipientEmail}`);
    } catch (err) {
      console.warn("Backend server offline or email endpoint failed:", err);
    }

    // 2. Add to frontend outbox view
    if (window.SupportPilotEmailEnhanced && typeof window.SupportPilotEmailEnhanced.addEmail === "function") {
      window.SupportPilotEmailEnhanced.addEmail(ticket);
    }

    if (typeof showToast === "function") showToast("Ticket Resolved", `Ticket ${ticket.id} marked as Resolved and email sent to ${recipientEmail}.`, "success");
    closeDetailsDrawer();
    renderTicketsTable();
  }
}

function handleDrawerEscalate() {
  if (!activeDrawerTicketId) return;
  const ticket = currentTickets.find(t => t.id === activeDrawerTicketId);
  if (ticket) {
    ticket.priority = "Urgent";
    ticket.department = "Engineering";
    ticket.timeline.push({
      time: new Date().toISOString(),
      title: "Escalated to Engineering",
      user: "Nova Engine System",
      type: "ai"
    });

    saveStoredTickets(currentTickets);

    if (typeof showToast === "function") showToast("Ticket Escalated", `Ticket ${ticket.id} was escalated to Engineering support queues.`, "warning");
    closeDetailsDrawer();
    renderTicketsTable();
  }
}

function handleDrawerAssign() {
  if (!activeDrawerTicketId) return;
  const ticket = currentTickets.find(t => t.id === activeDrawerTicketId);
  if (ticket) {
    const agents = ["Sarah Connor", "Alex Mercer", "Emma Stone"];
    const randomAgent = agents[Math.floor(Math.random() * agents.length)];
    ticket.assignedAgent = randomAgent;

    saveStoredTickets(currentTickets);

    if (typeof showToast === "function") showToast("Agent Assigned", `Ticket ${ticket.id} assigned to ${randomAgent}.`, "info");
    closeDetailsDrawer();
    renderTicketsTable();
  }
}

// ---------------------------------------------------------------------------
// FORM MODAL & TICKET INSERTION WITH PERSISTENCE
// ---------------------------------------------------------------------------
function openNewTicketModal() {
  const form = document.getElementById("new-ticket-form");
  if (form) form.reset();
  
  const predCard = document.getElementById("ai-prediction-card");
  const loadingContainer = document.getElementById("ai-loading-container");
  const submitBtn = document.getElementById("btn-modal-submit");

  if (predCard) predCard.style.display = "none";
  if (loadingContainer) loadingContainer.style.display = "none";
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = "Run AI Prediction";
  }
  
  aiPredictingState = false;

  const backdrop = document.getElementById("new-ticket-modal-backdrop");
  if (backdrop) backdrop.classList.add("active");
}

function closeNewTicketModal() {
  const backdrop = document.getElementById("new-ticket-modal-backdrop");
  if (backdrop) backdrop.classList.remove("active");
}

function handleNewTicketSubmit(e) {
  e.preventDefault();

  const emailEl = document.getElementById("tkt-email");
  const subjectEl = document.getElementById("tkt-subject");
  const descEl = document.getElementById("tkt-desc");
  const deptEl = document.getElementById("tkt-dept");
  const categoryEl = document.getElementById("tkt-category");
  const priorityEl = document.getElementById("tkt-priority");
  const fileInput = document.getElementById("tkt-file");

  const requesterEmail = emailEl ? emailEl.value.trim() : "user@company.com";
  const userName = requesterEmail ? requesterEmail.split("@")[0].replace(".", " ").replace(/\b\w/g, l => l.toUpperCase()) : "Corporate Employee";
  const subject = subjectEl ? subjectEl.value.trim() : "";
  const description = descEl ? descEl.value.trim() : "";
  const dept = deptEl ? deptEl.value : "Customer Support";
  const category = categoryEl ? categoryEl.value : "Software";
  const priority = priorityEl ? priorityEl.value : "P3-Medium";

  if (!subject || !description) {
    if (typeof showToast === "function") showToast("Form Error", "Please fill in all required fields.", "error");
    return;
  }

  if (!aiPredictingState) {
    // Phase 1: Run AI Prediction Analysis Simulation
    const loadingContainer = document.getElementById("ai-loading-container");
    const submitBtn = document.getElementById("btn-modal-submit");

    if (loadingContainer) loadingContainer.style.display = "flex";
    if (submitBtn) submitBtn.disabled = true;

    setTimeout(() => {
      if (loadingContainer) loadingContainer.style.display = "none";
      if (submitBtn) submitBtn.disabled = false;

      let predictedDept = dept;
      let predictedPriority = priority;
      let confidence = Math.floor(Math.random() * 12) + 86;

      const lowerSub = subject.toLowerCase();
      if (lowerSub.includes("vpn") || lowerSub.includes("network") || lowerSub.includes("connection")) {
        predictedDept = "Engineering";
        predictedPriority = "High";
      } else if (lowerSub.includes("billing") || lowerSub.includes("invoice")) {
        predictedDept = "Billing";
        predictedPriority = "High";
      }

      const predPriEl = document.getElementById("ai-pred-priority");
      const predDeptEl = document.getElementById("ai-pred-dept");
      const predCatEl = document.getElementById("ai-pred-category");
      const predConfEl = document.getElementById("ai-pred-confidence");

      if (predPriEl) predPriEl.textContent = predictedPriority;
      if (predDeptEl) predDeptEl.textContent = predictedDept;
      if (predCatEl) predCatEl.textContent = category;
      if (predConfEl) predConfEl.textContent = `${confidence}% confidence`;

      const predCard = document.getElementById("ai-prediction-card");
      if (predCard) predCard.style.display = "block";

      aiPredictingState = true;
      if (submitBtn) submitBtn.textContent = "Confirm & Insert Ticket";
    }, 800);

  } else {
    // Phase 2: Create & Save Ticket with User's Email
    const predDeptEl = document.getElementById("ai-pred-dept");
    const predPriEl = document.getElementById("ai-pred-priority");
    const predConfEl = document.getElementById("ai-pred-confidence");

    const predictedDept = predDeptEl ? predDeptEl.textContent : dept;
    const predictedPriority = predPriEl ? predPriEl.textContent : priority;
    const confidenceVal = predConfEl ? parseInt(predConfEl.textContent) : 92;

    const attachmentsList = [];
    if (fileInput && fileInput.files.length > 0) {
      attachmentsList.push(fileInput.files[0].name);
    }

    const newId = `TKT-${100 + currentTickets.length + 1}`;
    const newTkt = {
      id: newId,
      user: { 
        name: userName, 
        email: requesterEmail, 
        company: "Workspace User" 
      },
      department: predictedDept,
      subject: subject,
      category: category,
      priority: predictedPriority,
      severity: predictedPriority === "Urgent" || predictedPriority === "High" ? "Critical" : "Medium",
      status: "Open",
      assignedAgent: "Nova AI System",
      createdDate: new Date().toISOString(),
      confidenceScore: confidenceVal,
      description: description,
      aiClassification: {
        category: category,
        priority: predictedPriority,
        confidence: confidenceVal,
        suggestedDept: predictedDept
      },
      suggestedResolution: `Automated Context Analysis for "${subject}": Check endpoint routing and verify network settings.`,
      timeline: [
        { time: new Date().toISOString(), title: "Ticket Opened", user: userName, type: "system" },
        { time: new Date().toISOString(), title: "Nova AI Classification Run", user: "Diagnosis Agent", type: "ai" }
      ],
      attachments: attachmentsList
    };

    currentTickets.unshift(newTkt);

    const localSaved = loadStoredTickets();
    localSaved.unshift(newTkt);
    saveStoredTickets(localSaved);

    // Sync to backend endpoint
    fetch("http://127.0.0.1:8000/api/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        title: subject, 
        description: description, 
        requester_email: requesterEmail 
      })
    }).catch(err => console.log("Backend triage sync skipped:", err));

    if (typeof showToast === "function") showToast("Ticket Created", `New ticket ${newId} created for ${requesterEmail}.`, "success");

    closeNewTicketModal();
    renderTicketsTable();
  }
}

function handleExportCSV() {
  if (currentTickets.length === 0) return;
  const headers = ["Ticket ID", "User", "Company", "Department", "Subject", "Category", "Priority", "Status", "Created Date"];
  const rows = currentTickets.map(t => [
    t.id,
    `"${t.user ? t.user.name : ''}"`,
    `"${t.user ? t.user.company : ''}"`,
    `"${t.department}"`,
    `"${t.subject ? t.subject.replace(/"/g, '""') : ''}"`,
    `"${t.category}"`,
    t.priority,
    t.status,
    t.createdDate
  ].join(","));

  const csvContent = headers.join("\n") + "\n" + rows.join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "supportpilot_tickets.csv");
  link.click();
}

function formatShortDate(isoString) {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    return isoString;
  }
}

function formatTime(isoString) {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch (e) {
    return isoString;
  }
}

window.SupportPilotTickets = {
  init: initTicketsModule,
  render: renderTicketsTable,
  getTickets: () => currentTickets,
  openDrawer: openDetailsDrawer,
  refresh: fetchLiveTickets
};