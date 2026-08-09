<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:1e3a8a,50:3b82f6,100:06b6d4&height=200&section=header&text=SupportPilot&fontSize=60&fontColor=ffffff&fontAlignY=38&desc=AI-Powered+IT+Ticket+Resolution+Platform&descSize=20&descAlignY=58" width="100%"/>
<br/>

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-Multi--Agent-FF6F00?style=for-the-badge&logo=langchain&logoColor=white)](https://www.langchain.com/langgraph)
[![Ollama](https://img.shields.io/badge/Ollama-LLaMA_3.2-000000?style=for-the-badge&logo=meta&logoColor=white)](https://ollama.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Ready-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![WebSocket](https://img.shields.io/badge/WebSocket-Live_Stream-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![Chart.js](https://img.shields.io/badge/Chart.js-4.4-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)](https://www.chartjs.org/)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)

<br/>

> 🚀 **SupportPilot** is an enterprise-grade IT Helpdesk & Automated Ticket Resolution Platform developed during the **Infosys Springboard Program** by **Group 3**.  
> It pairs a responsive **React 18** client dashboard with a high-throughput **FastAPI** backend, featuring **LLaMA 3.2 Chain-of-Thought AI Triage**, a **LangGraph Multi-Agent Pipeline (RAG + ChromaDB)**, **Bi-Directional Jira Integration**, **Event-Driven Transactional Email Automation**, **Modern User Profile & Settings Management**, and **Real-Time WebSocket Updates**.

</div>

---

## 📋 Table of Contents

- [✨ Key Features](#-key-features)
- [🏗️ System Architecture](#️-system-architecture)
- [🤖 Multi-Agent Orchestration & RAG Pipeline](#-multi-agent-orchestration--rag-pipeline)
- [🎯 Automated AI Triage & Priority Engine](#-automated-ai-triage--priority-engine)
- [⚙️ Settings & User Profile Management](#️-settings--user-profile-management)
- [🔄 Jira & Email Integration Ecosystem](#-jira--email-integration-ecosystem)
- [📊 Interactive Dashboard & Analytics](#-interactive-dashboard--analytics)
- [🖥️ Tech Stack](#️-tech-stack)
- [📁 Project Structure](#-project-structure)
- [🚀 Quickstart & Installation](#-quickstart--installation)
- [🔌 Complete API Reference](#-complete-api-reference)
- [🏷️ AI Classification Taxonomy & Routing Matrix](#️-ai-classification-taxonomy--routing-matrix)
- [🎨 UI / UX Design System](#-ui--ux-design-system)
- [🤝 Infosys Springboard Milestones & Team](#-infosys-springboard-milestones--team)
- [📄 License](#-license)

---

## ✨ Key Features

<table>
<tr>
<td width="50%" valign="top">

### 🎫 Intelligent Ticket Management
- **Full Ticket Lifecycle**: Create, view, update status (`Open` → `In Progress` → `Escalated` → `Resolved`), assign, and delete tickets.
- **Dynamic Filtering & Search**: Instant filtering by status, category, department, priority (`P1 Urgent` to `P4 Low`), and search keywords.
- **Detailed Drawer & Activity Trail**: Slide-out ticket drawer with full chronological event logs, resolution details, and agent telemetry.
- **Reassignment & Manual Override**: Operators can manually reassign tickets to specific support agents or departments.

</td>
<td width="50%" valign="top">

### 🧠 LLaMA 3.2 AI Triage Engine
- **Automated Intake Triage**: Automatic SLA priority (`P1 Urgent`, `P2 High`, `P3 Medium`, `P4 Low`), severity, category, and department assignment upon ticket creation.
- **Chain-of-Thought Reasoning**: AI writes technical justification before categorizing to maximize classification accuracy.
- **Confidence Scoring**: Computes a confidence score ($0.00 - 1.00$) per ticket.
- **High-Speed Heuristic Fallback**: Zero-downtime heuristic engine when local Ollama LLM is offline.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 🕸️ LangGraph Multi-Agent Orchestrator
- **Diagnosis Agent**: Evaluates issue descriptions, analyzes root cause, and classifies severity.
- **Retrieval Agent (RAG)**: Queries vector store and corporate knowledge base to extract matching runbooks and past solutions.
- **Resolution Agent**: Synthesizes structured remediation steps with actionable recovery guides.
- **Escalation Agent**: Monitors SLA breach risks and coordinates Jira syncing & team notifications.

</td>
<td width="50%" valign="top">

### ⚙️ Modern Settings & Profile System
- **Profile Customization**: Manage Name, Email, Phone, Bio, Department, and Role.
- **Custom Avatar Uploads**: Drag-and-drop or select profile images with automated server storage (`/uploads/profiles/`).
- **Security & Credentials**: Secure password updates with current password SHA-256 verification.
- **Live User Sync**: Global event broadcast across dashboard headers, avatar badges, and local sessions.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 🔄 Enterprise Jira Integration Hub
- **Bi-Directional Sync**: Automatically creates Jira issues (`ENG`, `NET`, `SW`, `DBA`) and synchronizes status changes.
- **Smart Team Routing**: Keyword-based routing to NetOps, Desktop Support, DBA, or Billing with assigned leads.
- **Jira Management UI**: Filter issues, view sync status, trigger manual syncs, and post comments directly to Jira.
- **Configurable Settings**: Custom Jira project keys, URLs, tokens, issue types, and polling intervals.

</td>
<td width="50%" valign="top">

### 📬 Transactional Email Automation
- **Event-Triggered Notifications**: Automated dispatch upon ticket creation, AI resolution, and team escalation.
- **Interactive Dispatch Timelines**: Visual stage tracker (*Generated → Queued → Sending → Delivered → Opened → Clicked*).
- **Rich Email Templates**: Pre-configured corporate HTML templates with auto-inserted ticket parameters.
- **Delivery Audit Logs**: JSON & SQLite persistence of all dispatched emails with status filters.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### ⚡ Real-Time WebSocket Streaming
- **Live Ticket Sync (`/ws/dashboard`)**: Instant updates pushed to all active connected clients when tickets change.
- **Zero-Latency Heartbeat**: Built-in ping/pong heartbeat and reconnect resilience.
- **Instant KPI Recalculation**: Analytics counters, trend graphs, and active tables update without page reload.

</td>
<td width="50%" valign="top">

### 📊 React 18 KPI Dashboard & Chart.js
- **Live Metric Cards**: Total tickets, open cases, resolved count, and AI automation rate with trends.
- **Interactive Charts**: 30-day ticket volume trends, category distribution doughnuts, and severity breakdown bars.
- **Zero Build Overhead**: Built with pure React 18 via CDN (`React.createElement`) — no Node.js compilation required.

</td>
</tr>
</table>

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT TIER (Browser SPA)                                 │
│                                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                    Modern Glassmorphic UI (Vanilla CSS + React 18)                    │  │
│  │                                                                                       │  │
│  │   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐ │  │
│  │   │ React KPI   │   │ Ticket Ops  │   │ Multi-Agent │   │ Settings &  │   │ Jira Hub &  │ │  │
│  │   │  Dashboard  │   │  & Filter   │   │  Telemetry  │   │ Profile UI  │   │ Email Auto  │ │  │
│  │   └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘ │  │
│  │          │                 │                 │                 │                 │        │  │
│  │          └─────────────────┴────────┬────────┴─────────────────┴─────────────────┘        │  │
│  │                                     │ REST & WebSockets                                   │  │
│  │  └──────────────────────────────────┼─────────────────────────────────────────────────────┘  │
└────────────────────────────────────────┼────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   APPLICATION TIER (FastAPI)                                │
│                                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                               FastAPI Backend (Main / App)                             │  │
│  │                                                                                       │  │
│  │  [Routers] Tickets · Users/Profile · KB · Escalations · Responses · Jira · Email      │  │
│  │  [AI Engine] app/triage.py Auto-Classification · LangGraph Multi-Agent Orchestrator   │  │
│  │  [WebSocket] /ws/dashboard Live Broadcast Hub · [CORS] Open Middleware               │  │
│  │  [Validation] Pydantic v2 Schema Enforcement & Type Validation                       │  │
│  └───────────┬─────────────────────────┬─────────────────────────┬───────────────────────┘  │
│              │                         │                         │                          │
│              ▼                         ▼                         ▼                          │
│   ┌────────────────────┐    ┌────────────────────┐    ┌────────────────────┐                │
│   │   AI Triage Engine │    │  LangGraph Multi-  │    │  RAG Knowledge     │                │
│   │   (app/triage.py)  │    │  Agent Pipeline    │    │  Retrieval Vector  │                │
│   │   (LLaMA 3.2 / ML) │    │  (StateGraph)      │    │  (ChromaDB + DB)   │                │
│   └────────────────────┘    └────────────────────┘    └────────────────────┘                │
└────────────────┬───────────────────────┬─────────────────────────┬──────────────────────────┘
                 │                       │                         │
                 ▼                       ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 PERSISTENCE & INTEGRATION TIER                              │
│                                                                                             │
│   ┌───────────────────────────┐ ┌───────────────────────────┐ ┌───────────────────────────┐   │
│   │     SQL Database (ORM)    │ │   Atlassian Jira Cloud    │ │   Transactional Email     │   │
│   │   SQLite / PostgreSQL     │ │  Bi-Directional REST Sync │ │  Relay & Log Store (JSON) │   │
│   │   + Media File Uploads    │ │   (data/jira_issues.json) │ │   (email_logs.json)       │   │
│   └───────────────────────────┘ └───────────────────────────┘ └───────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🤖 Multi-Agent Orchestration & RAG Pipeline

SupportPilot incorporates a **LangGraph StateGraph Multi-Agent Pipeline** (`app/agents/resolution_agent.py`) that systematically breaks down incident resolution into distinct autonomous agent stages:

```mermaid
graph TD
    A([📥 Ticket Intake]) --> B[Node 1: Fetch Ticket]
    B --> C[Node 2: Retrieve Knowledge Context - RAG]
    C --> D[Node 3: Generate AI Resolution]
    D --> E{Confidence >= 0.65?}
    
    E -- Yes --> F[Node 4A: Save Resolution & Mark Resolved]
    F --> G[📬 Trigger Transactional Email Service]
    
    E -- No --> H[Node 4B: Escalate Ticket to Human Team]
    H --> I[🔄 Sync with Atlassian Jira]
    I --> J[📬 Dispatch Escalation Alert Email]
    
    G --> K([🏁 Complete])
    J --> K([🏁 Complete])
    
    style A fill:#1e3a8a,stroke:#3b82f6,stroke-width:2px,color:#fff
    style K fill:#06b6d4,stroke:#3b82f6,stroke-width:2px,color:#fff
    style E fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff
```

### Agent Roles & Telemetry Endpoints

| Agent | Module | Responsibilities | Telemetry API |
|-------|--------|------------------|---------------|
| **Diagnosis Agent** | `resolution_agent.py` | Analyzes incident subject/body, performs semantic taxonomy mapping, root cause analysis, and severity prediction. | `GET /api/agents/{ticket_id}` |
| **Retrieval Agent** | `resolution_agent.py` | Vector search across ChromaDB and KB articles to find high-similarity runbooks and past resolutions. | `GET /api/rag/{ticket_id}` |
| **Resolution Agent** | `resolution_agent.py` | Synthesizes step-by-step remediation plan with minimal downtime impact based on retrieved context. | `GET /api/agents/{ticket_id}` |
| **Escalation Agent** | `resolution_agent.py` | Evaluates SLA breach risk, triggers Jira issue creation, and alerts designated on-call technical leads. | `POST /api/escalate` |

---

## 🎯 Automated AI Triage & Priority Engine

SupportPilot features an intelligent ticket triage engine (`app/triage.py`) that automatically parses every incoming ticket upon submission:

- **🔴 P1 Urgent**: Database deadlocks, table locking, connection pool exhaustion, critical production outages (`SRE / DBA`).
- **🟠 P2 High**: Corporate VPN timeouts, OAuth token expiration, Single Sign-On lockouts (`NetOps / IAM`).
- **🔵 P3 Medium**: Software installation errors, application crashes, billing & payment inquiries (`Support / Billing`).
- **⚪ P4 Low**: Hardware peripherals, keyboard/mouse replacements, printer paper jams (`IT Desktop Ops`).

---

## ⚙️ Settings & User Profile Management

The **Settings & Profile** page (`js/settings-react.js` & `app/routers/users.py`) offers a complete administrative user management suite:

1. **Profile Information**: Update Full Name, Email, Phone Number, Department, Role, and Bio.
2. **Avatar Uploads**: Upload custom profile avatars with instant thumbnail preview and static serving (`/uploads/profiles/`).
3. **Account Security**: Change account password securely with SHA-256 current password validation.
4. **Global User State Sync**: Automatically updates the top navigation bar, profile avatar, role badge, and session store across tabs without page reloads.

---

## 🔄 Jira & Email Integration Ecosystem

### Intelligent Jira Team Routing Rules

When a ticket is triaged or escalated, SupportPilot automatically applies intelligent routing heuristics to assign the corresponding Jira project key, team, and lead assignee:

| Issue Keywords | Project Key | Assigned Team | Default Lead Assignee | Priority |
|----------------|-------------|---------------|-----------------------|----------|
| `vpn`, `network`, `wifi`, `dns`, `firewall`, `gateway` | **NET** | Network Operations (NetOps) | Alex Rivera (NetOps Lead) | `High` |
| `software`, `install`, `setup`, `update`, `patch`, `os` | **SW** | Desktop Software Support | Devon Vance (Desktop Eng) | `Medium` |
| `database`, `sql`, `postgres`, `deadlock`, `query`, `redis` | **DBA** | Database Reliability Eng | Marcus Brody (Principal DBA) | `Critical` |
| `payment`, `invoice`, `stripe`, `billing`, `subscription` | **BILL** | Billing & Finance Operations | Elena Rostova (Billing Mgr) | `Medium` |
| `hardware`, `laptop`, `monitor`, `battery`, `printer` | **HW** | IT Hardware Asset Ops | Jason Chen (IT Asset Specialist) | `Low` |

### Email Automation Lifecycle

Every notification progresses through an interactive 6-stage delivery pipeline visible in the **Email Automation** tab:

```
[1. Generated] ──► [2. Queued] ──► [3. Sending] ──► [4. Delivered (250 OK)] ──► [5. Opened] ──► [6. Clicked]
```

---

## 📊 Interactive Dashboard & Analytics

The analytics dashboard provides real-time visualization of IT operations:

- **Volume & SLA Trends**: 30-day ticket intake vs resolution rates.
- **Category Doughnut Chart**: Proportion of Network, Authentication, Hardware, Software, Payment, and Database tickets.
- **Severity Breakdown**: Distribution of Low, Medium, High, and Critical issues.
- **Real-Time Counters**:
  - 📈 **Total Tickets**: Total incident volume tracked.
  - ⏳ **Open Tickets**: Active pending tickets awaiting resolution.
  - ✅ **Resolved**: Successfully closed tickets.
  - 🤖 **AI Handled**: Percentage of tickets triaged and resolved autonomously by SupportPilot.

---

## 🖥️ Tech Stack

### Frontend

| Layer | Technology | Description |
|-------|------------|-------------|
| **Core Architecture** | Vanilla HTML5 / ES6 JavaScript | Zero-build single page application |
| **Reactive UI** | React 18 (via CDN) | Dynamic KPI dashboard (`dashboard-react.js`) & Settings panel (`settings-react.js`) |
| **Charting Engine** | Chart.js 4.4 | Responsive canvas data visualization (`analytics.js`) |
| **Real-time Protocol**| HTML5 WebSockets | Real-time bi-directional update streaming |
| **Design System** | Custom Vanilla CSS3 | Glassmorphism, CSS variables, dark/light theme engine, floating dock menu |
| **Typography** | Plus Jakarta Sans (Google Fonts) | Clean enterprise typography |

### Backend

| Layer | Technology | Description |
|-------|------------|-------------|
| **API Framework** | FastAPI 0.115 | Asynchronous RESTful routing and WebSocket endpoints |
| **Server Engine** | Uvicorn 0.30 | High-performance ASGI production server |
| **Data Validation**| Pydantic v2 | Strict request/response schema modeling |
| **Database / ORM** | SQLAlchemy 2.0 + SQLite / PostgreSQL | Dual-engine ORM support with automated schema migrations |
| **AI / LLM Engine**| Ollama + LLaMA 3.2 | Local open-source LLM inference engine with JSON schema mode |
| **Triage Engine** | `app/triage.py` | Taxonomy mapping, SLA priority assignment, and heuristic classification |
| **Agent Framework**| LangGraph | Directed state machine multi-agent orchestration |
| **Authentication** | SHA-256 Hashing | Secure user registration & authentication protocol |

---

## 📁 Project Structure

```
Grp3_InfosysSpringboard/
│
├── 📄 index.html                  # Main SPA container (Dock nav, views, modals, drawers)
├── 📄 login.html                  # User authentication & registration portal
├── 📄 main.py                     # Primary FastAPI entrypoint (Routers, WebSockets, Triage, Auth)
├── 📄 classify.py                 # Standalone ticket classifier & Chain-of-Thought utility
├── 📄 seed_data.py                # Database population script with sample enterprise data
├── 📄 requirements.txt            # Python backend dependencies
├── 📄 env.example                 # Environment configuration template
├── 📄 .env                        # Local environment variables
├── 📄 supportpilot.db             # Local SQLite database instance
├── 📄 email_logs.json             # Persistent transactional email store
│
├── 📁 app/                        # Modular FastAPI Application Package
│   ├── 📄 __init__.py
│   ├── 📄 main.py                 # Sub-package FastAPI entrypoint
│   ├── 📄 triage.py               # AI Triage & Priority Classification Engine
│   ├── 📄 database.py             # SQLAlchemy database session & engine config
│   ├── 📄 models.py               # SQLAlchemy ORM schemas (Users, Tickets, KB, Logs, Jira, etc.)
│   ├── 📄 schemas.py              # Pydantic request/response validation models
│   ├── 📄 crud.py                 # Core database CRUD query operations
│   │
│   ├── 📁 agents/                 # Multi-Agent Modules
│   │   ├── 📄 __init__.py
│   │   └── 📄 resolution_agent.py # LangGraph Multi-Agent Orchestrator (4-Node Pipeline)
│   │
│   └── 📁 routers/                # REST API Routers
│       ├── 📄 __init__.py
│       ├── 📄 analytics.py        # Dashboard KPI metrics & telemetry endpoint
│       ├── 📄 email.py            # Email automation, templates, stats & dispatch logs
│       ├── 📄 escalations.py      # Ticket escalation & assignment endpoints
│       ├── 📄 jira_tickets.py     # Jira Cloud synchronization & team routing hub
│       ├── 📄 knowledge_base.py   # KB article management & semantic query search
│       ├── 📄 responses.py        # AI-generated response records & storage
│       ├── 📄 tickets.py          # Full Ticket CRUD, status transitions & audit logs
│       └── 📄 users.py            # User management & profile endpoints
│
├── 📁 uploads/                    # User Profile Media Uploads
│   └── 📁 profiles/               # Profile avatars and user assets
│
├── 📁 css/
│   └── 📄 styles.css              # Unified design system (Tokens, glassmorphism, dock, animations)
│
├── 📁 js/                         # Frontend Modular JavaScript
│   ├── 📄 agent-pipeline.js       # Multi-agent visualizer & telemetry drawer
│   ├── 📄 analytics.js            # Chart.js analytics & trend visualizer
│   ├── 📄 app.js                  # Application bootstrap, navigation & modal controllers
│   ├── 📄 assistant.js            # Interactive IT AI assistant chatbot
│   ├── 📄 dashboard-react.js      # React 18 Live KPI Dashboard component
│   ├── 📄 data.js                 # Initial fallback and mockup datasets
│   ├── 📄 email-enhanced.js       # Transactional email manager & interactive timeline tracker
│   ├── 📄 email.js                # Core email notification helpers
│   ├── 📄 jira-integration.js     # Jira integration UI, issue sync & routing controller
│   ├── 📄 settings-react.js       # React 18 Settings & Profile component
│   ├── 📄 settings.js             # Theme switcher & local persistence
│   ├── 📄 tickets.js              # Ticket table, real-time filters, drawer & CRUD operations
│   └── 📄 workflow.js             # Automation rule configuration
│
└── 📁 data/                       # Local JSON Data Storage
    ├── 📄 jira_config.json        # Jira integration settings & credentials
    └── 📄 jira_issues.json        # Synced Jira issues store & comment logs
```

---

## 🚀 Quickstart & Installation

### Prerequisites

- **Python 3.10+** installed on your system.
- **[Ollama](https://ollama.com)** installed and running locally.
- A modern web browser (Chrome, Edge, Firefox, Safari).

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/sssnehsingh/Grp3_InfosysSpringboard.git
cd Grp3_InfosysSpringboard
```

### Step 2: Create a Virtual Environment & Install Dependencies

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Windows (CMD):
.\venv\Scripts\activate.bat
# macOS / Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Step 3: Configure Environment Variables

```bash
# Copy template configuration
cp env.example .env
```

*(Optional)* The default `.env` uses SQLite (`sqlite:///./supportpilot.db`), requiring zero setup. If you wish to use PostgreSQL:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/supportpilot
```

### Step 4: Start Ollama & Pull the LLaMA 3.2 Model

```bash
# Start Ollama service (if not running in background)
ollama serve

# In a separate terminal, pull the LLaMA 3.2 model:
ollama pull llama3.2
```

### Step 5: Seed Demo Enterprise Data

Populate the database with realistic demo users, tickets, KB articles, and activity logs:

```bash
python seed_data.py
```

### Step 6: Start the FastAPI Backend Server

```bash
uvicorn main:app --reload --port 8000
```

- 🌐 **API Base URL**: `http://127.0.0.1:8000`
- 📖 **Interactive Swagger UI**: `http://127.0.0.1:8000/docs`
- 📖 **Alternative ReDoc UI**: `http://127.0.0.1:8000/redoc`

### Step 7: Launch the Application Frontend

Open `login.html` or `index.html` directly in your browser:

```bash
# Windows
start login.html

# macOS
open login.html

# Linux
xdg-open login.html
```

> 💡 **Tip**: For the best development experience with hot-reloading, use the **Live Server** extension in VS Code.

---

## 🔌 Complete API Reference

### 1. Health & WebSocket Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | System health check and status confirmation. |
| `WS` | `/ws/dashboard` | Real-time WebSocket connection for live ticket updates and dashboard sync. |

---

### 2. User Profile & Settings Management (`/api/users`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users/profile` | Retrieve profile information for the authenticated user. |
| `PUT` | `/api/users/profile` | Update profile information (name, phone, bio, department, role). |
| `POST` | `/api/users/profile/image` | Upload a new avatar image (multipart form-data). |
| `POST` | `/api/users/change-password` | Update user password with current password SHA-256 verification. |

---

### 3. AI Triage & Multi-Agent Telemetry

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/triage` | Submit ticket for Chain-of-Thought LLaMA 3.2 classification & remediation drafting. |
| `GET` | `/api/agents/{ticket_id}` | Fetch multi-agent telemetry (Diagnosis, Retrieval, Resolution, Escalation status). |
| `GET` | `/api/rag/{ticket_id}` | Fetch RAG context augmentation metrics, ChromaDB embeddings & similarity scores. |
| `GET` | `/api/activity/{ticket_id}`| Retrieve chronological agent activity stream for a ticket. |

---

### 4. Ticket Operations (`/api/tickets`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tickets` | List tickets with optional query filters (`status`, `category`, `priority`, `skip`, `limit`). |
| `POST` | `/api/tickets` | Create a new ticket with automatic AI triage priority and category derivation. |
| `GET` | `/api/tickets/{id}` | Get ticket details including responses, logs, Jira sync, and escalations. |
| `PATCH` | `/api/tickets/{id}/status` | Update ticket status (`Open`, `In Progress`, `Escalated`, `Resolved`). |
| `PATCH` | `/api/tickets/{id}/classification` | Update ticket category, priority, and confidence score. |
| `DELETE` | `/api/tickets/{id}` | Remove ticket from database. |
| `GET` | `/api/tickets/{id}/logs` | Fetch activity audit trail for ticket. |
| `POST` | `/api/escalate` | Escalate ticket to a specialized engineering department. |
| `POST` | `/api/reassign` | Reassign ticket ownership to a specific support agent. |

---

### 5. Jira Integration Hub (`/api/jira`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/jira/issues` | Retrieve all synced Jira issues with status, priority, and assignee filters. |
| `POST` | `/api/jira/create` | Manually or automatically create a linked Jira issue from a ticket. |
| `PATCH` | `/api/jira/issues/{key}/status` | Update Jira issue status (`To Do`, `In Progress`, `Escalated`, `Done`). |
| `POST` | `/api/jira/issues/{key}/comments`| Post an agent or operator comment to a Jira issue. |
| `GET` | `/api/jira/config` | Fetch Jira Cloud connection configuration. |
| `POST` | `/api/jira/config` | Update Jira connection credentials and sync interval. |
| `POST` | `/api/jira/sync-all` | Trigger full bi-directional sync across all tickets and Jira issues. |

---

### 6. Transactional Email Automation (`/api/email`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/email/logs` | Fetch dispatched email history with pagination and status filters. |
| `GET` | `/api/email/logs/{id}` | Get single email dispatch details including interactive stage timeline. |
| `POST` | `/api/email/send` | Dispatch an automated email for ticket lifecycle events. |
| `GET` | `/api/email/stats` | Retrieve email delivery rate, open rate, click rate, and bounce stats. |
| `POST` | `/api/email/resend/{id}` | Re-queue and re-dispatch a failed or bounced email. |

---

### 7. Authentication & Knowledge Base

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/register` | Register a new user account with hashed credentials. |
| `POST` | `/api/login` | Authenticate user credentials and return user profile session. |
| `GET` | `/api/knowledge-base` | Retrieve knowledge base articles. |
| `GET` | `/api/knowledge-base/search?q=` | Search knowledge base via semantic keyword matching. |
| `GET` | `/api/analytics/dashboard` | Retrieve live KPI statistics and performance ratios. |

---

## 🏷️ AI Classification Taxonomy & Routing Matrix

SupportPilot's triage system standardizes classification across common enterprise IT incidents:

| Category | Typical Scenarios & Keywords | Department | Default Priority | Default Severity | Target Resolution SLA |
|----------|------------------------------|------------|------------------|------------------|-----------------------|
| 🌐 **Network** | VPN timeouts, gateway latency, Wi-Fi drops, DNS errors | Engineering | `P2 High` | `High` | 2 Hours |
| 🔐 **Authentication** | Password resets, SSO errors, MFA locked, access denied | Customer Support | `P3 Medium` | `Medium` | 1 Hour |
| 🗄️ **Database Performance** | Deadlocks, slow SQL queries, connection pool exhaustion | Engineering | `P1 Urgent` | `Critical` | 30 Minutes |
| 💻 **Hardware** | Printer offline, monitor failure, battery bulging, docking | IT Desktop Ops | `P4 Low` | `Low` | 8 Hours |
| 💿 **Software** | Application crash, installer failure, license expiration | Customer Support | `P3 Medium` | `Medium` | 4 Hours |
| 💳 **Payment Issues** | Stripe failure, invoice dispute, subscription renewal | Billing | `P3 Medium` | `Medium` | 4 Hours |
| 📧 **Email** | Outlook synchronization, SMTP bounce, mailbox quota | Customer Support | `P3 Medium` | `Medium` | 2 Hours |

---

## 🎨 UI / UX Design System

SupportPilot features a refined enterprise aesthetic built entirely with modern Vanilla CSS3:

- **Floating Glassmorphic Dock Menu**: A sleek left-docked floating navigation bar with responsive hover scaling, rotation micro-animations, and collapse/expand toggles.
- **Adaptive Dark / Light Themes**: Pure CSS custom property tokens (`--bg-primary`, `--accent-primary`, `--card-bg`, `--glass-border`) supporting zero-flicker theme switching.
- **Micro-Interactions**: Hover lifts, smooth glow shadows, pulse indicators for active AI status, and animated slide-out drawers.
- **Tabbed Ticket Drawer**: Side inspection panel allowing operators to switch seamlessly between ticket metadata, activity logs, and live Multi-Agent RAG telemetry.

---

## 🤝 Infosys Springboard Milestones & Team

SupportPilot was built collaboratively by **Group 3** as part of the **Infosys Springboard Program**:

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       PROJECT MILESTONE DELIVERABLES                                      │
├──────────────┬───────────────────────────────────────────────────────────────┬────────────────────────────┤
│ Milestone    │ Core Deliverables & Technical Scope                           │ Status                     │
├──────────────┼───────────────────────────────────────────────────────────────┼────────────────────────────┤
│ **M1**       │ Ticket Intake Engine, AI Classification Taxonomy, FastAPI     │ ✅ Completed               │
│              │ backend setup, SQLite database modeling, Pydantic schemas.    │                            │
├──────────────┼───────────────────────────────────────────────────────────────┼────────────────────────────┤
│ **M2**       │ Vector RAG Knowledge Base search, AI Remediation Generation,  │ ✅ Completed               │
│              │ React 18 KPI Dashboard, Chart.js trend visualizations.        │                            │
├──────────────┼───────────────────────────────────────────────────────────────┼────────────────────────────┤
│ **M3**       │ LangGraph Multi-Agent Orchestrator, Bi-Directional Jira Sync, │ ✅ Completed               │
│              │ Event-Driven Transactional Email Service & Delivery Timelines.│                            │
├──────────────┼───────────────────────────────────────────────────────────────┼────────────────────────────┤
│ **M4**       │ WebSocket Live Broadcasts, Settings & Profile Management,     │ ✅ Completed               │
│              │ Auto-Triage Pipeline, Floating Dock UI, Testing & Polish.     │                            │
└──────────────┴───────────────────────────────────────────────────────────────┴────────────────────────────┘
```

### 👥 Team Members — Group 3
- 🧠 **Sneh Singh**
- 🚀 **Pranjal Kumar**
- 💡 **Ruchitha Reddy**
- 🔧 **Mithrabharathi Ravula**
- ✨ **Anuradha Gethe**

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:06b6d4,50:3b82f6,100:1e3a8a&height=120&section=footer" width="100%"/>

**SupportPilot** · *AI-Powered IT Ticket Resolution Platform* · Infosys Springboard Group 3

</div>
