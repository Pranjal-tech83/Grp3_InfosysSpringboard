// assistant.js - Smart AI Chatbox Controller

function initAssistantModule() {
  const sendBtn = document.getElementById("btn-send-message");
  const chatInput = document.getElementById("chat-input");

  if (!sendBtn || !chatInput) return;

  sendBtn.addEventListener("click", handleSendMessage);
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  });
}

function handleSendMessage() {
  const chatInput = document.getElementById("chat-input");
  const message = chatInput.value.trim();
  if (!message) return;

  appendMessage(message, "user");
  chatInput.value = "";
  chatInput.disabled = true;
  document.getElementById("btn-send-message").disabled = true;

  // Simulate AI typing delay
  setTimeout(() => {
    generateAIResponse(message);
    chatInput.disabled = false;
    document.getElementById("btn-send-message").disabled = false;
    chatInput.focus();
  }, 1000);
}

function appendMessage(text, sender, isHTML = false) {
  const chatMessages = document.getElementById("chat-messages");
  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-message ${sender}`;
  
  if (sender === "user") {
    msgDiv.style.cssText = "align-self: flex-end; background-color: var(--accent-primary); color: white; padding: 12px 16px; border-radius: 8px; max-width: 80%;";
  } else {
    msgDiv.style.cssText = "align-self: flex-start; background-color: var(--bg-sidebar); padding: 12px 16px; border-radius: 8px; max-width: 80%; border: 1px solid var(--border-color);";
  }

  if (isHTML) {
    msgDiv.innerHTML = text;
  } else {
    const p = document.createElement("p");
    p.style.margin = "0";
    p.style.fontSize = "14px";
    p.textContent = text;
    msgDiv.appendChild(p);
  }

  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function generateAIResponse(userMessage) {
  const lowerMsg = userMessage.toLowerCase();
  
  if (lowerMsg.includes("book") || lowerMsg.includes("confirm")) {
    appendMessage(`
      <p style="margin: 0 0 10px 0; font-size: 14px;">Booking confirmed! Your tickets have been issued successfully.</p>
      <div style="padding: 10px; background: rgba(16, 185, 129, 0.1); border-left: 4px solid #10b981; border-radius: 4px; font-size: 13px;">
        <strong>Booking Reference:</strong> SP-${Math.floor(1000 + Math.random() * 9000)}<br>
        <strong>Status:</strong> Confirmed<br>
        A detailed itinerary has been sent to your email.
      </div>
    `, "ai", true);
    
    // Also trigger global toast
    if (typeof showToast === "function") {
      showToast("Booking Confirmed", "Your trip has been booked successfully.", "success");
    }
    return;
  }

  if (lowerMsg.includes("to ") || lowerMsg.includes("from ") || lowerMsg.includes("trip") || lowerMsg.includes("plan")) {
    const aiHTML = `
      <p style="margin: 0 0 10px 0; font-size: 14px;">I've analyzed the best routes and prices for your requested trip. Here is the comparison:</p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 13px; text-align: left;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border-color);">
            <th style="padding: 8px;">Provider</th>
            <th style="padding: 8px;">Duration</th>
            <th style="padding: 8px;">Price</th>
            <th style="padding: 8px;">Recommendation</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 8px;">SkyLink Airways</td>
            <td style="padding: 8px;">4h 15m</td>
            <td style="padding: 8px;">$345</td>
            <td style="padding: 8px;"><span class="badge badge-status-resolved">Best Price</span></td>
          </tr>
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 8px;">AeroSwift (Direct)</td>
            <td style="padding: 8px;">3h 50m</td>
            <td style="padding: 8px;">$410</td>
            <td style="padding: 8px;"><span class="badge badge-priority-high">Fastest</span></td>
          </tr>
          <tr>
            <td style="padding: 8px;">Global Transit Train</td>
            <td style="padding: 8px;">12h 30m</td>
            <td style="padding: 8px;">$120</td>
            <td style="padding: 8px;"><span class="badge badge-status-open">Eco-friendly</span></td>
          </tr>
        </tbody>
      </table>
      <p style="margin: 0 0 10px 0; font-size: 14px;">Based on your preferences, I recommend <strong>SkyLink Airways</strong> for the best balance of price and duration.</p>
      <button onclick="document.getElementById('chat-input').value = 'Book SkyLink Airways'; document.getElementById('btn-send-message').click();" class="btn btn-primary" style="padding: 6px 12px; font-size: 13px;">Book Complete Ticket ($345)</button>
    `;
    appendMessage(aiHTML, "ai", true);
    return;
  }

  // Default response
  appendMessage("I can help you plan your trip! Just tell me where you are starting from and where you want to go. For example: 'Plan a trip from New York to London'.", "ai");
}

// Global hook
window.SupportPilotAssistant = {
  init: initAssistantModule
};
