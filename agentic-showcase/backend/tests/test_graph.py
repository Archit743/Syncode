import asyncio
import sys
sys.path.insert(0, ".")

from app.config import settings
from app.providers import get_provider
from app.agents.graph import create_agent_graph

async def test():
    provider = get_provider(settings)
    print(f"Provider: {provider.name}")
    graph = create_agent_graph(provider, settings)
    initial = {
        "project": "node", "selected_path": "index.js", "message": "explain this file",
        "file_content": None, "file_tree": [], "plan": None, "context_summary": None,
        "proposed_changes": None, "review_result": None, "security_result": None,
        "test_result": None, "response_text": None, "events": [], "action": None, "error": None
    }
    acc = dict(initial)
    async for output in graph.astream(initial):
        node = list(output.keys())[0]
        update = output[node]
        for k,v in update.items():
            acc[k] = v
        print(f"Node: {node}, keys: {list(update.keys())}")
    
    rt = acc.get("response_text") or "NONE"
    print(f"response_text ({len(rt)} chars): {rt[:300]}")
    print(f"action present: {acc.get('action') is not None}")
    print(f"events count: {len(acc.get('events', []))}")
    print(f"error: {acc.get('error')}")

asyncio.run(test())
