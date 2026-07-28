/**
 * jira-integration.js — Jira Integration Controls Panel
 * Injects a full config UI above the existing Jira card in integrations-view.
 */
(function () {
    'use strict';

    // ── Mock activity data ────────────────────────────────────────────────────
    const ACTIVITY = [];

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

        const actRows = ACTIVITY.length > 0 ? ACTIVITY.map(a => {
            const sc = STATUS_C[a.status] || '#94a3b8', pc = PRIORITY_C[a.priority] || '#94a3b8';
            const mins = a.updatedMin; const t = rel(new Date(Date.now() - mins * 60000));
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
      <!-- Panel Header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;padding:20px 24px;background:var(--bg-sidebar);border:1px solid var(--border-color);border-radius:14px;box-shadow:var(--shadow-sm);margin-bottom:16px">
        <div style="display:flex;gap:16px;align-items:center">
          <div style="width:48px;height:48px;border-radius:12px;border:1px solid var(--border-color);background:var(--bg-app);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:22px;color:#0052cc;flex-shrink:0">J</div>
          <div>
            <div style="display:flex;align-items:center;gap:10px">
              <h3 style="font-size:18px;font-weight:700;margin:0">Jira Integration Controls</h3>
              <span style="display:inline-flex;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#10b98120;color:#10b981">v3.1</span>
            </div>
            <p style="color:var(--text-secondary);font-size:13px;margin:4px 0 0">Configure sync settings, map fields, and manage automation rules.</p>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;background:var(--bg-app);border:1px solid var(--border-color);border-radius:20px;padding:6px 14px;font-size:13px">
          <span style="width:8px;height:8px;border-radius:50%;background:${connColor};display:inline-block;${connStatus === 'Testing' ? 'animation:jiraPulse 1s ease-in-out infinite' : ''}"></span>
          <span style="font-weight:600">${connStatus}</span>
          <span style="font-size:11px;color:var(--text-muted)">· ${rel(lastSynced)}</span>
        </div>
      </div>

      <!-- Config + Status Grid -->
      <div style="display:grid;grid-template-columns:1fr 320px;gap:16px;margin-bottom:16px">

        <!-- Config Form -->
        <div class="card" style="background:var(--bg-sidebar);padding:20px">
          <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:16px">Configuration</div>

          <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:12px">
            <label style="font-size:12px;font-weight:700;color:var(--text-secondary)">Jira Instance URL</label>
            <input type="url" id="jira-url-input" value="${cfg.url}" placeholder="https://yourcompany.atlassian.net"
              oninput="window.SupportPilotJira._cfg('url',this.value)"
              style="padding:8px 12px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-input);font-size:13px;outline:none;color:var(--text-primary)">
          </div>

          <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:12px">
            <label style="font-size:12px;font-weight:700;color:var(--text-secondary)">API Token <span style="font-size:10px;color:var(--text-muted);font-weight:400">(masked)</span></label>
            <div style="position:relative">
              <input type="password" id="jira-token-input" value="●●●●●●●●●●●●●●●●" placeholder="Jira API token…"
                style="padding:8px 40px 8px 12px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-input);font-size:13px;outline:none;width:100%;box-sizing:border-box;color:var(--text-primary)">
              <button onclick="window.SupportPilotJira.toggleToken()" id="jira-eye" title="Toggle"
                style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-muted);display:flex;align-items:center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
            <div style="display:flex;flex-direction:column;gap:4px">
              <label style="font-size:12px;font-weight:700;color:var(--text-secondary)">Default Project Key</label>
              <input type="text" value="${cfg.projectKey}" placeholder="ENG"
                oninput="window.SupportPilotJira._cfg('projectKey',this.value)"
                style="padding:8px 12px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-input);font-size:13px;outline:none;color:var(--text-primary)">
            </div>
            <div style="display:flex;flex-direction:column;gap:4px">
              <label style="font-size:12px;font-weight:700;color:var(--text-secondary)">Issue Type</label>
              <select onchange="window.SupportPilotJira._cfg('issueType',this.value)"
                style="padding:8px 12px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-input);font-size:13px;outline:none;color:var(--text-primary)">
                <option value="Bug" ${cfg.issueType === 'Bug' ? 'selected' : ''}>Bug</option>
                <option value="Task" ${cfg.issueType === 'Task' ? 'selected' : ''}>Task</option>
                <option value="Story" ${cfg.issueType === 'Story' ? 'selected' : ''}>Story</option>
                <option value="Incident" ${cfg.issueType === 'Incident' ? 'selected' : ''}>Incident</option>
              </select>
            </div>
          </div>

          <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:12px">
            <label style="font-size:12px;font-weight:700;color:var(--text-secondary)">Default Priority</label>
            <select onchange="window.SupportPilotJira._cfg('priority',this.value)"
              style="padding:8px 12px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-input);font-size:13px;outline:none;color:var(--text-primary)">
              <option value="Critical" ${cfg.priority === 'Critical' ? 'selected' : ''}>Critical</option>
              <option value="High" ${cfg.priority === 'High' ? 'selected' : ''}>High</option>
              <option value="Medium" ${cfg.priority === 'Medium' ? 'selected' : ''}>Medium</option>
              <option value="Low" ${cfg.priority === 'Low' ? 'selected' : ''}>Low</option>
            </select>
          </div>

          <!-- Auto-create toggle -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-top:1px solid var(--border-color);margin-top:4px">
            <div>
              <div style="font-weight:600;font-size:14px">Auto-create Jira Tickets</div>
              <div style="font-size:12px;color:var(--text-secondary)">Automatically create issues for escalated tickets</div>
            </div>
            <label style="position:relative;width:44px;height:24px;flex-shrink:0">
              <input type="checkbox" id="jira-auto-toggle" ${cfg.autoCreate ? 'checked' : ''} onchange="window.SupportPilotJira.onToggle(this.checked)"
                style="opacity:0;width:0;height:0;position:absolute">
              <span onclick="document.getElementById('jira-auto-toggle').click()" style="position:absolute;inset:0;border-radius:999px;background:${cfg.autoCreate ? 'var(--accent-primary)' : 'var(--border-color)'};cursor:pointer;transition:0.3s;display:block">
                <span style="position:absolute;width:18px;height:18px;left:${cfg.autoCreate ? '23' : '3'}px;top:3px;border-radius:50%;background:white;transition:0.3s;box-shadow:0 1px 3px rgba(0,0,0,0.2);display:block"></span>
              </span>
            </label>
          </div>

          <div style="display:flex;gap:10px;margin-top:14px">
            <button onclick="window.SupportPilotJira.save()" class="btn btn-primary" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;font-size:13px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
              Save Config
            </button>
            <button onclick="window.SupportPilotJira.testConn()" id="jira-test-btn" class="btn btn-secondary" style="display:flex;align-items:center;gap:6px;font-size:13px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              Test Connection
            </button>
          </div>
        </div>

        <!-- Right Column -->
        <div style="display:flex;flex-direction:column;gap:14px">
          <!-- Connection Status -->
          <div class="card" style="background:var(--bg-sidebar);padding:18px">
            <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:14px">Connection Status</div>
            <div style="display:flex;align-items:center;gap:16px">
              <div style="width:54px;height:54px;border-radius:50%;border:3px solid ${connColor};background:${connColor}20;display:flex;align-items:center;justify-content:center;flex-shrink:0">${connIcon}</div>
              <div>
                <div style="font-weight:700;font-size:16px">${connStatus}</div>
                <div style="font-size:12px;color:var(--text-muted)">Last sync: ${rel(lastSynced)}</div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:2px;word-break:break-all">${cfg.url}</div>
              </div>
            </div>
          </div>

          <!-- Sync Now -->
          <div class="card" style="background:var(--bg-sidebar);padding:18px">
            <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:10px">Manual Sync</div>
            <p style="font-size:13px;color:var(--text-secondary);margin:0 0 14px">Force an immediate two-way synchronisation with Jira.</p>
            <button onclick="window.SupportPilotJira.sync()" id="jira-sync-btn" class="btn btn-primary" style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px;font-size:13px">
              ${isSyncing ? `<span class="ap-spinner" style="width:14px;height:14px;border-width:2px"></span> Syncing…` : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg> Sync Now`}
            </button>
          </div>

          <!-- Mini Stats -->
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
            ${[['Total', ACTIVITY.length], ['Open', ACTIVITY.filter(a => a.status === 'Open').length], ['Done', ACTIVITY.filter(a => a.status === 'Done').length]].map(([l, v]) => `
              <div style="background:var(--bg-sidebar);border:1px solid var(--border-color);border-radius:10px;padding:12px;text-align:center">
                <div style="font-size:20px;font-weight:800;color:var(--text-primary)">${v}</div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:2px;font-weight:600">${l}</div>
              </div>`).join('')}
          </div>
        </div>
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
        // Create the panel container before the existing Jira card
        const iv = document.getElementById('integrations-view');
        if (!iv) return;
        if (document.getElementById('jira-ctrl-panel')) { render(); return; }
        const wrap = document.createElement('div');
        wrap.id = 'jira-ctrl-panel';
        wrap.style.cssText = 'margin-bottom:24px';
        const firstCard = iv.querySelector('.card');
        if (firstCard) iv.insertBefore(wrap, firstCard);
        else iv.prepend(wrap);
        render();
    }

    function addActivity(ticket) {
        if (!cfg.autoCreate) return;
        const key = cfg.projectKey + '-' + Math.floor(Math.random() * 9000 + 1000);
        const priority = cfg.priority || 'High';

        ACTIVITY.unshift({
            ticketId: ticket.id,
            jiraKey: key,
            status: 'Open',
            priority: priority,
            assignee: 'Unassigned',
            updatedMin: 0
        });

        if (document.getElementById('jira-ctrl-panel')) {
            render();
        }

        if (typeof showToast === 'function') {
            showToast('Jira Issue Created', `Auto-created Jira ticket ${key} for ${ticket.id}`, 'success');
        }
    }

    window.SupportPilotJira = { init, render, save, testConn, sync, onToggle, toggleToken, _cfg, addActivity };
})();
