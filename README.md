<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:1e3a8a,50:3b82f6,100:06b6d4&height=200&section=header&text=SupportPilot&fontSize=60&fontColor=ffffff&fontAlignY=38&desc=AI-Powered+IT+Ticket+Resolution+Platform&descSize=20&descAlignY=58" width="100%"/>

<br/>

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Ollama](https://img.shields.io/badge/Ollama-LLaMA_3.2-black?style=for-the-badge&logo=meta&logoColor=white)](https://ollama.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

<br/>

> 🚀 A full-stack AI helpdesk platform built during the **Infosys Springboard Program** by **Group 3**.  
> Combines a React-powered frontend dashboard with a FastAPI + LLaMA 3.2 AI triage backend.

</div>

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [🖥️ Tech Stack](#️-tech-stack)
- [📁 Project Structure](#-project-structure)
- [🚀 Getting Started](#-getting-started)
- [🤖 AI Triage Engine](#-ai-triage-engine)
- [📊 Dashboard & Analytics](#-dashboard--analytics)
- [🔌 API Reference](#-api-reference)
- [🎨 UI Highlights](#-ui-highlights)
- [🤝 Team](#-team)

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🎫 Ticket Management
- Submit, view, filter, and sort tickets
- Real-time status updates (`Open` → `In Progress` → `Resolved`)
- Priority and severity tagging
- Full audit/activity log per ticket

</td>
<td width="50%">

### 🤖 AI Triage Agent
- Powered by **LLaMA 3.2** via Ollama
- Auto-classifies tickets into 5 categories
- Assigns severity levels with confidence scores
- Graceful fallback heuristics if LLM is unavailable

</td>
</tr>
<tr>
<td>

### 📊 Analytics Dashboard
- Live KPI cards (total, open, resolved, AI-handled)
- **Interactive charts** powered by Chart.js
- Ticket trend graphs, category breakdowns, severity distributions
- All built with **React 18** using `React.createElement` (no JSX/build step)

</td>
<td>

### 💬 AI Assistant Chatbot
- Context-aware IT support assistant
- Scenario-based routing (VPN, printer, password, network)
- Quick-action buttons for common resolutions
- Embedded directly in the dashboard sidebar

</td>
</tr>
<tr>
<td>

### ⚙️ Settings & Workflow
- User profile and notification preferences
- Email escalation integration
- Jira ticket linking
- Dark / Light theme toggle

</td>
<td>

### 📱 Fully Responsive
- Mobile-first layout with hamburger nav
- Slide-in sidebar with blur overlay
- Scrollable tables and adaptive KPI grids
- Works on all screen sizes ≥ 320px

</td>
</tr>
</table>

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                         │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │           React 18 Frontend (No Build Step)             │   │
│   │                                                         │   │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│   │  │Dashboard │ │ Tickets  │ │Analytics │ │Assistant │  │   │
│   │  │  React   │ │  (JS)    │ │ Chart.js │ │  Bot(JS) │  │   │
│   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│   │                        │                               │   │
│   │              Settings · Workflow · Email               │   │
│   └───────────────────────┬─────────────────────────────────┘   │
└───────────────────────────┼─────────────────────────────────────┘
                            │ HTTP / REST API
┌───────────────────────────▼─────────────────────────────────────┐
│                    FastAPI Backend  (Main.py)                    │
│                                                                 │
│   POST /api/triage ──► AI Triage Agent (LLaMA 3.2 via Ollama)  │
│                              │                                  │
│              ┌───────────────▼───────────────┐                  │
│              │        Pydantic Validation     │                  │
│              │  category · severity · score   │                  │
│              └───────────────┬───────────────┘                  │
│                              │                                  │
│              ┌───────────────▼───────────────┐                  │
│              │      SQLite Database           │                  │
│              │   (supportpilot.db)            │                  │
│              └───────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow — Ticket Lifecycle

```
User Submits Ticket
        │
        ▼
  Frontend (index.html)
        │ POST /api/triage
        ▼
  FastAPI (Main.py)
        │
        ├──► LLaMA 3.2 (Ollama)
        │         │
        │    JSON Response:
        │    { category, severity, confidence, reasoning }
        │         │
        ├◄────────┘
        │
        ├──► SQLite INSERT (tickets table)
        │
        └──► Return result to Frontend
                   │
                   ▼
        Dashboard updates KPI cards,
        charts, and ticket table in real-time
```

---

## 🖥️ Tech Stack

### Frontend

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **UI Framework** | React 18 (CDN, no JSX) | Dashboard & Settings panels |
| **Charts** | Chart.js | Ticket trend graphs, category pie charts, severity bars |
| **Styling** | Vanilla CSS + CSS Variables | Full theming (dark/light), glassmorphism |
| **Fonts** | Plus Jakarta Sans (Google Fonts) | Premium typography |
| **Icons** | Inline SVG | Zero-dependency icon system |
| **Animations** | CSS keyframes + transitions | Micro-animations, hover effects, toast fades |

### Backend

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **API Framework** | FastAPI 0.115 | REST API, async routing, Swagger docs |
| **AI / LLM** | Ollama + LLaMA 3.2 | Ticket classification & reasoning |
| **Database** | SQLite (dev) / PostgreSQL (prod) | Ticket storage & audit logs |
| **ORM** | SQLAlchemy 2.0 | DB models and query logic |
| **Validation** | Pydantic v2 | Request/response schema enforcement |
| **Server** | Uvicorn | ASGI production server |

---

## 📁 Project Structure

```
Grp3_InfosysSpringboard/
│
├── 📄 index.html                  # Main app shell (SPA layout)
├── 📄 login.html                  # Authentication page
├── 📄 Main.py                     # FastAPI entry point + AI triage endpoint
├── 📄 classify.py                 # Standalone ticket classifier utility
├── 📄 seed_data.py                # Demo data seeder
├── 📄 requirements.txt            # Python dependencies
├── 📄 env.example                 # Environment variable template
│
├── 📁 app/                        # Backend application package
│   ├── main.py                    # FastAPI app, CORS, router registration
│   ├── database.py                # DB engine/session setup
│   ├── models.py                  # SQLAlchemy ORM models
│   ├── schemas.py                 # Pydantic request/response models
│   ├── crud.py                    # All DB query/mutation logic
│   ├── 📁 agents/                 # AI agent modules
│   └── 📁 routers/
│       ├── users.py
│       ├── tickets.py
│       ├── knowledge_base.py
│       ├── responses.py           # AI-generated ticket resolutions
│       ├── escalations.py
│       ├── jira_tickets.py
│       └── analytics.py          # Dashboard stats endpoint
│
├── 📁 js/                         # Frontend JavaScript modules
│   ├── dashboard-react.js         # ⚛️ React 18 KPI dashboard component
│   ├── analytics.js               # 📊 Chart.js analytics (graphs/charts)
│   ├── tickets.js                 # 🎫 Ticket table, filters, CRUD
│   ├── assistant.js               # 🤖 AI chatbot assistant module
│   ├── settings-react.js          # ⚛️ React settings panel
│   ├── settings.js                # Settings logic & persistence
│   ├── workflow.js                # Workflow automation rules
│   ├── email.js                   # Email escalation integration
│   └── app.js                     # App bootstrap & navigation
│
├── 📁 css/
│   └── styles.css                 # Full design system (tokens, themes, components)
│
└── 📁 Ticket-Management/          # Legacy/alternate frontend build
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- [Ollama](https://ollama.com) installed and running
- LLaMA 3.2 model pulled: `ollama pull llama3.2`

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/sssnehsingh/Grp3_InfosysSpringboard.git
cd Grp3_InfosysSpringboard
```

### 2️⃣ Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 3️⃣ Configure Environment (Optional)

```bash
cp env.example .env
# Edit .env if you want to switch to PostgreSQL
```

### 4️⃣ Start Ollama (AI Engine)

```bash
ollama serve
# In a new terminal:
ollama pull llama3.2
```

### 5️⃣ Run the Backend

```bash
uvicorn Main:app --reload --port 8000
```

| URL | Purpose |
|-----|---------|
| `http://127.0.0.1:8000` | API base URL |
| `http://127.0.0.1:8000/docs` | 📖 Swagger interactive docs |
| `http://127.0.0.1:8000/redoc` | 📖 ReDoc alternative docs |

### 6️⃣ Open the Frontend

```bash
# Windows
start index.html

# Mac / Linux
open index.html
```

> 💡 **Tip:** Use the **Live Server** extension in VS Code for hot-reload during development.

### 7️⃣ Seed Demo Data (Optional)

```bash
python seed_data.py
```

Creates: 3 users · 4 tickets · 3 KB articles · 2 AI responses · 1 escalation · 2 Jira tickets

---

## 🤖 AI Triage Engine

The AI triage engine (`Main.py`) uses **LLaMA 3.2** (via Ollama) to automatically classify incoming IT support tickets.

### Classification Taxonomy

| Category | Example Issues | Default Severity |
|----------|---------------|-----------------|
| 🌐 **Network** | VPN timeouts, internet disconnections | `High` |
| 🔐 **Password Reset** | Account lockouts, forgotten credentials | `Low` / `Medium` |
| 🖥️ **Hardware** | Printer offline, blue screen errors | `Medium` / `High` |
| 💿 **Software** | App crashes, MS Office failures | `Medium` / `High` |
| 📧 **Email** | Login failures, send/receive errors | `Medium` |

### Triage Response Schema

```json
{
  "reasoning_summary": "User reports VPN handshake timeout — maps to Network/High per taxonomy.",
  "category": "Network",
  "severity": "High",
  "confidence_score": 0.97
}
```

### Fallback Heuristics

If the LLM is unavailable, the engine falls back to keyword-based classification:
- `vpn` / `network` in description → **Network / High**
- `critical` in title → **High severity**
- All else → **Software / Medium**

---

## 📊 Dashboard & Analytics

The dashboard is built with **React 18** loaded from CDN — no build step, no JSX, no webpack. Components use `React.createElement` directly.

### KPI Cards

```
┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│  Total Tickets │  │  Open Tickets  │  │    Resolved    │  │  AI Handled    │
│      247       │  │      43        │  │      189       │  │      91%       │
│   ↑ 12% MTD   │  │   ↓ 8% MTD    │  │   ↑ 15% MTD   │  │   ↑ 3% MTD    │
└────────────────┘  └────────────────┘  └────────────────┘  └────────────────┘
```

### Charts (Chart.js)

| Chart | Type | Data |
|-------|------|------|
| **Ticket Trend** | Line graph | Daily ticket volume over 30 days |
| **Category Breakdown** | Doughnut/Pie | Distribution across 5 IT categories |
| **Severity Distribution** | Bar chart | Low / Medium / High counts |
| **Resolution Time** | Area chart | Avg resolution time by category |

---

## 🔌 API Reference

### Core Endpoint

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/triage` | Submit ticket for AI classification |

**Request body:**
```json
{
  "title": "VPN keeps disconnecting",
  "description": "Cannot maintain a stable VPN connection since this morning."
}
```

### Full REST API (via `app/routers/`)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/users` | Create a user |
| `GET` | `/api/users` | List users |
| `GET` | `/api/users/{id}` | Get one user |
| `POST` | `/api/tickets` | Submit a new ticket |
| `GET` | `/api/tickets` | List tickets (filter by `status`, `category`, `priority`) |
| `GET` | `/api/tickets/{id}` | Get ticket + responses + escalations + Jira |
| `PATCH` | `/api/tickets/{id}/classification` | AI agent posts classification result |
| `PATCH` | `/api/tickets/{id}/status` | Update ticket status |
| `GET` | `/api/tickets/{id}/logs` | Ticket activity/audit trail |
| `GET` | `/api/knowledge-base` | List KB articles |
| `GET` | `/api/knowledge-base/search?q=` | Search KB |
| `POST` | `/api/tickets/{id}/responses` | Store AI-generated resolution |
| `POST` | `/api/tickets/{id}/escalations` | Escalate ticket to human team |
| `GET` | `/api/escalations` | List all escalations |
| `POST` | `/api/tickets/{id}/jira` | Create/update linked Jira issue |
| `GET` | `/api/analytics/dashboard` | Dashboard stats |

> All list endpoints support `skip`/`limit` pagination. CORS is open for development.

### Switching to PostgreSQL

```env
# .env
DATABASE_URL=postgresql://user:password@localhost:5432/supportpilot
```

No code changes needed — SQLAlchemy handles both SQLite and PostgreSQL.

---

## 🎨 UI Highlights

| Feature | Implementation |
|---------|---------------|
| **Glassmorphism cards** | `backdrop-filter: blur()` + semi-transparent backgrounds |
| **Dark / Light theme** | CSS custom properties toggled via `data-theme` attribute |
| **Micro-animations** | `@keyframes fadeIn`, `slideIn`, `pulse` on every interactive element |
| **Gradient hero banner** | `linear-gradient(135deg, #1e3a8a → #3b82f6 → #06b6d4)` |
| **Responsive grid** | CSS Grid + Flexbox, breakpoints at 768px and 480px |
| **Toast notifications** | Animated slide-in/out with auto-dismiss |
| **Sidebar nav** | Hamburger toggle on mobile with blur overlay backdrop |
| **Typography** | Plus Jakarta Sans from Google Fonts |

---

## 🤝 Team

> **Infosys Springboard — Group 3**

Built collaboratively across 4 milestones:

| Milestone | Focus |
|-----------|-------|
| **1** | Ticket intake, AI classification, FastAPI backend |
| **2** | KB search, AI response generation, React dashboard |
| **3** | Escalations, Jira integration, email workflows |
| **4** | Analytics charts, reporting, full UI polish |

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:06b6d4,50:3b82f6,100:1e3a8a&height=120&section=footer" width="100%"/>

*Built with ❤️ using **React 18**, **FastAPI**, **LLaMA 3.2**, and **Vanilla CSS***

</div>
