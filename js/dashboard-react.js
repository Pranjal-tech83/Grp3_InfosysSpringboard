// dashboard-react.js - React Dashboard Panel (Pure JS, no JSX/Babel needed)
// Uses React.createElement directly so no compilation is required.

(function () {
  'use strict';

  var R   = React;
  var h   = R.createElement;
  var useState  = R.useState;
  var useEffect = R.useEffect;

  /* ── SVG Icon helper ── */
  function ico(d, size, stroke, sw, fill) {
    size   = size   || 20;
    stroke = stroke || 'currentColor';
    sw     = sw     || 2;
    fill   = fill   || 'none';
    return h('svg', {
      width: size, height: size, viewBox: '0 0 24 24', fill: fill,
      stroke: stroke, strokeWidth: sw,
      strokeLinecap: 'round', strokeLinejoin: 'round',
    }, typeof d === 'string' ? h('path', { d: d }) : d);
  }

  var ICONS = {
    ticket: 'M20 12V8H4v4m16 0v8H4v-8m16 0H4',
    open: h('g', null, h('circle', {cx: 12, cy: 12, r: 10}), h('path', {d: 'M12 6v6l4 2'})),
    resolved: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3',
    ai: 'M12 2v4M12 18v4M4.93 4.93l2.83 2.83M19.07 19.07l-2.83-2.83M19.07 4.93l-2.83 2.83',
    plus: 'M12 5v14M5 12h14',
    sparkle: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z'
  };

  /* ── Styles ── */
  var STYLES = {
    dashboard: { display: 'flex', flexDirection: 'column', gap: '10px', animation: 'fadeIn 0.5s ease' },
    hero: {
      background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #06b6d4 100%)',
      borderRadius: '12px',
      padding: '12px',
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 10px 25px rgba(37, 99, 235, 0.2)'
    },
    heroTitle: { margin: 0, fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px' },
    heroSub: { margin: '4px 0 0 0', opacity: 0.9, fontSize: '13px' },
    heroDecor: {
      position: 'absolute', right: '-5%', top: '-20%', width: '300px', height: '300px',
      background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)',
      borderRadius: '50%'
    },
    grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' },
    kpiCard: {
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '10px',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'default'
    },
    kpiHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
    kpiTitle: { fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px' },
    kpiIconWrap: function(color, bg) { return { width: '32px', height: '32px', borderRadius: '8px', background: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }; },
    kpiValue: { fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 },
    kpiTrendUp: { fontSize: '11px', color: '#10b981', marginTop: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' },
    kpiTrendDown: { fontSize: '11px', color: '#ef4444', marginTop: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' },
    mainGrid: { gap: '10px' },
    sectionCard: {
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '10px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
    },
    sectionTitle: { fontSize: '13px', fontWeight: 700, marginBottom: '10px', color: 'var(--text-primary)' },
    btnPrimary: {
      background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
      color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px',
      fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
      boxShadow: '0 4px 12px rgba(37,99,235,0.3)', transition: 'all 0.2s', width: '100%', justifyContent: 'center'
    },
    btnSecondary: {
      background: 'var(--bg-hover)',
      color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '10px 16px', borderRadius: '8px',
      fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
      transition: 'all 0.2s', width: '100%', justifyContent: 'center', marginTop: '10px'
    }
  };

  /* ── Components ── */
  function KPICard(props) {
    return h('div', { className: 'react-kpi-card', style: STYLES.kpiCard },
      h('div', { style: STYLES.kpiHeader },
        h('span', { style: STYLES.kpiTitle }, props.title),
        h('div', { style: STYLES.kpiIconWrap(props.iconColor, props.iconBg) }, ico(props.icon, 20))
      ),
      h('div', { style: STYLES.kpiValue }, props.value),
      h('div', { style: props.trend > 0 ? STYLES.kpiTrendUp : STYLES.kpiTrendDown },
        props.trend > 0 ? '\u2191' : '\u2193',
        Math.abs(props.trend) + '% vs last week'
      )
    );
  }

  function QuickActions() {
    return h('div', { style: STYLES.sectionCard },
      h('div', { style: STYLES.sectionTitle }, 'Quick Tasks'),
      h('button', {
        id: 'dash-action-new-tkt-react', // Will be patched to modal later
        style: STYLES.btnPrimary,
        onClick: function() {
          if (window.SupportPilotTickets && window.SupportPilotTickets.openNewTicketModal) {
            window.SupportPilotTickets.openNewTicketModal();
          } else {
            // Fallback trigger if pure JS binding exists
            var vanillaBtn = document.getElementById('dash-action-new-tkt');
            if (vanillaBtn) vanillaBtn.click();
          }
        }
      }, ico(ICONS.plus, 18), 'Create New Ticket'),
      
      h('button', {
        id: 'dash-action-assistant-react',
        style: STYLES.btnSecondary,
        onClick: function() {
          var nav = document.querySelector('[data-target="assistant"]');
          if (nav) nav.click();
        }
      }, ico(ICONS.sparkle, 18), 'Ask AI Assistant')
    );
  }

  function BarChart() {
    var data = [60, 75, 85, 94, 80, 98, 92];
    var labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    var barColors = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6'];
    var maxVal = 100;
    var activeState = useState(null);
    var activeBar = activeState[0];
    var setActiveBar = activeState[1];
    var viewState = useState('chart');
    var viewMode = viewState[0];
    var setViewMode = viewState[1];

    return h('div', { style: Object.assign({}, STYLES.sectionCard, { display: 'flex', flexDirection: 'column' }) },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' } },
        h('div', { style: Object.assign({}, STYLES.sectionTitle, { marginBottom: 0 }) }, 'SLA Performance Trend'),
        h('button', {
          style: { background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' },
          onClick: function() { setViewMode(viewMode === 'chart' ? 'data' : 'chart'); }
        }, viewMode === 'chart' ? 'Show Data' : 'Back')
      ),
      viewMode === 'chart' ? h('div', { style: { position: 'relative', height: '200px', width: '100%', marginTop: 'auto' } },
        h('svg', { viewBox: '0 -10 100 110', preserveAspectRatio: 'none', style: { width: '100%', height: '100%', overflow: 'visible' } },
          // Data bars
          data.map(function(val, i) {
            var barWidth = 8;
            var spacing = (100 - barWidth) / (data.length - 1);
            var x = i * spacing;
            var hVal = (val / maxVal) * 100;
            var y = 100 - hVal;
            var isActive = activeBar === i;
            var opacity = activeBar === null || isActive ? 1 : 0.3;
            
            return h('g', { key: i, style: { cursor: 'pointer' }, onClick: function() { setActiveBar(isActive ? null : i); } },
              h('rect', { x: x, y: y, width: barWidth, height: hVal, rx: 3, fill: barColors[i % barColors.length], style: { opacity: opacity, transition: 'opacity 0.2s' } }),
              isActive && h('text', { x: x + (barWidth/2), y: y - 3, fill: 'var(--text-primary)', fontSize: '7px', fontWeight: 'bold', textAnchor: 'middle' }, val)
            );
          })
        ),
        // X Axis Labels
        h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: '12px' } },
          labels.map(function(l, i) {
            return h('span', { key: i, style: { fontSize: '12px', color: 'var(--text-muted)' } }, l);
          })
        )
      ) : h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flexGrow: 1, justifyContent: 'center' } },
        data.map(function(val, i) {
          return h('div', { key: i, style: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid var(--border-color)' } },
            h('span', { style: { fontWeight: 500, color: 'var(--text-secondary)' } }, labels[i]),
            h('span', { style: { fontWeight: 600, color: 'var(--text-primary)' } }, val + '%')
          );
        })
      )
    );
  }

  function PieChart() {
    var activeState = useState(null);
    var activeSlice = activeState[0];
    var setActiveSlice = activeState[1];
    var viewState = useState('chart');
    var viewMode = viewState[0];
    var setViewMode = viewState[1];

    // Values: Total=1248, Resolved=1196, AI=86, Open=52 (Sum=2582)
    // Slices for pie (normalized to 100 for stroke-dasharray)
    var slices = [
      { color: '#3b82f6', value: 48, display: '1,248', label: 'Total TICKETS' },
      { color: '#10b981', value: 46, display: '1,196', label: 'Resolved TICKETS' },
      { color: '#8b5cf6', value: 4, display: '86.4%', label: 'AI RESOLUTION' },
      { color: '#f59e0b', value: 2, display: '52', label: 'Open TICKETS' }
    ];
    
    // Circle math: r=15.9155 => circumference=100
    var cumValue = 0;
    return h('div', { style: Object.assign({}, STYLES.sectionCard, { display: 'flex', flexDirection: 'column' }) },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' } },
        h('div', { style: Object.assign({}, STYLES.sectionTitle, { marginBottom: 0 }) }, 'Ticket Categories'),
        h('button', {
          style: { background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' },
          onClick: function() { setViewMode(viewMode === 'chart' ? 'data' : 'chart'); }
        }, viewMode === 'chart' ? 'Show Data' : 'Back')
      ),
      viewMode === 'chart' ? h('div', { style: { display: 'flex', alignItems: 'center', gap: '16px', marginTop: 'auto', marginBottom: 'auto', flexWrap: 'wrap', justifyContent: 'center' } },
        h('svg', { viewBox: '0 0 42 42', style: { width: '130px', height: '130px', flexShrink: 0 } },
          slices.map(function(slice, i) {
            var offset = 100 - cumValue + 25; // +25 to start from top
            cumValue += slice.value;
            var isActive = activeSlice === i;
            var opacity = activeSlice === null || isActive ? 1 : 0.3;
            
            return h('circle', {
              key: i,
              cx: '21', cy: '21', r: '15.9155',
              fill: 'transparent',
              stroke: slice.color,
              strokeWidth: isActive ? '10' : '8',
              strokeDasharray: slice.value + ' ' + (100 - slice.value),
              strokeDashoffset: offset,
              style: { transition: 'all 0.3s ease-out', cursor: 'pointer', opacity: opacity },
              onClick: function() { setActiveSlice(isActive ? null : i); }
            });
          }),
          h('circle', { cx: '21', cy: '21', r: '11', fill: 'var(--bg-card)', style: { pointerEvents: 'none' } }),
          activeSlice !== null && h('text', { x: '21', y: '20', textAnchor: 'middle', fontSize: '6px', fontWeight: 'bold', fill: 'var(--text-primary)', style: { pointerEvents: 'none' } }, slices[activeSlice].display),
          activeSlice !== null && h('text', { x: '21', y: '26', textAnchor: 'middle', fontSize: '3px', fill: 'var(--text-secondary)', style: { pointerEvents: 'none' } }, slices[activeSlice].label.split(' ')[0])
        ),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' } },
          slices.map(function(slice, i) {
            return h('div', { key: i, style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                h('span', { style: { width: '8px', height: '8px', borderRadius: '50%', background: slice.color } }),
                h('span', { style: { color: 'var(--text-secondary)', fontWeight: 500 } }, slice.label)
              ),
              h('span', { style: { fontWeight: 600, color: 'var(--text-primary)' } }, slice.display)
            );
          })
        )
      ) : h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flexGrow: 1, justifyContent: 'center' } },
        slices.map(function(slice, i) {
          return h('div', { key: i, style: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid var(--border-color)' } },
            h('span', { style: { fontWeight: 500, color: 'var(--text-secondary)' } }, slice.label),
            h('span', { style: { fontWeight: 600, color: 'var(--text-primary)' } }, slice.display)
          );
        })
      )
    );
  }

  function DashboardComponent() {
    var date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    var hour = new Date().getHours();
    var greeting = "Good Morning!";
    if (hour >= 12 && hour < 17) {
      greeting = "Good Afternoon!";
    } else if (hour >= 17) {
      greeting = "Good Evening!";
    }

    return h('div', { style: STYLES.dashboard },
      /* Hero Banner */
      h('div', { style: STYLES.hero },
        h('div', { style: STYLES.heroDecor }),
        h('h1', { style: STYLES.heroTitle }, greeting),
        h('p', { style: STYLES.heroSub }, 'Here is your SupportPilot telemetry for ' + date + '.')
      ),

      /* KPI Grid */
      h('div', { style: STYLES.grid4 },
        h(KPICard, { title: 'TOTAL TICKETS', value: '1,248', trend: 12.4, icon: ICONS.ticket, iconColor: '#3b82f6', iconBg: 'rgba(59,130,246,0.1)' }),
        h(KPICard, { title: 'OPEN TICKETS', value: '52', trend: -3.1, icon: ICONS.open, iconColor: '#eab308', iconBg: 'rgba(234,179,8,0.1)' }),
        h(KPICard, { title: 'RESOLVED', value: '1,196', trend: 15.3, icon: ICONS.resolved, iconColor: '#10b981', iconBg: 'rgba(16,185,129,0.1)' }),
        h(KPICard, { title: 'AI RESOLUTION', value: '86.4%', trend: 1.8, icon: ICONS.ai, iconColor: '#8b5cf6', iconBg: 'rgba(139,92,246,0.1)' })
      ),

      /* Main Content Grid */
      h('div', { className: 'react-main-grid', style: STYLES.mainGrid },
        h(BarChart, null),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
          h(PieChart, null),
          h(QuickActions, null)
        )
      )
    );
  }

  // Export for global mounting
  window.SupportPilotReactDashboard = DashboardComponent;

})();
