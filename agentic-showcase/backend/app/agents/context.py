from datetime import datetime
from pathlib import Path
from app.config import Settings
from app.providers.base import LLMProvider

async def context_node(state, provider: LLMProvider, settings: Settings):
    events = state.get("events", [])
    plan = state.get("plan", {})
    
    target_file = plan.get("target_file") or state.get("selected_path")
    
    file_content = None
    if target_file:
        try:
            base_path = Path(settings.WORKSPACE_ROOT) / state["project"]
            target_path = (base_path / target_file).resolve()
            
            try:
                target_path.relative_to(base_path)
            except ValueError:
                file_content = None  # Block path traversal
                raise ValueError("Path traversal detected")
                
            if target_path.exists() and target_path.is_file():
                with open(target_path, "r", encoding="utf-8", errors="replace") as f:
                    file_content = f.read()
        except Exception:
            pass
            
    # Very basic context summary
    context_summary = f"Project: {state['project']}\n"
    if target_file:
        context_summary += f"Target File: {target_file}\n"
        if file_content:
            context_summary += f"Content:\n{file_content[:5000]}\n"
            
    events.append({
        "role": "Context",
        "status": "complete",
        "detail": f"Loaded context for {target_file if target_file else 'project'}",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    })
    
    return {
        "file_content": file_content,
        "context_summary": context_summary,
        "events": events
    }
