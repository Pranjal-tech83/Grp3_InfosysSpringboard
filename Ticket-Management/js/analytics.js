// analytics.js - Platform Analytics, CSS Chart Builders

function initAnalyticsModule() {
  // Setup Report Selectors
  const wBtn = document.getElementById("btn-report-weekly");
  const mBtn = document.getElementById("btn-report-monthly");

  if (wBtn && mBtn) {
    wBtn.addEventListener("click", () => {
      wBtn.classList.add("active");
      mBtn.classList.remove("active");
      renderDailyVolumeChart("weekly");
    });

    mBtn.addEventListener("click", () => {
      mBtn.classList.add("active");
      wBtn.classList.remove("active");
      renderDailyVolumeChart("monthly");
    });
  }

  // Load Initial Analytics
  refreshAnalyticsData();
}

function refreshAnalyticsData() {
  const tickets = window.SupportPilotTickets.getTickets();
  
  // 1. Calculate KPI Values
  const total = tickets.length;
  const open = tickets.filter(t => t.status === "Open").length;
  const pending = tickets.filter(t => t.status === "Pending").length;
  const resolved = tickets.filter(t => t.status === "Resolved").length;
  
  // Calculate AI resolution metrics
  const highConfidenceCount = tickets.filter(t => t.confidenceScore > 90).length;
  const aiRate = total > 0 ? ((highConfidenceCount / total) * 100).toFixed(1) : "85.0";

  // Update DOM Elements on Dashboard view
  document.getElementById("kpi-total").textContent = total.toLocaleString();
  document.getElementById("kpi-open").textContent = open;
  document.getElementById("kpi-resolved").textContent = resolved;
  document.getElementById("kpi-ai-rate").textContent = `${aiRate}%`;

  // 2. Render Charts
  renderDailyVolumeChart("weekly");
  renderSLADonutChart(resolved, total);
}

function renderDailyVolumeChart(mode) {
  const container = document.getElementById("analytics-chart-vol");
  if (!container) return;

  container.innerHTML = "";

  const datasets = {
    weekly: [
      { label: "Mon", val: 32 },
      { label: "Tue", val: 48 },
      { label: "Wed", val: 56 },
      { label: "Thu", val: 40 },
      { label: "Fri", val: 62 },
      { label: "Sat", val: 25 },
      { label: "Sun", val: 18 }
    ],
    monthly: [
      { label: "Jan", val: 120 },
      { label: "Feb", val: 150 },
      { label: "Mar", val: 180 },
      { label: "Apr", val: 140 },
      { label: "May", val: 210 },
      { label: "Jun", val: 240 },
      { label: "Jul", val: 280 },
      { label: "Aug", val: 260 },
      { label: "Sep", val: 220 },
      { label: "Oct", val: 200 },
      { label: "Nov", val: 190 },
      { label: "Dec", val: 225 }
    ]
  };

  const currentSet = datasets[mode];
  const maxVal = Math.max(...currentSet.map(d => d.val));

  currentSet.forEach(d => {
    const col = document.createElement("div");
    col.className = "bar-column";

    const percentageHeight = (d.val / maxVal) * 80; // normalize height max 80%

    col.innerHTML = `
      <div class="bar-fill" style="height: ${percentageHeight}%;" data-value="${d.val}"></div>
      <span class="bar-label" style="font-size: 10px;">${d.label}</span>
    `;

    container.appendChild(col);
  });
}

function renderSLADonutChart(resolved, total) {
  const ring = document.getElementById("analytics-sla-ring");
  const percentText = document.getElementById("sla-percentage-text");
  if (!ring || !percentText) return;

  // Simulate SLA conformed rating based on current resolved ratio
  const ratio = total > 0 ? (resolved / total) : 0.95;
  const percent = Math.min(Math.round(ratio * 100), 100);

  percentText.textContent = `${percent}%`;
  
  // Set conic-gradient degree allocations
  ring.style.background = `conic-gradient(
    var(--accent-primary) 0% ${percent}%,
    var(--border-color) ${percent}% 100%
  )`;
}

// Expose model globally
window.SupportPilotAnalytics = {
  init: initAnalyticsModule,
  refresh: refreshAnalyticsData
};
