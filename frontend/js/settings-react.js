// settings-react.js - Modern Settings & Profile Component for SupportPilot
// Pure JavaScript React implementation (no JSX / Babel compilation required)

(function () {
  'use strict';

  var R = React;
  var h = R.createElement;
  var useState = R.useState;
  var useEffect = R.useEffect;
  var useRef = R.useRef;

  function getApiBase() {
    if (window.API_BASE_URL) return window.API_BASE_URL;
    if (window.location.origin && window.location.origin.includes('8000')) {
      return window.location.origin;
    }
    return 'https://grp3-infosysspringboard.onrender.com';
  }

  function formatMediaUrl(url) {
    if (!url) return null;
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
      return url;
    }
    return getApiBase() + (url.startsWith('/') ? url : '/' + url);
  }

  // Global user state store & synchronization engine
  window.SupportPilotUser = {
    _currentUser: null,

    getUser: function () {
      if (this._currentUser) return this._currentUser;
      try {
        var raw = localStorage.getItem('supportpilot-user');
        if (raw) return JSON.parse(raw);
      } catch (e) { }
      return {
        id: 1,
        user_id: 1,
        name: localStorage.getItem('nova-user-name') || 'Pranjal Kumar',
        email: localStorage.getItem('nova-user-email') || 'pranjal.kumar@supportpilot.ai',
        role: 'Support Agent',
        department: 'Customer Support',
        phone: '+1 (555) 234-5678',
        bio: 'Lead AI Support Specialist at SupportPilot. Resolving complex customer escalations with AI assistance.',
        profileImage: localStorage.getItem('nova-profile-img') || null,
        emailVerified: true
      };
    },

    setUser: function (userData) {
      if (!userData) return;
      this._currentUser = Object.assign({}, this._currentUser || {}, userData);

      // Standardize fields
      if (userData.profile_image && !userData.profileImage) {
        this._currentUser.profileImage = userData.profile_image;
      }
      if (userData.email_verified !== undefined && userData.emailVerified === undefined) {
        this._currentUser.emailVerified = userData.email_verified;
      }

      if (this._currentUser.profileImage) {
        this._currentUser.profileImage = formatMediaUrl(this._currentUser.profileImage);
        this._currentUser.profile_image = this._currentUser.profileImage;
      }

      // Persist fallback cache
      try {
        localStorage.setItem('supportpilot-user', JSON.stringify(this._currentUser));
        if (this._currentUser.name) localStorage.setItem('nova-user-name', this._currentUser.name);
        if (this._currentUser.email) localStorage.setItem('nova-user-email', this._currentUser.email);
        if (this._currentUser.profileImage) {
          localStorage.setItem('nova-profile-img', this._currentUser.profileImage);
        } else if (userData.profileImage === null || userData.profile_image === null) {
          localStorage.removeItem('nova-profile-img');
        }
      } catch (e) { }

      // Apply to global DOM elements immediately
      this.syncGlobalDOM(this._currentUser);

      // Dispatch custom event
      try {
        window.dispatchEvent(new CustomEvent('supportpilot:userUpdated', { detail: this._currentUser }));
      } catch (e) { }
    },

    syncGlobalDOM: function (user) {
      if (!user) return;
      var fullName = user.name || 'Pranjal Kumar';
      var initials = fullName.split(' ').map(function (p) { return p[0]; }).join('').toUpperCase().slice(0, 2);
      var imgUrl = user.profileImage || user.profile_image;

      // Navbar elements
      var navImg = document.getElementById('navbar-avatar-img');
      var navTxt = document.getElementById('navbar-avatar-txt');
      if (navImg && navTxt) {
        if (imgUrl) {
          navImg.src = imgUrl;
          navImg.style.display = 'block';
          navTxt.style.display = 'none';
        } else {
          navImg.src = '';
          navImg.style.display = 'none';
          navTxt.textContent = initials;
          navTxt.style.display = 'block';
        }
      }

      // Sidebar username & avatar elements
      var sbn = document.getElementById('sidebar-user-name');
      if (sbn) sbn.textContent = fullName;

      var sbImg = document.getElementById('sidebar-avatar-img');
      var sbTxt = document.getElementById('sidebar-avatar-txt');
      if (sbImg && sbTxt) {
        if (imgUrl) {
          sbImg.src = imgUrl;
          sbImg.style.display = 'block';
          sbTxt.style.display = 'none';
        } else {
          sbImg.src = '';
          sbImg.style.display = 'none';
          sbTxt.textContent = initials;
          sbTxt.style.display = 'block';
        }
      }

      // Legacy bridge synchronization
      if (window.SupportPilotSettings) {
        if (typeof window.SupportPilotSettings.applyProfileImage === 'function') {
          window.SupportPilotSettings.applyProfileImage(imgUrl);
        }
        if (typeof window.SupportPilotSettings.updateUIInitials === 'function') {
          window.SupportPilotSettings.updateUIInitials(fullName);
        }
      }
    },

    fetchUser: function () {
      var self = this;
      return fetch(getApiBase() + '/api/users/me')
        .then(function (res) {
          if (!res.ok) throw new Error('API fetch returned ' + res.status);
          return res.json();
        })
        .then(function (data) {
          self.setUser(data);
          return data;
        })
        .catch(function (err) {
          console.warn('[SupportPilotUser] Fallback to cached profile:', err);
          var cached = self.getUser();
          self.syncGlobalDOM(cached);
          return cached;
        });
    }
  };

  /* Helper function to get 2-character initials */
  function getInitials(name) {
    if (!name) return 'SP';
    var parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /* SVG Icon Factory */
  function svgIcon(pathD, size, color, strokeWidth) {
    size = size || 18;
    color = color || 'currentColor';
    strokeWidth = strokeWidth || 2;
    return h('svg', {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: color,
      strokeWidth: strokeWidth,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      style: { flexShrink: 0 }
    }, h('path', { d: pathD }));
  }

  /* ══════════════════════════════════════════════════════════════
     PROFILE HEADER COMPONENT
  ══════════════════════════════════════════════════════════════ */
  function ProfileHeader(props) {
    var user = props.user;
    var onUploadClick = props.onUploadClick;
    var initials = getInitials(user.name);
    var profileImg = user.profileImage || user.profile_image;

    return h('div', { className: 'sp-profile-banner-card' },
      // Banner decorative top
      h('div', { className: 'sp-profile-banner-bg' }),

      // Main metadata banner body
      h('div', { className: 'sp-profile-banner-body' },
        h('div', { className: 'sp-profile-main-meta' },
          // Large circular header avatar
          h('div', {
            className: 'sp-profile-header-avatar',
            title: 'Click to upload or update profile photo',
            onClick: onUploadClick,
            style: { cursor: 'pointer' }
          },
            profileImg
              ? h('img', { src: profileImg, alt: user.name || 'User Profile' })
              : h('span', null, initials)
          ),

          // User details
          h('div', { className: 'sp-profile-header-details' },
            h('div', { className: 'sp-profile-header-name-row' },
              h('h2', { className: 'sp-profile-header-name' }, user.name || 'Support Agent'),
              // Online / Active Indicator
              h('div', { className: 'sp-active-pill' },
                h('div', { className: 'sp-pulse-dot' }),
                'Active'
              )
            ),
            h('p', { className: 'sp-profile-header-email' },
              svgIcon('M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', 14, 'var(--text-muted)'),
              (user.email === 'admin@company.com' ? 'theman838303@gmail.com' : user.email) || 'agent@supportpilot.ai'
            ),
            h('div', { className: 'sp-profile-badges-row' },
              h('span', { className: 'sp-role-pill' },
                svgIcon('M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', 13, 'var(--accent-primary)'),
                user.role || 'Support Agent'
              ),
              user.department && h('span', { className: 'sp-dept-pill' },
                svgIcon('M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', 13, 'var(--text-secondary)'),
                user.department
              )
            )
          )
        ),

        // Quick action
        h('div', { style: { display: 'flex', gap: 10, alignItems: 'center', marginTop: 12 } },
          h('button', {
            className: 'sp-btn sp-btn-secondary',
            onClick: onUploadClick,
            title: 'Change profile avatar'
          },
            svgIcon('M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', 15),
            'Update Avatar'
          )
        )
      )
    );
  }

  /* ══════════════════════════════════════════════════════════════
     PROFILE PHOTO CARD COMPONENT
  ══════════════════════════════════════════════════════════════ */
  function ProfilePhotoCard(props) {
    var user = props.user;
    var onUserUpdate = props.onUserUpdate;
    var fileInputRef = useRef(null);

    var previewState = useState(null);
    var previewFileState = useState(null);
    var uploadingState = useState(false);
    var uploadProgressState = useState(0);
    var alertState = useState(null); // { type: 'success'|'error', text: '' }

    var previewUrl = previewState[0], setPreviewUrl = previewState[1];
    var previewFile = previewFileState[0], setPreviewFile = previewFileState[1];
    var isUploading = uploadingState[0], setIsUploading = uploadingState[1];
    var uploadProgress = uploadProgressState[0], setUploadProgress = uploadProgressState[1];
    var alertMsg = alertState[0], setAlertMsg = alertState[1];

    var profileImg = user.profileImage || user.profile_image;
    var initials = getInitials(user.name);

    function handleFileSelect(e) {
      var file = e.target.files[0];
      if (!file) return;

      setAlertMsg(null);

      // Validate format
      var validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      var isImg = validTypes.indexOf(file.type.toLowerCase()) !== -1 ||
        /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);

      if (!isImg) {
        setAlertMsg({ type: 'error', text: 'Invalid file format. Please select a JPG, PNG, WebP, or GIF image.' });
        return;
      }

      // Validate size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setAlertMsg({ type: 'error', text: 'Image file exceeds maximum allowable size of 5 MB.' });
        return;
      }

      // Preview file before upload
      var reader = new FileReader();
      reader.onload = function (event) {
        setPreviewUrl(event.target.result);
        setPreviewFile(file);
      };
      reader.readAsDataURL(file);
    }

    function cancelPreview() {
      setPreviewUrl(null);
      setPreviewFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }

    function confirmUpload() {
      if (!previewFile) return;

      setIsUploading(true);
      setUploadProgress(20);

      var formData = new FormData();
      formData.append('file', previewFile);

      // Smooth progress animation simulation
      var progressInterval = setInterval(function () {
        setUploadProgress(function (prev) {
          if (prev >= 85) return prev;
          return prev + 15;
        });
      }, 120);

      fetch(getApiBase() + '/api/users/me/profile-image', {
        method: 'POST',
        body: formData
      })
        .then(function (res) {
          if (!res.ok) throw new Error('Upload failed with status ' + res.status);
          return res.json();
        })
        .then(function (data) {
          clearInterval(progressInterval);
          setUploadProgress(100);

          setTimeout(function () {
            setIsUploading(false);
            setPreviewUrl(null);
            setPreviewFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

            var updatedUser = data.user || Object.assign({}, user, {
              profileImage: data.profileImage || data.profile_image,
              profile_image: data.profileImage || data.profile_image
            });

            window.SupportPilotUser.setUser(updatedUser);
            onUserUpdate(updatedUser);

            setAlertMsg({ type: 'success', text: '✓ Profile image updated successfully.' });
            if (window.showToast) {
              window.showToast('Profile Updated', 'Profile image updated successfully.', 'success');
            }
          }, 300);
        })
        .catch(function (err) {
          clearInterval(progressInterval);
          setIsUploading(false);
          setUploadProgress(0);
          console.error('[Profile Upload Error]:', err);
          setAlertMsg({ type: 'error', text: 'Unable to upload profile image. Please try again.' });
          if (window.showToast) {
            window.showToast('Upload Failed', 'Unable to upload profile image. Please try again.', 'error');
          }
        });
    }

    function handleRemoveImage() {
      if (!profileImg) return;
      if (!confirm('Are you sure you want to remove your profile photo?')) return;

      fetch(getApiBase() + '/api/users/me/profile-image', {
        method: 'DELETE'
      })
        .then(function (res) {
          if (!res.ok) throw new Error('Remove request failed with status ' + res.status);
          return res.json();
        })
        .then(function (data) {
          var updatedUser = Object.assign({}, user, {
            profileImage: null,
            profile_image: null
          });
          window.SupportPilotUser.setUser(updatedUser);
          onUserUpdate(updatedUser);

          setAlertMsg({ type: 'success', text: '✓ Profile photo removed. Reverted to default avatar.' });
          if (window.showToast) {
            window.showToast('Avatar Removed', 'Reverted profile photo back to color initials.', 'info');
          }
        })
        .catch(function (err) {
          console.error('[Profile Remove Error]:', err);
          setAlertMsg({ type: 'error', text: 'Unable to remove profile image. Please try again.' });
        });
    }

    return h('div', { className: 'sp-card' },
      h('div', { className: 'sp-card-header' },
        h('div', null,
          h('h3', { className: 'sp-card-title' }, 'Profile Photo'),
          h('p', { className: 'sp-card-subtitle' }, 'Upload a profile picture to personalize your workspace.')
        )
      ),

      // Status Alert Message
      alertMsg && h('div', { className: 'sp-alert-banner sp-alert-' + alertMsg.type },
        alertMsg.type === 'success'
          ? svgIcon('M5 13l4 4L19 7', 18, '#059669', 2.5)
          : svgIcon('M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', 18, '#dc2626', 2),
        h('span', null, alertMsg.text)
      ),

      // Center stage avatar display
      h('div', { className: 'sp-avatar-center-stage' },
        h('div', {
          className: 'sp-avatar-large-wrap',
          onClick: function () { fileInputRef.current.click(); }
        },
          (previewUrl || profileImg)
            ? h('img', { src: previewUrl || profileImg, alt: 'Avatar' })
            : h('span', null, initials),
          h('div', { className: 'sp-avatar-hover-overlay' },
            svgIcon('M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z', 20, '#fff'),
            h('span', null, 'Change')
          )
        ),

        h('input', {
          ref: fileInputRef,
          type: 'file',
          accept: 'image/jpeg,image/png,image/webp,image/gif',
          style: { display: 'none' },
          onChange: handleFileSelect
        }),

        // Upload Preview Confirmation Box
        previewUrl && h('div', { className: 'sp-upload-preview-box', style: { width: '100%' } },
          h('div', { className: 'sp-upload-preview-header' },
            svgIcon('M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', 16, 'var(--accent-primary)'),
            h('span', null, previewFile ? previewFile.name : 'Image selected for preview')
          ),

          isUploading && h('div', { style: { width: '100%' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 } },
              h('span', null, 'Uploading...'),
              h('span', null, uploadProgress + '%')
            ),
            h('div', { className: 'sp-progress-container' },
              h('div', { className: 'sp-progress-bar', style: { width: uploadProgress + '%' } })
            )
          ),

          !isUploading && h('div', { style: { display: 'flex', gap: 8, width: '100%' } },
            h('button', {
              className: 'sp-btn sp-btn-primary',
              style: { flex: 1 },
              onClick: confirmUpload
            },
              svgIcon('M5 13l4 4L19 7', 15),
              'Confirm Upload'
            ),
            h('button', {
              className: 'sp-btn sp-btn-secondary',
              onClick: cancelPreview
            }, 'Cancel')
          )
        ),

        // Action buttons
        !previewUrl && h('div', { className: 'sp-avatar-actions-row' },
          h('button', {
            className: 'sp-btn sp-btn-primary',
            onClick: function () { fileInputRef.current.click(); }
          },
            svgIcon('M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12', 15),
            profileImg ? 'Change Image' : 'Upload Image'
          ),
          profileImg && h('button', {
            className: 'sp-btn sp-btn-danger',
            onClick: handleRemoveImage,
            title: 'Remove custom avatar'
          },
            svgIcon('M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16', 15),
            'Remove'
          )
        ),

        h('div', { className: 'sp-avatar-meta-hint' },
          'Accepts JPG, PNG, WebP, GIF • Max file size 5MB'
        )
      )
    );
  }

  /* ══════════════════════════════════════════════════════════════
     PERSONAL INFORMATION CARD COMPONENT
  ══════════════════════════════════════════════════════════════ */
  function PersonalInfoCard(props) {
    var user = props.user;
    var onUserUpdate = props.onUserUpdate;
    var isEmployee = props.isEmployee;

    var nameState = useState(user.name || '');
    var deptState = useState(user.department || 'Customer Support');
    var phoneState = useState(user.phone || '');
    var bioState = useState(user.bio || '');

    var savingState = useState(false);
    var alertState = useState(null);

    var name = nameState[0], setName = nameState[1];
    var dept = deptState[0], setDept = deptState[1];
    var phone = phoneState[0], setPhone = phoneState[1];
    var bio = bioState[0], setBio = bioState[1];
    var isSaving = savingState[0], setIsSaving = savingState[1];
    var alertMsg = alertState[0], setAlertMsg = alertState[1];

    // Sync state when props change
    useEffect(function () {
      setName(user.name || '');
      setDept(user.department || 'Customer Support');
      setPhone(user.phone || '');
      setBio(user.bio || '');
    }, [user.name, user.department, user.phone, user.bio]);

    function handleReset() {
      setName(user.name || '');
      setDept(user.department || 'Customer Support');
      setPhone(user.phone || '');
      setBio(user.bio || '');
      setAlertMsg(null);
    }

    function handleSave(e) {
      if (e) e.preventDefault();
      if (!name.trim()) {
        setAlertMsg({ type: 'error', text: 'Full Name cannot be empty.' });
        return;
      }

      setIsSaving(true);
      setAlertMsg(null);

      var payload = {
        name: name.trim(),
        department: dept.trim(),
        phone: phone.trim(),
        bio: bio.trim()
      };

      fetch(getApiBase() + '/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (!res.ok) throw new Error('Update returned status ' + res.status);
          return res.json();
        })
        .then(function (data) {
          setIsSaving(false);
          var updated = data.user || Object.assign({}, user, payload);
          window.SupportPilotUser.setUser(updated);
          onUserUpdate(updated);

          setAlertMsg({ type: 'success', text: '✓ Profile updated successfully.' });
          if (window.showToast) {
            window.showToast('Profile Saved', 'Profile updated successfully.', 'success');
          }
          setTimeout(function () { setAlertMsg(null); }, 4000);
        })
        .catch(function (err) {
          setIsSaving(false);
          console.error('[Profile Update Error]:', err);
          setAlertMsg({ type: 'error', text: 'Unable to update profile. Please try again.' });
          if (window.showToast) {
            window.showToast('Update Failed', 'Unable to update profile. Please try again.', 'error');
          }
        });
    }

    return h('div', { className: 'sp-card' },
      h('div', { className: 'sp-card-header' },
        h('div', null,
          h('h3', { className: 'sp-card-title' }, 'Personal Information'),
          h('p', { className: 'sp-card-subtitle' }, 'Update your identity details and how your name appears across tickets and team escalations.')
        )
      ),

      // Status Alert Message
      alertMsg && h('div', { className: 'sp-alert-banner sp-alert-' + alertMsg.type },
        alertMsg.type === 'success'
          ? svgIcon('M5 13l4 4L19 7', 18, '#059669', 2.5)
          : svgIcon('M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', 18, '#dc2626', 2),
        h('span', null, alertMsg.text)
      ),

      h('form', { onSubmit: handleSave },
        // Grid Row: Name & Role
        h('div', { className: 'sp-form-grid-2' },
          h('div', { className: 'sp-form-group' },
            h('label', { className: 'sp-form-label', htmlFor: 'sp-input-fullname' },
              h('span', null, 'Full Name', h('span', { className: 'sp-form-required' }, '*'))
            ),
            h('input', {
              id: 'sp-input-fullname',
              type: 'text',
              className: 'sp-input',
              placeholder: 'e.g. Pranjal Kumar',
              value: name,
              required: true,
              onChange: function (e) { setName(e.target.value); }
            })
          ),

          isEmployee ?
            h('div', { className: 'sp-form-group' },
              h('label', { className: 'sp-form-label' }, 'Email Address'),
              h('input', {
                type: 'email',
                className: 'sp-input',
                value: (user.email === 'admin@company.com' ? 'theman838303@gmail.com' : user.email) || '',
                readOnly: true,
                disabled: true,
                style: { cursor: 'not-allowed', background: 'rgba(148, 163, 184, 0.08)' }
              })
            ) :
            h('div', { className: 'sp-form-group' },
              h('label', { className: 'sp-form-label' }, 'Account Role'),
              h('input', {
                type: 'text',
                className: 'sp-input',
                value: user.role || 'Support Agent',
                readOnly: true,
                disabled: true,
                style: { cursor: 'not-allowed', background: 'rgba(148, 163, 184, 0.08)' }
              })
            )
        ),

        // Grid Row: Department & Phone
        h('div', { className: 'sp-form-grid-2' },
          h('div', { className: 'sp-form-group' },
            h('label', { className: 'sp-form-label', htmlFor: 'sp-input-dept' }, 'Department'),
            h('select', {
              id: 'sp-input-dept',
              className: 'sp-select',
              value: dept,
              onChange: function (e) { setDept(e.target.value); }
            },
              h('option', { value: 'Customer Support' }, 'Customer Support'),
              h('option', { value: 'Tier-2 Technical Escalations' }, 'Tier-2 Technical Escalations'),
              h('option', { value: 'IT Infrastructure & DevOps' }, 'IT Infrastructure & DevOps'),
              h('option', { value: 'Quality Assurance & Operations' }, 'Quality Assurance & Operations'),
              h('option', { value: 'Engineering Team' }, 'Engineering Team')
            )
          ),

          !isEmployee ? h('div', { className: 'sp-form-group' },
            h('label', { className: 'sp-form-label', htmlFor: 'sp-input-phone' }, 'Phone Number (Optional)'),
            h('input', {
              id: 'sp-input-phone',
              type: 'tel',
              className: 'sp-input',
              placeholder: '+1 (555) 234-5678',
              value: phone,
              onChange: function (e) { setPhone(e.target.value); }
            })
          ) : null
        ),

        // Textarea: Bio
        !isEmployee ? h('div', { className: 'sp-form-group' },
          h('label', { className: 'sp-form-label', htmlFor: 'sp-input-bio' },
            h('span', null, 'Professional Bio'),
            h('span', { style: { fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' } }, bio.length + ' / 300')
          ),
          h('textarea', {
            id: 'sp-input-bio',
            className: 'sp-textarea',
            maxLength: 300,
            rows: 3,
            placeholder: 'Share a short description of your role, specialties, and support focus areas...',
            value: bio,
            onChange: function (e) { setBio(e.target.value); }
          })
        ) : null,

        // Action Buttons Row
        h('div', { style: { display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10, paddingTop: 16, borderTop: '1px solid var(--border-color)' } },
          h('button', {
            type: 'button',
            className: 'sp-btn sp-btn-secondary',
            onClick: handleReset,
            disabled: isSaving
          }, 'Cancel'),

          h('button', {
            type: 'submit',
            className: 'sp-btn sp-btn-primary',
            disabled: isSaving
          },
            isSaving
              ? h('span', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                svgIcon('M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', 15),
                'Saving...'
              )
              : h('span', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                svgIcon('M5 13l4 4L19 7', 15),
                'Save Changes'
              )
          )
        )
      )
    );
  }

  /* ══════════════════════════════════════════════════════════════
     MASTER SETTINGS & PROFILE PAGE COMPONENT
  ══════════════════════════════════════════════════════════════ */
  function SettingsPage() {
    var userState = useState(window.SupportPilotUser.getUser());
    var loadingState = useState(true);

    var user = userState[0], setUser = userState[1];
    var isLoading = loadingState[0], setIsLoading = loadingState[1];

    useEffect(function () {
      window.SupportPilotUser.fetchUser()
        .then(function (loaded) {
          setUser(loaded);
          setIsLoading(false);
        })
        .catch(function () {
          setIsLoading(false);
        });

      function handleGlobalUserUpdate(e) {
        if (e.detail) setUser(e.detail);
      }
      window.addEventListener('supportpilot:userUpdated', handleGlobalUserUpdate);
      return function () {
        window.removeEventListener('supportpilot:userUpdated', handleGlobalUserUpdate);
      };
    }, []);

    function handleUserUpdate(updatedUser) {
      setUser(updatedUser);
    }

    function triggerUploadDialog() {
      var photoBtn = document.querySelector('.sp-avatar-actions-row .sp-btn-primary');
      if (photoBtn) photoBtn.click();
    }

    if (isLoading) {
      return h('div', { className: 'sp-settings-container' },
        h('div', { style: { marginBottom: 16 } },
          h('div', { className: 'sp-skeleton', style: { width: 180, height: 28, marginBottom: 8 } }),
          h('div', { className: 'sp-skeleton', style: { width: 340, height: 16 } })
        ),
        h('div', { className: 'sp-skeleton', style: { height: 160, borderRadius: 20, marginBottom: 24 } }),
        h('div', { className: 'sp-settings-layout' },
          h('div', { className: 'sp-skeleton', style: { height: 320, borderRadius: 18 } }),
          h('div', { className: 'sp-skeleton', style: { height: 420, borderRadius: 18 } })
        )
      );
    }

    var isEmployee = user && user.role && user.role.toLowerCase() === 'employee';

    return h('div', { className: 'sp-settings-container' },
      // Page Top Title & Subtitle
      h('div', { style: { marginBottom: 6 } },
        h('h1', { style: { margin: '0 0 6px 0', fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' } }, isEmployee ? 'Profile' : 'Settings'),
        h('p', { style: { margin: 0, fontSize: 14, color: 'var(--text-secondary)' } }, isEmployee ? 'Manage your personal profile information.' : 'Manage your SupportPilot profile and account information.')
      ),

      // Profile Header Banner Card
      h(ProfileHeader, { user: user, onUploadClick: triggerUploadDialog }),

      // 2-Column Responsive Layout
      h('div', { className: 'sp-settings-layout' },
        // Left Column (Profile Photo + Overview)
        h('div', { className: 'sp-col-left' },
          h(ProfilePhotoCard, { user: user, onUserUpdate: handleUserUpdate })
        ),

        // Right Column (Personal Info)
        h('div', { className: 'sp-col-right' },
          h(PersonalInfoCard, { user: user, onUserUpdate: handleUserUpdate, isEmployee: isEmployee })
        )
      )
    );
  }

  /* ── Mount Function ── */
  var rootInstance = null;
  function mountSettingsPanel() {
    var container = document.getElementById('settings-react-root');
    if (!container) return;

    if (!rootInstance) {
      rootInstance = ReactDOM.createRoot(container);
    }
    rootInstance.render(h(SettingsPage));
  }

  window.__mountSettingsPanel = mountSettingsPanel;

  // Auto-mount when settings navigation tab is clicked
  function initSettingsMountListener() {
    var navEls = document.querySelectorAll('[data-target="settings"]');
    navEls.forEach(function (el) {
      el.addEventListener('click', function () {
        setTimeout(mountSettingsPanel, 60);
      });
    });

    var sv = document.getElementById('settings-view');
    if (sv && sv.classList.contains('active-view')) {
      mountSettingsPanel();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSettingsMountListener);
  } else {
    initSettingsMountListener();
  }

  // Pre-fetch and synchronize user immediately on startup
  try {
    window.SupportPilotUser.fetchUser();
  } catch (e) { }

})();
