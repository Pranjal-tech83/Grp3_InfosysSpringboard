"""
SupportPilot — Resolution Agent (Member 5: LangGraph / Resolution Agent)
=========================================================================

WHAT THIS FILE DOES
--------------------
This is the multi-agent workflow that runs *after* a ticket has already been
created (Member 2 / tickets.py) and classified (Member 3 / classify.py).

Pipeline (each box below = one LangGraph node):

    fetch_ticket  -->  retrieve_knowledge  -->  generate_response  -->  route()
                                                                          |
                                                        -------------------------------
                                                        |                             |
                                                 save_response                 escalate_ticket
                                                 (confidence OK)               (confidence low /
                                                                                 LLM says unresolved)

It talks to the REST API that Member 2 built (app/routers/*.py) — it does
NOT touch the database directly. That keeps your module independent and
easy to demo/test on its own, and easy to integrate later.

HOW IT PLUGS INTO THE REST OF THE TEAM
---------------------------------------
- Member 2 (Backend/API): you call his endpoints only —
    GET   /api/tickets/{id}
    GET   /api/knowledge-base/search?q=...      (Member 4's KB, keyword search
                                                  for now, semantic later)
    POST  /api/tickets/{id}/responses
    POST  /api/tickets/{id}/escalations
    PATCH /api/tickets/{id}/status
- Member 3 (Classification): by the time your graph runs, the ticket already
  has category/severity/priority filled in (via PATCH .../classification).
  You just read those fields.
- Member 4 (RAG): today `retrieve_knowledge` calls the existing keyword
  search endpoint. The moment Member 4 upgrades `crud.search_kb` to vector
  search, your node needs ZERO changes — same endpoint, better results.
- Member 6 (Jira/Email/Testing): the `escalate_ticket` node is the hand-off
  point for them — after you create the Escalation record, their Jira/email
  integration picks it up and files a ticket / sends a notification.

HOW TO RUN THIS FILE STANDALONE (for your own testing/demo)
-------------------------------------------------------------
1. Make sure the backend is running in another terminal:
       uvicorn app.main:app --reload
2. Make sure Ollama is running locally with the model pulled:
       ollama pull llama3.2
3. From the project root:
       python -m app.agents.resolution_agent --ticket-id 1
   (or just `python app/agents/resolution_agent.py --ticket-id 1` if you
   add the project root to PYTHONPATH)
4. To test without the other members' modules being ready yet, run:
       python app/agents/resolution_agent.py --demo
   This uses fake/mock ticket + KB data instead of hitting the real API, so
   you are never blocked waiting on teammates.
"""

from __future__ import annotations

import argparse
import sys
from typing import Optional, TypedDict

import requests
import ollama
from langgraph.graph import StateGraph, END

# ---------------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------------
API_BASE_URL = "http://127.0.0.1:8000"      # Member 2's FastAPI server
LLM_MODEL = "llama3.2"                       # local Ollama model
CONFIDENCE_THRESHOLD = 0.65                  # below this -> escalate to human


# ---------------------------------------------------------------------------
# 1. STATE — the shared "clipboard" every node reads/writes
# ---------------------------------------------------------------------------
class TicketState(TypedDict, total=False):
    ticket_id: int
    subject: str
    description: str
    category: Optional[str]
    severity: Optional[str]
    priority: Optional[str]

    kb_context: str          # concatenated snippets pulled from the KB
    kb_article_ids: list

    generated_response: str
    confidence_score: float
    is_resolved: bool

    escalation_reason: Optional[str]
    log: list                # human-readable trace, printed at the end / shown on screen-share


def _log(state: TicketState, message: str) -> None:
    state.setdefault("log", []).append(message)
    print(f"[Resolution Agent] {message}")


# ---------------------------------------------------------------------------
# 2. NODE 1 — fetch_ticket
#    Pulls the ticket (with its classification already filled in) from the API
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

    _log(state, f"Fetched ticket #{ticket_id}: '{state['subject']}' "
                 f"(category={state['category']}, severity={state['severity']})")
    return state


