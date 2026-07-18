// assistant.js - Smart IT Assistant Chatbox Controller (Actionable Guide Version)

function initAssistantModule() {
  const sendBtn = document.getElementById("btn-send-message");
  const chatInput = document.getElementById("chat-input");
  const chatMessages = document.getElementById("chat-messages");

  if (!sendBtn || !chatInput) return;

  // Initialize welcome layout when the chat screen is clear
  if (chatMessages && chatMessages.children.length <= 1) {
    chatMessages.innerHTML = "";
    appendMessage("Hello! I'm your SupportPilot IT Assistant. Ask me about VPN issues, network connectivity, printer troubleshooting, or password management.", "ai");
  }

  sendBtn.addEventListener("click", handleSendMessage);
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSendMessage();
  });
}

function handleSendMessage() {
  const chatInput = document.getElementById("chat-input");
  const message = chatInput.value.trim();
  const sendBtn = document.getElementById("btn-send-message");
  if (!message) return;

  appendMessage(message, "user");
  chatInput.value = "";
  chatInput.disabled = true;
  sendBtn.disabled = true;

  // Dynamic user engagement simulation delay
  setTimeout(() => {
    generateAIResponse(message);
    chatInput.disabled = false;
    sendBtn.disabled = false;
    chatInput.focus();
  }, 1000); 
}

