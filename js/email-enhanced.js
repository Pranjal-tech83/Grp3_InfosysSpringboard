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
                              onclick="window.SupportPilotEmailEnhanced.viewEmail('${e.id}')"
                              class="btn btn-secondary"
                              style="padding:6px 12px;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:5px;border-radius:8px;"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                              <span>View</span>
                            </button>

                            <button 
                              onclick="window.SupportPilotEmailEnhanced.resendEmail('${e.id}')"
                              class="btn btn-secondary"
                              style="padding:6px 10px;font-size:12px;display:inline-flex;align-items:center;border-radius:8px;"
                              title="Resend email to recipient"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                            </button>

                            <button 
                              onclick="window.SupportPilotEmailEnhanced.downloadEmail('${e.id}')"
                              class="btn btn-secondary"
                              style="padding:6px 10px;font-size:12px;display:inline-flex;align-items:center;border-radius:8px;"
                              title="Download email (.eml)"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
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

  // ── Right-Side View Email Drawer ──────────────────────────────────────────
  function viewEmail(id) {
    activeEmailId = id;
    const email = emails.find(e => e.id === id);
    if (!email) return;

    // Remove existing drawer elements if any
    document.getElementById('email-drawer-backdrop')?.remove();
    document.getElementById('email-drawer-panel')?.remove();

    const evt = getEventBadge(email.subject, email.event_type);
    const statusCls = statusClass(email.status);
    const avBg = avatarColor(email.recipient_name || email.to);
    const initials = getInitials(email.recipient_name || email.to);

    const timeline = email.timeline || [
      { stage: 'Generated', time: email.sent_at, detail: 'Email generated automatically.', ok: true },
      { stage: 'Queued', time: email.sent_at, detail: 'Placed into dispatch queue.', ok: true },
      { stage: 'Sending', time: email.sent_at, detail: 'Dispatched via relay.', ok: true },
      { stage: 'Delivered', time: email.delivered_at || email.sent_at, detail: 'Confirmed delivery receipt.', ok: true }
    ];

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'email-drawer-backdrop';
    backdrop.className = 'email-drawer-backdrop';
    backdrop.onclick = closeDrawer;

    // Panel
    const panel = document.createElement('div');
    panel.id = 'email-drawer-panel';
    panel.className = 'email-drawer';

    panel.innerHTML = `
      <!-- Drawer Header -->
      <div class="email-drawer-header">
        <div style="display:flex;flex-direction:column;gap:6px;flex:1;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="display:inline-block;padding:2px 8px;border-radius:6px;font-size:10.5px;font-weight:800;letter-spacing:0.4px;background:${evt.bg};color:${evt.color};">
              ${evt.label}
            </span>
            <span class="status-pill ${statusCls}">
              <span class="status-dot"></span>
              <span>${email.status || 'Delivered'}</span>
            </span>
            <span style="font-family:monospace;font-size:12px;font-weight:700;color:var(--text-muted);">${email.id}</span>
          </div>
          <h2 style="font-size:17px;font-weight:800;color:var(--text-primary);margin:2px 0 0 0;line-height:1.35;">
            ${email.subject}
          </h2>
        </div>

        <button onclick="window.SupportPilotEmailEnhanced.closeDrawer()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:6px;border-radius:8px;display:flex;align-items:center;justify-content:center;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="20" height="20"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- Drawer Content -->
      <div class="email-drawer-body">
        
        <!-- Metadata Grid -->
        <div>
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.6px;color:var(--text-muted);margin-bottom:8px;">
            Email Metadata
          </div>
          <div class="email-meta-grid">
            <div>
              <div style="font-size:11px;color:var(--text-muted);font-weight:600;">To (Recipient)</div>
              <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-top:2px;">
                ${email.recipient_name || 'Customer'} &lt;${email.to}&gt;
              </div>
            </div>
            <div>
              <div style="font-size:11px;color:var(--text-muted);font-weight:600;">From (Sender)</div>
              <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-top:2px;">
                ${email.from || 'support@supportpilot.ai'}
              </div>
            </div>
            <div>
              <div style="font-size:11px;color:var(--text-muted);font-weight:600;">Linked Ticket</div>
              <div style="margin-top:2px;">
                <span 
                  onclick="window.SupportPilotEmailEnhanced.openLinkedTicket('${email.ticket_id}')"
                  style="color:var(--accent-primary);font-family:monospace;font-weight:700;font-size:13px;cursor:pointer;text-decoration:underline;"
                >
                  ${email.ticket_id || 'TKT-General'}
                </span>
                <span style="font-size:11px;color:var(--text-muted);margin-left:6px;">(${email.ticket_status || 'Open'})</span>
              </div>
            </div>
            <div>
              <div style="font-size:11px;color:var(--text-muted);font-weight:600;">Sent Timestamp</div>
              <div style="font-size:12.5px;font-weight:600;color:var(--text-secondary);margin-top:2px;">
                ${fmtFullTime(email.sent_at || email.created_at)}
              </div>
            </div>
          </div>
        </div>

        <!-- 6-Stage Delivery Timeline -->
        <div>
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.6px;color:var(--text-muted);margin-bottom:12px;">
            Delivery Timeline &amp; SLA Tracking
          </div>
          <div class="email-timeline-track">
            ${timeline.map((t, idx) => {
              const isOk = t.ok === true;
              const isFail = t.ok === false;
              const dotColor = isOk ? '#10b981' : (isFail ? '#ef4444' : '#f59e0b');
              const dotBg = isOk ? 'rgba(16, 185, 129, 0.15)' : (isFail ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)');

              return `
                <div class="email-timeline-item">
                  <div style="display:flex;flex-direction:column;align-items:center;">
                    <div class="email-timeline-dot" style="background:${dotBg};color:${dotColor};border:1.5px solid ${dotColor};">
                      ${isOk ? '✓' : (isFail ? '✕' : '•')}
                    </div>
                    ${idx < timeline.length - 1 ? '<div class="email-timeline-line"></div>' : ''}
                  </div>
                  <div class="email-timeline-content">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                      <span style="font-size:13px;font-weight:700;color:var(--text-primary);">${t.stage}</span>
                      <span style="font-size:11px;color:var(--text-muted);font-weight:600;">${t.time ? fmtFullTime(t.time) : 'Pending'}</span>
                    </div>
                    <div style="font-size:12.5px;color:var(--text-secondary);margin-top:3px;line-height:1.4;">
                      ${t.detail}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Email Body Previewer -->
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.6px;color:var(--text-muted);">
              Email Body Preview
            </div>
            <button onclick="window.SupportPilotEmailEnhanced.copyBody('${email.id}')" style="background:none;border:none;color:var(--accent-primary);font-size:11.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>Copy Body</span>
            </button>
          </div>

          <div class="email-body-preview">
            <div style="border-bottom:1px solid var(--border-color);padding-bottom:12px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
              <div style="font-weight:800;font-size:14px;color:var(--accent-primary);">SupportPilot Automated Dispatch</div>
              <div style="font-size:11px;color:var(--text-muted);">ID: ${email.ticket_id || 'TKT-Auto'}</div>
            </div>
            <div>${(email.body || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            <div style="margin-top:16px;padding-top:12px;border-top:1px dashed var(--border-color);font-size:11.5px;color:var(--text-muted);">
              This is an automated system dispatch from SupportPilot AI Ticket Engine. Do not reply directly to this message.
            </div>
          </div>
        </div>

        ${(email.attachments && email.attachments.length > 0) ? `
          <div>
            <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.6px;color:var(--text-muted);margin-bottom:8px;">
              Attachments (${email.attachments.length})
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${email.attachments.map(att => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--bg-app);border:1px solid var(--border-color);border-radius:8px;">
                  <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:16px;">📄</span>
                    <span style="font-size:13px;font-weight:600;color:var(--text-primary);">${att}</span>
                  </div>
                  <button onclick="window.SupportPilotEmailEnhanced.downloadAttachment('${att}')" class="btn btn-secondary" style="padding:4px 10px;font-size:11.5px;">Download</button>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

      </div>

      <!-- Drawer Footer Actions -->
      <div class="email-drawer-footer">
        <div style="display:flex;align-items:center;gap:8px;">
          <button onclick="window.SupportPilotEmailEnhanced.resendEmail('${email.id}')" class="btn btn-primary" style="display:inline-flex;align-items:center;gap:6px;font-size:13px;padding:8px 16px;border-radius:8px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            <span>Resend Email</span>
          </button>

          <button onclick="window.SupportPilotEmailEnhanced.downloadEmail('${email.id}')" class="btn btn-secondary" style="display:inline-flex;align-items:center;gap:6px;font-size:13px;padding:8px 14px;border-radius:8px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Download EML</span>
          </button>
        </div>

        <button onclick="window.SupportPilotEmailEnhanced.openLinkedTicket('${email.ticket_id}')" class="btn btn-secondary" style="display:inline-flex;align-items:center;gap:6px;font-size:13px;padding:8px 14px;border-radius:8px;">
          <span>Open Linked Ticket</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);

    // Trigger animation
    requestAnimationFrame(() => {
      backdrop.classList.add('active');
      panel.classList.add('active');
      isDrawerOpen = true;
    });

    // Close on Escape key
    const onKey = (e) => {
      if (e.key === 'Escape') {
        closeDrawer();
        document.removeEventListener('keydown', onKey);
      }
    };
    document.addEventListener('keydown', onKey);
  }

  function closeDrawer() {
    const backdrop = document.getElementById('email-drawer-backdrop');
    const panel = document.getElementById('email-drawer-panel');
    if (backdrop) backdrop.classList.remove('active');
    if (panel) panel.classList.remove('active');
    setTimeout(() => {
      backdrop?.remove();
      panel?.remove();
      isDrawerOpen = false;
      activeEmailId = null;
    }, 280);
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
        } catch (e) {}
      };

      socket.onclose = function () {
        setTimeout(initWebSocket, 4000);
      };
    } catch (e) {}
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