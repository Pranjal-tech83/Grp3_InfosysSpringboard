// app.js - Master Orchestrator & View Switcher

document.addEventListener("DOMContentLoaded", () => {
  // 1. Initialize Theme Engine
  initThemeEngine();

  // 2. Initialize Routing & Views Switching
  initNavigationRouter();

  // 3. Initialize Sidebar collapse/expand actions
  initSidebarToggles();

  // 4. Initialize Notification system
  initNotificationBadge();

  // 5. Initialize Sub-modules
  window.SupportPilotTickets.init();
  window.SupportPilotAssistant.init();
  window.SupportPilotAnalytics.init();
  window.SupportPilotEmail.init();
  window.SupportPilotSettings.init();

  // 6. Update Dashboard Views with live data
  refreshDynamicViewElements();

  // 7. Initialize Auth & Profile Redirection Engines
  initProfileNavigation();

  // 8. Initialize Integrations Filter Tabs
  initIntegrationsModule();

  // Welcome Toast Notification if logged in
  if (localStorage.getItem("nova-logged-in") === "true") {
    setTimeout(() => {
      showToast("System Online", "Nova AI Resolution Engine is listening to incoming tickets.", "success");
    }, 800);
  }
});

// --- Theme Toggling System ---
function initThemeEngine() {
  const root = document.documentElement;
  const toggleBtn = document.getElementById("theme-toggle");
  const sunIcon = document.getElementById("theme-sun-icon");
  const moonIcon = document.getElementById("theme-moon-icon");

  // Load theme preference
  const savedTheme = localStorage.getItem("nova-theme") || "light";
  applyTheme(savedTheme);

  toggleBtn.addEventListener("click", () => {
    const currentTheme = root.getAttribute("data-theme") || "light";
    const nextTheme = currentTheme === "light" ? "dark" : "light";
    applyTheme(nextTheme);
    
    // Sync theme settings select element if loaded
    const themeSelect = document.getElementById("settings-theme-select");
    if (themeSelect) {
      themeSelect.value = nextTheme;
    }
  });

  // Global theme switcher helper accessible from settings module
  window.toggleThemeDirect = (themeName) => {
    applyTheme(themeName);
  };

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    localStorage.setItem("nova-theme", theme);

    if (theme === "dark") {
      sunIcon.style.display = "none";
      moonIcon.style.display = "block";
    } else {
      sunIcon.style.display = "block";
      moonIcon.style.display = "none";
    }
  }
}

// --- SPA Page Router ---
function initNavigationRouter() {
  const navItems = document.querySelectorAll(".nav-item");
  const viewSections = document.querySelectorAll(".view-section");

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const targetView = item.getAttribute("data-target");
      if (!targetView) return;

      // Update sidebar nav active classes
      navItems.forEach(el => el.classList.remove("active"));
      item.classList.add("active");

      // Switch active visible section
      viewSections.forEach(section => {
        section.classList.remove("active-view");
      });
      
      const activeSection = document.getElementById(`${targetView}-view`);
      if (activeSection) {
        activeSection.classList.add("active-view");
        
        // Custom triggers depending on view target
        if (targetView === "assistant") {
          // No longer needed
        } else if (targetView === "email") {
          window.SupportPilotEmail.refreshInbox();
        } else if (targetView === "analytics") {
          window.SupportPilotAnalytics.refresh();
        }

      }
    });
  });

  const askAIBtn = document.getElementById("dash-action-assistant");
  if (askAIBtn) {
    askAIBtn.addEventListener("click", () => {
      const targetNav = document.querySelector('[data-target="assistant"]');
      if (targetNav) targetNav.click();
    });
  }
}


// --- Sidebar Collapse Action ---
function initSidebarToggles() {
  const toggleBtn = document.getElementById("navbar-sidebar-toggle");
  
  toggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-collapsed");
  });
}

// --- Notification Bell Alerts Trigger ---
function initNotificationBadge() {
  const notifBtn = document.getElementById("notif-toggle");
  
  notifBtn.addEventListener("click", () => {
    const badge = document.getElementById("notif-badge");
    let currentVal = parseInt(badge.textContent) || 0;
    
    if (currentVal > 0) {
      showToast("System Notifications", `You have ${currentVal} active anomalies pending verification.`, "warning");
      badge.textContent = "0";
      badge.style.display = "none";
    } else {
      showToast("System Logs", "All pipeline resolution validations cleared. No new alerts.", "info");
    }
  });
}

