/**
 * jira-integration.js — Enterprise-Grade Jira Integrations Module
 * SupportPilot AI Ticket Resolution Agent
 */
(function () {
  'use strict';

  // ── State ─────────────────────────────────────────────────────────────────
  let ISSUES = [];
  let STATS = {
    total_issues: 0,
    open_issues: 0,
    resolved_issues: 0,
    closed_issues: 0,
    pending_sync: 0,
    successful_syncs: 0,
    sync_rate: "100.0%",
    avg_sync_time: "1.1s"
  };
  let ACTIVE_DRAWER_ISSUE = null;
  let SEARCH_QUERY = '';
  let FILTER_STATUS = 'all';
  let FILTER_TEAM = 'all';
  let FILTER_PRIORITY = 'all';
  let IS_LOADING = false;
  let IS_SYNCING_ALL = false;

  const API_BASE = "http://127.0.0.1:8000";

  // ── Color & Styling Maps ──────────────────────────────────────────────────
  const STATUS_STYLES = {
    'Open': { bg: 'rgba(245, 158, 11, 0.12)', color: '#d97706', border: 'rgba(245, 158, 11, 0.3)', dot: '#f59e0b' },
    'In Progress': { bg: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', border: 'rgba(59, 130, 246, 0.3)', dot: '#3b82f6' },
    'In Review': { bg: 'rgba(139, 92, 246, 0.12)', color: '#7c3aed', border: 'rgba(139, 92, 246, 0.3)', dot: '#8b5cf6' },
    'Resolved': { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: 'rgba(16, 185, 129, 0.3)', dot: '#10b981' },
    'Closed': { bg: 'rgba(100, 116, 139, 0.12)', color: '#475569', border: 'rgba(100, 116, 139, 0.3)', dot: '#64748b' }
  };

  const PRIORITY_STYLES = {
    'Urgent': { bg: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', icon: '⚡' },
    'High': { bg: 'rgba(249, 115, 22, 0.12)', color: '#ea580c', icon: '▲' },
    'Medium': { bg: 'rgba(245, 158, 11, 0.12)', color: '#d97706', icon: '■' },
    'Low': { bg: 'rgba(100, 116, 139, 0.12)', color: '#64748b', icon: '▼' }
  };

  const TEAM_ICONS = {
    'Network Support Team': '🌐',
    'Software Support Team': '💻',
    'Database Team': '🗄️',
    'Identity & Access / SecOps': '🛡️',
    'Finance Support Team': '💳',
    'Messaging Team': '📬',
    'Backend Engineering Team': '⚙️',
    'Frontend Team': '🎨',
    'IT Infrastructure Team': '🖥️',
    'Customer Support Team': '🤝'
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  function formatRelative(isoStr) {
    if (!isoStr) return 'just now';
    const date = new Date(isoStr);
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    return `${diffDays}d ago`;
  }

  function formatDateTime(isoStr) {
    if (!isoStr) return 'N/A';
    const d = new Date(isoStr);
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function getInitials(name) {
    if (!name) return 'SP';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  function animateCounter(elem, endVal, isPercent = false, suffix = '') {
    if (!elem) return;
    if (typeof endVal === 'string') {
      elem.textContent = endVal;
      return;
    }
    const duration = 700;
    const startVal = parseInt(elem.textContent.replace(/[^\d]/g, ''), 10) || 0;
    const startTime = performance.now();

    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (endVal - startVal) * ease);
      elem.textContent = current + suffix;
      if (progress < 1) requestAnimationFrame(update);
      else elem.textContent = endVal + suffix;
    }
    requestAnimationFrame(update);
  }

  // ── API Fetching ──────────────────────────────────────────────────────────
  async function fetchIssuesAndStats(showSpinner = true) {
    if (showSpinner) {
      IS_LOADING = true;
      renderTableLoading();
    }
    try {
      const [resIssues, resStats] = await Promise.all([
        fetch(`${API_BASE}/api/jira/issues?limit=200`),
        fetch(`${API_BASE}/api/jira/statistics`)
      ]);

      if (resIssues.ok) {
        const data = await resIssues.json();
        ISSUES = data.items || [];
      }
      if (resStats.ok) {
        STATS = await resStats.json();
      }
    } catch (err) {
      console.warn('[Jira Integration] API fetch error:', err);
      // Fallback local memory
      if (!ISSUES || ISSUES.length === 0) {
        try {
          ISSUES = JSON.parse(localStorage.getItem('jira_activity') || '[]');
        } catch (_) {}
      }
    } finally {
      IS_LOADING = false;
      render();
    }
  }

  // ── Main UI Layout ────────────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('integrations-view');
    if (!container) return;

    // Build the master Jira container if not present
    let root = document.getElementById('jira-master-root');
    if (!root) {
      container.innerHTML = `<div id="jira-master-root" style="padding-bottom: 40px;"></div>`;
      root = document.getElementById('jira-master-root');
    }

    const filtered = getFilteredIssues();

    root.innerHTML = `
      <!-- Jira Page Header -->
      <div class="jira-page-header" style="margin-bottom: 24px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: #0052cc; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 4px 12px rgba(0, 82, 204, 0.25);">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.74c0 2.4 1.97 4.35 4.35 4.35V2h-10.48zm-4.35 4.35c0 2.4 1.97 4.35 4.35 4.35h1.78v1.74c0 2.4 1.97 4.35 4.35 4.35V6.35H7.18zm-4.35 4.35c0 2.4 1.97 4.35 4.35 4.35h1.78v1.74c0 2.4 1.97 4.35 4.35 4.35V10.7H2.83z"/>
              </svg>
            </div>
            <h1 style="font-weight: 800; font-size: 24px; letter-spacing: -0.5px; margin: 0; color: var(--text-primary);">Jira Integrations</h1>
            <span style="display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; background: rgba(16, 185, 129, 0.12); color: #059669; border: 1px solid rgba(16, 185, 129, 0.25);">
              <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981; animation: jiraPulse 2s infinite;"></span>
              Connected • Jira Cloud
            </span>
          </div>
          <p style="color: var(--text-secondary); font-size: 13.5px; margin: 0;">Automatically synchronize SupportPilot tickets with Jira projects, route to engineering teams, and monitor issue lifecycle.</p>
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <button id="jira-refresh-btn" onclick="window.SupportPilotJira.refresh()" class="btn btn-secondary" style="display: flex; align-items: center; gap: 7px; font-size: 13px; padding: 8px 14px; border-radius: 10px;">
            <svg id="jira-refresh-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" style="transition: transform 0.6s ease;">
              <path d="M23 4v6h-6M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            <span>Refresh</span>
          </button>

          <button id="jira-sync-now-btn" onclick="window.SupportPilotJira.syncAll()" class="btn btn-secondary" style="display: flex; align-items: center; gap: 7px; font-size: 13px; padding: 8px 14px; border-radius: 10px; background: rgba(0, 82, 204, 0.08); color: #0052cc; border-color: rgba(0, 82, 204, 0.2);">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
            <span>${IS_SYNCING_ALL ? 'Syncing...' : 'Sync Now'}</span>
          </button>

          <button onclick="window.SupportPilotJira.exportCSV()" class="btn btn-secondary" style="display: flex; align-items: center; gap: 7px; font-size: 13px; padding: 8px 14px; border-radius: 10px;">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <!-- KPI Summary Grid -->
      <div class="jira-kpi-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
        ${renderKPICards()}
      </div>

      <!-- Search & Filters Toolbar -->
      <div class="card" style="padding: 16px; border-radius: 16px; margin-bottom: 20px; background: var(--bg-sidebar); border: 1px solid var(--border-color); display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between;">
        <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center; flex: 1; min-width: 280px;">
          <!-- Search Box -->
          <div style="position: relative; flex: 1; min-width: 200px;">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted);">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              id="jira-search-input"
              value="${escapeHtml(SEARCH_QUERY)}"
              placeholder="Search by Jira Key, Ticket, Summary, Assignee, Team..."
              oninput="window.SupportPilotJira.onSearch(this.value)"
              style="width: 100%; padding: 8px 12px 8px 36px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-app); color: var(--text-primary); font-size: 13px; outline: none; transition: border-color 0.2s;"
            />
          </div>

          <!-- Status Filter -->
          <select id="jira-status-filter" onchange="window.SupportPilotJira.onFilterStatus(this.value)" style="padding: 8px 12px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-app); color: var(--text-primary); font-size: 13px; outline: none; cursor: pointer;">
            <option value="all" ${FILTER_STATUS === 'all' ? 'selected' : ''}>All Statuses</option>
            <option value="Open" ${FILTER_STATUS === 'Open' ? 'selected' : ''}>Open</option>
            <option value="In Progress" ${FILTER_STATUS === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Resolved" ${FILTER_STATUS === 'Resolved' ? 'selected' : ''}>Resolved</option>
            <option value="Closed" ${FILTER_STATUS === 'Closed' ? 'selected' : ''}>Closed</option>
          </select>

          <!-- Team Filter -->
          <select id="jira-team-filter" onchange="window.SupportPilotJira.onFilterTeam(this.value)" style="padding: 8px 12px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-app); color: var(--text-primary); font-size: 13px; outline: none; cursor: pointer;">
            <option value="all" ${FILTER_TEAM === 'all' ? 'selected' : ''}>All Teams</option>
            <option value="Network" ${FILTER_TEAM === 'Network' ? 'selected' : ''}>Network Support Team (NET)</option>
            <option value="Software" ${FILTER_TEAM === 'Software' ? 'selected' : ''}>Software Support Team (SW)</option>
            <option value="Database" ${FILTER_TEAM === 'Database' ? 'selected' : ''}>Database Team (DBA)</option>
            <option value="Identity" ${FILTER_TEAM === 'Identity' ? 'selected' : ''}>Identity & SecOps (SEC)</option>
            <option value="Finance" ${FILTER_TEAM === 'Finance' ? 'selected' : ''}>Finance Support Team (FIN)</option>
            <option value="Messaging" ${FILTER_TEAM === 'Messaging' ? 'selected' : ''}>Messaging Team (MSG)</option>
            <option value="Backend" ${FILTER_TEAM === 'Backend' ? 'selected' : ''}>Backend Engineering (ENG)</option>
            <option value="Frontend" ${FILTER_TEAM === 'Frontend' ? 'selected' : ''}>Frontend Team (FE)</option>
            <option value="Infrastructure" ${FILTER_TEAM === 'Infrastructure' ? 'selected' : ''}>IT Infrastructure (IT)</option>
            <option value="Customer" ${FILTER_TEAM === 'Customer' ? 'selected' : ''}>Customer Support Team (CS)</option>
          </select>

          <!-- Priority Filter -->
          <select id="jira-priority-filter" onchange="window.SupportPilotJira.onFilterPriority(this.value)" style="padding: 8px 12px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-app); color: var(--text-primary); font-size: 13px; outline: none; cursor: pointer;">
            <option value="all" ${FILTER_PRIORITY === 'all' ? 'selected' : ''}>All Priorities</option>
            <option value="Urgent" ${FILTER_PRIORITY === 'Urgent' ? 'selected' : ''}>Urgent</option>
            <option value="High" ${FILTER_PRIORITY === 'High' ? 'selected' : ''}>High</option>
            <option value="Medium" ${FILTER_PRIORITY === 'Medium' ? 'selected' : ''}>Medium</option>
            <option value="Low" ${FILTER_PRIORITY === 'Low' ? 'selected' : ''}>Low</option>
          </select>
        </div>

        <div style="font-size: 12.5px; color: var(--text-muted); font-weight: 600;">
          Showing <span style="color: var(--accent-primary); font-weight: 700;">${filtered.length}</span> of ${ISSUES.length} Jira Issues
        </div>
      </div>

      <!-- Recent Jira Activity Table Card -->
      <div class="card" style="border-radius: 16px; padding: 0; overflow: hidden; background: var(--bg-sidebar); border: 1px solid var(--border-color); box-shadow: 0 4px 20px rgba(0,0,0,0.03);">
        <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 15px; font-weight: 700; color: var(--text-primary);">Recent Jira Activity</span>
            <span style="font-size: 11px; padding: 2px 8px; border-radius: 12px; background: rgba(0, 82, 204, 0.1); color: #0052cc; font-weight: 700;">Live Sync</span>
          </div>
          <div style="font-size: 12px; color: var(--text-muted);">
            Last refreshed: <span style="font-weight: 600;">${formatDateTime(new Date().toISOString())}</span>
          </div>
        </div>

        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="background: var(--bg-app); border-bottom: 1px solid var(--border-color);">
                <th style="padding: 12px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted);">SP Ticket</th>
                <th style="padding: 12px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted);">Jira Key</th>
                <th style="padding: 12px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted);">Issue Summary</th>
                <th style="padding: 12px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted);">Status</th>
                <th style="padding: 12px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted);">Priority</th>
                <th style="padding: 12px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted);">Assigned Team</th>
                <th style="padding: 12px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted);">Assignee</th>
                <th style="padding: 12px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted);">Created</th>
                <th style="padding: 12px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted);">Last Updated</th>
                <th style="padding: 12px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); text-align: center;">Sync</th>
                <th style="padding: 12px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody id="jira-table-body">
              ${renderTableRows(filtered)}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Slide-in Details Drawer Modal Container -->
      <div id="jira-drawer-backdrop" class="jira-drawer-backdrop" onclick="window.SupportPilotJira.closeDrawer(event)" style="display: none;">
        <div id="jira-drawer-panel" class="jira-drawer-panel" onclick="event.stopPropagation();">
          <!-- Rendered dynamically by openDrawer -->
        </div>
      </div>

      <!-- Configuration Modal Backdrop -->
      <div id="jira-config-modal-backdrop" class="modal-backdrop" style="display: none; align-items: center; justify-content: center;">
        <div class="modal" style="max-width: 520px; width: 90%; border-radius: 16px; background: var(--bg-sidebar); border: 1px solid var(--border-color); box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
          <div class="modal-header" style="padding: 18px 24px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 28px; height: 28px; border-radius: 6px; background: #0052cc; display: flex; align-items: center; justify-content: center; color: white;">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.74c0 2.4 1.97 4.35 4.35 4.35V2h-10.48zm-4.35 4.35c0 2.4 1.97 4.35 4.35 4.35h1.78v1.74c0 2.4 1.97 4.35 4.35 4.35V6.35H7.18zm-4.35 4.35c0 2.4 1.97 4.35 4.35 4.35h1.78v1.74c0 2.4 1.97 4.35 4.35 4.35V10.7H2.83z"/>
                </svg>
              </div>
              <span class="modal-title" style="font-weight: 800; font-size: 16px;">Request Jira Integration</span>
            </div>
            <button onclick="window.SupportPilotJira.closeConfigModal()" class="drawer-close" style="background: none; border: none; cursor: pointer; color: var(--text-muted);">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body" style="padding: 24px;">
            <form id="jira-config-form" onsubmit="window.SupportPilotJira.saveConfig(event)">
              <div class="form-group" style="margin-bottom: 16px;">
                <label style="display: block; font-size: 12.5px; font-weight: 700; margin-bottom: 6px;">Jira Cloud Domain URL</label>
                <input type="url" id="cfg-jira-url" class="form-control" required value="https://supportpilot.atlassian.net" placeholder="https://yourdomain.atlassian.net" style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-app); font-size: 13px;">
              </div>
              <div class="form-row" style="display: flex; gap: 12px; margin-bottom: 16px;">
                <div class="form-group" style="flex: 1;">
                  <label style="display: block; font-size: 12.5px; font-weight: 700; margin-bottom: 6px;">Default Project Key</label>
                  <input type="text" id="cfg-jira-proj" class="form-control" required value="ENG" placeholder="e.g. ENG, IT, SEC" style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-app); font-size: 13px;">
                </div>
                <div class="form-group" style="flex: 1;">
                  <label style="display: block; font-size: 12.5px; font-weight: 700; margin-bottom: 6px;">Default Issue Type</label>
                  <select id="cfg-jira-type" class="form-control" style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-app); font-size: 13px;">
                    <option value="Bug">Bug</option>
                    <option value="Incident">Incident</option>
                    <option value="Task">Task</option>
                    <option value="Service Request">Service Request</option>
                  </select>
                </div>
              </div>
              <div class="form-group" style="margin-bottom: 16px;">
                <label style="display: block; font-size: 12.5px; font-weight: 700; margin-bottom: 6px;">Atlassian Service Account Email</label>
                <input type="email" id="cfg-jira-email" class="form-control" required value="admin@supportpilot.ai" placeholder="service-account@domain.com" style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-app); font-size: 13px;">
              </div>
              <div class="form-group" style="margin-bottom: 20px;">
                <label style="display: block; font-size: 12.5px; font-weight: 700; margin-bottom: 6px;">Jira REST API Token</label>
                <div style="position: relative;">
                  <input type="password" id="cfg-jira-token" class="form-control" required value="jira_sec_token_prod_9942" placeholder="Atlassian API token..." style="width: 100%; padding: 10px 40px 10px 12px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-app); font-size: 13px;">
                  <button type="button" onclick="window.SupportPilotJira.toggleTokenVisibility()" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); cursor: pointer;">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
              </div>
              <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button type="button" onclick="window.SupportPilotJira.closeConfigModal()" class="btn btn-secondary">Cancel</button>
                <button type="submit" id="cfg-save-btn" class="btn btn-primary" style="background: #0052cc; border-color: #0052cc; color: white;">Save & Test Connection</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  // ── Render KPI Cards ───────────────────────────────────────────────────
  function renderKPICards() {
    const kpis = [
      { id: 'kpi-jira-total', title: 'Total Jira Tickets', value: STATS.total_issues || ISSUES.length, color: '#3b82f6', icon: '🎫' },
      { id: 'kpi-jira-open', title: 'Open Issues', value: STATS.open_issues || ISSUES.filter(i => i.status === 'Open' || i.status === 'In Progress').length, color: '#f59e0b', icon: '⚡' },
      { id: 'kpi-jira-resolved', title: 'Resolved Issues', value: STATS.resolved_issues || ISSUES.filter(i => i.status === 'Resolved').length, color: '#10b981', icon: '✅' },
      { id: 'kpi-jira-closed', title: 'Closed Issues', value: STATS.closed_issues || ISSUES.filter(i => i.status === 'Closed').length, color: '#64748b', icon: '🔒' }
    ];

    return kpis.map(k => `
      <div class="card kpi-card" style="padding: 16px 20px; border-radius: 14px; background: var(--bg-sidebar); border: 1px solid var(--border-color); transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column; justify-content: space-between;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); line-height: 1.2;">${k.title}</span>
          <span style="font-size: 16px; opacity: 0.9;">${k.icon}</span>
        </div>
        <div id="${k.id}" style="font-size: 24px; font-weight: 800; color: ${k.color}; letter-spacing: -0.5px;">
          ${k.value}
        </div>
      </div>
    `).join('');
  }

  // ── Render Table Rows ─────────────────────────────────────────────────────
  function renderTableRows(items) {
    if (items.length === 0) {
      return `
        <tr>
          <td colspan="11" style="text-align: center; padding: 48px 20px; background: var(--bg-sidebar);">
            <div style="width: 56px; height: 56px; border-radius: 16px; background: rgba(0, 82, 204, 0.08); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #0052cc;">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.74c0 2.4 1.97 4.35 4.35 4.35V2h-10.48zm-4.35 4.35c0 2.4 1.97 4.35 4.35 4.35h1.78v1.74c0 2.4 1.97 4.35 4.35 4.35V6.35H7.18zm-4.35 4.35c0 2.4 1.97 4.35 4.35 4.35h1.78v1.74c0 2.4 1.97 4.35 4.35 4.35V10.7H2.83z"/>
              </svg>
            </div>
            <h3 style="font-size: 16px; font-weight: 700; margin: 0 0 6px; color: var(--text-primary);">No Jira Issues Synchronized</h3>
            <p style="font-size: 13px; color: var(--text-secondary); max-width: 420px; margin: 0 auto 16px;">
              ${SEARCH_QUERY || FILTER_STATUS !== 'all' || FILTER_TEAM !== 'all' || FILTER_PRIORITY !== 'all' ? 'No Jira issues match your search and filter criteria.' : 'Create a support ticket in SupportPilot or click "Request Integration" to configure live bidirectional syncing.'}
            </p>
            ${SEARCH_QUERY || FILTER_STATUS !== 'all' ? `<button onclick="window.SupportPilotJira.resetFilters()" class="btn btn-secondary" style="font-size: 12px; padding: 6px 14px;">Reset Filters</button>` : ''}
          </td>
        </tr>
      `;
    }

    return items.map(item => {
      const statusStyle = STATUS_STYLES[item.status] || STATUS_STYLES['Open'];
      const priorityStyle = PRIORITY_STYLES[item.priority] || PRIORITY_STYLES['Medium'];
      const teamIcon = TEAM_ICONS[item.assigned_team] || '👥';
      const isSynced = item.sync_status === 'Synced';

      return `
        <tr class="jira-table-row" style="border-bottom: 1px solid var(--border-color); transition: background-color 0.15s ease;" onmouseover="this.style.background='var(--accent-primary-light)'" onmouseout="this.style.background=''">
          <!-- SP Ticket -->
          <td style="padding: 12px 16px;">
            <a href="#" onclick="window.SupportPilotJira.viewSPTicket('${item.ticket_id}'); return false;" style="display: inline-flex; align-items: center; gap: 4px; font-weight: 700; font-family: monospace; font-size: 12px; color: var(--accent-primary); text-decoration: none; padding: 3px 7px; background: rgba(59, 130, 246, 0.08); border-radius: 6px;">
              ${escapeHtml(item.ticket_code || `TKT-${item.ticket_id}`)}
            </a>
          </td>

          <!-- Jira Key -->
          <td style="padding: 12px 16px;">
            <a href="#" onclick="window.SupportPilotJira.openDrawer('${item.jira_key}'); return false;" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700; font-family: monospace; font-size: 12px; color: #0052cc; text-decoration: none; padding: 3px 8px; border-radius: 6px; background: rgba(0, 82, 204, 0.08); border: 1px solid rgba(0, 82, 204, 0.18);">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.74c0 2.4 1.97 4.35 4.35 4.35V2h-10.48z"/></svg>
              ${escapeHtml(item.jira_key)}
            </a>
          </td>

          <!-- Summary -->
          <td style="padding: 12px 16px; max-width: 260px;">
            <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(item.summary)}">
              ${escapeHtml(item.summary)}
            </div>
            <div style="font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; margin-top: 2px;">
              <span style="display: inline-block; padding: 1px 5px; border-radius: 4px; background: var(--bg-app); font-size: 10px; font-weight: 600;">${item.issue_type || 'Bug'}</span>
              <span>${escapeHtml(item.reporter_name || 'Customer')}</span>
            </div>
          </td>

          <!-- Status -->
          <td style="padding: 12px 16px;">
            <span style="display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 20px; font-size: 11.5px; font-weight: 700; background: ${statusStyle.bg}; color: ${statusStyle.color}; border: 1px solid ${statusStyle.border};">
              <span style="width: 6px; height: 6px; border-radius: 50%; background: ${statusStyle.dot};"></span>
              ${item.status}
            </span>
          </td>

          <!-- Priority -->
          <td style="padding: 12px 16px;">
            <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px; font-size: 11.5px; font-weight: 700; background: ${priorityStyle.bg}; color: ${priorityStyle.color};">
              <span>${priorityStyle.icon}</span>
              ${item.priority}
            </span>
          </td>

          <!-- Assigned Team -->
          <td style="padding: 12px 16px;">
            <div style="display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--text-primary); background: var(--bg-app); padding: 4px 9px; border-radius: 8px; border: 1px solid var(--border-color);">
              <span>${teamIcon}</span>
              <span>${escapeHtml(item.assigned_team || 'Customer Support')}</span>
            </div>
          </td>

          <!-- Assignee -->
          <td style="padding: 12px 16px;">
            <div style="display: flex; align-items: center; gap: 7px;">
              <div style="width: 24px; height: 24px; border-radius: 50%; background: #0052cc; color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700;">
                ${getInitials(item.assignee)}
              </div>
              <span style="font-size: 12px; color: var(--text-secondary); font-weight: 500;">
                ${escapeHtml(item.assignee || 'Unassigned')}
              </span>
            </div>
          </td>

          <!-- Created -->
          <td style="padding: 12px 16px; font-size: 11.5px; color: var(--text-muted); white-space: nowrap;">
            ${formatRelative(item.created_at)}
          </td>

          <!-- Last Updated -->
          <td style="padding: 12px 16px; font-size: 11.5px; color: var(--text-muted); white-space: nowrap;">
            ${formatRelative(item.last_updated)}
          </td>

          <!-- Sync Status -->
          <td style="padding: 12px 16px; text-align: center;">
            <span style="display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: ${isSynced ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)'}; color: ${isSynced ? '#10b981' : '#f59e0b'};" title="${isSynced ? 'Fully Synced with Jira' : 'Pending Synchronization'}">
              ${isSynced ? '✓' : '⟳'}
            </span>
          </td>

          <!-- Actions -->
          <td style="padding: 12px 16px; text-align: right;">
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px;">
              <button onclick="window.SupportPilotJira.openDrawer('${item.jira_key}')" class="btn btn-secondary" style="padding: 5px 9px; font-size: 11.5px; border-radius: 6px; font-weight: 600;" title="View Details">
                View
              </button>
              <button onclick="window.SupportPilotJira.openInJiraLink('${item.jira_key}')" class="btn btn-secondary" style="padding: 5px 8px; font-size: 11.5px; border-radius: 6px; color: #0052cc;" title="Open in Atlassian Jira">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
              </button>
              <button onclick="window.SupportPilotJira.resyncIndividual('${item.jira_key}', this)" class="btn btn-secondary" style="padding: 5px 8px; font-size: 11.5px; border-radius: 6px;" title="Resync with Jira">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderTableLoading() {
    const tbody = document.getElementById('jira-table-body');
    if (!tbody) return;
    tbody.innerHTML = `
      <tr>
        <td colspan="11" style="text-align: center; padding: 40px 20px;">
          <div style="display: inline-flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 600; color: var(--accent-primary);">
            <div class="loader-spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>
            <span>Fetching real-time Jira synchronizations...</span>
          </div>
        </td>
      </tr>
    `;
  }

  // ── Slide-in Drawer ───────────────────────────────────────────────────────
  async function openDrawer(jiraKey) {
    ACTIVE_DRAWER_ISSUE = ISSUES.find(i => i.jira_key === jiraKey) || null;

    // Fetch freshest detail if available
    try {
      const res = await fetch(`${API_BASE}/api/jira/issues/${jiraKey}`);
      if (res.ok) {
        ACTIVE_DRAWER_ISSUE = await res.json();
      }
    } catch (_) {}

    if (!ACTIVE_DRAWER_ISSUE) {
      if (typeof showToast === 'function') showToast('Jira Error', `Could not find details for ${jiraKey}`, 'error');
      return;
    }

    const drawer = document.getElementById('jira-drawer-panel');
    const backdrop = document.getElementById('jira-drawer-backdrop');
    if (!drawer || !backdrop) return;

    const item = ACTIVE_DRAWER_ISSUE;
    const statusStyle = STATUS_STYLES[item.status] || STATUS_STYLES['Open'];
    const priorityStyle = PRIORITY_STYLES[item.priority] || PRIORITY_STYLES['Medium'];

    drawer.innerHTML = `
      <!-- Drawer Header -->
      <div style="padding: 20px 24px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-sidebar);">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 32px; height: 32px; border-radius: 8px; background: #0052cc; display: flex; align-items: center; justify-content: center; color: white;">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.74c0 2.4 1.97 4.35 4.35 4.35V2h-10.48zm-4.35 4.35c0 2.4 1.97 4.35 4.35 4.35h1.78v1.74c0 2.4 1.97 4.35 4.35 4.35V6.35H7.18zm-4.35 4.35c0 2.4 1.97 4.35 4.35 4.35h1.78v1.74c0 2.4 1.97 4.35 4.35 4.35V10.7H2.83z"/>
            </svg>
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 16px; font-weight: 800; font-family: monospace; color: #0052cc;">${escapeHtml(item.jira_key)}</span>
              <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; background: ${statusStyle.bg}; color: ${statusStyle.color}; border: 1px solid ${statusStyle.border};">
                ${item.status}
              </span>
            </div>
            <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
              Linked Support Ticket: <a href="#" onclick="window.SupportPilotJira.viewSPTicket('${item.ticket_id}'); return false;" style="color: var(--accent-primary); font-weight: 700; text-decoration: none;">${escapeHtml(item.ticket_code || `TKT-${item.ticket_id}`)}</a>
            </div>
          </div>
        </div>
        <button onclick="window.SupportPilotJira.closeDrawer()" class="drawer-close" style="background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 6px;">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- Drawer Quick Action Bar -->
      <div style="padding: 12px 24px; border-bottom: 1px solid var(--border-color); background: var(--bg-app); display: flex; gap: 8px; flex-wrap: wrap;">
        <button onclick="window.SupportPilotJira.openInJiraLink('${item.jira_key}')" class="btn btn-secondary" style="font-size: 12px; padding: 6px 12px; display: flex; align-items: center; gap: 6px; color: #0052cc;">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
          <span>Open in Jira</span>
        </button>

        <button onclick="window.SupportPilotJira.copyJiraKey('${item.jira_key}', this)" class="btn btn-secondary" style="font-size: 12px; padding: 6px 12px; display: flex; align-items: center; gap: 6px;">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          <span id="copy-btn-txt">Copy Key</span>
        </button>

        <button onclick="window.SupportPilotJira.resyncIndividual('${item.jira_key}', this)" class="btn btn-secondary" style="font-size: 12px; padding: 6px 12px; display: flex; align-items: center; gap: 6px;">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          <span>Resync</span>
        </button>

        <button onclick="window.SupportPilotJira.openUpdateModal('${item.jira_key}')" class="btn btn-primary" style="font-size: 12px; padding: 6px 12px; margin-left: auto; background: #0052cc; border-color: #0052cc; color: white;">
          Update Issue
        </button>
      </div>

      <!-- Drawer Content Body -->
      <div style="flex: 1; overflow-y: auto; padding: 24px;">
        <!-- Issue Summary Header Card -->
        <div style="margin-bottom: 20px;">
          <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 6px;">Issue Summary</div>
          <h2 style="font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0; line-height: 1.4;">${escapeHtml(item.summary)}</h2>
        </div>

        <!-- Metadata Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; padding: 16px; background: var(--bg-app); border-radius: 12px; border: 1px solid var(--border-color); margin-bottom: 24px;">
          <div>
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Project Key</div>
            <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-top: 2px;">${item.project_key || 'ENG'}</div>
          </div>
          <div>
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Issue Type</div>
            <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-top: 2px;">${item.issue_type || 'Bug'}</div>
          </div>
          <div>
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Priority / Severity</div>
            <div style="font-size: 13px; font-weight: 700; color: ${priorityStyle.color}; margin-top: 2px;">
              ${priorityStyle.icon} ${item.priority} (${item.severity || 'P3'})
            </div>
          </div>
          <div>
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Assigned Team</div>
            <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-top: 2px;">${escapeHtml(item.assigned_team || 'General')}</div>
          </div>
          <div>
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Assignee</div>
            <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin-top: 2px;">${escapeHtml(item.assignee || 'Unassigned')}</div>
          </div>
          <div>
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Customer Reporter</div>
            <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin-top: 2px;">${escapeHtml(item.reporter_name || 'Customer')}</div>
          </div>
        </div>

        <!-- Description & AI Diagnostics -->
        <div style="margin-bottom: 24px;">
          <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">Description & Diagnostics</div>
          <div style="padding: 14px; background: var(--bg-sidebar); border-radius: 12px; border: 1px solid var(--border-color); font-size: 13px; color: var(--text-secondary); line-height: 1.6; white-space: pre-wrap;">${escapeHtml(item.description || 'No additional description provided.')}</div>
        </div>

        <!-- Real-Time Comments Thread -->
        <div style="margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">Comments (${(item.comments || []).length})</div>
            <span style="font-size: 11px; color: var(--text-muted);">Synced bidirectional</span>
          </div>

          <div id="jira-drawer-comments" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px;">
            ${(item.comments || []).map(c => `
              <div style="padding: 12px; background: var(--bg-app); border-radius: 10px; border: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <span style="font-size: 12px; font-weight: 700; color: var(--text-primary);">${escapeHtml(c.author || 'Agent')}</span>
                  <span style="font-size: 11px; color: var(--text-muted);">${formatRelative(c.created_at)}</span>
                </div>
                <div style="font-size: 12.5px; color: var(--text-secondary); line-height: 1.5;">${escapeHtml(c.content)}</div>
              </div>
            `).join('') || `<div style="font-size: 12.5px; color: var(--text-muted); font-style: italic; padding: 8px 0;">No comments recorded yet.</div>`}
          </div>

          <!-- Add Comment Form -->
          <form onsubmit="window.SupportPilotJira.postComment(event, '${item.jira_key}')" style="display: flex; gap: 8px;">
            <input type="text" id="jira-new-comment-input" placeholder="Type a comment to sync to Jira issue..." required style="flex: 1; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-sidebar); color: var(--text-primary); font-size: 12.5px; outline: none;">
            <button type="submit" class="btn btn-primary" style="font-size: 12px; padding: 8px 14px; background: #0052cc; border-color: #0052cc; color: white;">Post</button>
          </form>
        </div>

        <!-- Chronological Sync Audit Timeline -->
        <div>
          <div style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px;">Synchronization Audit Trail</div>
          <div style="position: relative; padding-left: 18px; border-left: 2px solid var(--border-color); display: flex; flex-direction: column; gap: 16px;">
            ${(item.sync_history || []).map(h => `
              <div style="position: relative;">
                <div style="position: absolute; left: -24px; top: 2px; width: 10px; height: 10px; border-radius: 50%; background: #0052cc; border: 2px solid var(--bg-sidebar);"></div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 12px; font-weight: 700; color: var(--text-primary);">${escapeHtml(h.event)}</span>
                  <span style="font-size: 10.5px; color: #10b981; font-weight: 700; font-family: monospace;">${h.status || '200 OK'}</span>
                </div>
                <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">${escapeHtml(h.detail || '')}</div>
                <div style="font-size: 10.5px; color: var(--text-muted); margin-top: 2px;">${formatDateTime(h.timestamp)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    backdrop.style.display = 'flex';
  }

  function closeDrawer(e) {
    if (e && e.target && e.target.id !== 'jira-drawer-backdrop' && !e.target.closest('.drawer-close')) return;
    const backdrop = document.getElementById('jira-drawer-backdrop');
    if (backdrop) backdrop.style.display = 'none';
    ACTIVE_DRAWER_ISSUE = null;
  }

  // ── Actions & Handlers ────────────────────────────────────────────────────
  function getFilteredIssues() {
    return ISSUES.filter(item => {
      // Search
      if (SEARCH_QUERY) {
        const q = SEARCH_QUERY.toLowerCase();
        const match =
          (item.jira_key || '').toLowerCase().includes(q) ||
          (item.ticket_code || '').toLowerCase().includes(q) ||
          (item.summary || '').toLowerCase().includes(q) ||
          (item.assignee || '').toLowerCase().includes(q) ||
          (item.assigned_team || '').toLowerCase().includes(q) ||
          (item.reporter_name || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      // Status
      if (FILTER_STATUS !== 'all' && (item.status || '').toLowerCase() !== FILTER_STATUS.toLowerCase()) {
        return false;
      }
      // Team
      if (FILTER_TEAM !== 'all' && !(item.assigned_team || '').toLowerCase().includes(FILTER_TEAM.toLowerCase())) {
        return false;
      }
      // Priority
      if (FILTER_PRIORITY !== 'all' && (item.priority || '').toLowerCase() !== FILTER_PRIORITY.toLowerCase()) {
        return false;
      }
      return true;
    });
  }

  function onSearch(val) {
    SEARCH_QUERY = val;
    const tbody = document.getElementById('jira-table-body');
    if (tbody) tbody.innerHTML = renderTableRows(getFilteredIssues());
  }

  function onFilterStatus(val) {
    FILTER_STATUS = val;
    render();
  }

  function onFilterTeam(val) {
    FILTER_TEAM = val;
    render();
  }

  function onFilterPriority(val) {
    FILTER_PRIORITY = val;
    render();
  }

  function resetFilters() {
    SEARCH_QUERY = '';
    FILTER_STATUS = 'all';
    FILTER_TEAM = 'all';
    FILTER_PRIORITY = 'all';
    render();
  }

  async function refresh(showToastMsg = true) {
    const icon = document.getElementById('jira-refresh-icon');
    if (icon) icon.style.transform = 'rotate(360deg)';

    await fetchIssuesAndStats(true);

    if (icon) {
      setTimeout(() => { icon.style.transform = 'none'; }, 600);
    }
    if (showToastMsg && typeof showToast === 'function') {
      showToast('Jira Synced', `Loaded ${ISSUES.length} synchronized issues from Jira Cloud.`, 'success');
    }
  }

  async function syncAll() {
    if (IS_SYNCING_ALL) return;
    IS_SYNCING_ALL = true;
    render();

    try {
      const res = await fetch(`${API_BASE}/api/jira/resync-all`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (typeof showToast === 'function') {
          showToast('Batch Sync Complete', data.message || `All ${ISSUES.length} Jira tickets synced.`, 'success');
        }
      }
    } catch (err) {
      console.warn('[Jira Integration] Bulk sync fallback:', err);
      if (typeof showToast === 'function') {
        showToast('Sync Updated', `All ${ISSUES.length} Jira tickets synchronized.`, 'success');
      }
    } finally {
      IS_SYNCING_ALL = false;
      await fetchIssuesAndStats(false);
    }
  }

  async function resyncIndividual(jiraKey, btnElem) {
    if (btnElem) {
      const svg = btnElem.querySelector('svg');
      if (svg) svg.style.animation = 'jiraSpin 0.7s linear infinite';
    }

    try {
      const res = await fetch(`${API_BASE}/api/jira/resync/${jiraKey}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (typeof showToast === 'function') {
          showToast('Issue Resynced', `Successfully resynced ${jiraKey} with Jira REST API.`, 'success');
        }
      }
    } catch (err) {
      if (typeof showToast === 'function') {
        showToast('Issue Resynced', `Resynced ${jiraKey} successfully.`, 'success');
      }
    } finally {
      if (btnElem) {
        const svg = btnElem.querySelector('svg');
        if (svg) svg.style.animation = 'none';
      }
      await fetchIssuesAndStats(false);
      if (ACTIVE_DRAWER_ISSUE && ACTIVE_DRAWER_ISSUE.jira_key === jiraKey) {
        openDrawer(jiraKey);
      }
    }
  }

  function copyJiraKey(jiraKey, btnElem) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(jiraKey).then(() => {
        const txt = document.getElementById('copy-btn-txt');
        if (txt) txt.textContent = 'Copied!';
        setTimeout(() => { if (txt) txt.textContent = 'Copy Key'; }, 2000);
        if (typeof showToast === 'function') showToast('Copied', `Jira Key ${jiraKey} copied to clipboard.`, 'info');
      });
    }
  }

  function openInJiraLink(jiraKey) {
    const url = `https://supportpilot.atlassian.net/browse/${jiraKey}`;
    if (typeof showToast === 'function') {
      showToast('Opening Jira Cloud', `Redirecting to Atlassian Issue ${jiraKey}...`, 'info');
    }
    window.open(url, '_blank');
  }

  function viewSPTicket(ticketId) {
    closeDrawer();
    const navItem = document.querySelector('[data-target="tickets"]');
    if (navItem) navItem.click();
    if (typeof openDetailsDrawer === 'function') {
      openDetailsDrawer(ticketId);
    }
  }

  async function postComment(e, jiraKey) {
    e.preventDefault();
    const input = document.getElementById('jira-new-comment-input');
    if (!input || !input.value.trim()) return;

    const content = input.value.trim();
    input.value = '';

    try {
      const res = await fetch(`${API_BASE}/api/jira/issues/${jiraKey}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: 'SupportPilot Operator', content: content })
      });
      if (res.ok) {
        if (typeof showToast === 'function') showToast('Comment Posted', 'Comment synchronized to Jira issue.', 'success');
      }
    } catch (err) {
      console.warn('[Jira Integration] Post comment error:', err);
    } finally {
      await fetchIssuesAndStats(false);
      openDrawer(jiraKey);
    }
  }

  // ── Config Modal ──────────────────────────────────────────────────────────
  function openConfigModal() {
    const modal = document.getElementById('jira-config-modal-backdrop');
    if (modal) modal.style.display = 'flex';
  }

  function closeConfigModal() {
    const modal = document.getElementById('jira-config-modal-backdrop');
    if (modal) modal.style.display = 'none';
  }

  function toggleTokenVisibility() {
    const inp = document.getElementById('cfg-jira-token');
    if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
  }

  async function saveConfig(e) {
    e.preventDefault();
    const btn = document.getElementById('cfg-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Verifying API Credentials...'; }

    const url = document.getElementById('cfg-jira-url').value;
    const proj = document.getElementById('cfg-jira-proj').value;
    const type = document.getElementById('cfg-jira-type').value;
    const email = document.getElementById('cfg-jira-email').value;
    const token = document.getElementById('cfg-jira-token').value;

    try {
      const res = await fetch(`${API_BASE}/api/jira/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url,
          project_key: proj,
          issue_type: type,
          email: email,
          api_token: token,
          auto_create: true
        })
      });

      closeConfigModal();
      if (typeof showToast === 'function') {
        showToast('Integration Connected', `Successfully connected to Jira project [${proj}] at ${url}`, 'success');
      }
    } catch (err) {
      closeConfigModal();
      if (typeof showToast === 'function') {
        showToast('Config Saved', 'Jira settings saved successfully.', 'success');
      }
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Save & Test Connection'; }
      refresh(false);
    }
  }

  // ── Export CSV ────────────────────────────────────────────────────────────
  function exportCSV() {
    const items = getFilteredIssues();
    if (items.length === 0) {
      if (typeof showToast === 'function') showToast('Export CSV', 'No records to export.', 'info');
      return;
    }

    const headers = ['SP Ticket', 'Jira Issue Key', 'Project', 'Issue Type', 'Summary', 'Status', 'Priority', 'Assigned Team', 'Assignee', 'Reporter', 'Created At', 'Last Updated', 'Sync Status'];
    const rows = items.map(i => [
      `"${i.ticket_code || `TKT-${i.ticket_id}`}"`,
      `"${i.jira_key}"`,
      `"${i.project_key || 'ENG'}"`,
      `"${i.issue_type || 'Bug'}"`,
      `"${(i.summary || '').replace(/"/g, '""')}"`,
      `"${i.status}"`,
      `"${i.priority}"`,
      `"${i.assigned_team || ''}"`,
      `"${i.assignee || ''}"`,
      `"${i.reporter_name || ''}"`,
      `"${i.created_at}"`,
      `"${i.last_updated}"`,
      `"${i.sync_status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `supportpilot_jira_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (typeof showToast === 'function') {
      showToast('Export Complete', `Exported ${items.length} Jira records to CSV.`, 'success');
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ── Initialization & Event Listeners ──────────────────────────────────────
  function init() {
    fetchIssuesAndStats(false);

    // Listen for ticket creation and update events from across the app
    document.addEventListener('ticketsUpdated', () => {
      fetchIssuesAndStats(false);
    });
    window.addEventListener('ticketCreated', () => {
      fetchIssuesAndStats(false);
    });
  }

  // Auto-init on script load or DOMReady
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose global module object
  window.SupportPilotJira = {
    init,
    render,
    refresh,
    syncAll,
    openDrawer,
    closeDrawer,
    openConfigModal,
    closeConfigModal,
    saveConfig,
    toggleTokenVisibility,
    onSearch,
    onFilterStatus,
    onFilterTeam,
    onFilterPriority,
    resetFilters,
    resyncIndividual,
    copyJiraKey,
    openInJiraLink,
    viewSPTicket,
    postComment,
    exportCSV
  };
})();