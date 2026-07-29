/**
 * email-enhanced.js — Enhanced Email Automation Outbox View
 * Replaces the static email-view section with a fully interactive table,
 * stats bar, filter controls, and per-email delivery timeline modal.
 */
(function () {
    'use strict';

    // ── Seed email data ───────────────────────────────────────────────────────
    const SEED_EMAILS = [];

    let emails = [...SEED_EMAILS];
    let filterStatus = 'all';
    let searchQuery = '';
    let activeId = null;

    // ── Helpers ───────────────────────────────────────────────────────────────
    function fmtRelative(d) {
        const mins = Math.round((Date.now() - d.getTime()) / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    }

    function fmtTime(d) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function statusStyle(s) {
        const M = {
            Delivered: ['#10b981', '#10b98120'],
            Sent: ['#3b82f6', '#3b82f620'],
            Bounced: ['#f59e0b', '#f59e0b20'],
            Failed: ['#ef4444', '#ef444420']
        };
        const [c, bg] = M[s] || ['#94a3b8', '#94a3b820'];
        return { color: c, background: bg };
    }

    function avatarColor(name) {
        const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];
        let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
        return colors[h % colors.length];
    }

    function getInitials(name) {
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    }

    // ── Stats ─────────────────────────────────────────────────────────────────
    function computeStats() {
        const today = emails.filter(e => {
            const h = (Date.now() - e.sentAt.getTime()) / 3600000;
            return h <= 24;
        });
        const delivered = emails.filter(e => e.status === 'Delivered').length;
        const rate = emails.length ? Math.round((delivered / emails.length) * 100) : 0;
        const failed = emails.filter(e => e.status === 'Failed' || e.status === 'Bounced').length;
        return { today: today.length, rate, failed, total: emails.length };
    }

    // ── Filter emails ─────────────────────────────────────────────────────────
    function filtered() {
        return emails.filter(e => {
            const matchStatus = filterStatus === 'all' || e.status.toLowerCase() === filterStatus;
            const q = searchQuery.toLowerCase();
            const matchSearch = !q || e.subject.toLowerCase().includes(q) || e.recipient.toLowerCase().includes(q) || e.ticketId.toLowerCase().includes(q);
            return matchStatus && matchSearch;
        });
    }

    // ── Main render ───────────────────────────────────────────────────────────
    function render() {
        const view = document.getElementById('email-view');
        if (!view) return;
        const stats = computeStats();
        const rows = filtered();

        view.innerHTML = `
      <!-- Page Header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:12px">
        <div>
          <h1 style="font-size:24px;font-weight:800;letter-spacing:-0.5px;margin-bottom:4px">Email Automation Outbox</h1>
          <p style="color:var(--text-secondary);font-size:14px">Automated responses sent to customers — track delivery status and full timelines.</p>
        </div>
        <button onclick="window.SupportPilotEmailEnhanced.exportCSV()" class="btn btn-secondary" style="display:flex;align-items:center;gap:6px;font-size:13px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export CSV
        </button>
      </div>

      <!-- Stats Bar -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px">
        ${[
                { label: 'Emails Today', val: stats.today, icon: '📧', bg: '#3b82f620', color: '#3b82f6' },
                { label: 'Delivery Rate', val: stats.rate + '%', icon: '✅', bg: '#10b98120', color: '#10b981' },
                { label: 'Total Sent', val: stats.total, icon: '📤', bg: '#8b5cf620', color: '#8b5cf6' },
                { label: 'Failed/Bounced', val: stats.failed, icon: '⚠', bg: '#ef444420', color: '#ef4444' }
            ].map(s => `
          <div style="display:flex;align-items:center;gap:14px;padding:16px;background:var(--bg-sidebar);border:1px solid var(--border-color);border-radius:12px;box-shadow:var(--shadow-sm)">
            <div style="width:40px;height:40px;border-radius:10px;background:${s.bg};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${s.icon}</div>
            <div>
              <div style="font-size:20px;font-weight:800;color:var(--text-primary)">${s.val}</div>
              <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-top:2px">${s.label}</div>
            </div>
          </div>`).join('')}
      </div>

      <!-- Filter Bar -->
      <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
        <input type="text" id="ee-search" placeholder="Search recipient, subject, ticket…"
          value="${searchQuery}"
          oninput="window.SupportPilotEmailEnhanced.setSearch(this.value)"
          style="flex:1;min-width:200px;padding:8px 12px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-input);font-size:13px;outline:none">
        <select onchange="window.SupportPilotEmailEnhanced.setFilter(this.value)"
          style="padding:8px 12px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-input);font-size:13px;outline:none">
          <option value="all" ${filterStatus === 'all' ? 'selected' : ''}>All Status</option>
          <option value="delivered" ${filterStatus === 'delivered' ? 'selected' : ''}>Delivered</option>
          <option value="sent" ${filterStatus === 'sent' ? 'selected' : ''}>Sent</option>
          <option value="bounced" ${filterStatus === 'bounced' ? 'selected' : ''}>Bounced</option>
          <option value="failed" ${filterStatus === 'failed' ? 'selected' : ''}>Failed</option>
        </select>
      </div>

      <!-- Emails Table -->
      <div class="card" style="padding:0;overflow:hidden;background:var(--bg-sidebar)">
        ${rows.length === 0 ? `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 24px;color:var(--text-muted);gap:8px;text-align:center">
            <div style="font-size:32px">📭</div>
            <h3 style="font-size:16px;font-weight:700;color:var(--text-secondary);margin:0">No emails found</h3>
            <p style="font-size:13px;margin:0">Try a different search or filter.</p>
          </div>` : `
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr>
                ${['Recipient', 'Subject', 'Ticket', 'Status', 'Sent', ''].map(h =>
                `<th style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);padding:12px 16px;text-align:left;background:var(--bg-app);border-bottom:1px solid var(--border-color)">${h}</th>`
            ).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows.map(e => {
                const ss = statusStyle(e.status);
                const ac = avatarColor(e.recipient);
                return `<tr style="transition:background 0.15s;${activeId === e.id ? 'background:var(--accent-primary-light)' : ''}" onmouseover="this.style.background='var(--accent-primary-light)'" onmouseout="this.style.background='${activeId === e.id ? 'var(--accent-primary-light)' : 'transparent'}'">
                  <td style="padding:12px 16px;border-bottom:1px solid var(--border-color)">
                    <div style="display:flex;align-items:center;gap:10px">
                      <div style="width:32px;height:32px;border-radius:50%;background:${ac};color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0">${getInitials(e.recipient)}</div>
                      <div>
                        <div style="font-size:13px;font-weight:600;color:var(--text-primary)">${e.recipient}</div>
                        <div style="font-size:11px;color:var(--text-muted)">${e.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style="padding:12px 16px;border-bottom:1px solid var(--border-color);font-size:13px;color:var(--text-secondary);max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.subject}</td>
                  <td style="padding:12px 16px;border-bottom:1px solid var(--border-color)"><span style="font-size:12px;font-family:monospace;color:var(--accent-primary);font-weight:700">${e.ticketId}</span></td>
                  <td style="padding:12px 16px;border-bottom:1px solid var(--border-color)"><span style="display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${ss.background};color:${ss.color}">${e.status}</span></td>
                  <td style="padding:12px 16px;border-bottom:1px solid var(--border-color);font-size:12px;color:var(--text-muted)">${fmtRelative(e.sentAt)}</td>
                  <td style="padding:12px 16px;border-bottom:1px solid var(--border-color)">
                    <button onclick="window.SupportPilotEmailEnhanced.viewEmail('${e.id}')"
                      style="display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border:1px solid var(--border-color);border-radius:6px;background:var(--bg-sidebar);font-size:12px;font-weight:600;color:var(--text-secondary);cursor:pointer">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      View
                    </button>
                  </td>
                </tr>`;
            }).join('')}
            </tbody>
          </table>`}
      </div>`;
    }

    // ── Email detail modal ────────────────────────────────────────────────────
    function viewEmail(id) {
        activeId = id;
        const email = emails.find(e => e.id === id);
        if (!email) return;
        const ss = statusStyle(email.status);

        const timeline = [
            { stage: 'Queued', time: new Date(email.sentAt.getTime() - 5000), detail: 'Email queued by resolution engine', ok: true },
            { stage: 'Sent', time: new Date(email.sentAt.getTime()), detail: 'Dispatched via SMTP relay', ok: true },
            { stage: 'Delivered', time: new Date(email.sentAt.getTime() + 12000), detail: email.status === 'Delivered' ? 'Confirmed delivery receipt' : (email.status === 'Bounced' ? 'Bounced — invalid address' : 'Delivery failed'), ok: email.status === 'Delivered' }
        ];

        const body = `Dear ${email.recipient.split(' ')[0]},

Thank you for contacting SupportPilot. We have received your support request (${email.ticketId}).

Our AI resolution engine has analysed your issue: "${email.subject.replace(/^[^:]+:\s*/, '')}" and generated a solution.

Please review the suggested resolution below. If you need further assistance, do not reply to this email — instead, visit your support portal.

Status: ${email.status} at ${fmtTime(email.sentAt)}

Best regards,
SupportPilot Automated Response System`;

        // Remove old modal
        document.getElementById('ee-modal')?.remove();

        const modal = document.createElement('div');
        modal.id = 'ee-modal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:20px;z-index:9001;animation:fadeIn 0.2s ease';
        modal.innerHTML = `
      <div style="background:var(--bg-sidebar);border-radius:16px;border:1px solid var(--border-color);box-shadow:0 24px 60px rgba(0,0,0,0.2);width:100%;max-width:640px;max-height:82vh;display:flex;flex-direction:column;overflow:hidden;animation:slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)">
        <div style="padding:20px 24px;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <div>
            <div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:6px">${email.subject}</div>
            <div style="font-size:12px;color:var(--text-secondary);display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span>To: <strong>${email.recipient}</strong> &lt;${email.email}&gt;</span>
              <span>·</span>
              <span>Ticket: <strong style="color:var(--accent-primary)">${email.ticketId}</strong></span>
              <span>·</span>
              <span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;background:${ss.background};color:${ss.color}">${email.status}</span>
            </div>
          </div>
          <button onclick="document.getElementById('ee-modal').remove()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:4px;flex-shrink:0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div style="padding:20px 24px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:20px">
          <div>
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:10px">Email Body</div>
            <pre style="font-family:monospace;font-size:12px;white-space:pre-wrap;line-height:1.6;color:var(--text-secondary);background:var(--bg-app);border:1px solid var(--border-color);border-radius:8px;padding:16px;margin:0">${body}</pre>
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:14px">Delivery Timeline</div>
            <div style="display:flex;flex-direction:column;gap:0">
              ${timeline.map((t, i) => {
            const dotColor = t.ok ? '#10b981' : '#ef4444';
            return `
                  <div style="display:grid;grid-template-columns:20px 1fr;gap:12px;align-items:start">
                    <div style="display:flex;flex-direction:column;align-items:center">
                      <div style="width:20px;height:20px;border-radius:50%;border:2px solid ${dotColor};display:flex;align-items:center;justify-content:center;flex-shrink:0">
                        <svg viewBox="0 0 24 24" fill="none" stroke="${dotColor}" stroke-width="3" width="10" height="10">${t.ok ? '<path d="M20 6L9 17l-5-5"/>' : '<path d="M18 6L6 18M6 6l12 12"/>'}</svg>
                      </div>
                      ${i < timeline.length - 1 ? `<div style="width:2px;flex:1;background:var(--border-color);min-height:20px;margin-top:2px"></div>` : ''}
                    </div>
                    <div style="padding-bottom:${i < timeline.length - 1 ? '16' : '0'}px">
                      <div style="font-size:13px;font-weight:700;color:var(--text-primary)">${t.stage}</div>
                      <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${fmtTime(t.time)}</div>
                      <div style="font-size:12px;color:var(--text-secondary);margin-top:4px">${t.detail}</div>
                    </div>
                  </div>`;
        }).join('')}
            </div>
          </div>
        </div>
      </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    }

    function setFilter(val) { filterStatus = val; render(); }
    function setSearch(val) { searchQuery = val; render(); }
    function init() { render(); }
    function refresh() { render(); }

    function exportCSV() {
        const rows = [['ID', 'TicketID', 'Subject', 'Recipient', 'Email', 'Status', 'Sent']];
        emails.forEach(e => rows.push([e.id, e.ticketId, e.subject, e.recipient, e.email, e.status, e.sentAt.toISOString()]));
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `supportpilot_email_export_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ── Dispatch Automated Email ────────────────────────────────────────────────
    function addEmail(ticket) {
        if (!ticket) return;
        const newId = 'EM-' + String(emails.length + 1).padStart(3, '0');

        // Use actual ticket user and subject data
        const recipient = ticket.user && ticket.user.name ? ticket.user.name : "Customer";
        const emailAddr = ticket.user && ticket.user.email ? ticket.user.email : "customer@example.com";
        const subjectTitle = ticket.subject || ticket.title || "Support Request";

        emails.unshift({
            id: newId,
            ticketId: ticket.id,
            subject: `Resolved: ${subjectTitle}`,
            recipient: recipient,
            email: emailAddr,
            status: 'Delivered',
            sentAt: new Date(),
            category: ticket.category || 'General'
        });

        if (document.getElementById('email-view')) render();

        // If there's a toast function available in global scope, use it
        if (typeof showToast === 'function') {
            showToast('Email Dispatched', `Automated resolution email sent for ${ticket.id}`, 'info');
        }
    }

    // ── Public API ────────────────────────────────────────────────────────────
    window.SupportPilotEmailEnhanced = { init, refresh, setSearch, setFilter, viewEmail, exportCSV, addEmail };

})();
