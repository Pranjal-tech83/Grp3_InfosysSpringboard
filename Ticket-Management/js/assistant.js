// assistant.js - AI Assistant Page View Controller

function initAssistantModule() {
  const ticketSelect = document.getElementById("assistant-ticket-select");
  if (!ticketSelect) return;

  // Populate selection list from current tickets
  populateAssistantTicketDropdown();

  // Handle dropdown change event
  ticketSelect.addEventListener("change", (e) => {
    loadAssistantTicketData(e.target.value);
  });

  // Action Buttons
  document.getElementById("btn-assist-copy").addEventListener("click", copyAssistantResolution);
  document.getElementById("btn-assist-regenerate").addEventListener("click", regenerateAssistantResolution);

  // Load first ticket by default
  const tickets = window.TicketNovaTickets.getTickets();
  if (tickets.length > 0) {
    loadAssistantTicketData(tickets[0].id);
  }

  // Handle sidebar target clicks to refresh list
  document.getElementById("dash-action-assistant").addEventListener("click", () => {
    populateAssistantTicketDropdown();
    const tickets = window.TicketNovaTickets.getTickets();
    if (tickets.length > 0) {
      loadAssistantTicketData(tickets[0].id);
    }
  });
}

function populateAssistantTicketDropdown() {
  const ticketSelect = document.getElementById("assistant-ticket-select");
  ticketSelect.innerHTML = "";

  const tickets = window.TicketNovaTickets.getTickets();
  if (tickets.length === 0) {
    ticketSelect.innerHTML = `<option value="">No Active Tickets Available</option>`;
    return;
  }

  tickets.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = `${t.id} - ${t.subject} (${t.status})`;
    ticketSelect.appendChild(opt);
  });
}

function loadAssistantTicketData(ticketId) {
  const tickets = window.TicketNovaTickets.getTickets();
  const ticket = tickets.find(t => t.id === ticketId);
  if (!ticket) return;

  // Populate Details
  document.getElementById("assist-confidence").textContent = `${ticket.confidenceScore}%`;
  
  const escalationLabel = document.getElementById("assist-escalation");
  if (ticket.priority === "Urgent" || ticket.priority === "High") {
    escalationLabel.textContent = "High Risk";
    escalationLabel.style.color = "#ef4444";
  } else {
    escalationLabel.textContent = "Low Risk";
    escalationLabel.style.color = "#10b981";
  }

  document.getElementById("assist-diagnosis-summary").innerHTML = `
    <strong>Identified Category:</strong> ${ticket.aiClassification.category}<br>
    <strong>Core Anomaly Detected:</strong> "${ticket.subject}"<br>
    <strong>Analysis Context:</strong> The description reveals anomalies in ${ticket.category}. Primary severity is marked as ${ticket.severity}.
  `;

  document.getElementById("assist-resolution-body").textContent = ticket.suggestedResolution;

  // Render Troubleshoot Checklist
  const troubleshootContainer = document.getElementById("assist-troubleshoot-list");
  troubleshootContainer.innerHTML = "";

  // Split resolution suggestions into list items
  const steps = [
    `Locate reference indicators for category "${ticket.category}"`,
    `Trace logs to identify primary fault points`,
    `Deploy recommended fix: "${ticket.suggestedResolution.slice(0, 50)}..."`,
    `Test communication lines and verify response payload`,
    `Close support ticket TKT-${ticket.id.slice(-4)}`
  ];

  steps.forEach((stepText, idx) => {
    const li = document.createElement("li");
    li.style.cssText = "display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-secondary);";
    li.innerHTML = `
      <input type="checkbox" id="chk-step-${idx}" style="cursor: pointer; width: 16px; height: 16px;">
      <label for="chk-step-${idx}" style="cursor: pointer; user-select: none;">${stepText}</label>
    `;
    troubleshootContainer.appendChild(li);
  });
}

function copyAssistantResolution() {
  const content = document.getElementById("assist-resolution-body").textContent;
  navigator.clipboard.writeText(content).then(() => {
    showToast("Copied to Clipboard", "AI resolution guidelines copied successfully.", "success");
  }).catch(() => {
    showToast("Copy Failed", "Failed to access clipboard. Copy text manually.", "error");
  });
}

function regenerateAssistantResolution() {
  const ticketSelect = document.getElementById("assistant-ticket-select");
  const ticketId = ticketSelect.value;
  if (!ticketId) return;

  const contentBox = document.getElementById("assist-resolution-body");
  contentBox.style.opacity = "0.5";
  showToast("Regenerating Response", "Querying vector indices for context...", "info");

  setTimeout(() => {
    contentBox.style.opacity = "1";
    const baseText = contentBox.textContent;
    contentBox.textContent = `[REGENERATED CORE GUIDANCE - ${new Date().toLocaleTimeString()}]\n\n${baseText}\n\nAdditional Checkpoints:\n1. Audit infrastructure routing configurations.\n2. Confirm security firewall assertions are signed properly.`;
    showToast("Regeneration Completed", "Response updated with deep-scan credentials context.", "success");
  }, 1200);
}

// Expose model globally
window.TicketNovaAssistant = {
  init: initAssistantModule,
  populateDropdown: populateAssistantTicketDropdown,
  loadTicket: loadAssistantTicketData
};
