// config.js - Global Configuration for SupportPilot Frontend
const SupportPilotConfig = {
  // Detect if running locally (including Live Server, localhost, or opening file:/// directly)
  API_BASE_URL: (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' || 
    window.location.hostname === '' || 
    window.location.protocol === 'file:'
  )
    ? 'http://127.0.0.1:8000'
    : 'https://grp3-infosysspringboard.onrender.com',

  WS_BASE_URL: (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' || 
    window.location.hostname === '' || 
    window.location.protocol === 'file:'
  )
    ? 'ws://127.0.0.1:8000'
    : 'wss://grp3-infosysspringboard.onrender.com',
};

// Expose on window object
window.API_BASE_URL = SupportPilotConfig.API_BASE_URL;
window.WS_BASE_URL = SupportPilotConfig.WS_BASE_URL;
window.SupportPilotConfig = SupportPilotConfig;

console.log("SupportPilot Configuration Initialized:", SupportPilotConfig);