// --- Toast Alert Popup Factory ---
function showToast(title, description, type = "info") {
  const container = document.getElementById("toast-stack-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  // Select SVG icon matching toast style
  let iconSvg = "";
  if (type === "success") {
    iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3" stroke="#10b981" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`;
  } else if (type === "warning") {
    iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" stroke="#f59e0b" stroke-width="2" fill="none"/><path d="M12 8v4M12 16h.01" stroke="#f59e0b" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`;
  } else if (type === "error") {
    iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" stroke="#ef4444" stroke-width="2" fill="none"/><path d="M15 9l-6 6M9 9l6 6" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/></svg>`;
  } else {
    iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" stroke="var(--accent-primary)" stroke-width="2" fill="none"/><path d="M12 16v-4M12 8h.01" stroke="var(--accent-primary)" stroke-width="2.5" stroke-linecap="round"/></svg>`;
  }

  toast.innerHTML = `
    ${iconSvg}
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-desc">${description}</div>
    </div>
    <button class="toast-close">&times;</button>
  `;

  // Attach close listener
  toast.querySelector(".toast-close").addEventListener("click", () => {
    toast.remove();
  });

  container.appendChild(toast);

  // Auto clean after 4 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
}

// --- Global Dynamic Views Refresh (KPI Syncs & Recent Activity table) ---
function refreshDynamicViewElements() {
  const tickets = window.SupportPilotTickets.getTickets();
  
  // 1. Sync Analytics metrics counters
  if (window.SupportPilotAnalytics && typeof window.SupportPilotAnalytics.refresh === "function") {
    window.SupportPilotAnalytics.refresh();
  }

  // 2. Render Dashboard recent activity list (show top 5 items)
  const tbody = document.getElementById("dash-activity-tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  const previewList = tickets.slice(0, 5);
  previewList.forEach(t => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong style="color: var(--accent-primary); font-family: monospace;">${t.id}</strong></td>
      <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${t.subject}</td>
      <td><span class="badge badge-priority-${t.priority.toLowerCase()}">${t.priority}</span></td>
      <td><span style="color: var(--text-secondary);">${t.category}</span></td>
      <td><span class="badge badge-status-${t.status.toLowerCase()}">${t.status}</span></td>
    `;
    
    // Clicking dashboard row opens tickets drawer directly
    tr.addEventListener("click", () => {
      // Toggle nav target active element
      const targetNav = document.querySelector('[data-target="tickets"]');
      if (targetNav) targetNav.click();
      
      setTimeout(() => {
        window.SupportPilotTickets.openDrawer(t.id);
      }, 300);
    });

    tbody.appendChild(tr);
  });
}

// --- Profile Click Redirection to Settings Section ---
function initProfileNavigation() {
  const sidebarProfile = document.getElementById("sidebar-profile-box");
  const navbarProfile = document.getElementById("navbar-profile-btn");

  const navigateToSettings = () => {
    const settingsNav = document.querySelector('.nav-item[data-target="settings"]');
    if (settingsNav) {
      settingsNav.click();
    }
  };

  if (sidebarProfile) {
    sidebarProfile.addEventListener("click", (e) => {
      // If click target or ancestor is the logout button, do not redirect
      if (e.target.closest("#sidebar-logout-btn")) return;
      navigateToSettings();
    });
  }

  if (navbarProfile) {
    navbarProfile.addEventListener("click", navigateToSettings);
  }
}

// --- Integrations Page Filtering System ---
function initIntegrationsModule() {
  const tabs = document.querySelectorAll(".integration-tab");
  const cards = document.querySelectorAll(".integration-card-item");

  if (tabs.length === 0) return;

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      // Toggle active states on tabs
      tabs.forEach(t => {
        t.classList.remove("active");
        t.style.color = "var(--text-secondary)";
        t.style.borderBottom = "none";
        t.style.fontWeight = "500";
        t.style.paddingBottom = "8px";
      });

      tab.classList.add("active");
      tab.style.color = "var(--accent-primary)";
      tab.style.borderBottom = "2px solid var(--accent-primary)";
      tab.style.fontWeight = "700";
      tab.style.paddingBottom = "8px";

      const category = tab.getAttribute("data-type");

      // Filter cards
      cards.forEach(card => {
        const cardCat = card.getAttribute("data-category");
        if (category === "all" || cardCat === category) {
          card.style.display = "flex";
        } else {
          card.style.display = "none";
        }
      });
    });
  });
}

// Expose toast factory globally
window.showToast = showToast;
window.refreshDynamicViewElements = refreshDynamicViewElements;

