import re
from datetime import datetime
from app.config import Settings
from app.providers.base import LLMProvider

async def security_node(state, provider: LLMProvider, settings: Settings):
    events = state.get("events", [])
    action = state.get("action")
    
    if not action:
        return state
        
    issues = []
    
    # Path traversal
    if "../" in action["path"] or action["path"].startswith("/") or "\\" in action["path"]:
        issues.append("Path traversal detected")
        
    content = action["after"]
    
    # Simple dangerous pattern scanning
    dangerous_patterns = [
        (r"exec\s*\(", "Use of exec()"),
        (r"eval\s*\(", "Use of eval()"),
        (r"os\.system\s*\(", "Use of os.system()"),
        (r"subprocess\.call", "Use of subprocess.call() without validation"),
        (r"rm\s+-rf", "Dangerous shell command")
    ]
    
    for pattern, desc in dangerous_patterns:
        if re.search(pattern, content):
            issues.append(desc)
            
    is_safe = len(issues) == 0
    
    events.append({
        "role": "Security",
        "status": "complete",
        "detail": f"Security check {'passed' if is_safe else 'failed'}",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    })
    
    if not is_safe:
        return {
            "security_result": {"safe": False, "issues": issues},
            "error": f"Security check failed: {', '.join(issues)}",
            "events": events
        }
        
    return {
        "security_result": {"safe": True, "issues": []},
        "events": events
    }
