// settings.js - Platform Settings & Preference Configuration Controller

function initSettingsModule() {
  // Save settings trigger
  document.getElementById("btn-save-settings").addEventListener("click", saveProfileSettings);

  // Logout trigger from Settings view
  const settingsLogoutBtn = document.getElementById("btn-settings-logout");
  if (settingsLogoutBtn) {
    settingsLogoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      // Trigger same logout logic as sidebar button
      localStorage.removeItem("nova-logged-in");
      document.getElementById("app-container").style.display = "none";
      document.getElementById("login-screen").classList.add("active");
      showToast("Logged Out", "Signed out of SupportPilot session.", "info");
    });
  }

  // Profile picture uploading actions
  const photoInput = document.getElementById("settings-photo-input");
  const uploadBtn = document.getElementById("btn-upload-photo");
  const removeBtn = document.getElementById("btn-remove-photo");

  if (uploadBtn && photoInput) {
    uploadBtn.addEventListener("click", () => photoInput.click());
    
    photoInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        showToast("Upload Error", "Please select a valid image file format.", "error");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataURL = event.target.result;
        
        // Save image string to storage
        localStorage.setItem("nova-profile-img", dataURL);
        
        // Apply image to elements
        applyProfileImage(dataURL);
        showToast("Photo Updated", "Your profile picture has been updated successfully.", "success");
      };
      reader.readAsDataURL(file);
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener("click", () => {
      localStorage.removeItem("nova-profile-img");
      applyProfileImage(null);
      showToast("Photo Removed", "Reverted profile avatar back to color initials.", "info");
    });
  }

  // Sync profile details initially
  const storedName = localStorage.getItem("nova-user-name") || "Pranjal kumar";
  const storedEmail = localStorage.getItem("nova-user-email") || "pranjal.kumar@supportpilot.ai";

  document.getElementById("settings-fullname").value = storedName;
  document.getElementById("settings-email").value = storedEmail;

  // Sync initials text inside text placeholders
  updateUIInitials(storedName);

  // Sync profile picture initially
  const storedImage = localStorage.getItem("nova-profile-img");
  applyProfileImage(storedImage);

  // Sync avatar color initially
  const storedAvatarColor = localStorage.getItem("nova-avatar-bg") || "#2563eb";
  const avatarChoices = document.querySelectorAll(".avatar-color-choice");
  
  avatarChoices.forEach(choice => {
    const color = choice.getAttribute("data-color");
    
    // Set selection border active state
    if (color === storedAvatarColor) {
      choice.classList.add("selected");
    } else {
      choice.classList.remove("selected");
    }
    
    // Add click handler
    choice.addEventListener("click", () => {
      // Toggle selection class
      avatarChoices.forEach(el => el.classList.remove("selected"));
      choice.classList.add("selected");
      
      // Save color
      localStorage.setItem("nova-avatar-bg", color);
      
      // Update active displays in UI
      applyAvatarColor(color);
      showToast("Profile Color Saved", "User avatar theme color updated in real-time.", "success");
    });
  });

  // Apply initial color selection
  applyAvatarColor(storedAvatarColor);

  // Sync theme dropdown select with active page theme
  const themeSelect = document.getElementById("settings-theme-select");
  const activeTheme = document.documentElement.getAttribute("data-theme") || "light";
  themeSelect.value = activeTheme;

  themeSelect.addEventListener("change", (e) => {
    const selectedTheme = e.target.value;
    if (typeof toggleThemeDirect === "function") {
      toggleThemeDirect(selectedTheme);
    }
  });

  // Language translation mock selection
  document.getElementById("settings-lang-select").addEventListener("change", (e) => {
    showToast("Language Updated", `Platform interface translated to ${e.target.options[e.target.selectedIndex].text}.`, "info");
  });
}

function applyAvatarColor(color) {
  const sbAvatar = document.getElementById("sidebar-avatar");
  const navAvatar = document.getElementById("navbar-avatar");
  const previewAvatar = document.getElementById("settings-avatar-preview");
  
  if (sbAvatar) sbAvatar.style.backgroundColor = color;
  if (navAvatar) navAvatar.style.backgroundColor = color;
  if (previewAvatar) previewAvatar.style.backgroundColor = color;
}

function applyProfileImage(dataURL) {
  const sbImg = document.getElementById("sidebar-avatar-img");
  const sbTxt = document.getElementById("sidebar-avatar-txt");
  const navImg = document.getElementById("navbar-avatar-img");
  const navTxt = document.getElementById("navbar-avatar-txt");
  const previewImg = document.getElementById("settings-avatar-preview-img");
  const previewTxt = document.getElementById("settings-avatar-preview-txt");

  if (dataURL) {
    if (sbImg) { sbImg.src = dataURL; sbImg.style.display = "block"; }
    if (sbTxt) sbTxt.style.display = "none";

    if (navImg) { navImg.src = dataURL; navImg.style.display = "block"; }
    if (navTxt) navTxt.style.display = "none";

    if (previewImg) { previewImg.src = dataURL; previewImg.style.display = "block"; }
    if (previewTxt) previewTxt.style.display = "none";
  } else {
    if (sbImg) { sbImg.src = ""; sbImg.style.display = "none"; }
    if (sbTxt) sbTxt.style.display = "block";

    if (navImg) { navImg.src = ""; navImg.style.display = "none"; }
    if (navTxt) navTxt.style.display = "block";

    if (previewImg) { previewImg.src = ""; previewImg.style.display = "none"; }
    if (previewTxt) previewTxt.style.display = "block";
  }
}

function updateUIInitials(nameString) {
  const parts = nameString.split(" ");
  const initials = parts.map(p => p[0]).join("").toUpperCase().slice(0, 2);

  const sbTxt = document.getElementById("sidebar-avatar-txt");
  const navTxt = document.getElementById("navbar-avatar-txt");
  const previewTxt = document.getElementById("settings-avatar-preview-txt");
  
  if (sbTxt) sbTxt.textContent = initials;
  if (navTxt) navTxt.textContent = initials;
  if (previewTxt) previewTxt.textContent = initials;
}

function saveProfileSettings() {
  const nameInput = document.getElementById("settings-fullname").value.trim();
  const emailInput = document.getElementById("settings-email").value.trim();

  if (!nameInput || !emailInput) {
    showToast("Save Failed", "Full Name and Email fields cannot be blank.", "error");
    return;
  }

  // Update in localStorage
  localStorage.setItem("nova-user-name", nameInput);
  localStorage.setItem("nova-user-email", emailInput);

  // Update UI Elements dynamically
  document.getElementById("sidebar-user-name").textContent = nameInput;
  
  // Update initials
  updateUIInitials(nameInput);

  showToast("Profile Updated", "Account setting preferences saved successfully.", "success");
}

// Expose settings module
window.SupportPilotSettings = {
  init: initSettingsModule,
  applyAvatarColor: applyAvatarColor,
  applyProfileImage: applyProfileImage,
  updateUIInitials: updateUIInitials
};
