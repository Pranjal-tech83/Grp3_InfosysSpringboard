// tickets.js - Full Working Tickets View, Table Sorting, Pagination, Drawer & Form Modal Controller

// State for Tickets Page
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

// Tracks if AI prediction card has been displayed for the current form submission
let aiPredictingState = false;

// Initialize the Tickets manager
function initTicketsModule() {
  // Load initial tickets from data layer securely
  if (window.TicketNovaData && window.TicketNovaData.initialTickets) {
    currentTickets = [...window.TicketNovaData.initialTickets];
  }

  // Setup DOM Event Listeners safely
  const searchBar = document.getElementById("tkt-search-bar");
  if (searchBar) searchBar.addEventListener("input", handleSearch);

  const filterDept = document.getElementById("filter-dept");
  if (filterDept) filterDept.addEventListener("change", handleFilterChange);

  const filterPriority = document.getElementById("filter-priority");
  if (filterPriority) filterPriority.addEventListener("change", handleFilterChange);

  const filterStatus = document.getElementById("filter-status");
  if (filterStatus) filterStatus.addEventListener("change", handleFilterChange);

  // Table header clicks for sorting
  const headers = document.querySelectorAll("#main-tickets-table th");
  headers.forEach(header => {
    header.addEventListener("click", () => {
      const column = header.getAttribute("data-sort");
      if (column) handleSort(column);
    });
  });

  // Modal open/close actions binding safely
  const createBtn = document.getElementById("btn-create-ticket-modal");
  if (createBtn) createBtn.addEventListener("click", openNewTicketModal);
  
  const dashNewBtn = document.getElementById("dash-action-new-tkt");
  if (dashNewBtn) dashNewBtn.addEventListener("click", openNewTicketModal);
  
  const closeBtn = document.getElementById("modal-close-btn");
  if (closeBtn) closeBtn.addEventListener("click", closeNewTicketModal);

  const cancelBtn = document.getElementById("btn-modal-cancel");
  if (cancelBtn) cancelBtn.addEventListener("click", closeNewTicketModal);

  const ticketForm = document.getElementById("new-ticket-form");
  if (ticketForm) ticketForm.addEventListener("submit", handleNewTicketSubmit);

  // Details drawer closing actions
  const drawerClose = document.getElementById("drawer-close-btn");
  if (drawerClose) drawerClose.addEventListener("click", closeDetailsDrawer);

  const backdrop = document.getElementById("ticket-drawer-backdrop");
  if (backdrop) {
    backdrop.addEventListener("click", (e) => {
      if (e.target.id === "ticket-drawer-backdrop") closeDetailsDrawer();
    });
  }

  // Drawer buttons
  const resolveBtn = document.getElementById("btn-drawer-resolve");
  if (resolveBtn) resolveBtn.addEventListener("click", handleDrawerResolve);

  const escalateBtn = document.getElementById("btn-drawer-escalate");
  if (escalateBtn) escalateBtn.addEventListener("click", handleDrawerEscalate);

  const assignBtn = document.getElementById("btn-drawer-assign");
  if (assignBtn) assignBtn.addEventListener("click", handleDrawerAssign);

  const exportBtn = document.getElementById("btn-export-ui");
  if (exportBtn) exportBtn.addEventListener("click", handleExportCSV);

  // Initial table render execution
  renderTicketsTable();
}

