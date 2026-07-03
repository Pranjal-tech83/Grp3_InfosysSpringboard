// workflow.js - Multi-Agent Workflow simulator controller

let workflowActive = false;

function initWorkflowModule() {
  renderAgentPipeline();

  // Button simulator actions
  document.getElementById("btn-trigger-workflow").addEventListener("click", () => {
    // Pick the first ticket as example context
    const tickets = window.TicketNovaTickets.getTickets();
    const refTicket = tickets.length > 0 ? tickets[0] : null;
    runWorkflowSimulation(refTicket);
  });

  document.getElementById("dash-action-run-wf").addEventListener("click", () => {
    // Navigate to workflow tab
    const wfNav = document.querySelector('[data-target="workflow"]');
    if (wfNav) wfNav.click();
    setTimeout(() => {
      const tickets = window.TicketNovaTickets.getTickets();
      const refTicket = tickets.length > 0 ? tickets[0] : null;
      runWorkflowSimulation(refTicket);
    }, 500);
  });
}

function renderAgentPipeline() {
  const container = document.getElementById("workflow-pipeline-container");
  container.innerHTML = "";

  const steps = window.TicketNovaData.agentSteps;

  steps.forEach((step, idx) => {
    const card = document.createElement("div");
    card.className = "agent-card";
    card.id = `agent-card-${step.id}`;
    
    // Add connector arrow if not last item
    let arrowHtml = "";
    if (idx < steps.length - 1) {
      arrowHtml = `
        <div class="pipeline-connector" style="display: block;">
          <svg viewBox="0 0 24 24" width="24" height="24"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="agent-header">
        <span class="agent-name">${step.name}</span>
        <span class="agent-badge agent-badge-pending" id="agent-badge-${step.id}">Pending</span>
      </div>
      <p style="font-size: 11px; color: var(--text-muted); line-height: 1.4;">${step.description}</p>
      
      <div class="agent-progress-wrapper">
        <div class="agent-progress-bar" id="agent-progress-${step.id}"></div>
      </div>

      <div style="font-size: 11px; display: flex; justify-content: space-between;">
        <span style="color: var(--text-muted);">Latency:</span>
        <span style="font-weight: 700;" id="agent-time-${step.id}">--</span>
      </div>

      <div class="agent-logs-panel" id="agent-logs-${step.id}">
        Waiting...
      </div>
      ${arrowHtml}
    `;

    container.appendChild(card);
  });
}

async function runWorkflowSimulation(ticket = null) {
  if (workflowActive) return;
  workflowActive = true;

  const btn = document.getElementById("btn-trigger-workflow");
  btn.disabled = true;
  btn.innerHTML = `<span>Simulation Running...</span>`;

  // Clean overall logs and individual panels
  const overallLogs = document.getElementById("workflow-overall-logs");
  overallLogs.textContent = "";
  appendOverallLog("Initializing Multi-Agent Resolution pipeline...");
  
  if (ticket) {
    appendOverallLog(`Loaded context ticket: ${ticket.id} - "${ticket.subject}"`);
  }

  const steps = window.TicketNovaData.agentSteps;

  // Reset agent visual states
  steps.forEach(step => {
    const card = document.getElementById(`agent-card-${step.id}`);
    card.classList.remove("agent-active", "agent-completed");
    
    const badge = document.getElementById(`agent-badge-${step.id}`);
    badge.textContent = "Pending";
    badge.className = "agent-badge agent-badge-pending";

    document.getElementById(`agent-progress-${step.id}`).style.width = "0%";
    document.getElementById(`agent-time-${step.id}`).textContent = "--";
    document.getElementById(`agent-logs-${step.id}`).textContent = "Idle";
  });

  // Run sequential loops
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    await simulateAgentStep(step, ticket);
  }

  // End of simulation
  workflowActive = false;
  btn.disabled = false;
  btn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 3l14 9-14 9V3z" fill="currentColor"/></svg><span>Simulate Ticket Flow</span>`;
  
  appendOverallLog("Multi-Agent Simulation completed successfully. Resolution generated.");
  showToast("Simulation Completed", "All AI Agent nodes executed successfully.", "success");
}

function simulateAgentStep(agent, ticket) {
  return new Promise((resolve) => {
    const card = document.getElementById(`agent-card-${agent.id}`);
    const badge = document.getElementById(`agent-badge-${agent.id}`);
    const progress = document.getElementById(`agent-progress-${agent.id}`);
    const logBox = document.getElementById(`agent-logs-${agent.id}`);
    const timeLabel = document.getElementById(`agent-time-${agent.id}`);

    card.classList.add("agent-active");
    badge.textContent = "Active";
    badge.className = "agent-badge agent-badge-active";
    logBox.textContent = "";

    appendOverallLog(`Activating agent: ${agent.name}...`);

    let progressVal = 0;
    let logIdx = 0;
    
    // Fetch logs data (customize logs dynamically based on context ticket if available)
    let logLines = [...agent.logs];
    if (ticket && agent.id === "diagnose") {
      logLines[1] = `Parsing description context for anomalies: "${ticket.category}"`;
      logLines[2] = `Classification parameters configured. Priority: ${ticket.priority}`;
    }

    const intervalTime = 30; // speed of progress bar
    const totalDuration = 1200; // ms
    const increment = (100 / (totalDuration / intervalTime));

    const logIntervalStep = Math.floor((totalDuration / logLines.length) / intervalTime);
    let stepCount = 0;

    const timer = setInterval(() => {
      stepCount++;
      progressVal += increment;
      progress.style.width = `${Math.min(progressVal, 100)}%`;

      if (stepCount % logIntervalStep === 0 && logIdx < logLines.length) {
        const p = document.createElement("div");
        p.style.marginBottom = "4px";
        p.textContent = `> ${logLines[logIdx]}`;
        logBox.appendChild(p);
        logBox.scrollTop = logBox.scrollHeight;
        logIdx++;
      }

      if (progressVal >= 100) {
        clearInterval(timer);
        
        // Finalize state
        card.classList.remove("agent-active");
        card.classList.add("agent-completed");
        
        badge.textContent = "Completed";
        badge.className = "agent-badge agent-badge-completed";
        
        timeLabel.textContent = agent.executionTime;
        appendOverallLog(`Agent ${agent.name} finished diagnostics. Status: Success. Duration: ${agent.executionTime}`);
        
        resolve();
      }
    }, intervalTime);
  });
}

function appendOverallLog(message) {
  const overallLogs = document.getElementById("workflow-overall-logs");
  const time = new Date().toLocaleTimeString();
  overallLogs.textContent += `[${time}] ${message}\n`;
  overallLogs.scrollTop = overallLogs.scrollHeight;
}

// Expose simulation capability
window.TicketNovaWorkflow = {
  init: initWorkflowModule,
  simulate: runWorkflowSimulation
};
