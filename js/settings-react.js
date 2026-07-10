// settings-react.js - React Settings Panel (Pure JS, no JSX/Babel needed)
// Uses React.createElement directly so no compilation is required.

(function () {
  'use strict';

  var R   = React;
  var h   = R.createElement;
  var useState  = R.useState;
  var useEffect = R.useEffect;
  var useRef    = R.useRef;

  var THEME_COLORS = [
    { value: '#2563eb', label: 'Ocean Blue'  },
    { value: '#10b981', label: 'Emerald'     },
    { value: '#4f46e5', label: 'Indigo'      },
    { value: '#d97706', label: 'Amber'       },
    { value: '#7c3aed', label: 'Violet'      },
    { value: '#e11d48', label: 'Rose'        },
    { value: '#0891b2', label: 'Cyan'        },
    { value: '#16a34a', label: 'Forest'      },
  ];

  function getInitials(name) {
    return (name || 'U')
      .split(' ')
      .map(function(p){ return p[0]; })
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  /* ── SVG Icon helper ── */
  function ico(d, size, stroke, sw) {
    size   = size   || 18;
    stroke = stroke || 'currentColor';
    sw     = sw     || 2;
    return h('svg', {
      width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
      stroke: stroke, strokeWidth: sw,
      strokeLinecap: 'round', strokeLinejoin: 'round',
    }, h('path', { d: d }));
  }

  /* ── Shared CSS-in-JS style objects ── */
  var S = {
    card:     { display:'flex', flexDirection:'column', overflow:'hidden', borderRadius:12, background:'var(--bg-card, rgba(255,255,255,0.7))', border:'1px solid var(--border-color, rgba(226,232,240,.8))', boxShadow:'0 4px 16px rgba(0,0,0,.06)' },
    banner:   { position:'relative', height:54, marginBottom:32, flexShrink:0 },
    bannerGrd:{ position:'absolute', inset:0, background:'linear-gradient(135deg,#2563eb 0%,#7c3aed 50%,#06b6d4 100%)', borderRadius:'12px 12px 0 0', opacity:.88 },
    avatarWrap:{ position:'absolute', bottom:-28, left:16, zIndex:2 },
    avatar:   { width:56, height:56, borderRadius:'50%', border:'3px solid var(--bg-sidebar,#fff)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative', boxShadow:'0 4px 10px rgba(0,0,0,.15)', cursor:'crosshair' },
    avatarImg:{ width:'100%', height:'100%', objectFit:'cover' },
    avatarTxt:{ fontWeight:800, fontSize:18, color:'#fff', userSelect:'none' },
    uploadFab:{ position:'absolute', bottom:0, right:0, width:20, height:20, borderRadius:'50%', background:'#2563eb', border:'2px solid white', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, boxShadow:'0 2px 4px rgba(37,99,235,.4)' },
    bannerName:{ position:'absolute', bottom:-30, left:82, display:'flex', flexDirection:'column', gap:0 },
    bnDisp:   { fontWeight:800, fontSize:14, color:'var(--text-primary,#0f172a)' },
    bnEmail:  { fontSize:10, color:'var(--text-secondary,#475569)' },
    photoRow: { display:'flex', gap:6, padding:'0 16px', marginBottom:0 },
    formGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, padding:'4px 16px 0' },
    fg:       { display:'flex', flexDirection:'column', gap:2, padding:'0 16px' },
    label:    { fontSize:10, fontWeight:700, color:'var(--text-secondary,#475569)', letterSpacing:.5, textTransform:'uppercase', marginBottom:0 },
    iw:       { position:'relative', display:'flex', alignItems:'center' },
    ii:       { position:'absolute', left:10, display:'flex', pointerEvents:'none' },
    input:    { width:'100%', padding:'6px 10px 6px 32px', fontSize:12, fontFamily:'inherit', fontWeight:500, background:'var(--bg-input,#f8fafc)', color:'var(--text-primary,#0f172a)', border:'1.5px solid var(--border-color,rgba(226,232,240,.8))', borderRadius:6, outline:'none', caretColor:'#2563eb', boxSizing:'border-box' },
    btnPri:   { display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'8px 16px', border:'none', borderRadius:6, cursor:'pointer', fontFamily:'inherit', fontWeight:700, fontSize:12, color:'#fff', boxShadow:'0 4px 10px rgba(37,99,235,.3)', width:'100%', transition:'all .2s' },
    btnSec:   { display:'flex', alignItems:'center', gap:4, padding:'5px 10px', fontSize:11, fontWeight:600, fontFamily:'inherit', background:'rgba(37,99,235,.1)', color:'#2563eb', border:'1px solid rgba(37,99,235,.2)', borderRadius:6, cursor:'pointer', whiteSpace:'nowrap', transition:'all .2s' },
    btnDanger:{ display:'flex', alignItems:'center', gap:4, padding:'6px 12px', fontSize:12, fontWeight:700, fontFamily:'inherit', background:'linear-gradient(135deg,#ef4444,#dc2626)', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', boxShadow:'0 4px 10px rgba(239,68,68,.3)', whiteSpace:'nowrap', transition:'all .2s' },
    logCard:  { display:'flex', flexDirection:'column', gap:6, padding:12, borderRadius:12, background:'var(--bg-card,rgba(255,255,255,.7))', border:'1px solid rgba(239,68,68,.2)', boxShadow:'0 4px 12px rgba(0,0,0,.06)' },
    logHead:  { display:'flex', alignItems:'center', gap:8 },
    logIcon:  { width:30, height:30, borderRadius:8, background:'rgba(239,68,68,.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  };

  /* ── inject focus ring CSS once ── */
  (function() {
    var st = document.createElement('style');
    st.textContent = '#sp-rn:focus,#sp-re:focus{border-color:#2563eb!important;box-shadow:0 0 0 3px rgba(37,99,235,.12)!important;}';
    document.head.appendChild(st);
  })();

  /* ══════════════════════════════════════════════════════════════
     SETTINGS PANEL COMPONENT
  ══════════════════════════════════════════════════════════════ */
  function SettingsPanel() {
    var nameState  = useState(localStorage.getItem('nova-user-name')  || 'Pranjal kumar');
    var emailState = useState(localStorage.getItem('nova-user-email') || 'pranjal.kumar@supportpilot.ai');
    var photoState = useState(localStorage.getItem('nova-profile-img') || null);
    var colorState = useState(localStorage.getItem('nova-avatar-bg')   || '#2563eb');
    var savedState = useState(false);
    var errState   = useState('');
    var logState   = useState(false);
    var dragState  = useState(false);
    var fileRef    = useRef(null);

    var name  = nameState[0],  setName  = nameState[1];
    var email = emailState[0], setEmail = emailState[1];
    var photo = photoState[0], setPhoto = photoState[1];
    var color = colorState[0], setColor = colorState[1];
    var saved      = savedState[0], setSaved      = savedState[1];
    var photoErr   = errState[0],   setPhotoErr   = errState[1];
    var showLogout = logState[0],   setShowLogout = logState[1];
    var dragOver   = dragState[0],  setDragOver   = dragState[1];

    /* sync bridges */
    useEffect(function() {
      if (window.SupportPilotSettings) {
        window.SupportPilotSettings.applyAvatarColor(color);
        window.SupportPilotSettings.applyProfileImage(photo);
        window.SupportPilotSettings.updateUIInitials(name);
      }
      var sbn = document.getElementById('sidebar-user-name');
      if (sbn) sbn.textContent = name;
    }, [name, email, photo, color]);

    function processFile(file) {
      setPhotoErr('');
      if (!file) return;
      if (!file.type.startsWith('image/')) { setPhotoErr('Please select a valid image file.'); return; }
      if (file.size > 4 * 1024 * 1024)    { setPhotoErr('Image must be smaller than 4 MB.'); return; }
      var reader = new FileReader();
      reader.onload = function(e) {
        var url = e.target.result;
        setPhoto(url);
        localStorage.setItem('nova-profile-img', url);
      };
      reader.readAsDataURL(file);
    }

    function removePhoto() { setPhoto(null); localStorage.removeItem('nova-profile-img'); }

    function pickColor(c)  { setColor(c); localStorage.setItem('nova-avatar-bg', c); }

    function saveProfile() {
      if (!name.trim() || !email.trim()) {
        if (window.showToast) showToast('Save Failed', 'Name and email cannot be blank.', 'error');
        return;
      }
      localStorage.setItem('nova-user-name', name.trim());
      localStorage.setItem('nova-user-email', email.trim());
      setSaved(true);
      if (window.showToast) showToast('Profile Saved', 'Account preferences saved successfully.', 'success');
      setTimeout(function(){ setSaved(false); }, 2500);
    }

    function doLogout() {
      localStorage.removeItem('nova-logged-in');
      if (window.showToast) showToast('Logged Out', 'Signed out of SupportPilot.', 'info');
      setShowLogout(false);
      setTimeout(function(){ window.location.href = 'login.html'; }, 600);
    }

    var initials = getInitials(name);

    /* ── render ── */
    return h('div', { style:{ display:'flex', flexDirection:'column', gap:12, maxWidth:860 } },

      /* ══ PROFILE CARD ══ */
      h('div', { className:'card', style:S.card },

        /* banner + avatar */
        h('div', { style:S.banner },
          h('div', { style:S.bannerGrd }),
          h('div', { style:S.avatarWrap },
            h('div', {
              style: Object.assign({}, S.avatar, { backgroundColor: photo ? 'transparent' : color }),
              onDragOver:  function(e){ e.preventDefault(); setDragOver(true); },
              onDragLeave: function(){ setDragOver(false); },
              onDrop:      function(e){ e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]); },
              title: 'Drag & drop a photo here'
            },
              photo
                ? h('img', { src:photo, alt:'Profile', style:S.avatarImg })
                : h('span', { style:S.avatarTxt }, initials),
              dragOver && h('div', { style:{ position:'absolute', inset:0, background:'rgba(37,99,235,.65)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:12, fontWeight:700, borderRadius:'50%' } }, 'Drop!'),
              h('button', {
                onClick: function(){ fileRef.current.click(); },
                style: S.uploadFab, title:'Upload photo'
              }, ico('M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12', 13, '#fff'))
            )
          ),
          h('div', { style:S.bannerName },
            h('span', { style:S.bnDisp  }, name),
            h('span', { style:S.bnEmail }, email)
          )
        ),

        /* hidden file input */
        h('input', { ref:fileRef, type:'file', accept:'image/*', style:{ display:'none' },
                     onChange: function(e){ processFile(e.target.files[0]); } }),

        /* photo action buttons */
        h('div', { style:S.photoRow },
          h('button', { onClick: function(){ fileRef.current.click(); }, style:S.btnSec },
            ico('M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12', 13),
            ' Upload Photo'
          ),
          photo && h('button', {
            onClick: removePhoto,
            style: Object.assign({}, S.btnSec, { color:'#ef4444', borderColor:'rgba(239,68,68,.25)' })
          }, ico('M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6', 13, '#ef4444'), ' Remove')
        ),
        photoErr && h('p', { style:{ fontSize:12, color:'#ef4444', padding:'0 24px 4px' } }, photoErr),

        /* name + email */
        h('div', { style:S.formGrid },
          h('div', { style:{ display:'flex', flexDirection:'column', gap:6 } },
            h('label', { style:S.label, htmlFor:'sp-rn' }, 'Full Name'),
            h('div', { style:S.iw },
              h('span', { style:S.ii }, ico('M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z', 15, 'var(--text-muted,#94a3b8)')),
              h('input', { id:'sp-rn', style:S.input, value:name, placeholder:'Your full name',
                           onChange: function(e){ setName(e.target.value); } })
            )
          ),
          h('div', { style:{ display:'flex', flexDirection:'column', gap:6 } },
            h('label', { style:S.label, htmlFor:'sp-re' }, 'Email Address'),
            h('div', { style:S.iw },
              h('span', { style:S.ii }, ico('M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm16 2l-8 5-8-5', 15, 'var(--text-muted,#94a3b8)')),
              h('input', { id:'sp-re', type:'email', style:S.input, value:email, placeholder:'your@email.com',
                           onChange: function(e){ setEmail(e.target.value); } })
            )
          )
        ),

        /* theme color picker */
        h('div', { style: Object.assign({}, S.fg, { marginTop:4 }) },
          h('label', { style:S.label }, 'Profile Theme Color'),
          h('div', { style:{ display:'flex', gap:6, flexWrap:'wrap', marginTop:2 } },
            THEME_COLORS.map(function(c) {
              var isSelected = color === c.value;
              return h('button', {
                key: c.value, title: c.label,
                onClick: function(){ pickColor(c.value); },
                style: {
                  width:28, height:28, borderRadius:'50%',
                  background:c.value, border:'none', cursor:'pointer',
                  boxShadow: isSelected ? ('0 0 0 2px white, 0 0 0 4px ' + c.value) : '0 2px 4px rgba(0,0,0,.15)',
                  transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                  transition:'all .2s',
                  padding:0,
                }
              });
            })
          ),
          h('p', { style:{ fontSize:10, color:'var(--text-muted,#94a3b8)', marginTop:4, marginBottom: 0 } },
            'Selected: ',
            h('strong', { style:{ color:color } },
              (THEME_COLORS.find(function(c){ return c.value === color; }) || { label:color }).label
            )
          )
        ),

        /* save button */
        h('div', { style:{ padding:'8px 16px 16px' } },
          h('button', {
            onClick: saveProfile,
            style: Object.assign({}, S.btnPri, {
              background: saved
                ? 'linear-gradient(135deg,#10b981,#059669)'
                : 'linear-gradient(135deg,#2563eb,#7c3aed)'
            })
          },
            saved
              ? [ico('M20 6L9 17l-5-5', 15, '#fff', 2.5), ' Saved!']
              : [ico('M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v14a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8', 15, '#fff'), ' Save Profile']
          )
        )
      ), // end profile card

      /* ══ LOGOUT CARD ══ */
      h('div', { style:S.logCard },
        h('div', { style:S.logHead },
          h('div', { style:S.logIcon },
            ico('M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9', 20, '#ef4444')
          ),
          h('div', null,
            h('div', { style:{ fontWeight:700, fontSize:15, color:'#ef4444' } }, 'Session Management'),
            h('div', { style:{ fontSize:12, color:'var(--text-secondary,#475569)' } }, 'Sign out of your active workspace session')
          )
        ),
        h('p', { style:{ fontSize:13, color:'var(--text-secondary,#475569)', lineHeight:1.6 } },
          'You will be redirected to the sign-in page. Any unsaved changes will be lost.'
        ),
        !showLogout
          ? h('button', { onClick: function(){ setShowLogout(true); }, style:S.btnDanger },
              ico('M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9', 15, '#fff'),
              ' Log Out of Account'
            )
          : h('div', { style:{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' } },
              h('p', { style:{ fontSize:13, fontWeight:600, color:'#ef4444', flex:1 } }, 'Are you sure?'),
              h('button', { onClick:function(){ setShowLogout(false); }, style:S.btnSec }, 'Cancel'),
              h('button', { onClick:doLogout, style:S.btnDanger },
                ico('M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9', 14, '#fff'),
                ' Yes, Sign Out'
              )
            )
      ) // end logout card

    ); // end root div
  } // end SettingsPanel

  /* ── Mount function ── */
  var mounted = false;
  function mountSettingsPanel() {
    var root = document.getElementById('settings-react-root');
    if (!root || mounted) return;
    mounted = true;
    ReactDOM.createRoot(root).render(R.createElement(SettingsPanel));
  }

  window.__mountSettingsPanel = mountSettingsPanel;

  /* ── Poll until nav exists, then wire click ── */
  (function poll() {
    var navEls = document.querySelectorAll('[data-target="settings"]');
    if (navEls.length) {
      navEls.forEach(function(el) {
        el.addEventListener('click', function() { setTimeout(mountSettingsPanel, 80); });
      });
      var sv = document.getElementById('settings-view');
      if (sv && sv.classList.contains('active-view')) mountSettingsPanel();
    } else {
      setTimeout(poll, 250);
    }
  })();

})();
