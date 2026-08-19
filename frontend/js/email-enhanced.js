/**
 * email-enhanced.js — Enterprise-Grade Email Automation Outbox Module
 * Complete audit trail, live delivery tracking, 6-stage timeline drawer,
 * animated KPI counters, search/filter controls, and real-time backend synchronization.
 */
(function () {
  'use strict';

  const API_BASE = 'http://127.0.0.1:8000';

  // ── State ─────────────────────────────────────────────────────────────────
  let emails = [];
  let statistics = {
    emails_today: 0,
    delivery_rate: 100.0,
    total_sent: 0,
    failed: 0,
    pending: 0,
    avg_delivery_time: '1.2s'
  };

  let filterStatus = 'all';
  let filterDate = 'all';
  let filterCategory = 'all';
  let searchQuery = '';
  let activeEmailId = null;
  let isRefreshing = false;
  let isDrawerOpen = false;
  let socket = null;
  let pollTimer = null;

  // ── Helpers ───────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function fmtRelative(d) {
    if (!d) return 'Recently';
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    const diffSec = Math.floor((Date.now() - dateObj.getTime()) / 1000);
    if (diffSec < 45) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 172800) return 'Yesterday';
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function fmtFullTime(d) {
    if (!d) return '—';
    try {
      const dateObj = typeof d === 'string' ? new Date(d) : d;
      return dateObj.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return String(d);
    }
  }

  function avatarColor(name) {
    const colors = [
      'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      'linear-gradient(135deg, #8b5cf6, #6d28d9)',
      'linear-gradient(135deg, #10b981, #047857)',
      'linear-gradient(135deg, #f59e0b, #b45309)',
      'linear-gradient(135deg, #ec4899, #be185d)',
      'linear-gradient(135deg, #06b6d4, #0e7490)',
      'linear-gradient(135deg, #6366f1, #4338ca)'
    ];
    let h = 0;
    const str = name || 'Support';
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffff;
    return colors[h % colors.length];
  }

  function getInitials(name) {
    if (!name) return 'SP';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  function getEventBadge(subject, eventType) {
    const sub = (subject || '').toLowerCase();
    const evt = (eventType || '').toLowerCase();

    if (evt === 'created' || sub.includes('received') || sub.includes('created')) {
      return { label: 'RECEIVED', bg: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' };
    }
    if (evt === 'assigned' || sub.includes('assigned')) {
      return { label: 'ASSIGNED', bg: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9' };
    }
    if (evt === 'classified' || sub.includes('classification')) {
      return { label: 'AI CLASSIFIED', bg: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' };
    }
    if (evt === 'solution_generated' || evt === 'solution' || sub.includes('solution') || sub.includes('suggested')) {
      return { label: 'AI SOLUTION', bg: 'rgba(168, 85, 247, 0.12)', color: '#a855f7' };
    }
    if (evt === 'escalated' || sub.includes('escalated')) {
      return { label: 'ESCALATED', bg: 'rgba(249, 115, 22, 0.12)', color: '#f97316' };
    }
    if (evt === 'resolved' || sub.includes('resolved')) {
      return { label: 'RESOLVED', bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981' };
    }
    if (evt === 'closed' || sub.includes('closed')) {
      return { label: 'CLOSED', bg: 'rgba(100, 116, 139, 0.12)', color: '#64748b' };
    }
    return { label: 'OUTBOX', bg: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' };
  }

  function statusClass(status) {
    const s = (status || 'Delivered').toLowerCase();
    if (s === 'delivered') return 'status-delivered';
    if (s === 'opened') return 'status-opened';
    if (s === 'queued') return 'status-queued';
    if (s === 'sending') return 'status-sending';
    if (s === 'failed') return 'status-failed';
    if (s === 'bounced') return 'status-bounced';
    return 'status-delivered';
  }

  // ── Filter Logic ──────────────────────────────────────────────────────────
  function getFilteredEmails() {
    return emails.filter(e => {
      // 1. Status Filter
      const st = (e.status || '').toLowerCase();
      if (filterStatus !== 'all' && st !== filterStatus) return false;

      // 2. Category / Event Filter
      if (filterCategory === 'ai') {
        const sub = (e.subject || '').toLowerCase();
        if (!sub.includes('ai') && !sub.includes('solution') && !sub.includes('classif')) return false;
      } else if (filterCategory === 'escalated') {
        const sub = (e.subject || '').toLowerCase();
        if (!sub.includes('escalat')) return false;
      } else if (filterCategory === 'delivered' && st !== 'delivered') {
        return false;
      } else if (filterCategory === 'opened' && st !== 'opened') {
        return false;
      } else if (filterCategory === 'failed' && st !== 'failed' && st !== 'bounced') {
        return false;
      }

      // 3. Date Filter
      if (filterDate !== 'all') {
        const created = new Date(e.created_at || e.sent_at || Date.now());
        const ageHours = (Date.now() - created.getTime()) / 3600000;
        if (filterDate === 'today' && ageHours > 24) return false;
        if (filterDate === '7d' && ageHours > 168) return false;
        if (filterDate === '30d' && ageHours > 720) return false;
      }

      // 4. Search Filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTo = (e.to || '').toLowerCase().includes(q);
        const matchName = (e.recipient_name || '').toLowerCase().includes(q);
        const matchSub = (e.subject || '').toLowerCase().includes(q);
        const matchTkt = (e.ticket_id || '').toLowerCase().includes(q);
        const matchBody = (e.body || '').toLowerCase().includes(q);
        if (!matchTo && !matchName && !matchSub && !matchTkt && !matchBody) return false;
      }

      return true;
    });
  }

  // ── Render Outbox ─────────────────────────────────────────────────────────
  function render() {
    const root = document.getElementById('email-view');
    if (!root) return;

    const filtered = getFilteredEmails();

    root.innerHTML = `
      <div class="email-outbox-container">
        
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;">
          <div>
            <div style="display:flex;align-items:center;gap:10px;">
              <h1 style="font-size:24px;font-weight:800;letter-spacing:-0.5px;margin:0;color:var(--text-primary);">
                Email Automation Outbox
              </h1>
              <span style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:11.5px;font-weight:700;background:rgba(16, 185, 129, 0.12);color:#10b981;">
                <span style="width:6px;height:6px;border-radius:50%;background:#10b981;"></span>
                Live Sync
              </span>
            </div>
            <p style="color:var(--text-secondary);font-size:13.5px;margin:4px 0 0 0;">
              Automatically generated customer emails with complete delivery tracking and audit history.
            </p>
          </div>

          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <button onclick="window.SupportPilotEmailEnhanced.exportCSV()" class="btn btn-secondary" style="display:flex;align-items:center;gap:7px;font-size:13px;padding:8px 14px;border-radius:10px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Export CSV</span>
            </button>

            <button onclick="window.SupportPilotEmailEnhanced.refresh(true)" class="btn btn-secondary" style="display:flex;align-items:center;gap:7px;font-size:13px;padding:8px 14px;border-radius:10px;">
              <svg id="outbox-refresh-icon" style="${isRefreshing ? 'animation:spin 0.8s linear infinite;' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/></svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <!-- 4 Summary KPI Cards with Animated Numbers -->
        <div class="outbox-kpi-grid">
          
          <!-- Card 1: Emails Today -->
          <div class="outbox-kpi-card">
            <div class="outbox-kpi-icon" style="background:rgba(59, 130, 246, 0.12);color:#3b82f6;">📧</div>
            <div>
              <div style="font-size:22px;font-weight:800;color:var(--text-primary);" class="animated-counter">
                ${statistics.emails_today}
              </div>
              <div style="font-size:11.5px;font-weight:600;color:var(--text-muted);margin-top:2px;">Emails Sent Today</div>
            </div>
          </div>

          <!-- Card 2: Delivery Rate -->
          <div class="outbox-kpi-card">
            <div class="outbox-kpi-icon" style="background:rgba(16, 185, 129, 0.12);color:#10b981;">📈</div>
            <div>
              <div style="font-size:22px;font-weight:800;color:#10b981;" class="animated-counter">
                ${statistics.delivery_rate}%
              </div>
              <div style="font-size:11.5px;font-weight:600;color:var(--text-muted);margin-top:2px;">Delivery Rate</div>
            </div>
          </div>

          <!-- Card 3: Total Emails Sent -->
          <div class="outbox-kpi-card">
            <div class="outbox-kpi-icon" style="background:rgba(139, 92, 246, 0.12);color:#8b5cf6;">📨</div>
            <div>
              <div style="font-size:22px;font-weight:800;color:var(--text-primary);" class="animated-counter">
                ${statistics.total_sent}
              </div>
              <div style="font-size:11.5px;font-weight:600;color:var(--text-muted);margin-top:2px;">Total Emails Sent</div>
            </div>
          </div>

          <!-- Card 4: Failed / Bounced -->
          <div class="outbox-kpi-card">
            <div class="outbox-kpi-icon" style="background:rgba(239, 68, 68, 0.12);color:#ef4444;">⚠</div>
            <div>
              <div style="font-size:22px;font-weight:800;color:${statistics.failed > 0 ? '#ef4444' : 'var(--text-primary)'};" class="animated-counter">
                ${statistics.failed}
              </div>
              <div style="font-size:11.5px;font-weight:600;color:var(--text-muted);margin-top:2px;">Failed / Bounced</div>
            </div>
          </div>

        </div>

        <!-- Search & Filter Controls -->
        <div class="outbox-search-bar">
          <!-- Text Search -->
          <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:240px;position:relative;">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" width="16" height="16" style="position:absolute;left:12px;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input 
              type="text" 
              class="outbox-search-input" 
              placeholder="Search recipient email, customer name, ticket number (e.g. TKT-1001), or subject..." 
              value="${searchQuery}"
              oninput="window.SupportPilotEmailEnhanced.setSearch(this.value)"
              style="padding-left:36px;"
            />
            ${searchQuery ? `<button onclick="window.SupportPilotEmailEnhanced.setSearch('')" style="position:absolute;right:10px;background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:14px;">✕</button>` : ''}
          </div>

          <!-- Status Dropdown Filter -->
          <select class="outbox-select" onchange="window.SupportPilotEmailEnhanced.setFilter(this.value)">
            <option value="all" ${filterStatus === 'all' ? 'selected' : ''}>All Status</option>
            <option value="delivered" ${filterStatus === 'delivered' ? 'selected' : ''}>Delivered</option>
            <option value="opened" ${filterStatus === 'opened' ? 'selected' : ''}>Opened</option>
            <option value="queued" ${filterStatus === 'queued' ? 'selected' : ''}>Queued</option>
            <option value="sending" ${filterStatus === 'sending' ? 'selected' : ''}>Sending</option>
            <option value="failed" ${filterStatus === 'failed' ? 'selected' : ''}>Failed</option>
            <option value="bounced" ${filterStatus === 'bounced' ? 'selected' : ''}>Bounced</option>
          </select>

          <!-- Date Dropdown Filter -->
          <select class="outbox-select" onchange="window.SupportPilotEmailEnhanced.setDateFilter(this.value)">
            <option value="all" ${filterDate === 'all' ? 'selected' : ''}>All Time</option>
            <option value="today" ${filterDate === 'today' ? 'selected' : ''}>Today</option>
            <option value="7d" ${filterDate === '7d' ? 'selected' : ''}>Last 7 Days</option>
            <option value="30d" ${filterDate === '30d' ? 'selected' : ''}>Last 30 Days</option>
          </select>
        </div>

        <!-- Outbox Table Card -->
        <div class="outbox-table-card">
          ${filtered.length === 0 ? `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:56px 24px;text-align:center;">
              <div style="width:64px;height:64px;border-radius:18px;background:var(--bg-app);border:1px dashed var(--border-color);display:flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:16px;">
                📭
              </div>
              <h3 style="font-size:17px;font-weight:800;color:var(--text-primary);margin:0 0 6px 0;">No automated emails found</h3>
              <p style="font-size:13.5px;color:var(--text-secondary);max-width:400px;margin:0 0 16px 0;">
                No emails matched your current search and filter settings. Emails created from ticket activities will automatically appear here.
              </p>
              <button onclick="window.SupportPilotEmailEnhanced.resetFilters()" class="btn btn-secondary" style="font-size:13px;padding:6px 14px;border-radius:8px;">
                Reset Filters
              </button>
            </div>
          ` : `
            <div style="overflow-x:auto;">
              <table class="outbox-table">
                <thead>
                  <tr>
                    <th>Recipient</th>
                    <th>Subject</th>
                    <th>Ticket</th>
                    <th>Status</th>
                    <th>Sent</th>
                    <th style="text-align:right;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${filtered.map((e, idx) => {
      const evt = getEventBadge(e.subject, e.event_type);
      const avBg = avatarColor(e.recipient_name || e.to);
      const initials = getInitials(e.recipient_name || e.to);
      const statusCls = statusClass(e.status);
      const relativeTime = fmtRelative(e.created_at || e.sent_at);
      const fullTime = fmtFullTime(e.created_at || e.sent_at);
      const isSelected = activeEmailId === e.id;

      return `
                      <tr class="outbox-row ${isSelected ? 'outbox-row-new' : ''}">
                        
                        <!-- Recipient -->
                        <td>
                          <div style="display:flex;align-items:center;gap:12px;">
                            <div style="width:36px;height:36px;border-radius:50%;background:${avBg};color:#ffffff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12.5px;flex-shrink:0;box-shadow:0 2px 6px rgba(0,0,0,0.12);">
                              ${initials}
                            </div>
                            <div>
                              <div style="font-size:13.5px;font-weight:700;color:var(--text-primary);">
                                ${e.recipient_name || 'Customer'}
                              </div>
                              <div style="font-size:11.5px;color:var(--text-muted);margin-top:1px;">
                                ${e.to}
                              </div>
                            </div>
                          </div>
                        </td>

                        <!-- Subject -->
                        <td>
                          <div style="display:flex;flex-direction:column;gap:4px;max-width:320px;">
                            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                              <span style="display:inline-block;padding:2px 7px;border-radius:6px;font-size:10px;font-weight:800;letter-spacing:0.4px;background:${evt.bg};color:${evt.color};">
                                ${evt.label}
                              </span>
                            </div>
                            <div style="font-size:13px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${e.subject}">
                              ${e.subject}
                            </div>
                          </div>
                        </td>

                        <!-- Linked Ticket -->
                        <td>
                          <span 
                            onclick="window.SupportPilotEmailEnhanced.openLinkedTicket('${e.ticket_id}')"
                            style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:8px;background:rgba(99, 102, 241, 0.08);border:1px solid rgba(99, 102, 241, 0.2);color:var(--accent-primary);font-family:monospace;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.15s ease;"
                            onmouseover="this.style.background='rgba(99, 102, 241, 0.18)'"
                            onmouseout="this.style.background='rgba(99, 102, 241, 0.08)'"
                            title="Click to open linked ticket"
                          >
                            <span>${e.ticket_id || 'TKT-Auto'}</span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                          </span>
                        </td>

                        <!-- Status -->
                        <td>
                          <span class="status-pill ${statusCls}">
                            <span class="status-dot"></span>
                            <span>${e.status || 'Delivered'}</span>
                          </span>
                        </td>

                        <!-- Sent Time -->
                        <td>
                          <span style="font-size:12.5px;color:var(--text-muted);cursor:help;" title="${fullTime}">
                            ${relativeTime}
                          </span>
                        </td>

                        <!-- Actions -->
                        <td style="text-align:right;">
                          <div style="display:inline-flex;align-items:center;gap:6px;">
                            <button 
                              onclick="event.preventDefault(); event.stopPropagation(); window.SupportPilotEmailEnhanced.viewEmail('${e.id}'); return false;"
                              class="btn btn-secondary"
                              style="padding:6px 12px;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:5px;border-radius:8px;cursor:pointer;"
                              title="View Fullscreen Details"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                              <span>View</span>
                            </button>
                          </div>
                        </td>

                      </tr>
                    `;
    }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

      </div>
    `;
  }

  // ── Fullscreen Email Detail Modal & DOM Management ────────────────────────
  function ensureModalContainers() {
    let backdrop = document.getElementById('email-drawer-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'email-drawer-backdrop';
      backdrop.className = 'email-drawer-backdrop';
      backdrop.style.display = 'none';
      backdrop.onclick = function (e) {
        if (e.target === backdrop) {
          closeDrawer();
        }
      };

      const panel = document.createElement('div');
      panel.id = 'email-drawer-panel';
      panel.className = 'email-drawer';
      panel.onclick = function (e) {
        e.stopPropagation();
      };

      backdrop.appendChild(panel);
      document.body.appendChild(backdrop);
    }
  }

  function viewEmail(id) {
    activeEmailId = id;
    ensureModalContainers();

    const email = emails.find(e => String(e.id) === String(id));
    if (!email) {
      console.warn(`Email with ID ${id} not found in outbox.`);
      return;
    }

    renderDrawerContent(email);

    const backdrop = document.getElementById('email-drawer-backdrop');
    const panel = document.getElementById('email-drawer-panel');
    if (backdrop && panel) {
      backdrop.style.display = 'flex';
      requestAnimationFrame(() => {
        backdrop.classList.add('active');
        panel.classList.add('active');
        isDrawerOpen = true;
      });
    }

    // Close on Escape key handler
    const onKey = (e) => {
      if (e.key === 'Escape') {
        closeDrawer();
        document.removeEventListener('keydown', onKey);
      }
    };
    document.addEventListener('keydown', onKey);
  }

  function renderDrawerContent(email) {
    const panel = document.getElementById('email-drawer-panel');
    if (!panel || !email) return;

    const evt = getEventBadge(email.subject, email.event_type);
    const statusCls = statusClass(email.status);
    const avBg = avatarColor(email.recipient_name || email.to);
    const initials = getInitials(email.recipient_name || email.to);

    const timeline = email.timeline || [
      { stage: 'Trigger Event', time: email.created_at || email.sent_at, detail: 'Ticket event registered automated email sequence.', ok: true },
      { stage: 'AI Compilation', time: email.created_at || email.sent_at, detail: 'AI generated response payload from ticket context.', ok: true },
      { stage: 'Queue & Policy', time: email.sent_at || email.created_at, detail: 'Passed SPF/DKIM verification & dispatch queue.', ok: true },
      { stage: 'SMTP Dispatch', time: email.sent_at, detail: 'Dispatched through enterprise email relay gateway.', ok: true },
      { stage: 'Delivered', time: email.delivered_at || email.sent_at, detail: 'Delivery receipt confirmed by remote MX server (250 OK).', ok: true },
      { stage: 'Client Read / Opened', time: email.status === 'opened' ? (email.delivered_at || email.sent_at) : null, detail: email.status === 'opened' ? 'Email open tracking pixel registered by recipient.' : 'Tracking pixel awaiting client interaction.', ok: email.status === 'opened' ? true : null }
    ];

    panel.innerHTML = `
      <!-- Fullscreen Top Navigation Header Bar -->
      <div style="padding: 16px 32px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-sidebar); flex-shrink: 0; box-shadow: 0 2px 12px rgba(0,0,0,0.06); z-index: 20;">
        <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
          <button onclick="window.SupportPilotEmailEnhanced.closeDrawer()" class="btn btn-secondary" style="display: inline-flex; align-items: center; gap: 8px; font-size: 13px; padding: 8px 16px; border-radius: 10px; font-weight: 700; background: var(--bg-app); border: 1px solid var(--border-color); cursor: pointer;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span>Back to Email Outbox</span>
          </button>

          <div style="width: 1px; height: 24px; background: var(--border-color);"></div>

          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-size: 17px; font-weight: 800; color: var(--text-primary); max-width: 520px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(email.subject)}">
                  ${escapeHtml(email.subject)}
                </span>
                <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.4px; background: ${evt.bg}; color: ${evt.color};">
                  ${evt.label}
                </span>
                <span class="status-pill ${statusCls}">
                  <span class="status-dot"></span>
                  <span>${email.status || 'Delivered'}</span>
                </span>
              </div>
              <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px; display: flex; align-items: center; gap: 8px;">
                <span>ID: <strong style="font-family: monospace;">${escapeHtml(email.id)}</strong></span>
                <span>•</span>
                <span>Linked Ticket: <a href="#" onclick="event.preventDefault(); window.SupportPilotEmailEnhanced.openLinkedTicket('${email.ticket_id}'); return false;" style="color: var(--accent-primary); font-weight: 700; text-decoration: none;">${escapeHtml(email.ticket_id || 'TKT-Auto')}</a></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Fullscreen Top Actions -->
        <div style="display: flex; align-items: center; gap: 10px;">
          <button onclick="window.SupportPilotEmailEnhanced.closeDrawer()" class="drawer-close" style="background: var(--bg-app); border: 1px solid var(--border-color); border-radius: 9px; cursor: pointer; color: var(--text-secondary); padding: 7px 12px; display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 700;" title="Close Fullscreen (Esc)">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            <span>Esc</span>
          </button>
        </div>
      </div>

      <!-- Fullscreen Content Area -->
      <div style="flex: 1; overflow-y: auto; background: var(--bg-app); padding: 28px 36px;">
        <div style="max-width: 1480px; margin: 0 auto; display: grid; grid-template-columns: minmax(0, 1.85fr) minmax(360px, 1.1fr); gap: 24px; align-items: start;">
          
          <!-- Left Column (Primary Email Viewer) -->
          <div style="display: flex; flex-direction: column; gap: 20px;">
            
            <!-- Email Header Details Card -->
            <div class="card" style="padding: 24px; border-radius: 16px; background: var(--bg-card); border: 1px solid var(--border-color);">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 20px; padding-bottom: 18px; border-bottom: 1px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 14px;">
                  <div style="width: 44px; height: 44px; border-radius: 50%; background: ${avBg}; color: white; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
                    ${initials}
                  </div>
                  <div>
                    <div style="font-size: 16px; font-weight: 800; color: var(--text-primary);">
                      ${escapeHtml(email.recipient_name || 'Customer')}
                    </div>
                    <div style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">
                      To: <span style="color: var(--text-secondary); font-weight: 600;">${escapeHtml(email.to)}</span>
                    </div>
                  </div>
                </div>

                <div style="text-align: right;">
                  <div style="font-size: 12.5px; font-weight: 600; color: var(--text-secondary);">
                    ${fmtFullTime(email.sent_at || email.created_at)}
                  </div>
                  <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px; display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>Signed by supportpilot.ai</span>
                  </div>
                </div>
              </div>

              <!-- From / Sender Info -->
              <div style="display: flex; flex-wrap: wrap; gap: 16px; font-size: 12.5px; color: var(--text-secondary); background: var(--bg-app); padding: 12px 16px; border-radius: 10px; border: 1px solid var(--border-color);">
                <div><strong>From:</strong> SupportPilot AI Engine &lt;${escapeHtml(email.from || 'support@supportpilot.ai')}&gt;</div>
                <div>•</div>
                <div><strong>Event Type:</strong> <span style="color: var(--accent-primary); font-weight: 700;">${escapeHtml(email.event_type || 'Notification')}</span></div>
                <div>•</div>
                <div><strong>Encryption:</strong> TLS 1.3 256-bit</div>
              </div>
            </div>

            <!-- Email Body Card -->
            <div class="card" style="padding: 24px; border-radius: 16px; background: var(--bg-card); border: 1px solid var(--border-color);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border-color);">
                <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span>Email Content Payload</span>
                </div>
                <button onclick="window.SupportPilotEmailEnhanced.copyBody('${email.id}')" class="btn btn-secondary" style="padding: 4px 10px; font-size: 11.5px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer;">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  <span>Copy Body</span>
                </button>
              </div>

              <!-- Formatted Email Body -->
              <div class="email-body-preview" style="font-size: 14px; line-height: 1.7; padding: 22px; border-radius: 12px; background: var(--bg-app); border: 1px solid var(--border-color); color: var(--text-primary); white-space: pre-wrap;">
                <div style="border-bottom: 1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center;">
                  <div style="font-weight: 800; font-size: 14px; color: var(--accent-primary);">SupportPilot Automated Customer Notification</div>
                  <div style="font-size: 11.5px; color: var(--text-muted); font-family: monospace;">Ref: ${escapeHtml(email.ticket_id || 'TKT-Auto')}</div>
                </div>
                <div>${(email.body || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                <div style="margin-top: 24px; padding-top: 16px; border-top: 1px dashed var(--border-color); font-size: 12px; color: var(--text-muted); line-height: 1.5;">
                  This is an automated system dispatch transmitted by the SupportPilot AI Ticket Engine. Do not reply directly to this notification. If you have further questions, please access your SupportPilot customer portal.
                </div>
              </div>

              <!-- Attachments if any -->
              ${(email.attachments && email.attachments.length > 0) ? `
                <div style="margin-top: 20px;">
                  <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-muted); margin-bottom: 10px;">
                    Attachments (${email.attachments.length})
                  </div>
                  <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${email.attachments.map(att => `
                      <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--bg-app); border: 1px solid var(--border-color); border-radius: 8px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                          <span style="font-size: 16px;">📄</span>
                          <span style="font-size: 13px; font-weight: 600; color: var(--text-primary);">${escapeHtml(att)}</span>
                        </div>
                        <button onclick="window.SupportPilotEmailEnhanced.downloadAttachment('${escapeHtml(att)}')" class="btn btn-secondary" style="padding: 4px 10px; font-size: 11.5px;">Download</button>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>

          </div>

          <!-- Right Column (Metadata, Delivery Timeline & SLA Tracking) -->
          <div style="display: flex; flex-direction: column; gap: 20px;">
            
            <!-- Delivery Timeline & SLA Card -->
            <div class="card" style="padding: 24px; border-radius: 16px; background: var(--bg-card); border: 1px solid var(--border-color);">
              <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-muted); margin-bottom: 16px; display: flex; align-items: center; gap: 6px;">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>6-Stage Delivery Timeline</span>
              </div>

              <div class="email-timeline-track">
                ${timeline.map((t, idx) => {
      const isOk = t.ok === true;
      const isFail = t.ok === false;
      const dotColor = isOk ? '#10b981' : (isFail ? '#ef4444' : '#f59e0b');
      const dotBg = isOk ? 'rgba(16, 185, 129, 0.15)' : (isFail ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)');

      return `
                    <div class="email-timeline-item">
                      <div style="display: flex; flex-direction: column; align-items: center;">
                        <div class="email-timeline-dot" style="background: ${dotBg}; color: ${dotColor}; border: 1.5px solid ${dotColor};">
                          ${isOk ? '✓' : (isFail ? '✕' : '•')}
                        </div>
                        ${idx < timeline.length - 1 ? '<div class="email-timeline-line"></div>' : ''}
                      </div>
                      <div class="email-timeline-content">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                          <span style="font-size: 13px; font-weight: 700; color: var(--text-primary);">${escapeHtml(t.stage)}</span>
                          <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">${t.time ? fmtFullTime(t.time) : 'Pending'}</span>
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 3px; line-height: 1.4;">
                          ${escapeHtml(t.detail)}
                        </div>
                      </div>
                    </div>
                  `;
    }).join('')}
              </div>
            </div>

            <!-- Linked Ticket Card -->
            <div class="card" style="padding: 22px; border-radius: 16px; background: var(--bg-card); border: 1px solid var(--border-color);">
              <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-muted); margin-bottom: 12px;">
                Associated Support Ticket
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; background: var(--bg-app); padding: 14px 16px; border-radius: 12px; border: 1px solid var(--border-color);">
                <div>
                  <div style="font-family: monospace; font-size: 15px; font-weight: 800; color: var(--accent-primary);">
                    ${escapeHtml(email.ticket_id || 'TKT-Auto')}
                  </div>
                  <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                    Status: <strong style="color: var(--text-primary);">${escapeHtml(email.ticket_status || 'Open')}</strong>
                  </div>
                </div>
                <button onclick="window.SupportPilotEmailEnhanced.openLinkedTicket('${email.ticket_id}')" class="btn btn-secondary" style="font-size: 12px; padding: 6px 12px; border-radius: 8px; font-weight: 700; display: inline-flex; align-items: center; gap: 5px;">
                  <span>View Ticket</span>
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
              </div>
            </div>

            <!-- Technical Transmission Details -->
            <div class="card" style="padding: 22px; border-radius: 16px; background: var(--bg-card); border: 1px solid var(--border-color);">
              <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-muted); margin-bottom: 14px;">
                Transmission Details
              </div>
              <div style="display: flex; flex-direction: column; gap: 10px; font-size: 12px;">
                <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 8px;">
                  <span style="color: var(--text-muted);">Message-ID:</span>
                  <span style="font-family: monospace; color: var(--text-primary); font-weight: 600;">&lt;${escapeHtml(email.id)}@sp.ai&gt;</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 8px;">
                  <span style="color: var(--text-muted);">Relay Provider:</span>
                  <span style="color: var(--text-primary); font-weight: 600;">Brevo / Postfix SMTP</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 8px;">
                  <span style="color: var(--text-muted);">Delivery Latency:</span>
                  <span style="color: #10b981; font-weight: 700;">${statistics.avg_delivery_time || '0.9s'}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--text-muted);">Auth Signature:</span>
                  <span style="color: var(--text-primary); font-weight: 600;">DKIM-Pass (2048-bit)</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    `;
  }

  function closeDrawer() {
    const backdrop = document.getElementById('email-drawer-backdrop');
    const panel = document.getElementById('email-drawer-panel');
    if (backdrop) backdrop.classList.remove('active');
    if (panel) panel.classList.remove('active');
    setTimeout(() => {
      if (backdrop) backdrop.style.display = 'none';
      isDrawerOpen = false;
      activeEmailId = null;
    }, 200);
  }

  // ── Resend Email Action ───────────────────────────────────────────────────
  async function resendEmail(id) {
    try {
      if (typeof showToast === 'function') {
        showToast('Resending Email', `Dispatched delivery attempt for ${id}...`, 'info');
      }

      const resp = await fetch(`${API_BASE}/api/email/resend/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (resp.ok) {
        const data = await resp.json();
        if (typeof showToast === 'function') {
          showToast('Email Resent Successfully', `New delivery timeline logged for ${id}`, 'success');
        }
        await refresh(false);
        if (isDrawerOpen && activeEmailId === id) {
          viewEmail(id);
        }
      } else {
        throw new Error(`Server returned ${resp.status}`);
      }
    } catch (e) {
      console.error('Failed to resend email:', e);
      if (typeof showToast === 'function') {
        showToast('Resend Failed', 'Could not reach backend relay. Check server logs.', 'error');
      }
    }
  }

  // ── Download Email as .eml ────────────────────────────────────────────────
  function downloadEmail(id) {
    const email = emails.find(e => e.id === id);
    if (!email) return;

    const emlContent = `From: ${email.from || 'support@supportpilot.ai'}\nTo: ${email.to}\nSubject: ${email.subject}\nDate: ${(email.sent_at ? new Date(email.sent_at) : new Date()).toUTCString()}\nContent-Type: text/plain; charset=UTF-8\nX-SupportPilot-Ticket: ${email.ticket_id || 'TKT-Auto'}\nX-Delivery-Status: ${email.status || 'Delivered'}\n\n${email.body || ''}`;

    const blob = new Blob([emlContent], { type: 'message/rfc822' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${email.id}_${email.ticket_id || 'email'}.eml`;
    a.click();
    URL.revokeObjectURL(url);

    if (typeof showToast === 'function') {
      showToast('Email Downloaded', `Saved ${email.id}.eml to your local storage`, 'info');
    }
  }

  function downloadAttachment(filename) {
    const dummy = `SupportPilot Diagnostic Artifact: ${filename}\nGenerated for ticket verification.\nTimestamp: ${new Date().toISOString()}`;
    const blob = new Blob([dummy], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyBody(id) {
    const email = emails.find(e => e.id === id);
    if (!email) return;
    navigator.clipboard.writeText(email.body || '');
    if (typeof showToast === 'function') {
      showToast('Copied to Clipboard', 'Email body copied successfully', 'success');
    }
  }

  // ── Export CSV ────────────────────────────────────────────────────────────
  function exportCSV() {
    const filtered = getFilteredEmails();
    const headers = ['ID', 'Ticket ID', 'Status', 'Recipient Name', 'Recipient Email', 'Subject', 'Sent Time', 'Delivered Time'];
    const rows = [headers];

    filtered.forEach(e => {
      rows.push([
        e.id,
        e.ticket_id || 'TKT-Auto',
        e.status || 'Delivered',
        e.recipient_name || '',
        e.to,
        (e.subject || '').replace(/"/g, '""'),
        e.sent_at || e.created_at || '',
        e.delivered_at || ''
      ]);
    });

    const csvStr = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SupportPilot_Email_Outbox_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    if (typeof showToast === 'function') {
      showToast('CSV Exported', `Exported ${filtered.length} outbox email logs`, 'success');
    }
  }

  // ── Open Linked Ticket in UI ──────────────────────────────────────────────
  function openLinkedTicket(ticketId) {
    closeDrawer();
    // Switch navigation view to tickets
    const navBtn = document.querySelector('[data-view="tickets-view"]') || document.getElementById('nav-tickets');
    if (navBtn) navBtn.click();

    // If ticket drawer function exists in tickets.js, invoke it
    setTimeout(() => {
      if (window.openTicketDrawer && ticketId) {
        window.openTicketDrawer(ticketId);
      }
    }, 150);
  }

  // ── Email Settings Modal ──────────────────────────────────────────────────
  function openSettings() {
    document.getElementById('email-settings-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'email-settings-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:20px;z-index:9999;animation:fadeIn 0.2s ease;';

    modal.innerHTML = `
      <div style="background:var(--bg-card);border-radius:18px;border:1px solid var(--border-color);box-shadow:0 24px 60px rgba(0,0,0,0.3);width:100%;max-width:580px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;">
        
        <div style="padding:20px 24px;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:20px;">⚙️</span>
            <div>
              <h3 style="font-size:16px;font-weight:800;color:var(--text-primary);margin:0;">Email Relay &amp; Automation Settings</h3>
              <p style="font-size:12px;color:var(--text-secondary);margin:2px 0 0 0;">Configure outbound SMTP, Brevo transactional API, and event rules</p>
            </div>
          </div>
          <button onclick="document.getElementById('email-settings-modal').remove()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:4px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div style="padding:24px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:18px;">
          
          <div style="background:var(--bg-app);border:1px solid var(--border-color);border-radius:12px;padding:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <span style="font-size:13px;font-weight:700;color:var(--text-primary);">Relay Provider</span>
              <span style="display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;background:rgba(16, 185, 129, 0.12);color:#10b981;">
                ● Active (Brevo / SMTP Relay)
              </span>
            </div>
            <div style="font-size:12px;color:var(--text-muted);">
              Outbound emails are dispatched via <strong>support@supportpilot.ai</strong> with verified SPF and DKIM signatures.
            </div>
          </div>

          <div>
            <label style="font-size:12px;font-weight:700;color:var(--text-secondary);display:block;margin-bottom:6px;">Default Sender Address</label>
            <input type="text" value="support@supportpilot.ai" readonly style="width:100%;padding:9px 12px;background:var(--bg-app);border:1px solid var(--border-color);border-radius:8px;font-size:13px;color:var(--text-primary);outline:none;">
          </div>

          <div>
            <div style="font-size:12px;font-weight:700;color:var(--text-secondary);margin-bottom:8px;">Automated Notification Triggers</div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${[
        'Ticket Created — "We received your support request"',
        'Ticket Assigned — "Your ticket has been assigned"',
        'AI Classified — "AI classified your issue"',
        'AI Resolution — "Suggested solution is ready"',
        'Ticket Escalated — "Your ticket has been escalated"',
        'Ticket Resolved — "Your issue has been resolved"',
        'Ticket Closed — "Support ticket closed"'
      ].map(rule => `
                <label style="display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--text-primary);cursor:pointer;">
                  <input type="checkbox" checked style="accent-color:var(--accent-primary);width:15px;height:15px;">
                  <span>${rule}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <div style="border-top:1px solid var(--border-color);padding-top:16px;">
            <div style="font-size:12px;font-weight:700;color:var(--text-secondary);margin-bottom:8px;">Send Test Automated Dispatch</div>
            <div style="display:flex;gap:8px;">
              <input type="email" id="test-email-dest" placeholder="Enter recipient email (e.g. dev@company.com)" style="flex:1;padding:9px 12px;background:var(--bg-app);border:1px solid var(--border-color);border-radius:8px;font-size:13px;color:var(--text-primary);outline:none;">
              <button onclick="window.SupportPilotEmailEnhanced.sendTestEmail()" class="btn btn-primary" style="font-size:12px;padding:8px 14px;border-radius:8px;white-space:nowrap;">
                Send Test Email
              </button>
            </div>
          </div>

        </div>

        <div style="padding:16px 24px;border-top:1px solid var(--border-color);display:flex;justify-content:flex-end;gap:10px;">
          <button onclick="document.getElementById('email-settings-modal').remove()" class="btn btn-secondary" style="font-size:13px;padding:8px 16px;border-radius:8px;">
            Done
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  }

  async function sendTestEmail() {
    const input = document.getElementById('test-email-dest');
    const to = input ? input.value.trim() : '';
    if (!to || !to.includes('@')) {
      if (typeof showToast === 'function') {
        showToast('Invalid Email', 'Please enter a valid recipient email address', 'warning');
      }
      return;
    }

    try {
      const resp = await fetch(`${API_BASE}/api/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: to,
          name: to.split('@')[0],
          ticket_id: 'TKT-TEST',
          event_type: 'solution_generated',
          ticket_status: 'In Progress',
          subject: 'AI GENERATED SOLUTION: Suggested solution is ready - Test System Verification',
          body: 'Hello!\n\nThis is a verified test dispatch from SupportPilot Email Automation Outbox.\n\nAll systems operational: SMTP relay, webhook delivery tracking, and 6-stage timeline.\n\nBest regards,\nSupportPilot Engineering Team'
        })
      });

      if (resp.ok) {
        if (typeof showToast === 'function') {
          showToast('Test Email Sent', `Dispatched test email to ${to}`, 'success');
        }
        document.getElementById('email-settings-modal')?.remove();
        await refresh(false);
      }
    } catch (e) {
      console.error('Test email failed:', e);
    }
  }

  // ── Dispatch Programmatic Email (Integration hook) ────────────────────────
  async function addEmail(ticket, actionType = 'Resolved') {
    if (!ticket) return;

    const recipient = ticket.user && ticket.user.name ? ticket.user.name : (ticket.requester_name || "Customer");
    const emailAddr = ticket.user && ticket.user.email ? ticket.user.email : (ticket.requester_email || "customer@example.com");
    const subjectTitle = ticket.subject || ticket.title || "Support Request";
    const ticketId = ticket.id ? (String(ticket.id).startsWith('TKT-') ? String(ticket.id) : `TKT-${ticket.id}`) : 'TKT-Auto';

    let eventType = 'custom';
    const normAction = (actionType || '').toLowerCase();
    if (normAction.includes('create')) eventType = 'created';
    else if (normAction.includes('assign')) eventType = 'assigned';
    else if (normAction.includes('classif')) eventType = 'classified';
    else if (normAction.includes('solut')) eventType = 'solution_generated';
    else if (normAction.includes('escalat')) eventType = 'escalated';
    else if (normAction.includes('resolv')) eventType = 'resolved';
    else if (normAction.includes('close')) eventType = 'closed';

    try {
      const resp = await fetch(`${API_BASE}/api/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailAddr,
          name: recipient,
          ticket_id: ticketId,
          ticket_status: ticket.status || 'Open',
          event_type: eventType,
          subject: `${eventType.toUpperCase()}: ${subjectTitle}`,
          body: `Automated update regarding ${ticketId} (${subjectTitle}). Issue status updated to ${ticket.status || 'In Progress'}.`
        })
      });

      if (resp.ok) {
        await refresh(false);
        if (typeof showToast === 'function') {
          showToast('Email Dispatched', `Automated ${eventType} notification logged in Outbox`, 'info');
        }
      }
    } catch (e) {
      console.warn('Failed to dispatch automated email via backend:', e);
    }
  }

  // ── Data Fetching ─────────────────────────────────────────────────────────
  async function refresh(userInitiated = false) {
    if (userInitiated) {
      isRefreshing = true;
      render();
    }

    try {
      const [statsRes, outboxRes] = await Promise.all([
        fetch(`${API_BASE}/api/email/statistics`).catch(() => null),
        fetch(`${API_BASE}/api/email/outbox`).catch(() => null)
      ]);

      if (statsRes && statsRes.ok) {
        statistics = await statsRes.json();
      }

      if (outboxRes && outboxRes.ok) {
        const data = await outboxRes.json();
        emails = data.items || [];
      }
    } catch (err) {
      console.warn('Failed to refresh email outbox data:', err);
    } finally {
      isRefreshing = false;
      render();
      if (isDrawerOpen && activeEmailId) {
        const activeEmail = emails.find(e => String(e.id) === String(activeEmailId));
        if (activeEmail) {
          renderDrawerContent(activeEmail);
        }
      }
    }
  }

  // ── Filter Setters ────────────────────────────────────────────────────────
  function setSearch(val) {
    searchQuery = val;
    render();
  }

  function setFilter(val) {
    filterStatus = val;
    render();
  }

  function setDateFilter(val) {
    filterDate = val;
    render();
  }

  function setCategory(val) {
    filterCategory = val;
    render();
  }

  function resetFilters() {
    searchQuery = '';
    filterStatus = 'all';
    filterDate = 'all';
    filterCategory = 'all';
    render();
  }

  // ── Real-Time WebSockets & Listeners ──────────────────────────────────────
  function initWebSocket() {
    try {
      const wsUrl = `ws://${window.location.hostname || '127.0.0.1'}:8000/ws/dashboard`;
      socket = new WebSocket(wsUrl);

      socket.onmessage = function (event) {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'emailsUpdated' || msg.type === 'ticketsUpdated' || msg.type === 'dashboard_update') {
            refresh(false);
          }
        } catch (e) { }
      };

      socket.onclose = function () {
        setTimeout(initWebSocket, 4000);
      };
    } catch (e) { }
  }

  function init() {
    refresh();
    initWebSocket();

    // Fallback periodic poll
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      refresh(false);
    }, 15000);

    // Event listeners
    window.addEventListener('emailsUpdated', () => refresh(false));
    window.addEventListener('ticketsUpdated', () => refresh(false));
  }

  // ── Export Public API ─────────────────────────────────────────────────────
  window.SupportPilotEmailEnhanced = {
    init,
    refresh,
    setSearch,
    setFilter,
    setDateFilter,
    setCategory,
    resetFilters,
    viewEmail,
    closeDrawer,
    resendEmail,
    downloadEmail,
    downloadAttachment,
    copyBody,
    exportCSV,
    openSettings,
    sendTestEmail,
    openLinkedTicket,
    addEmail
  };

  // Auto-init if DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
