import json
from datetime import datetime
from app.config import Settings
from app.providers.base import LLMProvider

async def planner_node(state, provider: LLMProvider, settings: Settings):
    events = state.get("events", [])
    
    msgs = [
        {
            "role": "system",
            "content": "You are a request classifier. Classify the user's intent as one of: explain, modify, create, debug, test, chat. Output JSON ONLY with schema: {\"intent\": \"str\", \"target_file\": \"str\", \"description\": \"str\"}. If no target file is mentioned, use the currently selected path if available."
        }
    ]
    msgs.extend(state.get("chat_history", []))
    msgs.append({
        "role": "user",
        "content": f"Selected path: {state.get('selected_path')}\nMessage: {state['message']}"
    })
    
    response = await provider.complete(msgs, settings.GROQ_MODEL_PLANNER)
    
    try:
        # Simple extraction of JSON if wrapped in markdown
        if "```json" in response:
            response = response.split("```json")[1].split("```")[0]
        elif "```" in response:
            response = response.split("```")[1].split("```")[0]
            
        plan = json.loads(response.strip())
    except Exception as e:
        plan = {"intent": "chat", "target_file": state.get("selected_path"), "description": str(e)}
        
    events.append({
        "role": "Planner",
        "status": "complete",
        "detail": f"Classified as: {plan.get('intent', 'chat')}",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    })
    
    return {"plan": plan, "events": events}
