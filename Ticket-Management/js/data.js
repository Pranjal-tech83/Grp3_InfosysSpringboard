// data.js - Mock Data Layer for TicketNova Platform

const initialTickets = [
  {
    id: "TKT-1024",
    user: { name: "David Miller", email: "david.miller@acme.com", company: "Acme Corp" },
    department: "Engineering",
    subject: "API Authentication failing with 401 Unauthorized in Production",
    category: "Authentication",
    priority: "Urgent",
    severity: "Critical",
    status: "Open",
    assignedAgent: "Sarah Connor",
    createdDate: "2026-07-03T10:15:00Z",
    confidenceScore: 97,
    description: "Our production services are failing to authenticate with the primary API gateway. We are receiving standard 401 Unauthorized codes despite rotating credentials and passing valid tokens. This is blocking all new client requests.",
    aiClassification: {
      category: "API & Authentication",
      priority: "Urgent",
      severity: "Critical",
      confidence: 97,
      suggestedDept: "Engineering Infrastructure"
    },
    suggestedResolution: "Validate token signing certificates and clock skew. It appears the token validation server has a time drift of ~120s compared to the auth gateway, causing all validation calls to fail. Synchronize clocks via NTP.",
    escalationHistory: [
      { date: "2026-07-03T10:16:00Z", from: "System Reception", to: "Triage Agent", message: "Auto-escalated to Engineering based on 'Critical' severity classification." }
    ],
    timeline: [
      { time: "2026-07-03T10:15:00Z", title: "Ticket Created", user: "David Miller", type: "system" },
      { time: "2026-07-03T10:16:00Z", title: "AI Analysis Completed", user: "Diagnosis Agent", type: "ai" },
      { time: "2026-07-03T10:20:00Z", title: "Knowledge Retrieval", user: "Knowledge Agent", type: "ai" }
    ],
    attachments: ["server_logs_401.txt", "oauth_payload.json"]
  },
  {
    id: "TKT-1025",
    user: { name: "Emily Watson", email: "emily@pixeltech.io", company: "PixelTech" },
    department: "Billing",
    subject: "Double-charged for monthly enterprise subscription",
    category: "Payment Issues",
    priority: "High",
    severity: "Major",
    status: "Pending",
    assignedAgent: "Alex Mercer",
    createdDate: "2026-07-02T14:22:00Z",
    confidenceScore: 91,
    description: "We noticed two identical invoices and charges on our corporate credit card for the month of June. We only upgraded to the Enterprise tier once. Please reverse the duplicate charge.",
    aiClassification: {
      category: "Billing & Invoices",
      priority: "High",
      severity: "Major",
      confidence: 91,
      suggestedDept: "Billing & Finance"
    },
    suggestedResolution: "Locate customer invoice history in Stripe billing dashboard. Identify if duplicate tokens were generated during checkout callback. Refund the second charge invoice number INV-8874 and update customer subscription status.",
    escalationHistory: [],
    timeline: [
      { time: "2026-07-02T14:22:00Z", title: "Ticket Created", user: "Emily Watson", type: "system" },
      { time: "2026-07-02T14:25:00Z", title: "AI Diagnostics Run", user: "Diagnosis Agent", type: "ai" }
    ],
    attachments: ["invoice_INV-8873.pdf", "cc_statement_june.png"]
  },
  {
    id: "TKT-1026",
    user: { name: "Marcus Chen", email: "marcus.c@nexusrift.com", company: "NexusRift" },
    department: "Customer Support",
    subject: "Cannot invite new users to workspace - limit reached alert",
    category: "Workspace Settings",
    priority: "Medium",
    severity: "Minor",
    status: "Open",
    assignedAgent: "Emma Stone",
    createdDate: "2026-07-03T08:45:00Z",
    confidenceScore: 88,
    description: "I am attempting to add 3 new team members to our workspace, but the system keeps raising an error saying 'Seat limit reached', even though our billing dashboard shows we have 5 empty seats available in our plan.",
    aiClassification: {
      category: "Workspace Settings",
      priority: "Medium",
      severity: "Minor",
      confidence: 88,
      suggestedDept: "Customer Support Tier 2"
    },
    suggestedResolution: "Refresh the cache of user seats inside the organization config. Clear database query lock which blocks seat allocations from updating immediately in secondary read replicas.",
    escalationHistory: [],
    timeline: [
      { time: "2026-07-03T08:45:00Z", title: "Ticket Created", user: "Marcus Chen", type: "system" }
    ],
    attachments: ["seat_alert_screenshot.jpg"]
  },
  {
    id: "TKT-1027",
    user: { name: "Jessica Taylor", email: "jtaylor@cloudscale.net", company: "CloudScale" },
    department: "Engineering",
    subject: "Webhook delivery failure to target servers",
    category: "Webhooks",
    priority: "High",
    severity: "Major",
    status: "Resolved",
    assignedAgent: "Sarah Connor",
    createdDate: "2026-07-01T09:00:00Z",
    confidenceScore: 94,
    description: "Webhooks are constantly timing out when sending updates to our target listener endpoint. We have checked our firewall rules, and they are correct. Is there a throttling policy on your outbound servers?",
    aiClassification: {
      category: "Webhooks & API Integrations",
      priority: "High",
      severity: "Major",
      confidence: 94,
      suggestedDept: "Engineering Infrastructure"
    },
    suggestedResolution: "Check outbound NAT IP block list. It is possible our webhook server's outgoing IP address was flagged for spam/ddos by AWS Shield or custom user proxies. Whitelist the outbound range provided in documentation.",
    escalationHistory: [
      { date: "2026-07-01T11:00:00Z", from: "Sarah Connor", to: "Resolved State", message: "Resolved by updating firewall rules and whitelisting IP endpoints." }
    ],
    timeline: [
      { time: "2026-07-01T09:00:00Z", title: "Ticket Created", user: "Jessica Taylor", type: "system" },
      { time: "2026-07-01T11:00:00Z", title: "Marked Resolved", user: "Sarah Connor", type: "agent" }
    ],
    attachments: []
  },
  {
    id: "TKT-1028",
    user: { name: "Robert Downey", email: "robert@starkindustries.com", company: "Stark Industries" },
    department: "Engineering",
    subject: "Database latency spiked to 800ms during query operations",
    category: "Database Performance",
    priority: "Urgent",
    severity: "Critical",
    status: "Open",
    assignedAgent: "Unassigned",
    createdDate: "2026-07-03T11:30:00Z",
    confidenceScore: 98,
    description: "We are observing massive spikes in write latency on our postgres-db cluster. Queries that normally take 5ms are lagging over 800ms. CPU usage is pinned at 98%. Need immediate help to check locks.",
    aiClassification: {
      category: "Database & Performance",
      priority: "Urgent",
      severity: "Critical",
      confidence: 98,
      suggestedDept: "Engineering DB Operations"
    },
    suggestedResolution: "Analyze active pg_stat_activity queries. Find and kill long-running table locks or non-indexed searches on the metrics schema. Execute VACUUM ANALYZE to refresh index plans.",
    escalationHistory: [],
    timeline: [
      { time: "2026-07-03T11:30:00Z", title: "Ticket Created", user: "Robert Downey", type: "system" }
    ],
    attachments: ["cpu_spike_report.log"]
  },
  {
    id: "TKT-1029",
    user: { name: "Sophia Loren", email: "sophia@cinematech.it", company: "CinemaTech" },
    department: "Customer Support",
    subject: "Password reset link sends users to invalid expired page",
    category: "User Experience",
    priority: "Low",
    severity: "Minor",
    status: "Resolved",
    assignedAgent: "Emma Stone",
    createdDate: "2026-06-30T16:00:00Z",
    confidenceScore: 85,
    description: "Some of our users are reporting that the password reset link generated by the system directs them to a 404 expired screen immediately after clicking it, even if they click it within 1 minute of request.",
    aiClassification: {
      category: "Auth Flows",
      priority: "Low",
      severity: "Minor",
      confidence: 85,
      suggestedDept: "Frontend UX Team"
    },
    suggestedResolution: "Check configuration setting for password expiry window token lifespan. There is an environment variable configuration that was incorrectly set to 60 seconds rather than 60 minutes.",
    escalationHistory: [],
    timeline: [
      { time: "2026-06-30T16:00:00Z", title: "Ticket Created", user: "Sophia Loren", type: "system" },
      { time: "2026-06-30T16:30:00Z", title: "Resolved State", user: "Emma Stone", type: "agent" }
    ],
    attachments: []
  },
  {
    id: "TKT-1030",
    user: { name: "Ryan Gosling", email: "driver@la-la-land.io", company: "Driver Services" },
    department: "Billing",
    subject: "Declined transactions for international currency card payments",
    category: "Payment Issues",
    priority: "Medium",
    severity: "Major",
    status: "Pending",
    assignedAgent: "Unassigned",
    createdDate: "2026-07-03T02:10:00Z",
    confidenceScore: 89,
    description: "We are receiving credit card decline notices for customers purchasing subscriptions using non-US cards. The invoices fail at the stripe validation level. Address verification system is declining valid cards.",
    aiClassification: {
      category: "Billing & Currency Gateway",
      priority: "Medium",
      severity: "Major",
      confidence: 89,
      suggestedDept: "Billing"
    },
    suggestedResolution: "Adjust Stripe Radar risk rules for international billing card postal codes. Allow bypass of billing zip validation for countries where zip codes are not standardized.",
    escalationHistory: [],
    timeline: [
      { time: "2026-07-03T02:10:00Z", title: "Ticket Created", user: "Ryan Gosling", type: "system" }
    ],
    attachments: []
  }
];

