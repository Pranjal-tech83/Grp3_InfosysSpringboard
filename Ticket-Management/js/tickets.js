// tickets.js - Tickets View, Table Sorting, Pagination, Drawer & Form Modal Controller

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
  // Load initial tickets from mock database
  currentTickets = [...window.TicketNovaData.initialTickets];

  // Setup DOM Event Listeners
  document.getElementById("tkt-search-bar").addEventListener("input", handleSearch);
  document.getElementById("filter-dept").addEventListener("change", handleFilterChange);
  document.getElementById("filter-priority").addEventListener("change", handleFilterChange);
  document.getElementById("filter-status").addEventListener("change", handleFilterChange);

  // Table header clicks for sorting
  const headers = document.querySelectorAll("#main-tickets-table th");
  headers.forEach(header => {
    header.addEventListener("click", () => {
      const column = header.getAttribute("data-sort");
      if (column) handleSort(column);
    });
  });

  // Modal open/close actions
  document.getElementById("btn-create-ticket-modal").addEventListener("click", openNewTicketModal);
  document.getElementById("dash-action-new-tkt").addEventListener("click", openNewTicketModal);
  document.getElementById("modal-close-btn").addEventListener("click", closeNewTicketModal);
  document.getElementById("btn-modal-cancel").addEventListener("click", closeNewTicketModal);
  document.getElementById("new-ticket-form").addEventListener("submit", handleNewTicketSubmit);

  // Details drawer closing actions
  document.getElementById("drawer-close-btn").addEventListener("click", closeDetailsDrawer);
  document.getElementById("ticket-drawer-backdrop").addEventListener("click", (e) => {
    if (e.target.id === "ticket-drawer-backdrop") closeDetailsDrawer();
  });

  // Drawer buttons
  document.getElementById("btn-drawer-resolve").addEventListener("click", handleDrawerResolve);
  document.getElementById("btn-drawer-escalate").addEventListener("click", handleDrawerEscalate);
  document.getElementById("btn-drawer-assign").addEventListener("click", handleDrawerAssign);

  // Export CSV mock trigger
  document.getElementById("btn-export-ui").addEventListener("click", handleExportCSV);

  // First rendering of tickets table
  renderTicketsTable();
}

