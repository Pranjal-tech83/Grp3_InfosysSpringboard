// dashboard-react.js - React Dashboard Panel (Pure JS, no JSX/Babel needed)
// Uses React.createElement directly so no compilation is required.

(function () {
  'use strict';

  var R = React;
  var h = R.createElement;
  var useState = R.useState;
  var useEffect = R.useEffect;

  /* ── SVG Icon helper ── */
  function ico(d, size, stroke, sw, fill) {
    size = size || 20;
    stroke = stroke || 'currentColor';
    sw = sw || 2;
    fill = fill || 'none';
    return h('svg', {
      width: size, height: size, viewBox: '0 0 24 24', fill: fill,
      stroke: stroke, strokeWidth: sw,
      strokeLinecap: 'round', strokeLinejoin: 'round',
    }, typeof d === 'string' ? h('path', { d: d }) : d);
  }

  var ICONS = {
    ticket: 'M20 12V8H4v4m16 0v8H4v-8m16 0H4',
    open: h('g', null, h('circle', { cx: 12, cy: 12, r: 10 }), h('path', { d: 'M12 6v6l4 2' })),
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
    kpiIconWrap: function (color, bg) { return { width: '32px', height: '32px', borderRadius: '8px', background: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }; },
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
        onClick: function () {
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
        onClick: function () {
          var nav = document.querySelector('[data-target="assistant"]');
          if (nav) nav.click();
        }
      }, ico(ICONS.sparkle, 18), 'Ask AI Assistant')
    );
  }

  function AdvancedMetricsPanel(props) {
    var tickets = props.tickets || [];
    
    // Compute data from tickets
    var dataReceived = [0, 0, 0, 0, 0, 0, 0];
    var dataResolved = [0, 0, 0, 0, 0, 0, 0];
    tickets.forEach(function(t) {
      if (!t.createdDate) return;
      var d = new Date(t.createdDate);
      if (isNaN(d.getTime())) return;
      var day = d.getDay(); // 0 is Sunday, 1 is Monday
      var index = day === 0 ? 6 : day - 1; // Map to 0=Mon ... 6=Sun
      dataReceived[index]++;
      if (t.status === 'Resolved') {
        dataResolved[index]++;
      }
    });
    
    var labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Convert data to SVG path coordinates
    function generatePath(data, maxVal, width, height) {
      var path = '';
      var spacing = width / (data.length - 1);
      data.forEach(function(val, i) {
        var x = i * spacing;
        var y = height - ((val / maxVal) * height);
        if (i === 0) {
          path += 'M ' + x + ' ' + y + ' ';
        } else {
          // simple bezier curve calculation
          var prevX = (i - 1) * spacing;
          var prevY = height - ((data[i - 1] / maxVal) * height);
          var cp1x = prevX + spacing / 2;
          var cp1y = prevY;
          var cp2x = x - spacing / 2;
          var cp2y = y;
          path += 'C ' + cp1x + ' ' + cp1y + ', ' + cp2x + ' ' + cp2y + ', ' + x + ' ' + y + ' ';
        }
      });
      return path;
    }

    var chartW = 400;
    var chartH = 120;
    var maxChartVal = Math.max.apply(null, dataReceived.concat(dataResolved).concat([10])); // At least scale to 10
    
    // Calculate rounded upper bound for maxChartVal for y-axis labels
    var yStep = Math.ceil(maxChartVal / 6);
    maxChartVal = yStep * 6; // Adjust max value to fit exactly 6 grid lines nicely
    
    var pathReceived = generatePath(dataReceived, maxChartVal, chartW, chartH);
    var pathResolved = generatePath(dataResolved, maxChartVal, chartW, chartH);
    
    // Fill paths (close to bottom)
    var fillReceived = pathReceived + 'L ' + chartW + ' ' + chartH + ' L 0 ' + chartH + ' Z';
    var fillResolved = pathResolved + 'L ' + chartW + ' ' + chartH + ' L 0 ' + chartH + ' Z';

    // SVG Icons for lists
    var trendIcon = h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, style: { width: 16, height: 16, marginRight: 6 } }, h('polyline', { points: '22 7 13.5 15.5 8.5 10.5 2 17' }), h('polyline', { points: '16 7 22 7 22 13' }));
    var optIcon = h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, style: { width: 16, height: 16, marginRight: 6 } }, h('path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' }), h('path', { d: 'M9 12l2 2 4-4' }));

    var viewState = useState('chart');
    var viewMode = viewState[0];
    var setViewMode = viewState[1];

    return h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%' } },
      
      // LEFT PANEL
      h('div', { style: Object.assign({}, STYLES.sectionCard, { display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }) },
        
        // Line Chart Section
        h('div', null,
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } },
            h('div', { style: { display: 'flex', alignItems: 'center' } },
              trendIcon,
              h('span', { style: Object.assign({}, STYLES.sectionTitle, { marginBottom: 0, fontSize: '15px' }) }, 'Ticket Volume & Resolution')
            ),
            h('button', {
              style: { background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' },
              onClick: function () { setViewMode(viewMode === 'chart' ? 'data' : 'chart'); }
            }, viewMode === 'chart' ? 'Show Data' : 'Back')
          ),
          
          viewMode === 'chart' ? h('div', null,
            h('div', { style: { display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                h('div', { style: { width: 12, height: 12, border: '2px solid #2563eb', borderRadius: 2 } }), 'Tickets Received'
              ),
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                h('div', { style: { width: 12, height: 12, border: '2px solid #10b981', borderRadius: 2 } }), 'Tickets Resolved'
              )
            ),
            h('div', { style: { position: 'relative', height: '150px', width: '100%' } },
              h('div', { style: { position: 'absolute', left: 0, top: 0, bottom: '20px', width: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' } },
                [6, 5, 4, 3, 2, 1, 0].map(function(mult) {
                  return h('span', { key: mult }, (mult * yStep).toString());
                })
              ),
            h('svg', { 
              viewBox: '0 0 ' + chartW + ' ' + (chartH+5), 
              preserveAspectRatio: 'none', 
              style: { position: 'absolute', left: '25px', right: 0, top: 0, width: 'calc(100% - 25px)', height: 'calc(100% - 20px)' }
            },
              
              // Grid lines
              [0, 1, 2, 3, 4, 5, 6].map(function(mult) {
                var y = mult * yStep;
                var yPos = chartH - ((y / maxChartVal) * chartH);
                return h('line', { x1: 0, y1: yPos, x2: chartW, y2: yPos, stroke: 'var(--border-color)', strokeWidth: 0.5, opacity: 0.5, key: y });
              }),

              // Fills
              h('path', { d: fillReceived, fill: 'rgba(37,99,235,0.05)', stroke: 'none', style: { pointerEvents: 'none' } }),
              h('path', { d: fillResolved, fill: 'rgba(16,185,129,0.15)', stroke: 'none', style: { pointerEvents: 'none' } }),
              
              // Lines
              h('path', { d: pathReceived, fill: 'none', stroke: '#2563eb', strokeWidth: 2.5, style: { pointerEvents: 'none' } }),
              h('path', { d: pathResolved, fill: 'none', stroke: '#10b981', strokeWidth: 2.5, style: { pointerEvents: 'none' } }),

              // Points
              dataReceived.map(function(val, i) {
                return h('circle', { cx: i * (chartW / (dataReceived.length - 1)), cy: chartH - ((val / maxChartVal) * chartH), r: 2.5, fill: '#fff', stroke: '#2563eb', strokeWidth: 1.5, key: 'rcv'+i, style: { pointerEvents: 'none' } });
              }),
              dataResolved.map(function(val, i) {
                return h('circle', { cx: i * (chartW / (dataResolved.length - 1)), cy: chartH - ((val / maxChartVal) * chartH), r: 2.5, fill: '#fff', stroke: '#10b981', strokeWidth: 1.5, key: 'res'+i, style: { pointerEvents: 'none' } });
              }),
              
              // Clickable Overlay Regions
              labels.map(function(_, i) {
                var spacing = chartW / (labels.length - 1);
                var x = i === 0 ? 0 : (i * spacing) - (spacing / 2);
                var width = i === 0 || i === labels.length - 1 ? spacing / 2 : spacing;
                return h('rect', {
                  key: 'overlay'+i,
                  x: x,
                  y: 0,
                  width: width,
                  height: chartH,
                  fill: 'rgba(0,0,0,0)',
                  style: { cursor: 'pointer', pointerEvents: 'all' },
                  onClick: function() {
                    console.log('Line graph overlay clicked! Day index:', i);
                    if (window.filterTicketsByDay) {
                      window.filterTicketsByDay(i);
                    } else {
                      console.error("filterTicketsByDay function missing!");
                    }
                  }
                });
              })
            ),
              h('div', { style: { position: 'absolute', left: '25px', right: 0, bottom: 0, display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' } },
                labels.map(function(l, i) { return h('span', { key: i }, l); })
              )
            )
          ) : h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '180px' } },
            labels.map(function (day, i) {
              return h('div', { key: i, style: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 0', borderBottom: '1px solid var(--border-color)' } },
                h('span', { style: { fontWeight: 500, color: 'var(--text-secondary)' } }, day),
                h('div', { style: { display: 'flex', gap: '16px' } },
                  h('span', { style: { color: '#2563eb', fontWeight: 600 } }, 'Recv: ' + dataReceived[i]),
                  h('span', { style: { color: '#10b981', fontWeight: 600 } }, 'Res: ' + dataResolved[i])
                )
              );
            })
          )
        ),
        
        // Workflow Status Section
        h('div', { style: { marginTop: '10px' } },
          h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '12px' } },
            h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, style: { width: 16, height: 16, marginRight: 6 } }, h('path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' }), h('rect', { x: 3, y: 11, width: 18, height: 11, rx: 2, ry: 2 })),
            h('span', { style: Object.assign({}, STYLES.sectionTitle, { marginBottom: 0, fontSize: '13px' }) }, 'Escalation Workflow Status')
          ),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
            [
              { num: 1, title: 'AI Classification', desc: '127 tickets classified today', color: '#10b981' },
              { num: 2, title: 'AI Resolution Attempt', desc: '85 tickets resolved automatically', color: '#10b981' },
              { num: 3, title: 'Human Agent Review', desc: '32 tickets escalated to support team', color: '#2563eb' },
              { num: 4, title: 'Resolution Validation', desc: '10 tickets pending validation', color: '#94a3b8' }
            ].map(function(item) {
              return h('div', { key: item.num, style: { display: 'flex', alignItems: 'center', gap: '12px' } },
                h('div', { style: { width: 24, height: 24, borderRadius: '50%', background: item.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' } }, item.num),
                h('div', { style: { display: 'flex', flexDirection: 'column' } },
                  h('span', { style: { fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' } }, item.title),
                  h('span', { style: { fontSize: '11px', color: 'var(--text-secondary)' } }, item.desc)
                )
              );
            })
          )
        )
      ),

      // RIGHT PANEL
      h('div', { style: Object.assign({}, STYLES.sectionCard, { display: 'flex', flexDirection: 'column', padding: '16px', background: 'var(--bg-sidebar)' }) },
        h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '20px' } },
          optIcon,
          h('span', { style: Object.assign({}, STYLES.sectionTitle, { marginBottom: 0, fontSize: '15px' }) }, 'System Optimization Metrics')
        ),
        
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' } },
          [
            { label: 'Classification Accuracy', value: '94%', color: '#2563eb', pct: 94 },
            { label: 'Resolution Success Rate', value: '87%', color: '#10b981', pct: 87 },
            { label: 'Knowledge Base Coverage', value: '92%', color: '#f59e0b', pct: 92 },
            { label: 'System Uptime', value: '99.9%', color: '#8b5cf6', pct: 99.9 },
            { label: 'Avg. Response Generation Time', value: '2.3s', color: '#2563eb', pct: 75 },
            { label: 'User Satisfaction Score', value: '92%', color: '#10b981', pct: 92 }
          ].map(function(m, i) {
            return h('div', { key: i, style: { background: 'var(--bg-app)', padding: '12px', borderRadius: '8px' } },
              h('div', { style: { fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' } }, m.label),
              h('div', { style: { fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' } }, m.value),
              h('div', { style: { height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' } },
                h('div', { style: { height: '100%', width: m.pct + '%', background: m.color, borderRadius: '3px' } })
              )
            );
          })
        )
      )
    );
  }

  function PieChart(props) {
    var activeState = useState(null);
    var activeSlice = activeState[0];
    var setActiveSlice = activeState[1];
    var viewState = useState('chart');
    var viewMode = viewState[0];
    var setViewMode = viewState[1];

    var tickets = props.tickets || [];
    var total = tickets.length;
    var resolved = tickets.filter(function(t) { return t.status === 'Resolved'; }).length;
    var open = tickets.filter(function(t) { return t.status === 'Open'; }).length;
    var aiCount = tickets.filter(function (t) { return t.aiClassification && t.aiClassification.category; }).length;
    var aiPct = total > 0 ? Math.round((aiCount / total) * 100) : 0;
    
    var sum = total + resolved + aiPct + open;

    // Slices for pie (normalized to 100 for stroke-dasharray)
    var slices = [
      { color: '#3b82f6', value: sum > 0 ? (total / sum) * 100 : 0, display: total.toString(), label: 'Total TICKETS' },
      { color: '#10b981', value: sum > 0 ? (resolved / sum) * 100 : 0, display: resolved.toString(), label: 'Resolved TICKETS' },
      { color: '#8b5cf6', value: sum > 0 ? (aiPct / sum) * 100 : 0, display: aiPct + '%', label: 'AI RESOLUTION' },
      { color: '#f59e0b', value: sum > 0 ? (open / sum) * 100 : 0, display: open.toString(), label: 'Open TICKETS' }
    ];

    // Circle math: r=15.9155 => circumference=100
    var cumValue = 0;
    return h('div', { style: Object.assign({}, STYLES.sectionCard, { display: 'flex', flexDirection: 'column' }) },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' } },
        h('div', { style: Object.assign({}, STYLES.sectionTitle, { marginBottom: 0 }) }, 'Ticket Categories'),
        h('button', {
          style: { background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' },
          onClick: function () { setViewMode(viewMode === 'chart' ? 'data' : 'chart'); }
        }, viewMode === 'chart' ? 'Show Data' : 'Back')
      ),
      viewMode === 'chart' ? h('div', { style: { display: 'flex', alignItems: 'center', gap: '16px', marginTop: 'auto', marginBottom: 'auto', flexWrap: 'wrap', justifyContent: 'center' } },
        h('svg', { viewBox: '0 0 42 42', style: { width: '130px', height: '130px', flexShrink: 0 } },
          slices.map(function (slice, i) {
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
              onClick: function () { setActiveSlice(isActive ? null : i); }
            });
          }),
          h('circle', { cx: '21', cy: '21', r: '11', fill: 'var(--bg-card)', style: { pointerEvents: 'none' } }),
          activeSlice !== null && h('text', { x: '21', y: '20', textAnchor: 'middle', fontSize: '6px', fontWeight: 'bold', fill: 'var(--text-primary)', style: { pointerEvents: 'none' } }, slices[activeSlice].display),
          activeSlice !== null && h('text', { x: '21', y: '26', textAnchor: 'middle', fontSize: '3px', fill: 'var(--text-secondary)', style: { pointerEvents: 'none' } }, slices[activeSlice].label.split(' ')[0])
        ),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' } },
          slices.map(function (slice, i) {
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
        slices.map(function (slice, i) {
          return h('div', { key: i, style: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid var(--border-color)' } },
            h('span', { style: { fontWeight: 500, color: 'var(--text-secondary)' } }, slice.label),
            h('span', { style: { fontWeight: 600, color: 'var(--text-primary)' } }, slice.display)
          );
        })
      )
    );
  }

  function DashboardComponent() {
    var [tickets, setTickets] = useState(window.SupportPilotData ? window.SupportPilotData.initialTickets : []);

    useEffect(function () {
      var handleUpdate = function (e) { setTickets(e.detail || []); };
      document.addEventListener('ticketsUpdated', handleUpdate);
      return function () { document.removeEventListener('ticketsUpdated', handleUpdate); };
    }, []);

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
        h(KPICard, { title: 'TOTAL TICKETS', value: tickets.length > 0 ? tickets.length.toString() : '0', trend: 0, icon: ICONS.ticket, iconColor: '#3b82f6', iconBg: 'rgba(59,130,246,0.1)' }),
        h(KPICard, { title: 'OPEN TICKETS', value: tickets.length > 0 ? tickets.filter(function (t) { return t.status === 'Open'; }).length.toString() : '0', trend: 0, icon: ICONS.open, iconColor: '#eab308', iconBg: 'rgba(234,179,8,0.1)' }),
        h(KPICard, { title: 'RESOLVED', value: tickets.length > 0 ? tickets.filter(function (t) { return t.status === 'Resolved'; }).length.toString() : '0', trend: 0, icon: ICONS.resolved, iconColor: '#10b981', iconBg: 'rgba(16,185,129,0.1)' }),
        h(KPICard, { title: 'AI RESOLUTION', value: tickets.length > 0 ? Math.round((tickets.filter(function (t) { return t.aiClassification && t.aiClassification.category; }).length / tickets.length) * 100) + '%' : '0%', trend: 0, icon: ICONS.ai, iconColor: '#8b5cf6', iconBg: 'rgba(139,92,246,0.1)' })
      ),

      /* Main Content Grid */
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
        h(AdvancedMetricsPanel, { tickets: tickets }),
        h('div', { className: 'react-main-grid', style: STYLES.mainGrid },
          h(PieChart, { tickets: tickets }),
          h(QuickActions, null)
        )
      )
    );
  }

  // Export for global mounting
  window.SupportPilotReactDashboard = DashboardComponent;

})();