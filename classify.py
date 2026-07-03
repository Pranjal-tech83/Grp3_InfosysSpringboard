import asyncio
import json
from typing import Literal
from pydantic import BaseModel, Field
import ollama

# Structured Data Schema matching classification rules
class TicketClassificationResponse(BaseModel):
    category: Literal["Network", "Password Reset", "Hardware", "Software", "Email"] = Field(
        description="The IT domain classification matching the corporate taxonomy."
    )
    severity: Literal["Low", "Medium", "High"] = Field(
        description="The technical urgency level based on the issue description."
    )
    confidence_score: float = Field(
        description="Confidence score for this classification between 0.00 and 1.00."
    )
    reasoning_summary: str = Field(
        description="A concise one-sentence explanation justifying the category and severity."
    )

# Local Ollama Classification Engine
async def classify_it_ticket(ticket_description: str) -> TicketClassificationResponse:
    """
    Analyzes an IT support ticket using a local LLM and returns structured parameters
    matching the team data schema.
    """
    system_prompt = (
        "You are an automated IT Triage Agent for SupportPilot. "
        "Analyze the provided ticket and assign a Category and Severity based on these strict organizational rules:\n\n"
        "Taxonomy Matrix:\n"
        "- Category: 'Network' (e.g., VPN issues, Internet disconnections) -> Severity: 'High'\n"
        "- Category: 'Password Reset' (e.g., Account lockouts, forgotten passwords) -> Severity: 'Low' or 'Medium'\n"
        "- Category: 'Hardware' (e.g., Printer offline, blue screen errors) -> Severity: 'Medium' or 'High'\n"
        "- Category: 'Software' (e.g., App crashes, MS Office installation failures) -> Severity: 'Medium' or 'High'\n"
        "- Category: 'Email' (e.g., Login failures, unable to send emails) -> Severity: 'Medium'\n\n"
        "You must respond strictly in JSON format matching the requested schema."
    )

    try:
        # Calling local Ollama service
        response = ollama.chat(
            model="llama3.2",  
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Ticket Issue: {ticket_description}"}
            ],
            format=TicketClassificationResponse.model_json_schema(),
            options={"temperature": 0.0}  
        )

        raw_content = response["message"]["content"]
        

        return TicketClassificationResponse.model_validate_json(raw_content)

    except Exception as e:
        print(f"Error executing local classification: {e}")
        raise


# 3. Interactive Execution Block for Manual Testing
async def main():
    print("----------------------------------------------")
    print("   SupportPilot: Local AI Triage Console Running    ")
    print("-----------------------------------------------")
    print("Type your IT issue below to get priority and severity scores.")
    print("Type 'exit' or 'quit' to stop the program.\n")
    
    while True:
        # Prompt the user to manually enter an issue
        user_input = input("Enter IT Issue Description: ").strip()
        
        # Check if the user wants to close the program
        if user_input.lower() in ['exit', 'quit']:
            print("\nClosing triage console. Goodbye!")
            break
            
        if not user_input:
            print(" Input cannot be empty. Please describe the problem.\n")
            continue
            
        print("\n Analyzing issue via local Ollama engine...")
        
        try:
            # Pass your manual input directly to your AI engine
            result = await classify_it_ticket(user_input)
            
            print("\n[TRIAGE RESULT GENERATED]")
            print(f"🔹 Assigned Category : {result.category}")
            print(f"🔹 Technical Severity: {result.severity}")
            print(f"🔹 Confidence Score  : {result.confidence_score * 100:.1f}%")
            print(f"🔹 AI Reasoning      : {result.reasoning_summary}")
            print("====================================================\n")
            
        except Exception as e:
            print(f" An error occurred during classification: {e}\n")

if __name__ == "__main__":
    asyncio.run(main())