# SupportPilot Backend

FastAPI + SQLAlchemy backend for the SupportPilot AI Ticket Resolution Agent.
Implements the database schema and API layer from the project doc (sections
8–9): Users, Tickets, Knowledge Base, Ticket Responses, Escalations, Jira
Tickets, and Activity Logs — plus a dashboard analytics endpoint.

## 1. Setup

```bash
cd supportpilot-backend
pip install -r requirements.txt
cp .env.example .env        # optional — defaults to local SQLite if skipped
```

## 2. Load demo data (optional but recommended)

```bash
python seed_data.py
```

This creates 3 users, 4 tickets (in various states), 3 knowledge base
articles, 2 AI responses, 1 escalation, and 2 linked Jira tickets — enough
for the frontend team to build every screen against real data immediately.

## 3. Run the server

```bash
uvicorn app.main:app --reload
```

- API base URL: `http://127.0.0.1:8000`
- Interactive docs (Swagger): `http://127.0.0.1:8000/docs`
- Alternative docs (ReDoc): `http://127.0.0.1:8000/redoc`

The frontend team can use `/docs` to see every endpoint, its request/response
schema, and try it live — no need to read this file for the fine details.

## 4. Switching to Postgres

By default the app uses a local SQLite file (`supportpilot.db`) so anyone can
run it with zero setup. For staging/production, set `DATABASE_URL` in `.env`:

```
DATABASE_URL=postgresql://user:password@localhost:5432/supportpilot
```

No code changes needed — SQLAlchemy handles both.

## 5. Project structure

```
supportpilot-backend/
├── app/
│   ├── main.py              # FastAPI app, CORS, router registration
│   ├── database.py          # DB engine/session setup
│   ├── models.py            # SQLAlchemy ORM models (matches schema diagram)
│   ├── schemas.py           # Pydantic request/response models
│   ├── crud.py              # All DB query/mutation logic
│   └── routers/
│       ├── users.py
│       ├── tickets.py
│       ├── knowledge_base.py
│       ├── responses.py     # AI-generated ticket resolutions
│       ├── escalations.py
│       ├── jira_tickets.py
│       └── analytics.py     # Dashboard stats
├── seed_data.py              # Populates demo data
├── requirements.txt
└── .env.example
```

## 6. API reference (high level)

| Method | Path                                     | Purpose                                             |
|--------|-------------------------------------------|------------------------------------------------------|
| POST   | `/api/users`                              | Create a user                                        |
| GET    | `/api/users`                              | List users                                            |
| GET    | `/api/users/{id}`                         | Get one user                                          |
| POST   | `/api/tickets`                            | Submit a new ticket (Milestone 1: intake)             |
| GET    | `/api/tickets`                            | List tickets (filter by `status`, `category`, `priority`) |
| GET    | `/api/tickets/{id}`                       | Get ticket + responses + escalations + Jira link      |
| PATCH  | `/api/tickets/{id}/classification`        | AI Agent posts category/severity/priority (Milestone 1) |
| PATCH  | `/api/tickets/{id}/status`                | Update ticket status                                  |
| GET    | `/api/tickets/{id}/logs`                  | Ticket activity/audit trail                           |
| POST   | `/api/knowledge-base`                     | Add a KB article                                      |
| GET    | `/api/knowledge-base`                     | List KB articles                                      |
| GET    | `/api/knowledge-base/search?q=`           | Search KB (Milestone 2 — swap for vector search later)|
| POST   | `/api/tickets/{id}/responses`             | Store an AI-generated resolution (Milestone 2)        |
| GET    | `/api/tickets/{id}/responses`             | List a ticket's AI responses                          |
| POST   | `/api/tickets/{id}/escalations`           | Escalate a ticket to a human team (Milestone 3)       |
| GET    | `/api/escalations`                        | List all escalations (filter by `status`)             |
| POST   | `/api/tickets/{id}/jira`                  | Create/update the linked Jira issue (Milestone 3)     |
| GET    | `/api/analytics/dashboard`                | Dashboard stats (Milestone 4)                         |

## 7. Notes for the AI Agent teammate (Member 1, presumably)

Two integration points are intentionally left as simple stand-ins so the
API contract is stable while the AI logic gets built:

- **`crud.search_kb`** — currently a `LIKE` keyword match. Replace its
  internals with FAISS/Chroma vector search; the `/api/knowledge-base/search`
  endpoint signature doesn't need to change.
- **`PATCH /api/tickets/{id}/classification`** — call this once your
  classification engine has scored a ticket. It accepts any subset of
  `category`, `sub_category`, `priority`, `severity`,
  `classification_confidence`, `status`.

## 8. Notes for the frontend teammate

- Every list endpoint supports `skip`/`limit` pagination.
- CORS is wide open (`allow_origins=["*"]`) for development — tell me before
  we go to prod so we can lock it to your actual frontend origin.
- All timestamps are UTC ISO-8601 strings.
