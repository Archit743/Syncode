import asyncio
from typing import AsyncIterator, List, Dict, Any, Optional
from .base import LLMProvider

class MockProvider(LLMProvider):
    async def complete(self, messages: List[Dict[str, Any]], model: Optional[str] = None) -> str:
        last_msg = messages[-1]["content"] if messages else ""
        system_msg = next((m["content"] for m in messages if m["role"] == "system"), "")
        
        # Simple mock logic based on intent parsing
        if "classify" in system_msg.lower():
            lower_msg = last_msg.lower()
            chat_words = ["explain", "what", "how", "why", "help", "describe", "tell", "show"]
            if any(w in lower_msg for w in chat_words):
                return '{"intent": "chat", "target_file": "", "description": "Chat response"}'
            else:
                return '{"intent": "modify", "target_file": "", "description": "Modify the code"}'
        elif "expert code editor" in system_msg.lower():
            # parse original content from last_msg
            original = ""
            if "Original Content:\n```\n" in last_msg:
                parts = last_msg.split("Original Content:\n```\n")
                if len(parts) > 1:
                    original = parts[1].split("\n```")[0]
            if original:
                modified = original + "\n# Mock modification added\n"
                return f"```python\n{modified}\n```"
            return "```python\n# Mock modified code\ndef hello():\n    print('Hello World')\n```"
        elif "review" in system_msg.lower():
            return '{"approved": true, "confidence": 0.9, "summary": "Looks good", "issues": []}'
            
        return f"This is a mocked response. I see you're looking at:\n{last_msg[:100]}..."

    async def stream(self, messages: List[Dict[str, Any]], model: Optional[str] = None) -> AsyncIterator[str]:
        text = await self.complete(messages, model)
        
        words = text.split(" ")
        for i, word in enumerate(words):
            yield word + (" " if i < len(words) - 1 else "")
            await asyncio.sleep(0.05)

    @property
    def name(self) -> str:
        return "mock"
