"""
SupportPilot — Resolution Agent (Milestone 3: Multi-Agent Orchestrator)
=========================================================================

WHAT THIS FILE DOES
--------------------
This is the multi-agent orchestrator powered by LangGraph. It processes tickets 
after classification, retrieves knowledge-base context, drafts AI resolutions,
and coordinates with downstream integration agents (Jira & Email Services).

Pipeline Nodes:
    fetch_ticket  -->  retrieve_knowledge  -->  generate_response  -->  route()
                                                                          |
                                                        -------------------------------
                                                        |                             |
                                                 save_response                 escalate_ticket
                                            (triggers Email Service)        (triggers Jira + Email)

Plugs directly into:
  - Backend API: /api/tickets/{id}
  - Knowledge Base: /api/knowledge-base/search
  - Jira Integration: /api/jira/tickets (or /api/jira/create)
  - Email Service: /api/email/send
"""

from __future__ import annotations

import argparse
import sys
from typing import Optional, TypedDict

import requests
import ollama
from langgraph.graph import StateGraph, END

# ---------------------------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------------------------
API_BASE_URL = "http://127.0.0.1:8000"      # Backend FastAPI server endpoint
LLM_MODEL = "llama3.2"                       # Local Ollama LLM model
CONFIDENCE_THRESHOLD = 0.65                  # Auto-resolution score boundary


# ---------------------------------------------------------------------------
# 1. STATE DEFINITION
# ---------------------------------------------------------------------------
class TicketState(TypedDict, total=False):
    ticket_id: int
    subject: str
    description: str
    category: Optional[str]
    severity: Optional[str]
    priority: Optional[str]
    user_email: Optional[str]

    kb_context: str          # Knowledge Base snippets
    kb_article_ids: list

    generated_response: str
    confidence_score: float
    is_resolved: bool

    jira_issue_key: Optional[str]  # Milestone 3: Jira sync reference
    escalation_reason: Optional[str]
    log: list                # Execution trace log


def _log(state: TicketState, message: str) -> None:
    state.setdefault("log", []).append(message)
    print(f"[Resolution Agent] {message}")


# ---------------------------------------------------------------------------
# 2. NODE 1 — fetch_ticket
# ---------------------------------------------------------------------------
def fetch_ticket(state: TicketState) -> TicketState:
    ticket_id = state["ticket_id"]
    resp = requests.get(f"{API_BASE_URL}/api/tickets/{ticket_id}", timeout=10)
    resp.raise_for_status()
    data = resp.json()

    state["subject"] = data["subject"]
    state["description"] = data["description"]
    state["category"] = data.get("category")
    state["severity"] = data.get("severity")
    state["priority"] = data.get("priority")
    state["user_email"] = data.get("user_email", "user@example.com")

    _log(state, f"Fetched ticket #{ticket_id}: '{state['subject']}' "
                 f"(category={state['category']}, severity={state['severity']})")
    return state


# ---------------------------------------------------------------------------
# 3. NODE 2 — retrieve_knowledge
# ---------------------------------------------------------------------------
def retrieve_knowledge(state: TicketState) -> TicketState:
    query = f"{state['subject']} {state['description']}"

    params = {
        "q": query, 
        "limit": 3,
        "ticket_id": state["ticket_id"]  
    }

    if state.get("category"):
        params["category"] = state["category"]

    resp = requests.get(f"{API_BASE_URL}/api/knowledge-base/search", params=params, timeout=10)
    resp.raise_for_status()
    articles = resp.json()

    if articles:
        snippets = "\n\n".join(f"Article: {a['title']}\n{a['content']}" for a in articles)
        state["kb_context"] = snippets
        state["kb_article_ids"] = [a["article_id"] for a in articles]
        _log(state, f"Retrieved {len(articles)} context-filtered KB article(s)")
    else:
        state["kb_context"] = "No matching knowledge-base articles were found."
        state["kb_article_ids"] = []
        _log(state, "No KB articles matched this ticket scope.")

    return state


