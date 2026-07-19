// data.js - Dynamic Database Fetcher for SupportPilot Tickets

window.SupportPilotData = {
    // Keep a fallback array just in case the server drops offline
    initialTickets: [],

    // Core function to load live tickets from the FastAPI backend
    fetchLiveTickets: async function() {
        try {
            const response = await fetch('http://127.0.0.1:8000/api/tickets');
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
    }
};

// Auto-fetch data when the script file executes in the page lifecycle
window.SupportPilotData.fetchLiveTickets();