// dashboard-react.js - Developer Support Analytics Dashboard (React 18 Pure JS)
// Real-time backend connectivity via WebSockets + 15s polling fallback + event listeners

(function () {
  'use strict';

  var R = React;
  var h = R.createElement;
  var useState = R.useState;
  var useEffect = R.useEffect;
  var useRef = R.useRef;
  var useCallback = R.useCallback;

  // Dynamic API Base URL resolver
  function getApiBaseUrl() {
    if (window.API_BASE_URL) return window.API_BASE_URL;
    if (window.location.origin && window.location.origin.includes('8000')) {
      return window.location.origin;
    }
    return 'http://127.0.0.1:8000';
  }

  function getWsBaseUrl() {
    var base = getApiBaseUrl();
    var isSecure = base.startsWith('https:');
    var host = base.replace(/^https?:\/\//, '');
    return (isSecure ? 'wss://' : 'ws://') + host + '/ws/dashboard';
  }

  /* ── SVG Icon Helper ── */
  function ico(d, size, stroke, sw, fill) {
    size = size || 20;
    stroke = stroke || 'currentColor';
    sw = sw || 2;
    fill = fill || 'none';
    return h('svg', {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: fill,
      stroke: stroke,
      strokeWidth: sw,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      style: { display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }
    }, typeof d === 'string' ? h('path', { d: d }) : d);
  }

  var ICONS = {
    ticket: 'M20 12V8H4v4m16 0v8H4v-8m16 0H4M8 4h8',
    ai: 'M12 2v4M12 18v4M4.93 4.93l2.83 2.83M19.07 19.07l-2.83-2.83M19.07 4.93l-2.83 2.83M4.93 19.07l2.83-2.83',
    time: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    smile: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm-3-9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm-3 5.5c-2.33 0-4.32-1.45-5.12-3.5h10.24c-.8 2.05-2.79 3.5-5.12 3.5z',
    clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    plus: 'M12 5v14M5 12h14',
    sparkle: 'M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4',
    refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
    check: 'M20 6L9 17l-5-5',
    alert: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    arrowUp: 'M12 19V5M5 12l7-7 7 7',
    arrowDown: 'M12 5v14M19 12l-7 7-7-7',
    filter: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z',
    bot: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    flow: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
  };

  /* ── Number Animation Component ── */
  function AnimatedNumber(props) {
    var target = typeof props.value === 'number' ? props.value : parseFloat(props.value) || 0;
    var suffix = props.suffix || '';
    var prefix = props.prefix || '';
    var decimals = props.decimals || 0;

    var [displayVal, setDisplayVal] = useState(target);
    var prevTarget = useRef(target);

    useEffect(function () {
      var start = prevTarget.current;
      var end = target;
      prevTarget.current = target;
      if (start === end) {
        setDisplayVal(end);
        return;
      }

      var startTime = performance.now();
      var duration = 600; // ms

      function step(now) {
        var elapsed = now - startTime;
        var progress = Math.min(elapsed / duration, 1);
        // easeOutExpo
        var ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        var current = start + (end - start) * ease;
        setDisplayVal(current);
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          setDisplayVal(end);
        }
      }
      requestAnimationFrame(step);
    }, [target]);

    var formatted = displayVal.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });

    return h('span', { className: 'animated-counter' }, prefix + formatted + suffix);
  }

  /* ── Skeleton Shimmer ── */
  function Skeleton(props) {
    return h('div', {
      className: 'skeleton-shimmer',
      style: Object.assign({
        width: props.width || '100%',
        height: props.height || '20px',
        borderRadius: props.borderRadius || '8px',
        background: 'var(--border-color)',
        opacity: 0.6
      }, props.style || {})
    });
  }

  /* ── Welcome Banner with Dynamic Greeting & Real-time Clock ── */
  function WelcomeBanner({ summary, loading, isLive }) {
    var [now, setNow] = useState(new Date());

    useEffect(function () {
      var timer = setInterval(function () {
        setNow(new Date());
      }, 1000);
      return function () { clearInterval(timer); };
    }, []);

    var hour = now.getHours();
    var greeting = 'Good Morning';
    var iconEmoji = '☀️';

    if (hour >= 5 && hour < 12) {
      greeting = 'Good Morning';
      iconEmoji = '☀️';
    } else if (hour >= 12 && hour < 17) {
      greeting = 'Good Afternoon';
      iconEmoji = '🌤️';
    } else if (hour >= 17 && hour < 21) {
      greeting = 'Good Evening';
      iconEmoji = '🌙';
    } else {
      greeting = 'Good Night';
      iconEmoji = '🌌';
    }

    var dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
    var dateFull = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    var timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    return h('div', {
      className: 'welcome-banner-hero',
      style: {
        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #8b5cf6 100%)',
        borderRadius: '20px',
        padding: '28px 32px',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 12px 30px rgba(59, 130, 246, 0.25)',
        position: 'relative',
        overflow: 'hidden',
        flexWrap: 'wrap',
        gap: '20px'
      }
    },
      // Subtle background decoration glow
      h('div', {
        style: {
          position: 'absolute',
          right: '-5%',
          top: '-40%',
          width: '320px',
          height: '320px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }
      }),

      // Left Content: Greeting & Live Clock
      h('div', { style: { position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '8px' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
          h('h1', { style: { margin: 0, fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px' } },
            greeting + ' ' + iconEmoji
          ),
          isLive ? h('span', {
            style: {
              background: 'rgba(16, 185, 129, 0.25)',
              border: '1px solid rgba(16, 185, 129, 0.6)',
              color: '#a7f3d0',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }
          },
            h('span', {
              style: {
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 8px #10b981'
              }
            }),
            'LIVE SYNC'
          ) : null
        ),
        h('div', { style: { fontSize: '15px', opacity: 0.95, lineHeight: 1.5 } },
          h('span', null, 'Here is your SupportPilot overview for '),
          h('strong', { style: { color: '#fef08a' } }, dayName + ', ' + dateFull)
        ),
        h('div', {
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '4px',
            background: 'rgba(0, 0, 0, 0.2)',
            padding: '6px 14px',
            borderRadius: '10px',
            width: 'fit-content',
            fontSize: '13px',
            fontWeight: 600,
            backdropFilter: 'blur(8px)'
          }
        },
          ico(ICONS.clock, 16, '#93c5fd'),
          h('span', null, 'Current Time: ' + timeString)
        )
      ),

      // Right Content: Quick Live Stat Badges
      h('div', {
        style: {
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          gap: '20px',
          background: 'rgba(255, 255, 255, 0.12)',
          padding: '14px 22px',
          borderRadius: '16px',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
        }
      },
        // Open Tickets
        h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: '85px' } },
          h('span', { style: { fontSize: '24px', fontWeight: 800, color: '#ffffff' } },
            loading ? h(Skeleton, { width: '40px', height: '26px' }) : h(AnimatedNumber, { value: summary ? summary.open_tickets : 0 })
          ),
          h('span', { style: { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', opacity: 0.85, fontWeight: 600 } },
            'Open Tickets'
          )
        ),
        h('div', { style: { width: '1px', background: 'rgba(255, 255, 255, 0.2)' } }),
        // AI Resolution Rate
        h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: '95px' } },
          h('span', { style: { fontSize: '24px', fontWeight: 800, color: '#34d399' } },
            loading ? h(Skeleton, { width: '50px', height: '26px' }) : h(AnimatedNumber, { value: summary ? summary.ai_resolution_rate : 0, suffix: '%', decimals: 1 })
          ),
          h('span', { style: { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', opacity: 0.85, fontWeight: 600 } },
            'AI Resolution'
          )
        )
      )
    );
  }

  /* ── KPI Card Component ── */
  function KPICard(props) {
    if (props.loading) {
      return h('div', {
        className: 'card kpi-card-react',
        style: {
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-md)'
        }
      },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px' } },
          h(Skeleton, { width: '110px', height: '16px' }),
          h(Skeleton, { width: '38px', height: '38px', borderRadius: '10px' })
        ),
        h(Skeleton, { width: '80px', height: '32px', style: { margin: '8px 0' } }),
        h(Skeleton, { width: '130px', height: '14px' })
      );
    }

    return h('div', {
      className: 'card kpi-card-react',
      style: {
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '22px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-md)',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
        cursor: 'default',
        position: 'relative'
      },
      onMouseEnter: function (e) {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
        e.currentTarget.style.borderColor = props.iconColor || 'var(--accent-primary)';
      },
      onMouseLeave: function (e) {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        e.currentTarget.style.borderColor = 'var(--border-color)';
      }
    },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' } },
        h('span', { style: { fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px', textTransform: 'uppercase' } },
          props.title
        ),
        h('div', {
          style: {
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: props.iconBg || 'rgba(59, 130, 246, 0.1)',
            color: props.iconColor || '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
          }
        }, ico(props.icon, 20, props.iconColor))
      ),
      h('div', { style: { fontSize: '30px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.15, letterSpacing: '-0.5px' } },
        typeof props.value === 'number'
          ? h(AnimatedNumber, { value: props.value, prefix: props.prefix || '', suffix: props.suffix || '', decimals: props.decimals || 0 })
          : props.value
      ),
      h('div', {
        style: {
          fontSize: '12px',
          color: props.trendPositive ? '#10b981' : 'var(--text-secondary)',
          marginTop: '10px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }
      },
        props.trendText ? h('span', {
          style: {
            background: props.trendPositive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.1)',
            color: props.trendPositive ? '#059669' : 'var(--text-secondary)',
            padding: '2px 6px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px'
          }
        }, (props.trendPositive ? '↑ ' : '') + props.trendBadge) : null,
        h('span', { style: { color: 'var(--text-secondary)', fontSize: '11.5px' } }, props.trendText)
      )
    );
  }

  /* ── Dual-Line Ticket Volume & Resolution Chart ── */
  function ChartPanel({ analytics, loading }) {
    var [hoveredIndex, setHoveredIndex] = useState(null);
    var [selectedWeek, setSelectedWeek] = useState('current');

    var emptyWeekly = [
      { day: 'Mon', created: 0, resolved: 0 },
      { day: 'Tue', created: 0, resolved: 0 },
      { day: 'Wed', created: 0, resolved: 0 },
      { day: 'Thu', created: 0, resolved: 0 },
      { day: 'Fri', created: 0, resolved: 0 },
      { day: 'Sat', created: 0, resolved: 0 },
      { day: 'Sun', created: 0, resolved: 0 }
    ];

    var currentWeekly = (analytics && analytics.weekly_data && analytics.weekly_data.length === 7)
      ? analytics.weekly_data
      : emptyWeekly;

    var prevWeekly = (analytics && analytics.previous_weekly_data && analytics.previous_weekly_data.length === 7)
      ? analytics.previous_weekly_data
      : emptyWeekly;

    var weekly = selectedWeek === 'current' ? currentWeekly : prevWeekly;

    var totalCreatedWeek = weekly.reduce(function (acc, d) { return acc + (d.created || 0); }, 0);
    var totalResolvedWeek = weekly.reduce(function (acc, d) { return acc + (d.resolved || 0); }, 0);

    var chartW = 700;
    var chartH = 220;
    var padY = 25;
    var drawH = chartH - padY * 2;

    var maxVal = Math.max.apply(null, weekly.map(function (d) { return Math.max(d.created || 0, d.resolved || 0); }));
    maxVal = Math.max(maxVal, 6); // at least scale up to 6
    if (maxVal > 10) maxVal = Math.ceil(maxVal / 5) * 5;

    var stepX = chartW / 6;

    function getY(val) {
      return (chartH - padY) - ((val / maxVal) * drawH);
    }

    function buildSmoothPath(key) {
      var points = weekly.map(function (d, i) {
        return { x: i * stepX, y: getY(d[key] || 0) };
      });

      if (points.length < 2) return 'M 0 ' + (chartH - padY);

      var p = 'M ' + points[0].x + ' ' + points[0].y;
      for (var i = 0; i < points.length - 1; i++) {
        var p0 = points[i];
        var p1 = points[i + 1];
        var cp1x = p0.x + (p1.x - p0.x) * 0.5;
        var cp1y = p0.y;
        var cp2x = p0.x + (p1.x - p0.x) * 0.5;
        var cp2y = p1.y;
        p += ' C ' + cp1x + ' ' + cp1y + ', ' + cp2x + ' ' + cp2y + ', ' + p1.x + ' ' + p1.y;
      }
      return p;
    }

    var pathCreated = buildSmoothPath('created');
    var pathResolved = buildSmoothPath('resolved');

    var fillCreated = pathCreated + ' L ' + chartW + ' ' + chartH + ' L 0 ' + chartH + ' Z';
    var fillResolved = pathResolved + ' L ' + chartW + ' ' + chartH + ' L 0 ' + chartH + ' Z';

    var yTicks = [maxVal, Math.round(maxVal * 0.66), Math.round(maxVal * 0.33), 0];

    return h('div', {
      className: 'card chart-card-react',
      style: {
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-md)',
        position: 'relative'
      }
    },
      // Header
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
          h('div', {
            style: { cursor: 'pointer', opacity: selectedWeek === 'previous' ? 0.5 : 1, padding: '4px' },
            onClick: function () { setSelectedWeek('previous'); }
          }, '⬅️'),
          h('div', null,
            h('div', { style: { fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' } },
              selectedWeek === 'current' ? 'Ticket Volume & Resolution Trend' : 'Previous Week Trend'
            ),
            h('div', { style: { fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: 600 } },
              selectedWeek === 'current'
                ? (analytics && analytics.current_week_label ? analytics.current_week_label : '')
                : (analytics && analytics.previous_week_label ? analytics.previous_week_label : '')
            )
          ),
          h('div', {
            style: { cursor: 'pointer', opacity: selectedWeek === 'current' ? 0.5 : 1, padding: '4px' },
            onClick: function () { setSelectedWeek('current'); }
          }, '➡️')
        ),
        // Legend & live weekly totals
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '18px', fontSize: '12.5px', fontWeight: 600 } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
            h('span', { style: { width: '12px', height: '12px', borderRadius: '3px', background: '#3b82f6', display: 'inline-block' } }),
            h('span', { style: { color: 'var(--text-primary)' } }, 'Tickets Created: '),
            h('strong', { style: { color: '#3b82f6' } }, totalCreatedWeek)
          ),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
            h('span', { style: { width: '12px', height: '12px', borderRadius: '3px', background: '#10b981', display: 'inline-block' } }),
            h('span', { style: { color: 'var(--text-primary)' } }, 'Tickets Resolved: '),
            h('strong', { style: { color: '#10b981' } }, totalResolvedWeek)
          )
        )
      ),

      // Chart SVG Area
      loading ? h(Skeleton, { height: '240px' }) : h('div', { style: { position: 'relative', height: '250px', width: '100%', marginTop: '10px' } },
        // Y-Axis Labels
        h('div', {
          style: {
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: '30px',
            width: '35px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-muted)',
            fontWeight: 600,
            textAlign: 'right',
            paddingRight: '8px'
          }
        },
          yTicks.map(function (val, i) {
            return h('span', { key: i }, val);
          })
        ),

        // SVG Canvas
        h('svg', {
          viewBox: '0 0 ' + chartW + ' ' + chartH,
          preserveAspectRatio: 'none',
          style: {
            position: 'absolute',
            left: '40px',
            right: 0,
            top: 0,
            width: 'calc(100% - 40px)',
            height: '220px',
            overflow: 'visible'
          }
        },
          // Definitions for gradients
          h('defs', null,
            h('linearGradient', { id: 'gradCreated', x1: '0', y1: '0', x2: '0', y2: '1' },
              h('stop', { offset: '0%', stopColor: 'rgba(59, 130, 246, 0.35)' }),
              h('stop', { offset: '100%', stopColor: 'rgba(59, 130, 246, 0.0)' })
            ),
            h('linearGradient', { id: 'gradResolved', x1: '0', y1: '0', x2: '0', y2: '1' },
              h('stop', { offset: '0%', stopColor: 'rgba(16, 185, 129, 0.35)' }),
              h('stop', { offset: '100%', stopColor: 'rgba(16, 185, 129, 0.0)' })
            )
          ),

          // Horizontal Grid Lines
          yTicks.map(function (val, i) {
            var yPos = padY + (i / (yTicks.length - 1)) * drawH;
            return h('line', {
              key: i,
              x1: 0,
              y1: yPos,
              x2: chartW,
              y2: yPos,
              stroke: 'var(--border-color)',
              strokeWidth: 1,
              strokeDasharray: i === yTicks.length - 1 ? 'none' : '3 3'
            });
          }),

          // Area fills
          h('path', { d: fillCreated, fill: 'url(#gradCreated)', stroke: 'none' }),
          h('path', { d: fillResolved, fill: 'url(#gradResolved)', stroke: 'none' }),

          // Line strokes
          h('path', { d: pathCreated, fill: 'none', stroke: '#3b82f6', strokeWidth: 3.5, strokeLinecap: 'round' }),
          h('path', { d: pathResolved, fill: 'none', stroke: '#10b981', strokeWidth: 3.5, strokeLinecap: 'round' }),

          // Interactive Data Points
          weekly.map(function (d, i) {
            var cx = i * stepX;
            var cyCreated = getY(d.created || 0);
            var cyResolved = getY(d.resolved || 0);
            var isHover = hoveredIndex === i;

            return h('g', {
              key: i,
              onMouseEnter: function () { setHoveredIndex(i); },
              onMouseLeave: function () { setHoveredIndex(null); },
              style: { cursor: 'pointer' }
            },
              // Invisible broad hit area
              h('rect', {
                x: cx - stepX / 2,
                y: 0,
                width: stepX,
                height: chartH,
                fill: 'transparent'
              }),
              // Vertical hover guide
              isHover ? h('line', {
                x1: cx,
                y1: padY,
                x2: cx,
                y2: chartH - padY,
                stroke: 'var(--accent-primary)',
                strokeWidth: 1.5,
                strokeDasharray: '4 4'
              }) : null,
              // Created circle
              h('circle', {
                cx: cx,
                cy: cyCreated,
                r: isHover ? 6.5 : 4.5,
                fill: '#ffffff',
                stroke: '#3b82f6',
                strokeWidth: 3,
                style: { transition: 'r 0.2s ease' }
              }),
              // Resolved circle
              h('circle', {
                cx: cx,
                cy: cyResolved,
                r: isHover ? 6.5 : 4.5,
                fill: '#ffffff',
                stroke: '#10b981',
                strokeWidth: 3,
                style: { transition: 'r 0.2s ease' }
              })
            );
          })
        ),

        // X-Axis Day Labels
        h('div', {
          style: {
            position: 'absolute',
            left: '40px',
            right: 0,
            bottom: 0,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            fontWeight: 700,
            paddingTop: '6px'
          }
        },
          weekly.map(function (d, i) {
            var isHover = hoveredIndex === i;
            return h('div', {
              key: i,
              style: {
                textAlign: 'center',
                width: '40px',
                color: isHover ? 'var(--accent-primary)' : 'var(--text-secondary)',
                transition: 'color 0.2s'
              }
            }, d.day);
          })
        ),

        // Interactive Hover Tooltip
        hoveredIndex !== null ? h('div', {
          style: {
            position: 'absolute',
            left: 'calc(40px + ' + (hoveredIndex * (100 / 6)) + '% - 65px)',
            top: '10px',
            background: 'var(--bg-sidebar)',
            color: 'var(--text-primary)',
            padding: '8px 14px',
            borderRadius: '10px',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-color)',
            fontSize: '12px',
            pointerEvents: 'none',
            zIndex: 10,
            minWidth: '130px',
            transform: 'translateX(' + (hoveredIndex === 0 ? '40px' : (hoveredIndex === 6 ? '-110px' : (hoveredIndex === 5 ? '-40px' : '0'))) + ')'
          }
        },
          h('div', { style: { fontWeight: 800, marginBottom: '4px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '3px' } },
            weekly[hoveredIndex].day + ' Analytics'
          ),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '8px', color: '#3b82f6' } },
            h('span', null, 'Created:'),
            h('strong', null, weekly[hoveredIndex].created)
          ),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '8px', color: '#10b981' } },
            h('span', null, 'Resolved:'),
            h('strong', null, weekly[hoveredIndex].resolved)
          )
        ) : null
      )
    );
  }

  /* ── 4-Stage Escalation Workflow Status Component ── */
  function EscalationTimeline({ analytics, loading }) {
    var ws = (analytics && analytics.workflow_status) ? analytics.workflow_status : {
      classified_today: 0,
      resolved_automatically: 0,
      escalated: 0,
      pending_validation: 0
    };

    var steps = [
      {
        num: 1,
        title: 'Step 1: AI Classification',
        subtitle: 'Triage & Taxonomy Tagging',
        desc: ws.classified_today + ' tickets classified today',
        color: '#3b82f6',
        icon: ICONS.bot,
        badge: 'Active Engine',
        badgeBg: 'rgba(59, 130, 246, 0.1)',
        badgeText: '#3b82f6'
      },
      {
        num: 2,
        title: 'Step 2: AI Resolution Attempt',
        subtitle: 'RAG Knowledge Synthesis',
        desc: ws.resolved_automatically + ' tickets resolved automatically',
        color: '#10b981',
        icon: ICONS.ai,
        badge: 'Operational',
        badgeBg: 'rgba(16, 185, 129, 0.1)',
        badgeText: '#10b981'
      },
      {
        num: 3,
        title: 'Step 3: Human Agent Review',
        subtitle: 'Tier-2 Technical Escalation',
        desc: ws.escalated + ' tickets escalated to human queue',
        color: '#f97316',
        icon: ICONS.ticket,
        badge: 'In Review',
        badgeBg: 'rgba(249, 115, 22, 0.1)',
        badgeText: '#f97316'
      },
      {
        num: 4,
        title: 'Step 4: Resolution Validation',
        subtitle: 'QA & Customer Sign-off',
        desc: ws.pending_validation + ' tickets pending sign-off',
        color: '#8b5cf6',
        icon: ICONS.check,
        badge: 'Monitoring',
        badgeBg: 'rgba(139, 92, 246, 0.1)',
        badgeText: '#8b5cf6'
      }
    ];

    return h('div', {
      className: 'card workflow-card-react',
      style: {
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-md)',
        height: '100%'
      }
    },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } },
        h('div', null,
          h('div', { style: { fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' } }, 'Escalation Workflow Status'),
          h('div', { style: { fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' } }, 'Live pipeline lifecycle metrics across automated & human tiers')
        ),
        h('div', {
          style: {
            background: 'var(--accent-primary-light)',
            color: 'var(--accent-primary)',
            padding: '4px 10px',
            borderRadius: '8px',
            fontSize: '11.5px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }
        }, ico(ICONS.flow, 14), '4 Stages Active')
      ),

      loading ? h(Skeleton, { height: '240px' }) : h('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          gap: '14px',
          marginTop: '6px'
        }
      },
        // Vertical connector line
        h('div', {
          style: {
            position: 'absolute',
            left: '23px',
            top: '24px',
            bottom: '24px',
            width: '2px',
            background: 'var(--border-color)',
            zIndex: 0
          }
        }),

        steps.map(function (step) {
          return h('div', {
            key: step.num,
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              position: 'relative',
              zIndex: 1,
              background: 'var(--bg-app)',
              padding: '14px 18px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s'
            },
            onMouseEnter: function (e) {
              e.currentTarget.style.transform = 'translateX(4px)';
              e.currentTarget.style.borderColor = step.color;
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            },
            onMouseLeave: function (e) {
              e.currentTarget.style.transform = 'translateX(0)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.boxShadow = 'none';
            }
          },
            // Step Number Icon Node
            h('div', {
              style: {
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: step.color,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 800,
                flexShrink: 0,
                boxShadow: '0 4px 10px ' + step.color + '40'
              }
            }, step.num),

            // Step Details
            h('div', { style: { display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '2px' } },
              h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' } },
                h('span', { style: { fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' } }, step.title),
                h('span', {
                  style: {
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: step.badgeBg,
                    color: step.badgeText
                  }
                }, step.badge)
              ),
              h('span', { style: { fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 500 } }, step.desc)
            )
          );
        })
      )
    );
  }

  /* ── Employee Recent Ticket Activity Component ── */
  function EmployeeRecentActivity({ analytics, loading }) {
    var activities = (analytics && analytics.recent_activities) ? analytics.recent_activities : [];

    return h('div', {
      className: 'card workflow-card-react',
      style: {
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-md)',
        height: '100%',
        maxHeight: '430px',
        overflowY: 'auto'
      }
    },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } },
        h('div', null,
          h('div', { style: { fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' } }, 'Recent Ticket Activity'),
          h('div', { style: { fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' } }, 'Live updates on your recent support tickets')
        ),
        h('div', {
          style: {
            background: 'var(--accent-primary-light)',
            color: 'var(--accent-primary)',
            padding: '4px 10px',
            borderRadius: '8px',
            fontSize: '11.5px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }
        }, ico(ICONS.clock, 14), 'Live Feed')
      ),

      loading ? h(Skeleton, { height: '240px' }) : (
        activities.length === 0 ? h('div', { style: { padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' } }, 'No recent activity found.') :
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '15px' } },
            activities.map(function (act) {
              return h('div', { key: act.id, style: { display: 'flex', alignItems: 'center', gap: '15px', paddingBottom: '15px', borderBottom: '1px solid var(--border-color)' } },
                h('div', { style: { flexShrink: 0, width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, ico(ICONS.ticket, 18)),
                h('div', { style: { display: 'flex', flexDirection: 'column', flex: 1 } },
                  h('span', { style: { fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)' } }, act.description),
                  h('span', { style: { fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' } }, new Date(act.timestamp).toLocaleDateString())
                )
              );
            })
          )
      )
    );
  }

  /* ── Interactive Ticket Status Distribution (Donut Chart) ── */
  function TicketStatusDistribution({ analytics, loading }) {
    var [hoveredSlice, setHoveredSlice] = useState(null);

    var pieData = (analytics && analytics.pie_chart_data) ? analytics.pie_chart_data : {
      open: 0,
      resolved: 0,
      ai_resolved: 0
    };

    var totalTickets = (pieData.open || 0) + (pieData.resolved || 0);

    var rawSlices = [
      { id: 'open', label: 'Open Tickets', count: pieData.open || 0, color: '#f59e0b', sublabel: 'Pending agent or triage' },
      { id: 'ai_resolved', label: 'AI Resolved', count: pieData.ai_resolved || 0, color: '#8b5cf6', sublabel: 'Auto-resolved via RAG' },
      { id: 'resolved', label: 'Manual Resolved', count: Math.max((pieData.resolved || 0) - (pieData.ai_resolved || 0), 0), color: '#10b981', sublabel: 'Resolved by staff agents' }
    ];

    var denominator = totalTickets > 0 ? totalTickets : 1;
    var accumulatedPct = 0;

    var slices = rawSlices.map(function (s) {
      var pct = totalTickets > 0 ? Math.round((s.count / denominator) * 100) : 0;
      var dashArray = pct + ' ' + (100 - pct);
      var dashOffset = 25 - accumulatedPct;
      accumulatedPct += pct;
      return {
        id: s.id,
        label: s.label,
        count: s.count,
        pct: pct,
        color: s.color,
        sublabel: s.sublabel,
        dashArray: dashArray,
        dashOffset: dashOffset
      };
    });

    return h('div', {
      className: 'card donut-card-react',
      style: {
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-md)',
        height: '100%'
      }
    },
      h('div', { style: { marginBottom: '16px' } },
        h('div', { style: { fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' } }, 'Ticket Status Distribution'),
        h('div', { style: { fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' } }, 'Proportion of active vs automated vs manual closures')
      ),

      loading ? h(Skeleton, { height: '240px' }) : h('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flexGrow: 1,
          gap: '20px'
        }
      },
        // Donut SVG Circle
        h('div', { style: { position: 'relative', width: '170px', height: '170px' } },
          h('svg', {
            viewBox: '0 0 42 42',
            style: { width: '100%', height: '100%', overflow: 'visible' }
          },
            // Background empty ring
            h('circle', {
              cx: '21',
              cy: '21',
              r: '15.9155',
              fill: 'transparent',
              stroke: 'var(--border-color)',
              strokeWidth: '5.5'
            }),

            // Segments
            totalTickets > 0 ? slices.map(function (slice) {
              var isHover = hoveredSlice === slice.id;
              var isDimmed = hoveredSlice !== null && !isHover;

              return h('circle', {
                key: slice.id,
                cx: '21',
                cy: '21',
                r: '15.9155',
                fill: 'transparent',
                stroke: slice.color,
                strokeWidth: isHover ? '7.5' : '5.5',
                strokeDasharray: slice.dashArray,
                strokeDashoffset: slice.dashOffset,
                style: {
                  transition: 'stroke-width 0.25s ease, opacity 0.25s ease, filter 0.25s ease',
                  cursor: 'pointer',
                  opacity: isDimmed ? 0.35 : 1,
                  filter: isHover ? 'drop-shadow(0 0 6px ' + slice.color + '80)' : 'none'
                },
                onMouseEnter: function () { setHoveredSlice(slice.id); },
                onMouseLeave: function () { setHoveredSlice(null); }
              });
            }) : null,

            // Center cutout text
            h('circle', {
              cx: '21',
              cy: '21',
              r: '12.5',
              fill: 'var(--bg-card)',
              style: { pointerEvents: 'none' }
            }),
            h('text', {
              x: '21',
              y: '19.5',
              textAnchor: 'middle',
              fontSize: '5.8px',
              fontWeight: 800,
              fill: 'var(--text-primary)',
              style: { pointerEvents: 'none' }
            }, totalTickets.toString()),
            h('text', {
              x: '21',
              y: '25.5',
              textAnchor: 'middle',
              fontSize: '3.2px',
              fontWeight: 600,
              fill: 'var(--text-secondary)',
              style: { pointerEvents: 'none' }
            }, 'Total Tickets')
          )
        ),

        // Legend List
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' } },
          slices.map(function (slice) {
            var isHover = hoveredSlice === slice.id;
            var isDimmed = hoveredSlice !== null && !isHover;

            return h('div', {
              key: slice.id,
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '13px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: isHover ? 'var(--accent-primary-light)' : 'transparent',
                opacity: isDimmed ? 0.4 : 1,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              },
              onMouseEnter: function () { setHoveredSlice(slice.id); },
              onMouseLeave: function () { setHoveredSlice(null); }
            },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
                h('div', {
                  style: {
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: slice.color,
                    boxShadow: '0 0 6px ' + slice.color + '60'
                  }
                }),
                h('div', { style: { display: 'flex', flexDirection: 'column' } },
                  h('span', { style: { color: 'var(--text-primary)', fontWeight: 600 } }, slice.label),
                  h('span', { style: { fontSize: '11px', color: 'var(--text-muted)' } }, slice.sublabel)
                )
              ),
              h('div', { style: { textAlign: 'right' } },
                h('span', { style: { fontWeight: 800, color: 'var(--text-primary)' } }, slice.count),
                h('span', { style: { fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '4px' } }, '(' + slice.pct + '%)')
              )
            );
          })
        )
      )
    );
  }

  /* ── Quick Actions Component ── */
  function QuickActions({ onRefresh, refreshing }) {
    function handleCreateTicket() {
      if (typeof window.openNewTicketModal === 'function') {
        window.openNewTicketModal();
        return;
      }
      var legacyBtn = document.getElementById('dash-action-new-tkt') || document.getElementById('navbar-create-ticket-btn') || document.getElementById('btn-create-ticket');
      if (legacyBtn) legacyBtn.click();
    }

    function handleAskAssistant() {
      var navAssistant = document.querySelector('[data-target="assistant"]');
      if (navAssistant) {
        navAssistant.click();
      } else {
        var views = document.querySelectorAll('.view-section');
        views.forEach(function (v) { v.classList.remove('active-view'); });
        var av = document.getElementById('assistant-view');
        if (av) av.classList.add('active-view');
      }
    }

    return h('div', {
      className: 'card quick-actions-card-react',
      style: {
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-md)',
        marginTop: '20px'
      }
    },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' } },
        h('div', null,
          h('div', { style: { fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' } }, 'Quick Actions & Operational Tools')
        ),
        h('button', {
          onClick: onRefresh,
          disabled: refreshing,
          style: {
            background: 'var(--bg-app)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '8px 14px',
            borderRadius: '10px',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: refreshing ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background 0.2s'
          }
        },
          h('span', { style: { display: 'inline-block', animation: refreshing ? 'spin 1s linear infinite' : 'none' } },
            ico(ICONS.refresh, 14)
          ),
          refreshing ? 'Syncing...' : 'Live Refresh'
        )
      ),

      h('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '18px'
        }
      },
        // Action 1: Create New Ticket
        h('div', {
          className: 'quick-action-primary',
          onClick: handleCreateTicket,
          style: {
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            borderRadius: '14px',
            padding: '20px 22px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            cursor: 'pointer',
            boxShadow: '0 8px 20px rgba(37, 99, 235, 0.25)',
            transition: 'transform 0.2s, box-shadow 0.2s'
          },
          onMouseEnter: function (e) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 24px rgba(37, 99, 235, 0.35)';
          },
          onMouseLeave: function (e) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(37, 99, 235, 0.25)';
          }
        },
          h('div', {
            style: {
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }
          }, ico(ICONS.plus, 22)),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '3px' } },
            h('span', { style: { fontSize: '16px', fontWeight: 800 } }, 'Create New Ticket'),
            h('span', { style: { fontSize: '12.5px', opacity: 0.9, lineHeight: 1.4 } }, 'Submit support inquiry with AI classification & auto-routing.')
          )
        ),

        // Action 2: Ask AI Assistant
        h('div', {
          className: 'quick-action-secondary',
          onClick: handleAskAssistant,
          style: {
            background: 'var(--bg-app)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: '20px 22px',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s'
          },
          onMouseEnter: function (e) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            e.currentTarget.style.borderColor = 'var(--accent-primary)';
          },
          onMouseLeave: function (e) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            e.currentTarget.style.borderColor = 'var(--border-color)';
          }
        },
          h('div', {
            style: {
              background: 'rgba(139, 92, 246, 0.12)',
              color: '#8b5cf6',
              borderRadius: '12px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }
          }, ico(ICONS.bot, 22, '#8b5cf6')),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '3px' } },
            h('span', { style: { fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' } }, 'Ask AI Assistant'),
            h('span', { style: { fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.4 } }, 'Troubleshoot VPNs, passwords, network firewalls, and knowledge base.')
          )
        )
      )
    );
  }

  /* ── Master Dashboard Container Component ── */
  function DeveloperSupportDashboard() {
    var [summary, setSummary] = useState(null);
    var [analytics, setAnalytics] = useState(null);
    var [loading, setLoading] = useState(true);
    var [refreshing, setRefreshing] = useState(false);
    var [error, setError] = useState(null);
    var [isLiveWs, setIsLiveWs] = useState(false);

    var summaryRef = useRef(null);
    summaryRef.current = summary;
    var debounceTimerRef = useRef(null);

    var fetchData = useCallback(function (showSpinner) {
      if (showSpinner) setRefreshing(true);

      var baseUrl = getApiBaseUrl();

      Promise.all([
        fetch(baseUrl + '/api/dashboard/summary').then(function (r) {
          if (!r.ok) return fetch(baseUrl + '/api/analytics/dashboard/summary').then(function (r2) { return r2.json(); });
          return r.json();
        }),
        fetch(baseUrl + '/api/dashboard/analytics').then(function (r) {
          if (!r.ok) return fetch(baseUrl + '/api/analytics/dashboard/analytics').then(function (r2) { return r2.json(); });
          return r.json();
        })
      ]).then(function (res) {
        setSummary(res[0]);
        setAnalytics(res[1]);
        setLoading(false);
        setRefreshing(false);
        setError(null);
      }).catch(function (err) {
        console.warn('Dashboard fetch issue:', err);
        setLoading(false);
        setRefreshing(false);
        if (!summaryRef.current) {
          setError('Could not connect to backend at ' + baseUrl + '. Retrying automatically...');
        }
      });
    }, []);

    // Debounced fetch for rapid real-time updates
    var triggerDebouncedFetch = useCallback(function () {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(function () {
        fetchData(false);
      }, 200);
    }, [fetchData]);

    // WebSocket real-time connection with auto-reconnect (mounts once)
    useEffect(function () {
      var wsUrl = getWsBaseUrl();
      var socket = null;
      var reconnectTimeout = null;

      function connectWs() {
        try {
          socket = new WebSocket(wsUrl);
          wsRef.current = socket;

          socket.onopen = function () {
            setIsLiveWs(true);
          };

          socket.onmessage = function (event) {
            try {
              var data = JSON.parse(event.data);
              if (data.type === 'ticketsUpdated' || data.type === 'refresh') {
                triggerDebouncedFetch();
              }
            } catch (e) { }
          };

          socket.onclose = function () {
            setIsLiveWs(false);
            reconnectTimeout = setTimeout(connectWs, 5000);
          };

          socket.onerror = function () {
            setIsLiveWs(false);
          };
        } catch (e) {
          setIsLiveWs(false);
          reconnectTimeout = setTimeout(connectWs, 8000);
        }
      }

      connectWs();

      return function () {
        if (socket) socket.close();
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
      };
    }, [triggerDebouncedFetch]);

    // Initial Fetch & Polling Fallback (every 20s) + Event Listeners (mounts once)
    useEffect(function () {
      fetchData(false);

      var pollInterval = setInterval(function () {
        fetchData(false);
      }, 20000);

      var handleGlobalTicketUpdate = function () {
        triggerDebouncedFetch();
      };

      window.addEventListener('ticketsUpdated', handleGlobalTicketUpdate);
      window.addEventListener('ticketCreated', handleGlobalTicketUpdate);
      window.addEventListener('ticketStatusChanged', handleGlobalTicketUpdate);
      window.addEventListener('supportpilot:refresh', handleGlobalTicketUpdate);

      return function () {
        clearInterval(pollInterval);
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        window.removeEventListener('ticketsUpdated', handleGlobalTicketUpdate);
        window.removeEventListener('ticketCreated', handleGlobalTicketUpdate);
        window.removeEventListener('ticketStatusChanged', handleGlobalTicketUpdate);
        window.removeEventListener('supportpilot:refresh', handleGlobalTicketUpdate);
      };
    }, [fetchData, triggerDebouncedFetch]);

    // Expose manual trigger globally
    window.SupportPilotDashboardRefresh = function () {
      fetchData(true);
    };

    return h('div', {
      className: 'dashboard-react-container',
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '24px',
        maxWidth: '1440px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box'
      }
    },
      // Error Banner if offline
      error ? h('div', {
        style: {
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#ef4444',
          padding: '12px 18px',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '13px',
          fontWeight: 600
        }
      },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
          ico(ICONS.alert, 18, '#ef4444'),
          h('span', null, error)
        ),
        h('button', {
          onClick: function () { fetchData(true); },
          style: {
            background: '#ef4444',
            color: '#ffffff',
            border: 'none',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer'
          }
        }, 'Retry Now')
      ) : null,

      // 1. Welcome Banner
      h(WelcomeBanner, { summary: summary, loading: loading, isLive: isLiveWs }),

      // 2. Top 4 KPI Metrics Grid
      h('div', {
        className: 'kpi-grid-react',
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px'
        }
      },
        h(KPICard, {
          title: 'Total Tickets',
          value: summary ? (summary.total_tickets != null ? summary.total_tickets : summary.total_tickets_today) : 0,
          trendBadge: 'Live Counter',
          trendText: 'Live database count',
          trendPositive: true,
          icon: ICONS.ticket,
          iconColor: '#2563eb',
          iconBg: 'rgba(37, 99, 235, 0.12)',
          loading: loading
        }),
        h(KPICard, {
          title: 'OPEN TICKETS',
          value: summary ? summary.open_tickets : 0,
          trendBadge: 'Active Queue',
          trendText: 'Awaiting resolution',
          trendPositive: true,
          icon: ICONS.sparkle,
          iconColor: '#10b981',
          iconBg: 'rgba(16, 185, 129, 0.12)',
          loading: loading
        }),
        h(KPICard, {
          title: 'RESOLVED Tickets',
          value: summary ? summary.resolved_tickets : 0,
          trendBadge: 'Completed',
          trendText: 'Total resolved & closed',
          trendPositive: true,
          icon: ICONS.time,
          iconColor: '#f97316',
          iconBg: 'rgba(249, 115, 22, 0.12)',
          loading: loading
        }),
        h(KPICard, {
          title: 'User Satisfaction',
          value: summary ? summary.user_satisfaction : 94.2,
          suffix: '%',
          decimals: 1,
          trendBadge: '98% CSAT',
          trendText: 'Verified feedback score',
          trendPositive: true,
          icon: ICONS.smile,
          iconColor: '#8b5cf6',
          iconBg: 'rgba(139, 92, 246, 0.12)',
          loading: loading
        })
      ),

      // 3. Weekly Ticket Volume & Resolution Dual-Line Chart
      h(ChartPanel, { analytics: analytics, loading: loading }),

      // 4. Escalation Workflow & Donut Distribution 2-Column Grid
      h('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '24px',
          alignItems: 'stretch'
        }
      },
        h(window.location.pathname.includes('/employee') ? EmployeeRecentActivity : EscalationTimeline, { analytics: analytics, loading: loading }),
        h(TicketStatusDistribution, { analytics: analytics, loading: loading })
      ),

      // 5. Quick Actions Bar
      h(QuickActions, {
        onRefresh: function () { fetchData(true); },
        refreshing: refreshing
      })
    );
  }

  // Export globally so index.html mounts it directly
  window.SupportPilotReactDashboard = DeveloperSupportDashboard;

})();