# ---------------------------------------------------------------------------
# 4. NODE 3 — generate_response
# ---------------------------------------------------------------------------
def generate_response(state: TicketState) -> TicketState:
    system_prompt = (
        "You are the Resolution Agent for SupportPilot, an internal IT helpdesk.\n\n"

        "GROUNDING RULES (do not break these):\n"
        "1. Only state a specific fix if it appears in the knowledge-base context below.\n"
        "2. If context matches, base steps directly on it.\n"
        "3. If context is missing, explicitly state: 'No exact match was found in the knowledge base.'\n"
        "4. Provide general best practices only as secondary guidance, labeled clearly.\n\n"

        "OUTPUT FORMAT:\n"
        "- A short numbered list of troubleshooting steps.\n"
        "- One line starting with 'RESOLVED: yes' or 'RESOLVED: no'.\n"
        "- One line starting with 'CONFIDENCE: ' with a value from 0.00 to 1.00.\n"
        "- Do NOT format RESOLVED or CONFIDENCE as markdown bullet points."
    )

    user_prompt = (
        f"Ticket subject: {state['subject']}\n"
        f"Description: {state['description']}\n"
        f"Category: {state.get('category')}\n"
        f"Severity: {state.get('severity')}\n\n"
        f"Knowledge base context:\n{state['kb_context']}"
    )

    response = ollama.chat(
        model=LLM_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        options={"temperature": 0.2},
    )
    raw_text = response["message"]["content"].strip()

    resolved = True
    confidence = 0.7
    body_lines = []
    for line in raw_text.splitlines():
        cleaned = line.strip().lstrip("-*").strip().strip("*").strip()
        upper = cleaned.upper()
        if upper.startswith("RESOLVED:"):
            resolved = "yes" in upper
        elif upper.startswith("CONFIDENCE:"):
            try:
                confidence = float(cleaned.split(":", 1)[1].strip())
            except ValueError:
                pass
        else:
            body_lines.append(line)

    state["generated_response"] = "\n".join(body_lines).strip()
    state["is_resolved"] = resolved
    state["confidence_score"] = confidence

    _log(state, f"LLM draft generated. resolved={resolved}, confidence={confidence:.2f}")
    return state


# ---------------------------------------------------------------------------
# 5. ROUTER
# ---------------------------------------------------------------------------
def route_after_generation(state: TicketState) -> str:
    if state["is_resolved"] and state["confidence_score"] >= CONFIDENCE_THRESHOLD:
        return "save_response"
    return "escalate_ticket"


# ---------------------------------------------------------------------------
# 6a. NODE 4a — save_response (Milestone 3 Email Integration)
# ---------------------------------------------------------------------------
def save_response(state: TicketState) -> TicketState:
    # 1. Save response to backend
    payload = {
        "generated_response": state["generated_response"],
        "confidence_score": state["confidence_score"],
    }
    resp = requests.post(
        f"{API_BASE_URL}/api/tickets/{state['ticket_id']}/responses",
        json=payload, timeout=10,
    )
    resp.raise_for_status()

    # 2. Update status to resolved
    requests.patch(
        f"{API_BASE_URL}/api/tickets/{state['ticket_id']}/status",
        json={"status": "resolved"}, timeout=10,
    )

    # 3. Milestone 3: Call Email Service to notify user
    try:
        email_payload = {
            "to": state.get("user_email", "user@example.com"),
            "name": state.get("user_name", "Customer"),
            "ticket_id": f"TKT-{state['ticket_id']}",
            "ticket_status": "Resolved",
            "event_type": "resolved",
            "subject": f"RESOLVED: [TKT-{state['ticket_id']}] {state['subject']}",
            "body": f"Hello {state.get('user_name', 'Customer')},\n\nYour support ticket #{state['ticket_id']} has been automatically resolved:\n\n{state['generated_response']}\n\nBest regards,\nSupportPilot AI Team"
        }
        requests.post(f"{API_BASE_URL}/api/email/send", json=email_payload, timeout=5)
        _log(state, "Resolution email dispatch triggered via Email Service.")
    except Exception as e:
        _log(state, f"Note: Email dispatch skipped or offline ({e})")

    _log(state, "Response saved and ticket marked 'resolved'.")
    return state


