// data.js - Dynamic Database Fetcher for SupportPilot Tickets

window.SupportPilotData = {
    // Keep a fallback array just in case the server drops offline
    initialTickets: [],

    // Core function to load live tickets from the FastAPI backend
    fetchLiveTickets: async function () {
        try {
            const response = await fetch('https://grp3-infosysspringboard.onrender.com/api/tickets');
            if (!response.ok) throw new Error('Network response was not ok');

            const backendTickets = await response.json();

            // Map FastAPI backend models to match your frontend object layout
            this.initialTickets = backendTickets.map(tkt => ({
                id: `TKT-${tkt.ticket_id}`,
                user: {
                    name: tkt.user?.name || tkt.user_name || "Unknown User",
                    company: tkt.user?.company || "Corporate Client",
                    email: tkt.user?.email || tkt.requester_email || ""
                },
                department: tkt.department || "Customer Support",
                subject: tkt.subject,
                category: tkt.category || "Unclassified",
                priority: tkt.priority || "Medium",
                status: tkt.status.charAt(0).toUpperCase() + tkt.status.slice(1), // Capitalize (e.g., "open" -> "Open")
                createdDate: tkt.created_at,
                description: tkt.description,
                confidenceScore: tkt.confidence_score ? Math.round(tkt.confidence_score * 100) : 0,
                aiClassification: {
                    category: tkt.category,
                    suggestedDept: tkt.department
                },
                suggestedResolution: tkt.resolution_text || "No resolution suggestion generated yet.",
                attachments: [],
                timeline: tkt.logs ? tkt.logs.map(log => ({
                    type: log.performed_by.includes("AI") ? "system" : "user",
                    time: log.timestamp,
                    title: log.action,
                    user: log.performed_by
                })) : []
            }));

            console.log("Successfully synchronized UI with backend data state:", this.initialTickets);

            // Trigger a custom event to tell tickets.js or dashboard-react.js to re-render
            document.dispatchEvent(new CustomEvent('ticketsUpdated', { detail: this.initialTickets }));

            return this.initialTickets;
        } catch (error) {
            console.error('Failed to sync with dynamic backend context:', error);
            return this.initialTickets;
        }
    },

    telemetryTimer: null,

    // Start polling the backend API for real-time telemetry updates
    startTelemetry: function (intervalMs = 5000) {
        if (this.telemetryTimer) return; // Already running

        console.log(`Starting real-time telemetry updates (polling every ${intervalMs}ms)...`);
        // Initial fetch
        this.fetchLiveTickets();

        // Setup recurring fetch
        this.telemetryTimer = setInterval(async () => {
            await this.fetchLiveTickets();
        }, intervalMs);
    },

    stopTelemetry: function () {
        if (this.telemetryTimer) {
            clearInterval(this.telemetryTimer);
            this.telemetryTimer = null;
            console.log("Stopped real-time telemetry updates.");
        }
    }
};

// Start live data telemetry when the script file executes
window.SupportPilotData.startTelemetry();