import asyncio
import json
import sqlite3
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field
import ollama

# =====================================================================
# 1. DATABASE MANAGEMENT UTILITY
# =====================================================================
DB_FILE = "supportpilot.db"

def init_database():
    """Creates a local database file and the tickets table if it doesn't exist."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            description TEXT,
            category TEXT,
            severity TEXT,
            confidence_score REAL,
            reasoning TEXT
        )
    ''')
    conn.commit()
    conn.close()

def save_ticket_to_db(description, category, severity, confidence, reasoning):
    """Saves a fully triaged ticket directly into our local database file."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    cursor.execute('''
        INSERT INTO tickets (timestamp, description, category, severity, confidence_score, reasoning)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (current_time, description, category, severity, confidence, reasoning))
    
    conn.commit()
    conn.close()


# =====================================================================
# 2. DATA BLUEPRINT & TAXONOMY MATRIX (Optimized for Chain-of-Thought)
# =====================================================================
class TicketClassificationResponse(BaseModel):
    # Moving reasoning_summary to the top forces the LLM to generate its 
    # logical analysis BEFORE picking categories, boosting confidence scores.
    reasoning_summary: str = Field(
        description="A concise one-sentence technical analysis justifying the category and severity."
    )
    category: Literal["Network", "Password Reset", "Hardware", "Software", "Email"] = Field(
        description="The IT domain classification matching the corporate taxonomy."
    )
    severity: Literal["Low", "Medium", "High"] = Field(
        description="The technical urgency level based on the issue description."
    )
    confidence_score: float = Field(
        description="Confidence score for this classification between 0.00 and 1.00."
    )


# =====================================================================
# 3. LOCAL OLLAMA CLASSIFICATION ENGINE (Optimized with Few-Shot Anchors)
# =====================================================================
async def classify_it_ticket(ticket_description: str) -> TicketClassificationResponse:
    system_prompt = (
        "You are an automated IT Triage Agent for SupportPilot. "
        "Analyze the provided ticket and assign a Category and Severity based on these strict organizational rules:\n\n"
        "Taxonomy Matrix:\n"
        "- Category: 'Network' (e.g., VPN issues, Internet disconnections) -> Severity: 'High'\n"
        "- Category: 'Password Reset' (e.g., Account lockouts, forgotten passwords) -> Severity: 'Low' or 'Medium'\n"
        "- Category: 'Hardware' (e.g., Printer offline, blue screen errors) -> Severity: 'Medium' or 'High'\n"
        "- Category: 'Software' (e.g., App crashes, MS Office installation failures) -> Severity: 'Medium' or 'High'\n"
        "- Category: 'Email' (e.g., Login failures, unable to send emails) -> Severity: 'Medium'\n\n"
        "Guidelines for High Confidence:\n"
        "1. Write the reasoning_summary FIRST by breaking down the core technical problem.\n"
        "2. Base the confidence_score on how clearly the user's text maps to the taxonomy rules (e.g., explicit mentions yield higher confidence than vague descriptions).\n\n"
        "You must respond strictly in JSON format matching the requested schema."
    )

    try:
        response = ollama.chat(
            model="llama3.2",  
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Ticket Issue: {ticket_description}"}
            ],
            format=TicketClassificationResponse.model_json_schema(),
            options={"temperature": 0.0}  # Hardened determinism for consistent classification
        )

        raw_content = response["message"]["content"]
        return TicketClassificationResponse.model_validate_json(raw_content)

    except Exception as e:
        print(f"Error executing local classification: {e}")
        raise


# =====================================================================
# 4. INTERACTIVE EXECUTION BLOCK WITH PERSISTENCE
# =====================================================================
async def main():
    # Initialize the local database file instantly on startup
    init_database()
    
    print("-----------------------------------------------")
    print("   SupportPilot: Local AI Triage Console Running    ")
    print("   (Persistent Storage Enabled: supportpilot.db)  ")
    print("-----------------------------------------------")
    print("Type your IT issue below to get priority and severity scores.")
    print("Type 'exit' or 'quit' to stop the program.\n")
    
    while True:
        user_input = input("Enter IT Issue Description: ").strip()
        
        if user_input.lower() in ['exit', 'quit']:
            print("\nClosing console. Goodbye!")
            break
            
        if not user_input:
            print("❌ Input cannot be empty. Please describe the problem.\n")
            continue
            
        print("\n🔄 Analyzing issue via local Ollama engine...")
        
        try:
            result = await classify_it_ticket(user_input)
            
            # Save our optimized results straight into the local database
            save_ticket_to_db(
                description=user_input,
                category=result.category,
                severity=result.severity,
                confidence=result.confidence_score,
                reasoning=result.reasoning_summary
            )
            
            print("\n[TRIAGE RESULT GENERATED & SAVED TO DB]")
            print(f"🔹 AI Reasoning      : {result.reasoning_summary}")
            print(f"🔹 Assigned Category : {result.category}")
            print(f"🔹 Technical Severity: {result.severity}")
            print(f"🔹 Confidence Score  : {result.confidence_score * 100:.1f}%")
            print("---------------------------------\n")
            
        except Exception as e:
            print(f"❌ An error occurred during classification: {e}\n")

if __name__ == "__main__":
    asyncio.run(main())