const mockEmails = [
  {
    id: "EML-101",
    recipient: "support@ticketnova.ai",
    sender: "david.miller@acme.com",
    subject: "RE: [TKT-1024] API Authentication failing in Production",
    preview: "Thanks for the response. Synchronizing our local time settings indeed solved the issue.",
    status: "Delivered",
    history: [
      { date: "2026-07-03T10:15:00Z", status: "Received", details: "Incoming ticket trigger email received" },
      { date: "2026-07-03T10:16:30Z", status: "Sent", details: "AI automated acknowledgement email dispatched" },
      { date: "2026-07-03T10:45:00Z", status: "Delivered", details: "Resolution update email sent to customer" }
    ]
  },
  {
    id: "EML-102",
    recipient: "billing@ticketnova.ai",
    sender: "emily@pixeltech.io",
    subject: "RE: [TKT-1025] Double-charged for monthly enterprise subscription",
    preview: "Please let me know once the charge back transaction has been processed.",
    status: "Pending",
    history: [
      { date: "2026-07-02T14:22:00Z", status: "Received", details: "Incoming billing issue request received" },
      { date: "2026-07-02T14:23:00Z", status: "Sent", details: "Automated ticket verification email sent" }
    ]
  },
  {
    id: "EML-103",
    recipient: "api@ticketnova.ai",
    sender: "jtaylor@cloudscale.net",
    subject: "RE: [TKT-1027] Webhook delivery failure to target servers",
    preview: "Perfect! We have whitelisted the IP ranges. Thanks for resolving so quickly.",
    status: "Delivered",
    history: [
      { date: "2026-07-01T09:00:00Z", status: "Received", details: "Incoming system integration report" },
      { date: "2026-07-01T11:00:00Z", status: "Delivered", details: "Resolution success summary sent to customer" }
    ]
  },
  {
    id: "EML-104",
    recipient: "support@ticketnova.ai",
    sender: "brian.o@fastdrive.org",
    subject: "Urgent check required: Custom SSO Integration failing validation step",
    preview: "We uploaded our metadata XML but the assertion signature cannot be matched.",
    status: "Failed",
    history: [
      { date: "2026-07-03T11:00:00Z", status: "Received", details: "SSO certificate upload validation error" },
      { date: "2026-07-03T11:00:05Z", status: "Failed", details: "Outbound automatic auto-reply blocked by target spam filter" }
    ]
  }
];