# ---------------------------------------------------------------------------
# 6b. NODE 4b — escalate_ticket (Milestone 3 Jira + Email Integration)
# ---------------------------------------------------------------------------
def escalate_ticket(state: TicketState) -> TicketState:
    reason = (
        f"Auto-escalated by Resolution Agent (confidence "
        f"{state['confidence_score']:.2f} < {CONFIDENCE_THRESHOLD}, "
        f"or LLM flagged this as not resolvable automatically)."
    )
    state["escalation_reason"] = reason

    team_map = {
        "Network": "Network Ops",
        "Hardware": "Desktop Support",
        "Software": "App Support",
        "Password Reset": "IAM Team",
        "Email": "Messaging Team",
    }
    assigned_team = team_map.get(state.get("category"), "General IT Support")

    # 1. Save AI draft response as starting point for human technicians
    requests.post(
        f"{API_BASE_URL}/api/tickets/{state['ticket_id']}/responses",
        json={
            "generated_response": state["generated_response"],
            "confidence_score": state["confidence_score"],
        },
        timeout=10,
    )

    # 2. Log internal escalation record
    requests.post(
        f"{API_BASE_URL}/api/tickets/{state['ticket_id']}/escalations",
        json={"assigned_team": assigned_team, "escalation_reason": reason},
        timeout=10,
    )

    # 3. Milestone 3: Trigger Jira Issue Creation
    try:
        jira_payload = {
            "ticket_id": state["ticket_id"],
            "summary": f"[SupportPilot] {state['subject']}",
            "description": f"{state['description']}\n\nEscalation Reason: {reason}",
            "priority": state.get("priority", "Medium"),
            "assigned_team": assigned_team
        }
        jira_resp = requests.post(f"{API_BASE_URL}/api/jira/tickets", json=jira_payload, timeout=5)
        if jira_resp.status_code in (200, 201):
            jira_data = jira_resp.json()
            state["jira_issue_key"] = jira_data.get("jira_key", "JIRA-AUTO")
            _log(state, f"Synced escalation to Jira: Issue Key {state['jira_issue_key']}")
    except Exception as e:
        _log(state, f"Note: Jira integration endpoint offline ({e})")

    # 4. Milestone 3: Send escalation handoff email to support team/user
    try:
        email_payload = {
            "to": state.get("user_email", "user@example.com"),
            "name": state.get("user_name", "Customer"),
            "ticket_id": f"TKT-{state['ticket_id']}",
            "ticket_status": "Escalated",
            "event_type": "escalated",
            "subject": f"ESCALATED: [TKT-{state['ticket_id']}] Handed over to {assigned_team}",
            "body": f"Hello {state.get('user_name', 'Customer')},\n\nYour ticket '{state['subject']}' has been escalated to {assigned_team}.\nReason: {reason}\n\nOur engineering team will assist you shortly."
        }
        requests.post(f"{API_BASE_URL}/api/email/send", json=email_payload, timeout=5)
        _log(state, "Escalation email dispatch triggered via Email Service.")
    except Exception as e:
        _log(state, f"Note: Email dispatch skipped or offline ({e})")

    _log(state, f"Ticket escalated to '{assigned_team}'. Reason: {reason}")
    return state


# ---------------------------------------------------------------------------
# 7. BUILD LANGGRAPH
# ---------------------------------------------------------------------------
def build_graph():
    graph = StateGraph(TicketState)

    graph.add_node("fetch_ticket", fetch_ticket)
    graph.add_node("retrieve_knowledge", retrieve_knowledge)
    graph.add_node("generate_response", generate_response)
    graph.add_node("save_response", save_response)
    graph.add_node("escalate_ticket", escalate_ticket)

    graph.set_entry_point("fetch_ticket")
    graph.add_edge("fetch_ticket", "retrieve_knowledge")
    graph.add_edge("retrieve_knowledge", "generate_response")
    graph.add_conditional_edges(
        "generate_response",
        route_after_generation,
        {"save_response": "save_response", "escalate_ticket": "escalate_ticket"},
    )
    graph.add_edge("save_response", END)
    graph.add_edge("escalate_ticket", END)

    return graph.compile()


# ---------------------------------------------------------------------------
# 8. STANDALONE & DEMO RUNNERS
# ---------------------------------------------------------------------------
def run_on_real_ticket(ticket_id: int):
    app_graph = build_graph()
    final_state = app_graph.invoke({"ticket_id": ticket_id})
    print("\n--- FINAL STATE ---")
    for k, v in final_state.items():
        if k != "log":
            print(f"{k}: {v}")


def run_demo():
    demo_state: TicketState = {
        "ticket_id": 0,
        "subject": "Cannot connect to office VPN",
        "description": "VPN client shows 'Error 807' every time I try to connect from home.",
        "category": "Network",
        "severity": "High",
        "user_email": "demo.user@company.com",
        "kb_context": (
            "Article: VPN Error 807 Fix\n"
            "Error 807 usually means a network timeout. Ask user to switch off "
            "any personal VPN/proxy, restart the Routing and Remote Access "
            "service, and reconnect using the corporate VPN client v4.2+."
        ),
        "kb_article_ids": [101],
    }
    demo_state = generate_response(demo_state)
    branch = route_after_generation(demo_state)
    print(f"\nRouter decided: {branch}")
    print("\n--- Generated response ---")
    print(demo_state["generated_response"])
    print(f"\nresolved={demo_state['is_resolved']} confidence={demo_state['confidence_score']}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SupportPilot Multi-Agent Orchestrator (Member 1)")
    parser.add_argument("--ticket-id", type=int, help="Run full graph against real ticket via API")
    parser.add_argument("--demo", action="store_true", help="Run against mock data locally")
    args = parser.parse_args()

    if args.demo:
        run_demo()
    elif args.ticket_id is not None:
        run_on_real_ticket(args.ticket_id)
    else:
        print("Usage:\n  python app/agents/resolution_agent.py --demo\n  python app/agents/resolution_agent.py --ticket-id 1")
        sys.exit(1)