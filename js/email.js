// email.js - Email Automation Page View Controller

let currentEmails = [];

function initEmailModule() {
  currentEmails = [...window.SupportPilotData.mockEmails];
  
  renderEmailInboxList();

  // Load first email by default
  if (currentEmails.length > 0) {
    loadEmailDetails(currentEmails[0].id);
  }
}

function renderEmailInboxList() {
  const container = document.getElementById("email-list-container");
  if (!container) return;

  container.innerHTML = "";

  if (currentEmails.length === 0) {
    container.innerHTML = `<div class="empty-state"><h3>No emails in outbox</h3></div>`;
    return;
  }

  currentEmails.forEach(email => {
    const card = document.createElement("div");
    card.className = "email-item-card";
    card.id = `email-card-${email.id}`;

    // Get status color
    let statusDot = "";
    if (email.status === "Delivered") statusDot = "#10b981";
    else if (email.status === "Pending") statusDot = "#f59e0b";
    else statusDot = "#ef4444";

    card.innerHTML = `
      <div class="email-header-top">
        <span class="email-sender">${email.sender}</span>
        <span style="display: flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; color: ${statusDot}">
          <span style="width: 6px; height: 6px; border-radius: 50%; background-color: ${statusDot};"></span>
          ${email.status}
        </span>
      </div>
      <div class="email-subject">${email.subject}</div>
      <div class="email-preview-text">${email.preview}</div>
    `;

    card.addEventListener("click", () => loadEmailDetails(email.id));
    container.appendChild(card);
  });
}

function loadEmailDetails(emailId) {
  const email = currentEmails.find(e => e.id === emailId);
  if (!email) return;

  // Toggle active highlights in inbox
  document.querySelectorAll(".email-item-card").forEach(el => el.classList.remove("active"));
  const activeCard = document.getElementById(`email-card-${emailId}`);
  if (activeCard) activeCard.classList.add("active");

  document.getElementById("email-detail-empty").style.display = "none";
  document.getElementById("email-detail-content").style.display = "block";

  // Fill content
  document.getElementById("email-view-subject").textContent = email.subject;
  document.getElementById("email-view-from").textContent = email.recipient;
  document.getElementById("email-view-to").textContent = email.sender;
  document.getElementById("email-view-body").textContent = email.preview;

  // Render delivery timeline
  const timelineContainer = document.getElementById("email-delivery-timeline");
  timelineContainer.innerHTML = "";

  email.history.forEach(log => {
    const node = document.createElement("div");
    node.className = `delivery-node ${email.status.toLowerCase()}`;
    node.innerHTML = `
      <div style="font-size: 11px; color: var(--text-muted);">${formatEmailTime(log.date)}</div>
      <div style="font-size: 13px; font-weight: 600; margin-bottom: 2px;">${log.status}</div>
      <p style="font-size: 12px; color: var(--text-secondary);">${log.details}</p>
    `;
    timelineContainer.appendChild(node);
  });
}

// Function triggered when ticket is resolved, automatically dispatching an outbox email notification
function addAutomatedEmail(ticket) {
  const newEmail = {
    id: `EML-${100 + currentEmails.length + 1}`,
    recipient: "support@supportpilot.ai",
    sender: ticket.user.email,
    subject: `RESOLVED: [${ticket.id}] ${ticket.subject}`,
    preview: `Dear Customer, our AI Engine has resolved your support ticket request.\n\nProposed Action Steps:\n${ticket.suggestedResolution}\n\nAssigned Agent: ${ticket.assignedAgent || 'Nova AI System'}.\nSupportPilot Resolution Platform.`,
    status: "Delivered",
    history: [
      { date: new Date().toISOString(), status: "Received", details: "Ticket resolution registered in core system." },
      { date: new Date().toISOString(), status: "Sent", details: "Outbound resolution summary email dispatched." },
      { date: new Date().toISOString(), status: "Delivered", details: "Handshake verify: Email delivered successfully to customer server." }
    ]
  };

  currentEmails.unshift(newEmail);
  
  // Re-render
  if (document.getElementById("email-view").classList.contains("active-view")) {
    renderEmailInboxList();
    loadEmailDetails(newEmail.id);
  }
}

function formatEmailTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// Expose model globally
window.SupportPilotEmail = {
  init: initEmailModule,
  addEmail: addAutomatedEmail,
  refreshInbox: renderEmailInboxList
};
