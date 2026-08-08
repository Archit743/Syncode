from datetime import datetime
from app.config import Settings
from app.providers.base import LLMProvider

async def test_node(state, provider: LLMProvider, settings: Settings):
    events = state.get("events", [])
    
    # Mock test execution for now
    
    events.append({
        "role": "Test",
        "status": "complete",
        "detail": "No tests configured",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    })
    
    return {
        "test_result": {"ran": False, "passed": True, "output": ""},
        "events": events
    }