# ---------------------------------------------------------------------------
# 3. NODE 2 — retrieve_knowledge
#    Calls Member 4's knowledge-base search endpoint (RAG)
# ---------------------------------------------------------------------------
def retrieve_knowledge(state: TicketState) -> TicketState:
    query = f"{state['subject']} {state['description']}"
    params = {"q": query, "limit": 3}
    if state.get("category"):
        params["category"] = state["category"]

    resp = requests.get(f"{API_BASE_URL}/api/knowledge-base/search", params=params, timeout=10)
    resp.raise_for_status()
    articles = resp.json()

    if articles:
        snippets = "\n\n".join(f"Article: {a['title']}\n{a['content']}" for a in articles)
        state["kb_context"] = snippets
        state["kb_article_ids"] = [a["article_id"] for a in articles]
        _log(state, f"Retrieved {len(articles)} KB article(s): "
                     f"{[a['title'] for a in articles]}")
    else:
        state["kb_context"] = "No matching knowledge-base articles were found."
        state["kb_article_ids"] = []
        _log(state, "No KB articles matched this ticket.")

    return state


# ---------------------------------------------------------------------------
# 4. NODE 3 — generate_response
#    Feeds ticket + retrieved KB context into the LLM to draft a resolution
# ---------------------------------------------------------------------------
def generate_response(state: TicketState) -> TicketState:
    # ------------------------------------------------------------------
    # PROMPT ENGINEERING — grounding / anti-hallucination rules.
    #
    # Goal: the LLM must NEVER invent a fix that isn't supported by the
    # knowledge-base context (or well-known, category-level best practice).
    # Every rule below exists to close a specific hallucination failure
    # mode we want to avoid in a real helpdesk:
    #   1. Inventing product/menu names, error codes, or settings that
    #      were never in the KB context.
    #   2. Sounding confident about a fix for an issue the KB doesn't
    #      actually cover.
    #   3. Silently mixing "verified KB steps" with "general guesses"
    #      so the user can't tell which is which.
    #   4. Escaping the required output format, which breaks the
    #      programmatic RESOLVED/CONFIDENCE parsing downstream.
    # ------------------------------------------------------------------
    system_prompt = (
        "You are the Resolution Agent for SupportPilot, an internal IT helpdesk.\n\n"

        "GROUNDING RULES (do not break these):\n"
        "1. Only state a specific fix (a setting, command, menu path, error code, "
        "or version number) if it appears in the knowledge-base context below. "
        "Never invent specifics that are not present in the context.\n"
        "2. If the knowledge-base context clearly matches the ticket, base your "
        "steps directly on it and mention it is from the knowledge base.\n"
        "3. If the context is missing, irrelevant, or only partially related, "
        "say so explicitly in one short sentence (e.g. 'No exact match was found "
        "in the knowledge base for this issue.') before giving anything else.\n"
        "4. In that case, you may give GENERAL, well-known best-practice "
        "troubleshooting steps for the ticket's category (e.g. standard network "
        "or password-reset checks), but you must label them as general guidance, "
        "not as a verified fix — and you must NOT present them with the same "
        "confidence as a KB-backed answer.\n"
        "5. Never fabricate a ticket number, article ID, policy, or quote that "
        "was not given to you.\n"
        "6. If you are not sure a step is safe or correct, do not include it — "
        "prefer fewer, verified steps over more, speculative ones.\n\n"

        "OUTPUT FORMAT (follow exactly, do not add extra sections):\n"
        "- A short numbered list of troubleshooting steps.\n"
        "- One line starting with 'RESOLVED: yes' or 'RESOLVED: no'. Answer "
        "'no' if this needs a human technician (hardware replacement, "
        "account/security exceptions) OR if the knowledge-base context did "
        "not actually cover this issue.\n"
        "- One line starting with 'CONFIDENCE: ' with a number from 0.00 to 1.00. "
        "Use a HIGH number (0.8+) only when the fix is directly grounded in the "
        "knowledge-base context. Use a LOW number (below 0.5) when you are "
        "relying on general guidance rather than the knowledge base.\n"
        "- Write the RESOLVED and CONFIDENCE lines as plain lines, NOT as bullet "
        "points or bold text (no leading '-', '*', or markdown)."
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

    # Pull out RESOLVED / CONFIDENCE lines, keep the rest as the response body
    resolved = True
    confidence = 0.7
    body_lines = []
    for line in raw_text.splitlines():
        # Strip common bullet/markdown prefixes ("- ", "* ", "1. ", "**") before
        # checking for the RESOLVED:/CONFIDENCE: markers, since the LLM
        # sometimes formats them as list items instead of bare lines.
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
# 5. ROUTER — decides which branch to take after generation
# ---------------------------------------------------------------------------
def route_after_generation(state: TicketState) -> str:
    if state["is_resolved"] and state["confidence_score"] >= CONFIDENCE_THRESHOLD:
        return "save_response"
    return "escalate_ticket"


# ---------------------------------------------------------------------------
# 6a. NODE 4a — save_response (happy path: auto-resolved)
# ---------------------------------------------------------------------------
def save_response(state: TicketState) -> TicketState:
    payload = {
        "generated_response": state["generated_response"],
        "confidence_score": state["confidence_score"],
    }
    resp = requests.post(
        f"{API_BASE_URL}/api/tickets/{state['ticket_id']}/responses",
        json=payload, timeout=10,
    )
    resp.raise_for_status()

    requests.patch(
        f"{API_BASE_URL}/api/tickets/{state['ticket_id']}/status",
        json={"status": "resolved"}, timeout=10,
    )
    _log(state, "Response saved and ticket marked 'resolved'.")
    return state


# ---------------------------------------------------------------------------
# 6b. NODE 4b — escalate_ticket (low confidence / needs a human)
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

    # Still save the AI's draft response so the human agent has a starting point
    requests.post(
        f"{API_BASE_URL}/api/tickets/{state['ticket_id']}/responses",
        json={
            "generated_response": state["generated_response"],
            "confidence_score": state["confidence_score"],
        },
        timeout=10,
    )

    requests.post(
        f"{API_BASE_URL}/api/tickets/{state['ticket_id']}/escalations",
        json={"assigned_team": assigned_team, "escalation_reason": reason},
        timeout=10,
    )
    # create_escalation on the backend already flips status -> 'escalated'
    _log(state, f"Ticket escalated to '{assigned_team}'. Reason: {reason}")
    return state


# ---------------------------------------------------------------------------
# 7. BUILD THE GRAPH
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
# 8. ENTRY POINT — lets you demo this module standalone
# ---------------------------------------------------------------------------
def run_on_real_ticket(ticket_id: int):
    app_graph = build_graph()
    final_state = app_graph.invoke({"ticket_id": ticket_id})
    print("\n--- FINAL STATE ---")
    for k, v in final_state.items():
        if k != "log":
            print(f"{k}: {v}")


def run_demo():
    """
    Runs the graph against fake in-memory data, WITHOUT calling the FastAPI
    backend. Useful this week if Member 2/3/4's parts aren't wired up yet —
    you can still build + present your LangGraph logic.
    """
    demo_state: TicketState = {
        "ticket_id": 0,
        "subject": "Cannot connect to office VPN",
        "description": "VPN client shows 'Error 807' every time I try to connect from home.",
        "category": "Network",
        "severity": "High",
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
    parser = argparse.ArgumentParser(description="SupportPilot Resolution Agent (Member 5)")
    parser.add_argument("--ticket-id", type=int, help="Run the full graph against a real ticket via the API")
    parser.add_argument("--demo", action="store_true", help="Run against mock data, no API/backend needed")
    args = parser.parse_args()

    if args.demo:
        run_demo()
    elif args.ticket_id is not None:
        run_on_real_ticket(args.ticket_id)
    else:
        print("Usage:\n  python resolution_agent.py --demo\n  python resolution_agent.py --ticket-id 1")
        sys.exit(1)