function appendMessage(text, sender, isHTML = false) {
  const chatMessages = document.getElementById("chat-messages");
  if (!chatMessages) return;

  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-message ${sender}`;
  
  if (sender === "user") {
    msgDiv.style.cssText = "align-self: flex-end; background-color: var(--accent-primary); color: white; padding: 12px 16px; border-radius: 8px; max-width: 80%; margin-bottom: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);";
  } else {
    msgDiv.style.cssText = "align-self: flex-start; background-color: var(--bg-sidebar); padding: 12px 16px; border-radius: 8px; max-width: 80%; border: 1px solid var(--border-color); margin-bottom: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);";
  }

  if (isHTML) {
    msgDiv.innerHTML = text;
  } else {
    const p = document.createElement("p");
    p.style.margin = "0";
    p.style.fontSize = "14px";
    p.style.lineHeight = "1.5";
    p.textContent = text;
    msgDiv.appendChild(p);
  }

  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function generateAIResponse(userMessage) {
  if (!userMessage) return;
  const lowerMsg = userMessage.toLowerCase();
  
  try {
    // SCENARIO 1: SPECIFIC VPN RESTART TARGET (HIGHEST PRIORITY)
    if (lowerMsg.includes("restart") && lowerMsg.includes("vpn")) {
      appendMessage(`
        <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>VPN Client Recycling Steps:</strong> If your secure connection tunnel is frozen or looping, perform this clean application restart:</p>
        <ol style="margin: 0 0 12px 0; padding-left: 20px; font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
          <li>Locate your VPN client icon in the Windows taskbar system tray (bottom-right corner), right-click it, and choose <strong>Disconnect / Exit</strong>.</li>
          <li>Press <code>Ctrl + Shift + Esc</code> to launch Task Manager. Verify no residual background processes (e.g., OpenVPN Daemon, Cisco AnyConnect backend) are running; if found, click <strong>End Task</strong>.</li>
          <li>Relaunch your client interface from the desktop, choose your regional gateway domain node, and run a fresh authentication handshake.</li>
        </ol>
        <p style="margin: 0; font-size: 13px; color: var(--text-secondary);">This clears any stale cryptographic credential tokens or broken loopback interfaces running on your local machine.</p>
      `, "ai", true);
      return;
    }

    // SCENARIO 2: HARDWARE PRINTER ROUTING (EVALUATED BEFORE GENERIC NETWORK KEYWORDS)
    // Fixes the bug where "how do I connect my printer" triggers generic Wi-Fi responses because of the word "connect"
    if (lowerMsg.includes("printer")) {
      appendMessage(`
        <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>Local Printer Mapping Checklist:</strong> If print requests are failing or the asset displays as offline, follow these steps:</p>
        <ul style="margin: 0 0 12px 0; padding-left: 20px; font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
          <li><strong>Restart Spooler Sockets:</strong> Press <code>Windows Key + R</code>, input <code>services.msc</code>, and hit Enter. Locate <strong>Print Spooler</strong> in the list, right-click it, and select <strong>Restart</strong>.</li>
          <li><strong>Verify Subnet Access:</strong> Ensure your local workstation is authenticated on the secure enterprise network line, not a segmented guest Wi-Fi access point.</li>
          <li><strong>Check Network Sharing Path:</strong> Validate that your system is targeting the exact network distribution folder path: <code>\\\\corp-print-04\\Floor2_Color</code>.</li>
        </ul>
        <button onclick="document.getElementById('chat-input').value = 'Give me the manual network flush steps'; document.getElementById('btn-send-message').click();" style="background: var(--accent-primary); color: white; border: none; padding: 6px 12px; font-size: 12px; border-radius: 4px; cursor: pointer; font-weight: 600;">Flush Network Connection Tables</button>
      `, "ai", true);
      return;
    }

    // SCENARIO 3: ACTIONABLE MANUAL NETWORK REMEDIATION (TRIGGERED BY BUTTONS / COMMANDS)
    if (lowerMsg.includes("patch") || lowerMsg.includes("flush") || lowerMsg.includes("fix") || lowerMsg.includes("optimize")) {
      appendMessage(`
        <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>Manual Command Prompt Repair Guide:</strong> You can completely flush your network interface cards using these real commands:</p>
        <div style="padding: 12px; background: rgba(59, 130, 246, 0.05); border-left: 4px solid var(--accent-primary); border-radius: 4px; font-size: 13px; line-height: 1.6; margin-bottom: 12px;">
          <strong>Step 1:</strong> Press the Windows key, type <code>cmd</code>, right-click on <strong>Command Prompt</strong>, and select <em>Run as Administrator</em>.<br>
          <strong>Step 2:</strong> Purge stale domain tables by running this command:<br>
          <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-weight: 600; display: inline-block; margin-top: 4px;">ipconfig /flushdns</code><br>
          <strong>Step 3:</strong> Reset corrupted network socket bindings by running:<br>
          <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-weight: 600; display: inline-block; margin-top: 4px;">netsh int ip reset</code>
        </div>
        <p style="margin: 0; font-size: 13px; color: var(--text-secondary);">Once both commands confirm a success status, restart your browser application and attempt to access your enterprise panel again.</p>
      `, "ai", true);
      return;
    }

    // SCENARIO 4: GENERAL GATEWAY / NETWORK DIAGNOSIS (BROAD INQUIRIES)
    if (lowerMsg.includes("vpn") || lowerMsg.includes("network") || lowerMsg.includes("internet") || lowerMsg.includes("connect")) {
      appendMessage(`
        <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>Network Connectivity Diagnosis:</strong> Let's figure out where the connection is dropping.</p>
        <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 1.5; color: var(--text-secondary);">Open a separate tab in your browser and test if standard external websites (like Google.com) load. If public links open fine, your local hardware Wi-Fi connection is fully functional. The problem lies with a handshake timeout loop on the secure enterprise VPN server gateway.</p>
        <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600;">What actionable route would you like to take?</p>
        <div style="display: flex; gap: 8px;">
          <button onclick="document.getElementById('chat-input').value = 'Give me the manual network flush steps'; document.getElementById('btn-send-message').click();" style="background: var(--accent-primary); color: white; border: none; padding: 6px 12px; font-size: 12px; border-radius: 4px; cursor: pointer; font-weight:600;">Show Me the Commands</button>
          <button onclick="document.getElementById('chat-input').value = 'I want to submit a critical ticket to technical staff'; document.getElementById('btn-send-message').click();" style="background: transparent; border: 1px solid var(--border-color); color: var(--text-main); padding: 6px 12px; font-size: 12px; border-radius: 4px; cursor: pointer;">Submit Support Ticket</button>
        </div>
      `, "ai", true);
      return;
    }

    // SCENARIO 5: PASSWORD / DOMAIN SECURITY LOCKOUT ROUTINES
    if (lowerMsg.includes("password") || lowerMsg.includes("lock") || lowerMsg.includes("account") || lowerMsg.includes("login")) {
      appendMessage(`
        <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>Active Directory Login Overrides:</strong> If your corporate identity profile is locked out due to rapid credential sync failures after a password rotation, run this offline log-in workaround:</p>
        <ol style="margin: 0 0 12px 0; padding-left: 20px; font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
          <li><strong>Sever Networks:</strong> Toggle airplane mode or shut off your laptop's Wi-Fi adapter entirely. This keeps the workstation from polling the centralized lockout directory servers.</li>
          <li><strong>Enter Cached Credentials:</strong> Type your exact prior password. The hardware operating system will read local cached configuration states and let you access your workspace offline.</li>
          <li><strong>Sync Token Groups:</strong> Reconnect your network links once your desktop interface finishes loading, and visit the single sign-on hub to re-sync your active access tokens.</li>
        </ol>
        <p style="margin: 0; font-size: 13px; color: var(--text-secondary);">If your credentials are completely expired or corrupted, please use the navigation links to open a formal account recovery ticket.</p>
      `, "ai", true);
      return;
    }

    // SCENARIO 6: HUMAN HELPDESK ESCALATION PIPELINE
    if (lowerMsg.includes("ticket") || lowerMsg.includes("escalate") || lowerMsg.includes("staff") || lowerMsg.includes("human")) {
      appendMessage(`
        <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Live Helpdesk Pipeline Entry:</strong></p>
        <p style="margin: 0; font-size: 13px; color: var(--text-secondary); line-height: 1.5;">Your workspace incident log has been compiled and forwarded directly to the live technical systems queue. An IT operations analyst will cross-reference your internal IP profile map and contact you on your team communication handle shortly.</p>
      `, "ai", true);
      return;
    }

    // SCENARIO 7: GENERIC CATCH-ALL FALLBACK
    appendMessage("I want to give you precise, actionable solutions. Could you clarify if you are troubleshooting a corporate VPN gateway timeout loop, an office network printer spooler connection, or a locked Active Directory domain login profile?", "ai");

  } catch (error) {
    console.error("Diagnostic routing evaluation failed:", error);
    appendMessage("An isolation error occurred while generating the instructions sequence. Please check terminal logs.", "ai");
  }
}

// Module registration hook
window.SupportPilotAssistant = {
  init: initAssistantModule
};
