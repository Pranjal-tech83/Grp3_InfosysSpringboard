/**
 * agent-pipeline.js — Multi-Agent Execution Panel
 * Renders inside #ap-panel-root (the Agent Activity tab in the ticket drawer).
 * Separate from tickets.js; wired in via app.js init and tickets.js hook.
 */
(function () {
  'use strict';

  // ── Agent definitions ─────────────────────────────────────────────────────
  const AGENTS = [
    {
      id: 'diagnosis',
      name: 'Diagnosis Agent',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`,
      color: '#3b82f6',
      detail: (t) => ({ 'Issue Category': t.category || 'Authentication', 'Severity Score': t.priority || 'High', 'Affected Module': 'Auth Gateway', 'KB Articles Found': '4 relevant articles' })
    },
    {
      id: 'retrieval',
      name: 'Retrieval Agent',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>`,
      color: '#10b981',
      detail: () => ({ 'Articles Retrieved': '3 KB articles', 'Top Match Score': '94.2%', 'Data Sources': 'KB + Past Tickets', 'Retrieval Time': '0.8s' })
    },
    {
      id: 'resolution',
      name: 'Resolution Agent',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
      color: '#f59e0b',
      detail: () => ({ 'Resolution Generated': 'Yes', 'Confidence Score': '87%', 'Steps Suggested': '5 steps', 'Est. Resolution Time': '~12 min' })
    },
    {
      id: 'escalation',
      name: 'Escalation Agent',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>`,
      color: '#ef4444',
      detail: () => ({ 'Escalation Needed': 'No', 'Routing': 'Engineering Team', 'SLA Breach Risk': 'Low', 'Auto-Jira Ticket': 'Not triggered' })
    }
  ];

  // ── Module state ──────────────────────────────────────────────────────────
  let state = {
    status: 'idle',      // idle | running | complete | failed
    steps: [],           // { agentId, status:'pending'|'active'|'complete'|'failed', ts, msg }
    log: [],
    confidence: 0,
    expanded: null,      // which agentId detail is open
    ticket: null
  };

  let runTimer = null;

  // ── Helpers ───────────────────────────────────────────────────────────────
  function fmtTime(d) {
    d = d || new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function statusIcon(s) {
    if (s === 'pending') return `<span style="width:20px;height:20px;border-radius:50%;border:2px solid #94a3b8;display:flex;align-items:center;justify-content:center;flex-shrink:0"></span>`;
    if (s === 'active') return `<span class="ap-spinner"></span>`;
    if (s === 'complete') return `<span style="width:20px;height:20px;border-radius:50%;background:#10b981;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" width="12" height="12"><path d="M20 6L9 17l-5-5"/></svg></span>`;
    if (s === 'failed') return `<span style="width:20px;height:20px;border-radius:50%;background:#ef4444;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" width="12" height="12"><path d="M18 6L6 18M6 6l12 12"/></svg></span>`;
    return '';
  }

  function stepColor(s) {
    if (s === 'active') return '#f59e0b';
    if (s === 'complete') return '#10b981';
    if (s === 'failed') return '#ef4444';
    return '#e2e8f0';
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function render() {
    const root = document.getElementById('ap-panel-root');
    if (!root) return;

    if (state.status === 'idle') {
      root.innerHTML = `
        <div style="padding:24px 20px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
            <div>
              <div style="font-size:15px;font-weight:800;color:var(--text-primary)">Multi-Agent Resolution Workflow</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px">4-stage AI pipeline for automated diagnosis &amp; resolution</div>
            </div>
            <button onclick="window.SupportPilotAgentPipeline.run()" class="btn btn-primary" style="display:flex;align-items:center;gap:6px;font-size:12px;padding:8px 14px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Run Pipeline
            </button>
          </div>
          ${renderStepper()}
          <div style="text-align:center;padding:16px 0;font-size:12px;color:var(--text-muted)">Click <strong>Run Pipeline</strong> to start the multi-agent workflow for this ticket.</div>
        </div>`;
      return;
    }

    const isComplete = state.status === 'complete';
    const isFailed = state.status === 'failed';

    root.innerHTML = `
      <div style="padding:24px 20px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <div>
            <div style="font-size:15px;font-weight:800;color:var(--text-primary)">Multi-Agent Resolution Workflow</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px">Ticket: ${state.ticket ? state.ticket.id : 'N/A'}</div>
          </div>
          <button onclick="window.SupportPilotAgentPipeline.reset()" class="btn btn-secondary" style="font-size:11px;padding:6px 12px">Reset</button>
        </div>

        ${isFailed ? `<div class="ap-banner ap-banner-error">⚠ Pipeline Failed — Escalated to Human Support</div>` : ''}
        ${isComplete ? `<div class="ap-banner ap-banner-success">✓ Resolution Pipeline Complete — Ticket Processed Successfully</div>` : ''}

        ${isComplete ? renderConfidence() : ''}

        ${renderStepper()}

        <div style="margin-top:20px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:var(--text-muted);margin-bottom:8px">Live Activity Log</div>
          <div style="max-height:160px;overflow-y:auto;display:flex;flex-direction:column;gap:3px;" id="ap-log-list">
            ${state.log.length === 0
        ? `<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:12px">No activity yet</div>`
        : state.log.map(e => `
                <div style="display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:start;padding:5px 8px;border-radius:6px;font-size:12px;background:${e.type === 'success' ? 'rgba(16,185,129,0.07)' : e.type === 'error' ? 'rgba(239,68,68,0.07)' : 'var(--bg-app)'}">
                  <span style="font-weight:700;color:var(--accent-primary);white-space:nowrap">${e.agent}</span>
                  <span style="color:var(--text-secondary)">${e.msg}</span>
                  <span style="font-size:10px;color:var(--text-muted);white-space:nowrap">${e.time}</span>
                </div>`).join('')
      }
          </div>
        </div>
      </div>`;
  }

  function renderStepper() {
    return `<div style="display:flex;flex-direction:column;gap:0">` +
      AGENTS.map((agent, i) => {
        const step = state.steps.find(s => s.agentId === agent.id) || { status: 'pending' };
        const isExpanded = state.expanded === agent.id && step.status === 'complete';
        const borderColor = stepColor(step.status);
        const isClickable = step.status === 'complete';

        const detailRows = isExpanded && step.status === 'complete'
          ? Object.entries(agent.detail(state.ticket || {})).map(([k, v]) =>
            `<div style="display:flex;justify-content:space-between;font-size:12px;gap:8px">
                <span style="color:var(--text-muted);font-weight:600;flex-shrink:0">${k}</span>
                <span style="color:var(--text-secondary);text-align:right">${v}</span>
              </div>`).join('')
          : '';

        return `
          <div>
            <div onclick="${isClickable ? `window.SupportPilotAgentPipeline.toggleExpand('${agent.id}')` : ''}"
              style="border:1px solid ${borderColor};border-radius:10px;padding:11px 13px;background:var(--bg-sidebar);transition:all 0.2s;${isClickable ? 'cursor:pointer' : ''};${step.status === 'active' ? 'box-shadow:0 0 0 3px rgba(245,158,11,0.15)' : ''}">
              <div style="display:flex;align-items:center;gap:11px">
                ${statusIcon(step.status)}
                <div style="width:28px;height:28px;border-radius:50%;background:${agent.color}20;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:${agent.color}">${agent.icon.replace('width="16"', 'width="14"').replace('height="16"', 'height="14"') || agent.icon}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:13px;font-weight:700;color:var(--text-primary)">${agent.name}</div>
                  <div style="font-size:11px;color:var(--text-muted);margin-top:1px">${step.ts ? fmtTime(step.ts) : (step.status === 'active' ? 'Running…' : 'Pending')}</div>
                  ${isClickable ? `<div style="font-size:10px;color:var(--accent-primary);margin-top:2px">${isExpanded ? '▲ Hide details' : '▼ View output'}</div>` : ''}
                </div>
                <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;background:${borderColor}20;color:${borderColor};white-space:nowrap">${step.status.charAt(0).toUpperCase() + step.status.slice(1)}</span>
              </div>
              ${isExpanded ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-color);display:flex;flex-direction:column;gap:6px">${detailRows}</div>` : ''}
            </div>
            ${i < AGENTS.length - 1 ? `<div style="width:2px;height:8px;background:${step.status === 'complete' ? 'rgba(16,185,129,0.4)' : 'var(--border-color)'};margin:0 auto"></div>` : ''}
          </div>`;
      }).join('') + `</div>`;
  }

  function renderConfidence() {
    const pct = state.confidence;
    const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
    return `
      <div style="background:var(--bg-sidebar);border:1px solid var(--border-color);border-radius:10px;padding:12px 14px;margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-size:12px;font-weight:700;color:var(--text-secondary)">Resolution Confidence</span>
          <span style="font-size:14px;font-weight:800;padding:2px 10px;border-radius:20px;background:${color}20;color:${color}">${pct}%</span>
        </div>
        <div style="height:8px;background:var(--border-color);border-radius:999px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${color};border-radius:999px;transition:width 1s ease"></div>
        </div>
      </div>`;
  }

  // ── Run pipeline ──────────────────────────────────────────────────────────
  function run() {
    if (state.status === 'running') return;
    state.status = 'running';
    state.steps = AGENTS.map(a => ({ agentId: a.id, status: 'pending', ts: null, msg: '' }));
    state.log = [];
    state.confidence = 0;
    state.expanded = null;
    render();

    const LOG_MSGS = [
      [0, 'Diagnosis Agent', 'Analysing ticket subject, category and priority…', 'info'],
      [0, 'Diagnosis Agent', `Identified ${(state.ticket && state.ticket.category) || 'Authentication'} issue`, 'success'],
      [1, 'Retrieval Agent', 'Querying knowledge base with semantic search…', 'info'],
      [1, 'Retrieval Agent', 'Found 3 relevant KB articles (top score 94.2%)', 'success'],
      [2, 'Resolution Agent', 'Generating resolution steps from retrieved context…', 'info'],
      [2, 'Resolution Agent', 'Resolution confidence: 87% — 5 steps generated', 'success'],
      [3, 'Escalation Agent', 'Evaluating SLA risk and escalation requirements…', 'info'],
      [3, 'Escalation Agent', 'No escalation required — ticket within SLA bounds', 'success']
    ];

    let agentIdx = 0;
    let logIdx = 0;

    function tick() {
      if (agentIdx >= AGENTS.length) {
        state.status = 'complete';
        state.confidence = 87;
        render();

        // Automatically dispatch email when pipeline resolves
        if (window.SupportPilotEmailEnhanced && typeof window.SupportPilotEmailEnhanced.addEmail === 'function' && state.ticket) {
          // Small delay for UI effect
          setTimeout(() => {
            window.SupportPilotEmailEnhanced.addEmail(state.ticket);
          }, 800);
        }

        return;
      }

      const step = state.steps[agentIdx];
      step.status = 'active';
      step.ts = new Date();
      render();

      // Two log entries per agent
      setTimeout(() => {
        const [, agent, msg, type] = LOG_MSGS[logIdx];
        state.log.unshift({ agent, msg, time: fmtTime(), type });
        logIdx++;
        render();

        setTimeout(() => {
          const [, agent2, msg2, type2] = LOG_MSGS[logIdx];
          state.log.unshift({ agent: agent2, msg: msg2, time: fmtTime(), type: type2 });
          logIdx++;
          step.status = 'complete';
          step.ts = new Date();
          agentIdx++;
          render();
          runTimer = setTimeout(tick, 700);
        }, 800);
      }, 600);
    }

    runTimer = setTimeout(tick, 400);
  }

  function reset() {
    clearTimeout(runTimer);
    state = { status: 'idle', steps: [], log: [], confidence: 0, expanded: null, ticket: state.ticket };
    render();
  }

  function toggleExpand(agentId) {
    state.expanded = state.expanded === agentId ? null : agentId;
    render();
  }

  // ── Called by tickets.js when drawer opens ────────────────────────────────
  function loadTicket(ticket) {
    clearTimeout(runTimer);
    state = { status: 'idle', steps: [], log: [], confidence: 0, expanded: null, ticket };
    render();
    // Auto-run for open/pending tickets
    if (ticket && (ticket.status === 'Open' || ticket.status === 'Pending')) {
      setTimeout(run, 500);
    }
  }

  // ── Tab switching ─────────────────────────────────────────────────────────
  function initTabs() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-drawer-tab]');
      if (!btn) return;
      const tab = btn.getAttribute('data-drawer-tab');

      document.querySelectorAll('[data-drawer-tab]').forEach(b => b.classList.remove('drawer-tab-active'));
      btn.classList.add('drawer-tab-active');

      document.querySelectorAll('.drawer-tab-panel').forEach(p => {
        p.style.display = 'none';
      });
      const panel = document.getElementById(`drawer-panel-${tab}`);
      if (panel) panel.style.display = 'flex';
    });
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    initTabs();
    render();
  }

  window.SupportPilotAgentPipeline = { init, loadTicket, run, reset, toggleExpand };
})();