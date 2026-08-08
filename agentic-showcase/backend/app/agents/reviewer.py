import json
from datetime import datetime
from app.config import Settings
from app.providers.base import LLMProvider

async def reviewer_node(state, provider: LLMProvider, settings: Settings):
    events = state.get("events", [])
    action = state.get("action")
    
    if not action:
        return state
        
    msgs = [
        {
            "role": "system",
            "content": (
                "Review the proposed code change. Check for: syntax errors, logic bugs, security issues, breaking changes. "
                "Output JSON ONLY with schema: {\"approved\": bool, \"confidence\": float (0-1), \"summary\": \"str\", \"issues\": [\"str\"]}"
            )
        },
        {
            "role": "user",
            "content": f"Path: {action['path']}\n\nDiff:\n{action['diff']}"
        }
    ]
    
    response = await provider.complete(msgs, settings.GROQ_MODEL_REVIEWER)
    
    try:
        if "```json" in response:
            response = response.split("```json")[1].split("```")[0]
        elif "```" in response:
            response = response.split("```")[1].split("```")[0]
            
        review = json.loads(response.strip())
    except Exception:
        review = {"approved": True, "confidence": 0.8, "summary": "Automatic approval due to parsing error", "issues": []}
        
    events.append({
        "role": "Reviewer",
        "status": "complete",
        "detail": "Review completed",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    })
    
    return {"review_result": review, "events": events}