// Render the Ticket Table
function renderTicketsTable() {
  const tbody = document.getElementById("tickets-tbody");
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

    // Handle nested object parameters (e.g. user.name)
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
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
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
            <span style="font-weight: 600;">${t.user.name}</span>
            <span style="font-size: 11px; color: var(--text-muted);">${t.user.company}</span>
          </div>
        </td>
        <td>${t.department}</td>
        <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${t.subject}">${t.subject}</td>
        <td><span style="font-size: 12px; color: var(--text-secondary);">${t.category}</span></td>
        <td><span class="badge badge-priority-${t.priority.toLowerCase()}">${t.priority}</span></td>
        <td><span class="badge badge-status-${t.status.toLowerCase()}">${t.status}</span></td>
        <td style="color: var(--text-secondary);">${formatShortDate(t.createdDate)}</td>
      `;
      tr.addEventListener("click", () => openDetailsDrawer(t.id));
      tbody.appendChild(tr);
    });
  }

  // Update pagination info label
  const infoLabel = document.getElementById("pagination-info");
  if (totalEntries > 0) {
    infoLabel.textContent = `Showing ${startIdx + 1} to ${endIdx} of ${totalEntries} entries`;
  } else {
    infoLabel.textContent = "Showing 0 entries";
  }

  // Update pagination button controls
  renderPaginationControls(totalPages);

  // Sync dashboard active table if rendered
  if (typeof updateDashboardViews === "function") {
    updateDashboardViews(currentTickets);
  }
}

// Render pagination numeric controls
function renderPaginationControls(totalPages) {
  const container = document.getElementById("pagination-controls");
  container.innerHTML = "";

  // Prev Button
  const prevBtn = document.createElement("button");
  prevBtn.className = "page-btn";
  prevBtn.innerHTML = "&larr;";
  prevBtn.disabled = tableState.currentPage === 1;
  prevBtn.addEventListener("click", () => {
    tableState.currentPage--;
    renderTicketsTable();
  });
  container.appendChild(prevBtn);

  // Page Numbers
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

  // Next Button
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

// Handling Search Input
function handleSearch(e) {
  tableState.searchQuery = e.target.value;
  tableState.currentPage = 1;
  renderTicketsTable();
}

// Handling Filter Selection Changes
function handleFilterChange() {
  tableState.deptFilter = document.getElementById("filter-dept").value;
  tableState.priorityFilter = document.getElementById("filter-priority").value;
  tableState.statusFilter = document.getElementById("filter-status").value;
  tableState.currentPage = 1;
  renderTicketsTable();
}

// Handling Column Header Clicks for Table Sorting
function handleSort(column) {
  if (tableState.sortColumn === column) {
    tableState.sortAsc = !tableState.sortAsc;
  } else {
    tableState.sortColumn = column;
    tableState.sortAsc = true;
  }
  renderTicketsTable();
}

// Open Details Drawer from Table Row Click
let activeDrawerTicketId = null;

function openDetailsDrawer(ticketId) {
  const ticket = currentTickets.find(t => t.id === ticketId);
  if (!ticket) return;

  activeDrawerTicketId = ticketId;

  // Set values inside Drawer Elements
  document.getElementById("drawer-ticket-id").textContent = ticket.id;
  document.getElementById("drawer-subject").textContent = ticket.subject;
  document.getElementById("drawer-desc").textContent = ticket.description;
  
  // Set priority and status badges
  const badgeContainer = document.getElementById("drawer-badges");
  badgeContainer.innerHTML = `
    <span class="badge badge-priority-${ticket.priority.toLowerCase()}">${ticket.priority}</span>
    <span class="badge badge-status-${ticket.status.toLowerCase()}">${ticket.status}</span>
  `;

  // AI Classification mapping
  document.getElementById("drawer-ai-confidence").textContent = `${ticket.confidenceScore}% Confident`;
  document.getElementById("drawer-ai-category").textContent = ticket.aiClassification.category;
  document.getElementById("drawer-ai-dept").textContent = ticket.aiClassification.suggestedDept;

  // Resolution suggestion body
  document.getElementById("drawer-resolution-text").textContent = ticket.suggestedResolution;

  // Render attachment lists
  const attachmentList = document.getElementById("drawer-attachments-list");
  attachmentList.innerHTML = "";
  if (ticket.attachments.length === 0) {
    attachmentList.innerHTML = `<span style="font-size: 12px; color: var(--text-muted);">No attachments provided.</span>`;
  } else {
    ticket.attachments.forEach(file => {
      const fileTag = document.createElement("span");
      fileTag.style.cssText = "font-size: 11px; padding: 4px 8px; border: 1px solid var(--border-color); border-radius: 4px; background-color: var(--bg-app); cursor: pointer;";
      fileTag.textContent = file;
      fileTag.addEventListener("click", () => {
        showToast("Attachment Download", `Downloading ${file} locally...`, "info");
      });
      attachmentList.appendChild(fileTag);
    });
  }

  // Render history timeline nodes
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

  // Toggle visible drawers
  document.getElementById("ticket-drawer-backdrop").classList.add("active");
}

function closeDetailsDrawer() {
  document.getElementById("ticket-drawer-backdrop").classList.remove("active");
  activeDrawerTicketId = null;
}

// Action Buttons within the Drawer
function handleDrawerResolve() {
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
    
    // Create automated email outbox dispatch
    if (typeof addAutomatedEmail === "function") {
      addAutomatedEmail(ticket);
    }

    showToast("Ticket Resolved", `Ticket ${ticket.id} marked as Resolved successfully.`, "success");
    closeDetailsDrawer();
    renderTicketsTable();
  }
}

function handleDrawerEscalate() {
  if (!activeDrawerTicketId) return;
  const ticket = currentTickets.find(t => t.id === activeDrawerTicketId);
  if (ticket) {
    // Escalate changes priority to Urgent and assigns to Engineering
    ticket.priority = "Urgent";
    ticket.department = "Engineering";
    ticket.timeline.push({
      time: new Date().toISOString(),
      title: "Escalated to Engineering",
      user: "Nova Engine System",
      type: "ai"
    });

    showToast("Ticket Escalated", `Ticket ${ticket.id} was escalated to Engineering support queues.`, "warning");
    closeDetailsDrawer();
    renderTicketsTable();

    // Open Workflow tab for them to see pipeline simulation
    setTimeout(() => {
      const wfNav = document.querySelector('[data-target="workflow"]');
      if (wfNav) wfNav.click();
      if (typeof runWorkflowSimulation === "function") {
        runWorkflowSimulation(ticket);
      }
    }, 1000);
  }
}

function handleDrawerAssign() {
  if (!activeDrawerTicketId) return;
  const ticket = currentTickets.find(t => t.id === activeDrawerTicketId);
  if (ticket) {
    const agents = ["Sarah Connor", "Alex Mercer", "Emma Stone"];
    const randomAgent = agents[Math.floor(Math.random() * agents.length)];
    ticket.assignedAgent = randomAgent;
    ticket.timeline.push({
      time: new Date().toISOString(),
      title: `Assigned to ${randomAgent}`,
      user: "Staff Admin",
      type: "agent"
    });

    showToast("Agent Assigned", `Ticket ${ticket.id} assigned to ${randomAgent}.`, "info");
    closeDetailsDrawer();
    renderTicketsTable();
  }
}

// Modal management for Creating Tickets
function openNewTicketModal() {
  // Clear any existing forms
  document.getElementById("new-ticket-form").reset();
  document.getElementById("ai-prediction-card").style.display = "none";
  document.getElementById("ai-loading-container").style.display = "none";
  aiPredictingState = false;

  document.getElementById("new-ticket-modal-backdrop").classList.add("active");
}

function closeNewTicketModal() {
  document.getElementById("new-ticket-modal-backdrop").classList.remove("active");
}

// Form Submission handling (Predictive AI Phase and Insertion Phase)
function handleNewTicketSubmit(e) {
  e.preventDefault();

  const subject = document.getElementById("tkt-subject").value;
  const description = document.getElementById("tkt-desc").value;
  const dept = document.getElementById("tkt-dept").value;
  const category = document.getElementById("tkt-category").value;
  const priority = document.getElementById("tkt-priority").value;
  const fileInput = document.getElementById("tkt-file");

  if (!aiPredictingState) {
    // Phase 1: Simulate AI Engine parsing text content
    document.getElementById("ai-loading-container").style.display = "flex";
    document.getElementById("btn-modal-submit").disabled = true;

    setTimeout(() => {
      document.getElementById("ai-loading-container").style.display = "none";
      document.getElementById("btn-modal-submit").disabled = false;

      // Predict values based on descriptions/subject content
      let predictedDept = dept;
      let predictedPriority = priority;
      let confidence = Math.floor(Math.random() * 15) + 84; // 84% - 98%

      if (subject.toLowerCase().includes("billing") || subject.toLowerCase().includes("invoice") || subject.toLowerCase().includes("charge")) {
        predictedDept = "Billing";
        predictedPriority = "High";
      } else if (subject.toLowerCase().includes("latency") || subject.toLowerCase().includes("auth") || subject.toLowerCase().includes("crash") || subject.toLowerCase().includes("api")) {
        predictedDept = "Engineering";
        predictedPriority = "Urgent";
      }

      // Populate predictive UI card
      document.getElementById("ai-pred-priority").textContent = predictedPriority;
      document.getElementById("ai-pred-dept").textContent = predictedDept;
      document.getElementById("ai-pred-category").textContent = category;
      document.getElementById("ai-pred-confidence").textContent = `${confidence}% confidence`;

      document.getElementById("ai-prediction-card").style.display = "block";
      
      // Upgrade state to allow final submit next click
      aiPredictingState = true;
      document.getElementById("btn-modal-submit").innerHTML = "Confirm & Insert Ticket";
    }, 1500);

  } else {
    // Phase 2: User confirmed predictions, append item to table
    const predictedDept = document.getElementById("ai-pred-dept").textContent;
    const predictedPriority = document.getElementById("ai-pred-priority").textContent;
    const confidenceVal = parseInt(document.getElementById("ai-pred-confidence").textContent);

    const attachmentsList = [];
    if (fileInput.files.length > 0) {
      attachmentsList.push(fileInput.files[0].name);
    }

    const newId = `TKT-${1024 + currentTickets.length}`;
    const newTkt = {
      id: newId,
      user: { name: "Pranjal Choudhary", email: "pranj@choudhary.com", company: "Local Workspace" },
      department: predictedDept,
      subject: subject,
      category: category,
      priority: predictedPriority,
      severity: predictedPriority === "Urgent" ? "Critical" : (predictedPriority === "High" ? "Major" : "Minor"),
      status: "Open",
      assignedAgent: "Unassigned",
      createdDate: new Date().toISOString(),
      confidenceScore: confidenceVal,
      description: description,
      aiClassification: {
        category: category,
        priority: predictedPriority,
        severity: predictedPriority === "Urgent" ? "Critical" : "Minor",
        confidence: confidenceVal,
        suggestedDept: predictedDept
      },
      suggestedResolution: `Review the log trace patterns for context related to "${subject}". If issues persist, verify routing and whitelisting.`,
      escalationHistory: [],
      timeline: [
        { time: new Date().toISOString(), title: "Ticket Opened", user: "Pranjal Choudhary", type: "system" },
        { time: new Date().toISOString(), title: "Nova AI Classification Run", user: "Diagnosis Agent", type: "ai" }
      ],
      attachments: attachmentsList
    };

    // Prepend to ticket lists
    currentTickets.unshift(newTkt);
    showToast("Ticket Opened", `New ticket ${newId} created successfully.`, "success");
    
    closeNewTicketModal();
    renderTicketsTable();

    // Trigger dynamic sidebar metrics updates in-app
    if (typeof refreshDynamicViewElements === "function") {
      refreshDynamicViewElements();
    }
  }
}

// Export Table contents mock handler
function handleExportCSV() {
  showToast("CSV Export Started", "Formatting tickets dataset. Download will trigger shortly.", "info");
  
  setTimeout(() => {
    showToast("CSV Downloaded", "Tickets directory list saved (5.8 KB).", "success");
  }, 1200);
}

// Helper date utilities
function formatShortDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// Expose functionality globally
window.TicketNovaTickets = {
  init: initTicketsModule,
  render: renderTicketsTable,
  getTickets: () => currentTickets,
  openDrawer: openDetailsDrawer
};
