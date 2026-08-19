// email.js - Email Automation Page View Controller

let currentEmails = [];

/**
 * Initializes the Email module by attempting to fetch real email logs
 * from the FastAPI backend. Falls back gracefully to mock data if offline.
 */
async function initEmailModule() {
  try {
    const baseUrl = window.API_BASE_URL || "https://grp3-infosysspringboard.onrender.com";
    const response = await fetch(`${baseUrl}/api/email/logs`);
    if (response.ok) {
      const liveEmails = await response.json();
      if (liveEmails && liveEmails.length > 0) {
        // Map backend log schema to expected UI format
        currentEmails = liveEmails.map((email, idx) => ({
          id: email.id || `EML-${100 + idx}`,
          sender: email.from || email.sender || "SupportPilot Engine",
          recipient: email.to || email.recipient || "user@example.com",
          subject: email.subject || "Automated Notification",
          preview: email.body || email.preview || "",
          status: email.status || "Delivered",
          history: email.history || [
            {
              date: email.created_at || new Date().toISOString(),
              status: "Dispatched",
              details: "Automated trigger execution via LangGraph Orchestrator.",
            },
            {
              date: email.delivered_at || new Date().toISOString(),
              status: "Delivered",
              details: "Handshake verify: Delivered successfully to target inbox.",
            },
          ],
        }));
      } else {
        currentEmails = [...(window.SupportPilotData?.mockEmails || [])];
      }
    } else {
      currentEmails = [...(window.SupportPilotData?.mockEmails || [])];
    }
  } catch (error) {
    console.warn("Backend API offline or unreachable, falling back to mock data:", error);
    currentEmails = [...(window.SupportPilotData?.mockEmails || [])];
  }

  // Render the inbox list pane
  renderEmailInboxList();

  // Automatically load and display the first email in the details panel
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

  currentEmails.forEach((email) => {
    const card = document.createElement("div");
    card.className = "email-item-card";
    card.id = `email-card-${email.id}`;

    // Get status indicator color
    let statusDot = "#10b981"; // Default green for Delivered
    if (email.status === "Pending") statusDot = "#f59e0b";
    else if (email.status === "Failed") statusDot = "#ef4444";

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
  const email = currentEmails.find((e) => e.id === emailId);
  if (!email) return;

  // Toggle active CSS highlights in inbox list
  document.querySelectorAll(".email-item-card").forEach((el) => el.classList.remove("active"));
  const activeCard = document.getElementById(`email-card-${emailId}`);
  if (activeCard) activeCard.classList.add("active");

  const emptyState = document.getElementById("email-detail-empty");
  const detailContent = document.getElementById("email-detail-content");

  if (emptyState) emptyState.style.display = "none";
  if (detailContent) detailContent.style.display = "block";

  // Fill content fields
  const subjectEl = document.getElementById("email-view-subject");
  const fromEl = document.getElementById("email-view-from");
  const toEl = document.getElementById("email-view-to");
  const bodyEl = document.getElementById("email-view-body");

  if (subjectEl) subjectEl.textContent = email.subject;
  if (fromEl) fromEl.textContent = email.recipient;
  if (toEl) toEl.textContent = email.sender;
  if (bodyEl) bodyEl.textContent = email.preview;

  // Render delivery history timeline
  const timelineContainer = document.getElementById("email-delivery-timeline");
  if (timelineContainer) {
    timelineContainer.innerHTML = "";
    email.history.forEach((log) => {
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
}

/**
 * Triggered dynamically when a ticket is resolved or escalated,
 * pushing an automated outbox item into memory and re-rendering.
 */
function addAutomatedEmail(ticket) {
  const newEmail = {
    id: `EML-${100 + currentEmails.length + 1}`,
    recipient: ticket.user?.email || "user@example.com",
    sender: "support@supportpilot.ai",
    subject: `RESOLVED: [${ticket.id}] ${ticket.subject}`,
    preview: `Dear Customer, our AI Engine has processed your support ticket request.\n\nProposed Steps:\n${ticket.suggestedResolution}\n\nAssigned Agent: ${ticket.assignedAgent || 'Nova AI System'}.`,
    status: "Delivered",
    history: [
      { date: new Date().toISOString(), status: "Received", details: "Ticket status registered in core engine." },
      { date: new Date().toISOString(), status: "Sent", details: "Outbound email summary dispatched." },
      { date: new Date().toISOString(), status: "Delivered", details: "Handshake verify: Email delivered successfully." }
    ]
  };

  currentEmails.unshift(newEmail);

  // Re-render view if currently active
  const emailView = document.getElementById("email-view");
  if (emailView && emailView.classList.contains("active-view")) {
    renderEmailInboxList();
    loadEmailDetails(newEmail.id);
  }
}

function formatEmailTime(isoString) {
  try {
    const d = new Date(isoString);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch (e) {
    return isoString;
  }
}

// Expose module functions globally
window.SupportPilotEmail = {
  init: initEmailModule,
  addEmail: addAutomatedEmail,
  refreshInbox: renderEmailInboxList,
};