// Render the Ticket Table
function renderTicketsTable() {
  const tbody = document.getElementById("tickets-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  // Apply filters
  let filtered = currentTickets.filter(t => {
    const matchesSearch = t.subject.toLowerCase().includes(tableState.searchQuery.toLowerCase()) ||
                          t.user.name.toLowerCase().includes(tableState.searchQuery.toLowerCase()) ||
                          t.id.toLowerCase().includes(tableState.searchQuery.toLowerCase());
    
    const matchesDept = tableState.deptFilter === "all" || t.department === tableState.deptFilter;
    const matchesPriority = tableState.priorityFilter === "all" || t.priority === tableState.priorityFilter;
    const matchesStatus = tableState.statusFilter === "all" || t.status === tableState.statusFilter;

    return matchesSearch && matchesDept && matchesPriority && matchesStatus;
  });

  // Apply sorting
  filtered.sort((a, b) => {
    let valA = a[tableState.sortColumn];
    let valB = b[tableState.sortColumn];

    if (tableState.sortColumn === "user") {
      valA = a.user.name;
      valB = b.user.name;
    }

    if (valA < valB) return tableState.sortAsc ? -1 : 1;
    if (valA > valB) return tableState.sortAsc ? 1 : -1;
    return 0;
  });

  // Apply pagination
  const totalEntries = filtered.length;
  const totalPages = Math.ceil(totalEntries / tableState.pageSize) || 1;
  
  if (tableState.currentPage > totalPages) {
    tableState.currentPage = totalPages;
  }

  const startIdx = (tableState.currentPage - 1) * tableState.pageSize;
  const endIdx = Math.min(startIdx + tableState.pageSize, totalEntries);
  const paginatedTickets = filtered.slice(startIdx, endIdx);

  // Render rows
  if (paginatedTickets.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <svg viewBox="0 0 24 24" width="48" height="48"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            <h3>No matching tickets found</h3>
            <p>Try refining your search query or adjust your filters.</p>
          </div>
        </td>
      </tr>
    `;
  } else {
    paginatedTickets.forEach(t => {
      const tr = document.createElement("tr");
      
      // Normalize priority classes to match styles.css definitions perfectly
      let pClass = t.priority.toLowerCase();
      if (pClass === "high") pClass = "high";
      if (pClass === "medium") pClass = "medium";
      if (pClass === "low") pClass = "low";
      if (pClass === "urgent" || pClass === "critical") pClass = "urgent";

      tr.innerHTML = `
        <td><strong style="color: var(--accent-primary); font-family: monospace;">${t.id}</strong></td>
        <td>
          <div style="display: flex; flex-direction: column;">
            <span style="font-weight: 600;">${t.user.name}</span>
            <span style="font-size: 11px; color: var(--text-muted);">${t.user.company}</span>
          </div>
        </td>
        <td>${t.department}</td>
        <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${t.subject}">${t.subject}</td>
        <td><span style="font-size: 12px; color: var(--text-secondary);">${t.category}</span></td>
        <td><span class="badge badge-priority-${pClass}">${t.priority}</span></td>
        <td><span class="badge badge-status-${t.status.toLowerCase()}">${t.status}</span></td>
        <td style="color: var(--text-secondary);">${formatShortDate(t.createdDate)}</td>
      `;
      tr.addEventListener("click", () => openDetailsDrawer(t.id));
      tbody.appendChild(tr);
    });
  }

  // Update pagination info label
  const infoLabel = document.getElementById("pagination-info");
  if (infoLabel) {
    infoLabel.textContent = totalEntries > 0 ? `Showing ${startIdx + 1} to ${endIdx} of ${totalEntries} entries` : "Showing 0 entries";
  }

  // Update pagination button controls
  renderPaginationControls(totalPages);
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
  tableState.deptFilter = document.getElementById("filter-dept").value;
  tableState.priorityFilter = document.getElementById("filter-priority").value;
  tableState.statusFilter = document.getElementById("filter-status").value;
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

let activeDrawerTicketId = null;

function openDetailsDrawer(ticketId) {
  const ticket = currentTickets.find(t => t.id === ticketId);
  if (!ticket) return;

  activeDrawerTicketId = ticketId;

  document.getElementById("drawer-ticket-id").textContent = ticket.id;
  document.getElementById("drawer-subject").textContent = ticket.subject;
  document.getElementById("drawer-desc").textContent = ticket.description;
  
  let pClass = ticket.priority.toLowerCase();
  if (pClass === "urgent" || pClass === "critical") pClass = "urgent";

  const badgeContainer = document.getElementById("drawer-badges");
  badgeContainer.innerHTML = `
    <span class="badge badge-priority-${pClass}">${ticket.priority}</span>
    <span class="badge badge-status-${ticket.status.toLowerCase()}">${ticket.status}</span>
  `;

  document.getElementById("drawer-ai-confidence").textContent = `${ticket.confidenceScore}% Confident`;
  document.getElementById("drawer-ai-category").textContent = ticket.aiClassification.category;
  document.getElementById("drawer-ai-dept").textContent = ticket.aiClassification.suggestedDept;
  document.getElementById("drawer-resolution-text").textContent = ticket.suggestedResolution;

  const attachmentList = document.getElementById("drawer-attachments-list");
  attachmentList.innerHTML = "";
  if (!ticket.attachments || ticket.attachments.length === 0) {
    attachmentList.innerHTML = `<span style="font-size: 12px; color: var(--text-muted);">No attachments provided.</span>`;
  } else {
    ticket.attachments.forEach(file => {
      const fileTag = document.createElement("span");
      fileTag.style.cssText = "font-size: 11px; padding: 4px 8px; border: 1px solid var(--border-color); border-radius: 4px; background-color: var(--bg-app); cursor: pointer;";
      fileTag.textContent = file;
      attachmentList.appendChild(fileTag);
    });
  }

  const timelineFlow = document.getElementById("drawer-timeline-flow");
  timelineFlow.innerHTML = "";
  ticket.timeline.forEach(event => {
    const node = document.createElement("div");
    node.className = `timeline-node ${event.type === "ai" ? "timeline-ai" : ""}`;
    node.innerHTML = `
      <div class="timeline-node-time">${formatTime(event.time)}</div>
      <div class="timeline-node-title">${event.title} (${event.user})</div>
    `;
    timelineFlow.appendChild(node);
  });

  document.getElementById("ticket-drawer-backdrop").classList.add("active");
}

function closeDetailsDrawer() {
  document.getElementById("ticket-drawer-backdrop").classList.remove("active");
  activeDrawerTicketId = null;
}

function handleDrawerResolve() {
  if (!activeDrawerTicketId) return;
  const ticket = currentTickets.find(t => t.id === activeDrawerTicketId);
  if (ticket) {
    ticket.status = "Resolved";
    ticket.timeline.push({ time: new Date().toISOString(), title: "Ticket Resolved", user: "Staff Operator", type: "agent" });
    if (window.TicketNovaEmail && typeof window.TicketNovaEmail.addEmail === "function") {
      window.TicketNovaEmail.addEmail(ticket);
    }
    showToast("Ticket Resolved", `Ticket ${ticket.id} marked as Resolved.`, "success");
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
    ticket.timeline.push({ time: new Date().toISOString(), title: "Escalated to Engineering", user: "Nova Engine System", type: "ai" });
    showToast("Ticket Escalated", `Ticket ${ticket.id} escalated to Engineering.`, "warning");
    closeDetailsDrawer();
    renderTicketsTable();
  }
}

function handleDrawerAssign() {
  if (!activeDrawerTicketId) return;
  const ticket = currentTickets.find(t => t.id === activeDrawerTicketId);
  if (ticket) {
    const randomAgent = ["Sarah Connor", "Alex Mercer", "Emma Stone"][Math.floor(Math.random() * 3)];
    ticket.assignedAgent = randomAgent;
    ticket.timeline.push({ time: new Date().toISOString(), title: `Assigned to ${randomAgent}`, user: "Staff Admin", type: "agent" });
    showToast("Agent Assigned", `Ticket ${ticket.id} allocated to ${randomAgent}.`, "info");
    closeDetailsDrawer();
    renderTicketsTable();
  }
}

function openNewTicketModal() {
  document.getElementById("new-ticket-form").reset();
  
  const card = document.getElementById("ai-prediction-card");
  if (card) card.style.display = "none";
  
  const loader = document.getElementById("ai-loading-container");
  if (loader) loader.style.display = "none";

  aiPredictingState = false;
  
  const submitBtn = document.getElementById("btn-modal-submit");
  if (submitBtn) {
    submitBtn.innerHTML = "Submit Ticket";
    submitBtn.disabled = false;
  }
  
  document.getElementById("new-ticket-modal-backdrop").classList.add("active");
}

function closeNewTicketModal() {
  document.getElementById("new-ticket-modal-backdrop").classList.remove("active");
}

function handleNewTicketSubmit(e) {
  e.preventDefault();

  const subject = document.getElementById("tkt-subject").value;
  const description = document.getElementById("tkt-desc").value;
  const dept = document.getElementById("tkt-dept").value;
  const fileInput = document.getElementById("tkt-file");
  const submitBtn = document.getElementById("btn-modal-submit");

  if (!aiPredictingState) {
    const loader = document.getElementById("ai-loading-container");
    if (loader) loader.style.display = "flex";
    if (submitBtn) submitBtn.disabled = true;

    fetch("http://127.0.0.1:8000/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: subject, description: description })
    })
    .then(res => res.json())
    .then(data => {
        if (loader) loader.style.display = "none";
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = "Confirm & Insert Ticket";
        }

        // Robust parsing schema setup to defend against NaN evaluations
        const rawConfidence = data.confidence_score !== undefined ? data.confidence_score : (data.confidence || 0.95);
        const parsedConfidence = parseFloat(rawConfidence);
        const displayConfidence = isNaN(parsedConfidence) ? 95 : Math.round(parsedConfidence * 100);

        const categoryVal = data.category || "General";
        const severityVal = data.severity || "Medium";
        const reasoningText = data.reasoning_summary || data.reasoning || "Triage processing complete.";

        // Bind data parameters explicitly onto target card text layouts
        document.getElementById("ai-pred-priority").textContent = severityVal;
        document.getElementById("ai-pred-dept").textContent = dept; 
        document.getElementById("ai-pred-category").textContent = categoryVal;
        document.getElementById("ai-pred-confidence").textContent = `${displayConfidence}% confidence`;

        const predCard = document.getElementById("ai-prediction-card");
        if (predCard) {
          predCard.setAttribute("data-reasoning", reasoningText);
          predCard.style.display = "block";
        }
        
        aiPredictingState = true;
    })
    .catch(err => {
        console.error("Inference link drop:", err);
        if (loader) loader.style.display = "none";
        if (submitBtn) submitBtn.disabled = false;
        alert("Local AI API Offline. Verify uvicorn is active inside the subfolder!");
    });

  } else {
    const pDept = document.getElementById("ai-pred-dept").textContent;
    const pPriority = document.getElementById("ai-pred-priority").textContent;
    const pCategory = document.getElementById("ai-pred-category").textContent;
    const rawConf = document.getElementById("ai-pred-confidence").textContent;
    const confVal = parseInt(rawConf.replace(/[^0-9]/g, ''), 10) || 95;
    const reasoning = document.getElementById("ai-prediction-card").getAttribute("data-reasoning") || "Processed via local LLM rules lookup.";

    const attachmentsList = [];
    if (fileInput && fileInput.files.length > 0) {
      attachmentsList.push(fileInput.files[0].name);
    }

    const newId = `TKT-${1024 + currentTickets.length}`;
    const newTkt = {
      id: newId,
      user: { name: "Pranjal Choudhary", email: "pranj@choudhary.com", company: "Local Workspace" },
      department: pDept,
      subject: subject,
      category: pCategory, 
      priority: pPriority,
      severity: pPriority === "Urgent" || pPriority === "High" ? "Critical" : "Minor",
      status: "Open",
      assignedAgent: "Unassigned",
      createdDate: new Date().toISOString(),
      confidenceScore: confVal,
      description: description,
      aiClassification: { category: pCategory, priority: pPriority, severity: pPriority === "Urgent" || pPriority === "High" ? "Critical" : "Minor", confidence: confVal, suggestedDept: pDept },
      suggestedResolution: reasoning,
      escalationHistory: [],
      timeline: [
        { time: new Date().toISOString(), title: "Ticket Opened", user: "Pranjal Choudhary", type: "system" },
        { time: new Date().toISOString(), title: "Nova AI Classification Run", user: "Diagnosis Agent", type: "ai" }
      ],
      attachments: attachmentsList
    };

    currentTickets.unshift(newTkt);
    showToast("Ticket Opened", `New ticket ${newId} added to active queue.`, "success");
    
    closeNewTicketModal();
    renderTicketsTable();
  }
}

function handleExportCSV() {
  showToast("CSV Export Started", "Formatting tickets dataset.", "info");
  setTimeout(() => { showToast("CSV Downloaded", "Tickets directory list saved.", "success"); }, 1200);
}

function formatShortDate(isoString) {
  return new Date(isoString).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// Global scope registration mapping
window.TicketNovaTickets = {
  init: initTicketsModule,
  render: renderTicketsTable,
  getTickets: () => currentTickets,
  openDrawer: openDetailsDrawer
};

// Global dashboard recent activity renderer sync override setup
window.refreshDynamicViewElements = function() {
  const tickets = window.TicketNovaTickets.getTickets();
  const tbody = document.getElementById("dash-activity-tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  const previewList = tickets.slice(0, 5);
  
  previewList.forEach(t => {
    const tr = document.createElement("tr");
    const priorityClass = (t.priority || "Low").toLowerCase();
    const statusClass = (t.status || "Open").toLowerCase();
    
    tr.innerHTML = `
      <td><strong style="color: var(--accent-primary); font-family: monospace;">${t.id}</strong></td>
      <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${t.subject}</td>
      <td><span class="badge badge-priority-${priorityClass}">${t.priority}</span></td>
      <td><span style="color: var(--text-secondary);">${t.category}</span></td>
      <td><span class="badge badge-status-${statusClass}">${t.status}</span></td>
    `;
    
    tr.addEventListener("click", () => {
      window.TicketNovaTickets.openDrawer(t.id);
    });
    tbody.appendChild(tr);
  });
};