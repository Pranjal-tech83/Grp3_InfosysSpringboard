// data.js - Mock Database for SupportPilot Tickets

window.SupportPilotData = {
  initialTickets: [
    {
      id: "TKT-1001",
      user: { name: "pranjal kumar", company: "Company Inc", email: "pranjal@example.com" },
      department: "Customer Support",
      subject: "Password problem",
      category: "Account Access",
      priority: "High",
      status: "Open",
      createdDate: new Date().toISOString(),
      description: "I forgot my password and cannot log in to my account. Please help me reset it.",
      confidenceScore: 95,
      aiClassification: {
        category: "Account Access",
        suggestedDept: "Customer Support"
      },
      suggestedResolution: "Send a password reset link to the user's email address.",
      attachments: [],
      timeline: [
        { type: "user", time: new Date().toISOString(), title: "Ticket created", user: "pranjal kumar" }
      ]
    }
  ]
};
