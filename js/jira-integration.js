/**
 * jira-integration.js — Jira Integration Controls Panel
 * Injects a full config UI above the existing Jira card in integrations-view.
 */
(function () {
  'use strict';

  // ── Mock activity data ────────────────────────────────────────────────────
  let ACTIVITY = [];
  try { ACTIVITY = JSON.parse(localStorage.getItem('jira_activity') || '[]'); } catch (_) { }

  // ── State ─────────────────────────────────────────────────────────────────
  let cfg = { url: 'https://mycompany.atlassian.net', projectKey: 'ENG', issueType: 'Bug', priority: 'High', autoCreate: true };
  let connStatus = 'Connected';
  let lastSynced = new Date(Date.now() - 1000 * 60 * 18);
  let isSyncing = false;
  let tokenVisible = false;

  try { const s = JSON.parse(localStorage.getItem('jira-cfg') || '{}'); Object.assign(cfg, s); } catch (_) { }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function rel(d) {
    const m = Math.round((Date.now() - d.getTime()) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    return Math.floor(h / 24) + 'd ago';
  }

  const STATUS_C = { 'In Progress': '#3b82f6', 'Open': '#f59e0b', 'Done': '#10b981', 'In Review': '#8b5cf6' };
  const PRIORITY_C = { Critical: '#ef4444', High: '#f97316', Medium: '#f59e0b', Low: '#64748b' };

  // ── Render ────────────────────────────────────────────────────────────────
  function render() {
    const wrap = document.getElementById('jira-ctrl-panel');
    if (!wrap) return;

    const connColor = { Connected: '#10b981', Error: '#ef4444', Testing: '#f59e0b', Disconnected: '#94a3b8' }[connStatus] || '#94a3b8';
    const connIcon = connStatus === 'Connected'
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" width="20" height="20"><path d="M20 6L9 17l-5-5"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" width="20" height="20"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>`;

    const actRows = ACTIVITY.length > 0 ? ACTIVITY.map((a, i) => {
      const sc = STATUS_C[a.status] || '#94a3b8', pc = PRIORITY_C[a.priority] || '#94a3b8';
      const fallbackMs = Date.now() - (a.updatedMin ? a.updatedMin * 60000 : (i * 45 + 5) * 60000);
      const updatedDate = a.timestamp ? new Date(a.timestamp) : new Date(fallbackMs); 
      const t = updatedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `<tr onmouseover="this.style.background='var(--accent-primary-light)'" onmouseout="this.style.background=''">
        <td style="padding:10px 12px;border-bottom:1px solid var(--border-color)"><a href="#" onclick="if(typeof openDetailsDrawer==='function'){openDetailsDrawer('${a.ticketId}'); const nav = document.querySelector('[data-target=\\'tickets\\']'); if(nav) nav.click();} return false;" style="color:var(--accent-primary);font-weight:700;font-family:monospace;font-size:12px;text-decoration:none">${a.ticketId}</a></td>
        <td style="padding:10px 12px;border-bottom:1px solid var(--border-color)"><a href="#" onclick="showToast('Jira','Opening ${a.jiraKey}…','info');return false" style="color:#0052cc;font-weight:700;font-family:monospace;font-size:12px;text-decoration:none">${a.jiraKey}</a></td>
        <td style="padding:10px 12px;border-bottom:1px solid var(--border-color)"><span style="display:inline-flex;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${sc}20;color:${sc}">${a.status}</span></td>
        <td style="padding:10px 12px;border-bottom:1px solid var(--border-color)"><span style="display:inline-flex;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${pc}20;color:${pc}">${a.priority}</span></td>
        <td style="padding:10px 12px;border-bottom:1px solid var(--border-color);font-size:12px;color:var(--text-secondary)">${a.assignee}</td>
        <td style="padding:10px 12px;border-bottom:1px solid var(--border-color);font-size:11px;color:var(--text-muted)">${t}</td>
      </tr>`;
    }).join('') : `<tr><td colspan="6" style="text-align:center;padding:32px 10px;color:var(--text-muted);font-size:13px;background:var(--bg-app);border-bottom:1px solid var(--border-color);">No Jira tickets found</td></tr>`;

    wrap.innerHTML = `
      <!-- Mini Stats -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
        ${[['Total', ACTIVITY.length], ['Open', ACTIVITY.filter(a => a.status === 'Open').length], ['Done', ACTIVITY.filter(a => a.status === 'Done').length]].map(([l, v]) => `
          <div style="background:var(--bg-sidebar);border:1px solid var(--border-color);border-radius:10px;padding:12px;text-align:center">
            <div style="font-size:20px;font-weight:800;color:var(--text-primary)">${v}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px;font-weight:600">${l}</div>
          </div>`).join('')}
      </div>

      <!-- Activity Table -->
      <div class="card" style="background:var(--bg-sidebar);padding:0;overflow:hidden">
        <div style="padding:16px 20px;border-bottom:1px solid var(--border-color)">
          <div style="font-size:14px;font-weight:700">Recent Jira Activity</div>
        </div>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr>${['SP Ticket', 'Jira Key', 'Status', 'Priority', 'Assignee', 'Updated'].map(h => `<th style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);padding:10px 12px;text-align:left;background:var(--bg-app);border-bottom:1px solid var(--border-color)">${h}</th>`).join('')}</tr>
          </thead>
          <tbody>${actRows}</tbody>
        </table>
      </div>
    `;
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  function _cfg(k, v) { cfg[k] = v; }

  function save() {
    try { localStorage.setItem('jira-cfg', JSON.stringify(cfg)); } catch (_) { }
    if (typeof showToast === 'function') showToast('Config Saved', 'Jira settings saved successfully.', 'success');
  }

  function testConn() {
    connStatus = 'Testing';
    render();
    const btn = document.getElementById('jira-test-btn');
    if (btn) { btn.disabled = true; }
    setTimeout(() => {
      connStatus = Math.random() > 0.1 ? 'Connected' : 'Error';
      if (connStatus === 'Connected') lastSynced = new Date();
      render();
      if (typeof showToast === 'function') {
        const ok = connStatus === 'Connected';
        showToast(ok ? 'Connection OK' : 'Connection Failed', ok ? `Connected to ${cfg.url}` : 'Could not reach Jira. Check URL and token.', ok ? 'success' : 'error');
      }
    }, 2000);
  }

  function sync() {
    if (isSyncing) return;
    isSyncing = true;
    render();
    setTimeout(() => {
      isSyncing = false;
      lastSynced = new Date();
      render();
      if (typeof showToast === 'function') showToast('Sync Complete', `Synced ${ACTIVITY.length} issues successfully.`, 'success');
    }, 2500);
  }

  function onToggle(checked) {
    cfg.autoCreate = checked;
    render();
    if (typeof showToast === 'function') showToast('Setting Updated', `Auto-create Jira tickets: ${checked ? 'Enabled' : 'Disabled'}.`, 'info');
  }

  function toggleToken() {
    tokenVisible = !tokenVisible;
    const inp = document.getElementById('jira-token-input');
    if (inp) inp.type = tokenVisible ? 'text' : 'password';
  }

  function init() {
    // Create the panel container before the integrations grid
    const iv = document.getElementById('integrations-view');
    if (!iv) return;
    if (document.getElementById('jira-ctrl-panel')) { render(); return; }
    const wrap = document.createElement('div');
    wrap.id = 'jira-ctrl-panel';
    wrap.style.cssText = 'margin-bottom:24px';
    const grid = iv.querySelector('#integrations-list-grid');
    if (grid) iv.insertBefore(wrap, grid);
    else iv.prepend(wrap);
    render();
  }

  function addActivity(ticket, force = false) {
    if (!cfg.autoCreate && !force) return;
    const key = cfg.projectKey + '-' + Math.floor(Math.random() * 9000 + 1000);
    const priority = cfg.priority || 'High';

    ACTIVITY.unshift({
      ticketId: ticket.id,
      jiraKey: key,
      status: 'Open',
      priority: priority,
      assignee: (ticket.department || 'Support') + ' Team',
      updatedMin: 0,
      timestamp: Date.now()
    });
    try { localStorage.setItem('jira_activity', JSON.stringify(ACTIVITY)); } catch (_) { }

    if (document.getElementById('jira-ctrl-panel')) {
      render();
    }

    if (typeof showToast === 'function') {
      showToast('Jira Issue Created', `Auto-created Jira ticket ${key} for ${ticket.id}`, 'success');
    }
  }

  window.SupportPilotJira = { init, render, save, testConn, sync, onToggle, toggleToken, _cfg, addActivity };
})();