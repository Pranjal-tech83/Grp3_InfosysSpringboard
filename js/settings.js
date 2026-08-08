// settings.js - SupportPilot Settings Bridge & UI Synchronization

function initSettingsModule() {
  // Sync avatar and user info on startup
  if (window.SupportPilotUser && typeof window.SupportPilotUser.getUser === "function") {
    var user = window.SupportPilotUser.getUser();
    applyProfileImage(user.profileImage || user.profile_image);
    updateUIInitials(user.name || "Pranjal Kumar");
  }

  // Safe listener for settings mount
  var settingsNav = document.querySelector('.nav-item[data-target="settings"]');
  if (settingsNav) {
    settingsNav.addEventListener("click", function () {
      if (typeof window.__mountSettingsPanel === "function") {
        setTimeout(window.__mountSettingsPanel, 50);
      }
    });
  }
}

function applyAvatarColor(color) {
  var sbAvatar = document.getElementById("sidebar-avatar");
  var navAvatar = document.getElementById("navbar-avatar");
  var previewAvatar = document.getElementById("settings-avatar-preview");

  if (sbAvatar) sbAvatar.style.backgroundColor = color;
  if (navAvatar) navAvatar.style.backgroundColor = color;
  if (previewAvatar) previewAvatar.style.backgroundColor = color;
}

function applyProfileImage(dataURL) {
  var sbImg = document.getElementById("sidebar-avatar-img");
  var sbTxt = document.getElementById("sidebar-avatar-txt");
  var navImg = document.getElementById("navbar-avatar-img");
  var navTxt = document.getElementById("navbar-avatar-txt");

  if (dataURL) {
    if (sbImg) { sbImg.src = dataURL; sbImg.style.display = "block"; }
    if (sbTxt) sbTxt.style.display = "none";

    if (navImg) { navImg.src = dataURL; navImg.style.display = "block"; }
    if (navTxt) navTxt.style.display = "none";
  } else {
    if (sbImg) { sbImg.src = ""; sbImg.style.display = "none"; }
    if (sbTxt) sbTxt.style.display = "block";

    if (navImg) { navImg.src = ""; navImg.style.display = "none"; }
    if (navTxt) navTxt.style.display = "block";
  }
}

function updateUIInitials(nameString) {
  if (!nameString) nameString = "Pranjal Kumar";
  var parts = nameString.trim().split(/\s+/);
  var initials = parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();

  var sbTxt = document.getElementById("sidebar-avatar-txt");
  var navTxt = document.getElementById("navbar-avatar-txt");

  if (sbTxt) sbTxt.textContent = initials;
  if (navTxt) navTxt.textContent = initials;
}

// Expose settings module
window.SupportPilotSettings = {
  init: initSettingsModule,
  applyAvatarColor: applyAvatarColor,
  applyProfileImage: applyProfileImage,
  updateUIInitials: updateUIInitials
};