// Available categories for new tickets
const categories = [
  "Authentication",
  "Payment Issues",
  "Workspace Settings",
  "Webhooks",
  "Database Performance",
  "User Experience",
  "API & Integrations"
];

// Available departments
const departments = [
  "Engineering",
  "Billing",
  "Customer Support",
  "Product Operations"
];

// Multi-Agent Workflow Node details and mock messages for simulations
const agentSteps = [
  {
    id: "diagnose",
    name: "Diagnosis Agent",
    description: "Analyzes language, constructs, and classifies issue metadata.",
    executionTime: "450ms",
    logs: [
      "Parsing ticket subject and description body...",
      "Extracting keywords: '401', 'unauthorized', 'credentials'...",
      "Matching category pattern -> API & Authentication (Confidence: 97%)",
      "Analyzing sentiment -> Urgent & Critical blockages."
    ]
  },
  {
    id: "knowledge",
    name: "Knowledge Agent",
    description: "Scans documentation indexing and internal vector solutions.",
    executionTime: "820ms",
    logs: [
      "Searching index vectors for: 'auth gateway 401 Unauthorized'...",
      "Retrieved documentation matching ID: KB-0045 (OAuth Signature Validation Issues)",
      "Retrieved resolution history ID: SOL-824 (Time Synchronizations on Auth Node)",
      "Extracted context snippets passed to reasoning layer."
    ]
  },
  {
    id: "reasoning",
    name: "Reasoning Agent",
    description: "Applies chain-of-thought logic to formulate resolution steps.",
    executionTime: "1240ms",
    logs: [
      "Evaluating symptoms: 401 response code + valid rotating credentials.",
      "Analyzing temporal variables: Server timestamps in log file show a drift.",
      "Hypothesis: Authentication token expired because validation server clock is ahead.",
      "Developing corrective steps: Verify system time synchronization using NTP service."
    ]
  },
  {
    id: "solution",
    name: "Solution Agent",
    description: "Packages the findings into actionable human explanations.",
    executionTime: "680ms",
    logs: [
      "Formatting steps in standard Markdown...",
      "Drafting suggestions for engineering team deployment...",
      "Adding copyable instructions for server synchronizations via `ntpdate` command."
    ]
  },
  {
    id: "validation",
    name: "Validation Agent",
    description: "Cross-checks proposal against compliance and system constraints.",
    executionTime: "390ms",
    logs: [
      "Checking suggestions for code vulnerabilities: Clean.",
      "Verifying tone and formatting standards: Clean.",
      "Confirming API routes match v2 specification: Confirmed."
    ]
  },
  {
    id: "escalation",
    name: "Escalation Agent",
    description: "Determines if manual human agent intervention is required.",
    executionTime: "150ms",
    logs: [
      "Evaluating confidence threshold: 97% is above resolution direct boundary (90%).",
      "Decision: Propose resolution to customer, allocate to 'Sarah Connor' on Engineering for monitoring."
    ]
  }
];

// Expose models to window context
window.TicketNovaData = {
  initialTickets,
  mockEmails,
  categories,
  departments,
  agentSteps
};
