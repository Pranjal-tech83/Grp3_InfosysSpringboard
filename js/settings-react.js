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
    card:     { display:'flex', flexDirection:'column', borderRadius:8, background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,0.1)', flexGrow: 1, height: '100%' },
    header:   { padding:'24px 32px', borderBottom:'1px solid #e2e8f0' },
    hTitle:   { fontSize:20, fontWeight:700, color:'#1e293b', margin:0 },
    layout:   { display:'flex', flexDirection:'row', minHeight:400, flexGrow: 1 },
    sidebar:  { width:220, borderRight:'1px solid #e2e8f0', padding:'24px 0', flexShrink:0 },
    navItem:  { display:'flex', alignItems:'center', gap:12, padding:'12px 24px', cursor:'pointer', fontSize:14, fontWeight:500, color:'#64748b', borderLeft:'3px solid transparent', transition:'all 0.2s' },
    navItemAct: { display:'flex', alignItems:'center', gap:12, padding:'12px 24px', cursor:'pointer', fontSize:14, fontWeight:500, color:'#1d4ed8', borderLeft:'3px solid #1d4ed8', background:'#eff6ff', transition:'all 0.2s' },
    content:  { flex:1, padding:32 },
    
    avatarRow:{ display:'flex', alignItems:'center', gap:24, marginBottom:32 },
    avatarWrap:{ position:'relative', width:96, height:96, borderRadius:'50%', background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', border:'1px solid #e2e8f0' },
    avatarImg:{ width:'100%', height:'100%', objectFit:'cover' },
    avatarTxt:{ fontSize:32, fontWeight:700, color:'#94a3b8' },
    camIcon:  { position:'absolute', bottom:0, right:0, width:28, height:28, background:'#1d4ed8', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', border:'2px solid #fff', cursor:'pointer' },
    btnBlue:  { background:'#1d4ed8', color:'#fff', padding:'10px 24px', borderRadius:4, fontWeight:500, fontSize:14, border:'none', cursor:'pointer', whiteSpace:'nowrap' },
    btnGray:  { background:'#f1f5f9', color:'#475569', padding:'10px 24px', borderRadius:4, fontWeight:500, fontSize:14, border:'none', cursor:'pointer', whiteSpace:'nowrap' },
    
    formGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, marginBottom:32 },
    fg:       { display:'flex', flexDirection:'column', gap:8 },
    label:    { fontSize:13, fontWeight:600, color:'#334155' },
    input:    { width:'100%', padding:'12px 14px', fontSize:14, color:'#1e293b', border:'1px solid #cbd5e1', borderRadius:4, outline:'none', boxSizing:'border-box', background:'#fff' },
    
    btnDanger:{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', fontSize:14, fontWeight:500, background:'transparent', color:'#ef4444', border:'none', borderRadius:4, cursor:'pointer', marginLeft:'-10px' },
  };

  /* ══════════════════════════════════════════════════════════════
     SETTINGS PANEL COMPONENT
  ══════════════════════════════════════════════════════════════ */
  function SettingsPanel() {
    var storedName = localStorage.getItem('nova-user-name') || 'pranjal kumar';
    var nameParts = storedName.split(' ');
    var firstNameState = useState(nameParts[0] || '');
    var lastNameState  = useState(nameParts.slice(1).join(' ') || '');
    var emailState = useState(localStorage.getItem('nova-user-email') || 'examples@gmail.com');
    var mobileState = useState(localStorage.getItem('nova-user-mobile') || '');
    var photoState = useState(localStorage.getItem('nova-profile-img') || null);
    
    var savedState = useState(false);
    var errState   = useState('');
    var tabState   = useState('profile');
    var fileRef    = useRef(null);

    var firstName = firstNameState[0], setFirstName = firstNameState[1];
    var lastName  = lastNameState[0],  setLastName  = lastNameState[1];
    var email     = emailState[0],     setEmail     = emailState[1];
    var mobile    = mobileState[0],    setMobile    = mobileState[1];
    var photo     = photoState[0],     setPhoto     = photoState[1];
    var saved     = savedState[0],     setSaved     = savedState[1];
    var photoErr  = errState[0],       setPhotoErr  = errState[1];
    var activeTab = tabState[0],       setActiveTab = tabState[1];

    /* sync bridges */
    useEffect(function() {
      var fullName = (firstName + ' ' + lastName).trim();
      if (window.SupportPilotSettings) {
        window.SupportPilotSettings.applyProfileImage(photo);
        window.SupportPilotSettings.updateUIInitials(fullName);
      }
      var sbn = document.getElementById('sidebar-user-name');
      if (sbn) sbn.textContent = fullName;
    }, [firstName, lastName, email, photo]);

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

    function saveProfile() {
      if (!firstName.trim() || !email.trim()) {
        if (window.showToast) showToast('Save Failed', 'First name and email cannot be blank.', 'error');
        return;
      }
      var fullName = (firstName + ' ' + lastName).trim();
      localStorage.setItem('nova-user-name', fullName);
      localStorage.setItem('nova-user-email', email.trim());
      localStorage.setItem('nova-user-mobile', mobile.trim());
      setSaved(true);
      if (window.showToast) showToast('Profile Saved', 'Account settings saved successfully.', 'success');
      setTimeout(function(){ setSaved(false); }, 2500);
    }

    function doLogout() {
      localStorage.removeItem('nova-logged-in');
      if (window.showToast) showToast('Logged Out', 'Signed out of SupportPilot.', 'info');
      setTimeout(function(){ window.location.href = 'login.html'; }, 600);
    }

    var initials = getInitials((firstName + ' ' + lastName).trim());

    return h('div', { style:S.card },
      
      h('div', { style:S.header },
        h('h1', { style:S.hTitle }, 'Account settings')
      ),
      
      h('div', { style:S.layout },
        
        // Sidebar Navigation
        h('div', { style:S.sidebar },
          h('div', { onClick: function(){ setActiveTab('profile'); }, style: activeTab === 'profile' ? S.navItemAct : S.navItem }, ico('M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', 18), ' Profile Settings'),
          h('div', { onClick: function(){ setActiveTab('password'); }, style: activeTab === 'password' ? S.navItemAct : S.navItem }, ico('M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', 18), ' Password'),
          h('div', { style:{ padding:'32px 24px' } },
            h('button', { onClick: doLogout, style:S.btnDanger }, 
              ico('M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1', 18, 'currentColor'), 
              'Log out'
            )
          )
        ),

        // Main Content Area
        h('div', { style:S.content },
          activeTab === 'profile' ? h('div', null,
            // Avatar Row
            h('div', { style:S.avatarRow },
              h('div', { style:S.avatarWrap },
                photo
                  ? h('img', { src:photo, alt:'Profile', style:S.avatarImg })
                  : h('span', { style:S.avatarTxt }, initials),
                h('div', { style:S.camIcon, title:'Upload photo', onClick: function(){ fileRef.current.click(); } }, ico('M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z', 14))
              ),
              h('button', { onClick: function(){ fileRef.current.click(); }, style:S.btnBlue }, 'Upload New'),
              h('button', { onClick: removePhoto, style:S.btnGray }, 'Delete avatar'),
              photoErr && h('p', { style:{ fontSize:12, color:'#ef4444', margin:0 } }, photoErr)
            ),

            h('input', { ref:fileRef, type:'file', accept:'image/*', style:{ display:'none' },
                         onChange: function(e){ processFile(e.target.files[0]); } }),

            // Form Grid
            h('div', { style:S.formGrid },
              
              h('div', { style:S.fg },
                h('label', { style:S.label, htmlFor:'sp-fn' }, h('span',null,'First Name '), h('span',{style:{color:'#ef4444'}},'*')),
                h('input', { id:'sp-fn', style:S.input, value:firstName, placeholder:'First name',
                             onChange: function(e){ setFirstName(e.target.value); } })
              ),
              
              h('div', { style:S.fg },
                h('label', { style:S.label, htmlFor:'sp-ln' }, h('span',null,'Last Name '), h('span',{style:{color:'#ef4444'}},'*')),
                h('input', { id:'sp-ln', style:S.input, value:lastName, placeholder:'Last name',
                             onChange: function(e){ setLastName(e.target.value); } })
              ),
              
              h('div', { style:S.fg },
                h('label', { style:S.label, htmlFor:'sp-em' }, 'Email'),
                h('input', { id:'sp-em', type:'email', style:S.input, value:email, placeholder:'examples@gmail.com',
                             onChange: function(e){ setEmail(e.target.value); } })
              ),
              
              h('div', { style:S.fg },
                h('label', { style:S.label, htmlFor:'sp-mob' }, h('span',null,'Mobile Number '), h('span',{style:{color:'#ef4444'}},'*')),
                h('input', { id:'sp-mob', type:'tel', style:S.input, value:mobile, placeholder:'0806 123 7890',
                             onChange: function(e){ setMobile(e.target.value); } })
              )

            ),

            // Save Changes
            h('div', { style:{ marginTop: 16 } },
              h('button', {
                onClick: saveProfile,
                style: Object.assign({}, S.btnBlue, { background: saved ? '#10b981' : '#1d4ed8' })
              }, saved ? 'Saved!' : 'Save Changes')
            )
          ) : h('div', null,
            // Password Section
            h('h2', { style:{ fontSize:18, fontWeight:700, color:'#1e293b', marginBottom: 24, marginTop:0 } }, 'Change Password'),
            h('div', { style:S.formGrid },
              h('div', { style:S.fg },
                h('label', { style:S.label, htmlFor:'sp-cp' }, 'Current Password'),
                h('input', { id:'sp-cp', type:'password', style:S.input, placeholder:'Enter current password' })
              ),
              h('div', { style:S.fg },
                h('label', { style:S.label, htmlFor:'sp-np' }, 'New Password'),
                h('input', { id:'sp-np', type:'password', style:S.input, placeholder:'Enter new password' })
              )
            ),
            h('div', { style:{ marginTop: 16 } },
              h('button', { style: S.btnBlue }, 'Update Password')
            )
          )


        ) // end content
      ) // end layout
    ); // end card
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
