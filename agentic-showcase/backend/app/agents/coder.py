import uuid
import difflib
from datetime import datetime
from app.config import Settings
from app.providers.base import LLMProvider

async def coder_node(state, provider: LLMProvider, settings: Settings):
    events = state.get("events", [])
    plan = state.get("plan", {})
    
    target_file = plan.get("target_file") or state.get("selected_path")
    original_content = state.get("file_content", "")
    
    msgs = [
        {
            "role": "system",
            "content": (
                "You are an expert code editor. Given the current file content and a modification request, "
                "output the COMPLETE modified file content. You MUST output the entire file, not just the changes. "
                "Wrap the code in ```language\n...\n``` markers."
            )
        },
        {
            "role": "user",
            "content": f"File: {target_file}\n\nOriginal Content:\n```\n{original_content}\n```\n\nRequest: {state['message']}\nContext:\n{state.get('context_summary')}"
        }
    ]
    
    response = await provider.complete(msgs, settings.GROQ_MODEL_CODER)
    
    new_content = ""
    if "```" in response:
        blocks = response.split("```")
        if len(blocks) >= 3:
            code_block = blocks[1]
            if "\n" in code_block:
                first_line, rest = code_block.split("\n", 1)
                if not first_line.strip() or (len(first_line.split()) == 1 and first_line.strip().isalnum()):
                    new_content = rest
                else:
                    new_content = code_block
            else:
                new_content = code_block
    else:
        new_content = response

    # Strip trailing whitespace and ensure newline
    new_content = new_content.strip() + "\n"
    original_content_str = original_content.strip() + "\n" if original_content else ""
    
    # Generate unified diff
    diff_lines = list(difflib.unified_diff(
        original_content_str.splitlines(keepends=True),
        new_content.splitlines(keepends=True),
        fromfile=target_file or "original",
        tofile=target_file or "modified"
    ))
    diff_str = "".join(diff_lines)
    
    action = None
    if diff_str.strip():
        action = {
            "id": str(uuid.uuid4()),
            "kind": "modify" if original_content else "create",
            "path": target_file or "new_file.txt",
            "project": state["project"],
            "summary": plan.get("description", "Update code"),
            "diff": diff_str,
            "before": original_content_str,
            "after": new_content
        }
        
    events.append({
        "role": "Coder",
        "status": "complete",
        "detail": f"Generated patch for {target_file}",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    })
    
    if action:
        response_text = f"I have generated changes for {target_file}. Please review the proposed changes."
    else:
        response_text = "I analyzed the code but no changes were needed."
    
    return {
        "action": action,
        "response_text": response_text,
        "events": events
    }
