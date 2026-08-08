from typing import TypedDict, List, Dict, Any, Optional
from langgraph.graph import StateGraph, END
from app.config import Settings
from app.providers.base import LLMProvider

class AgentState(TypedDict):
    project: str
    selected_path: Optional[str]
    message: str
    chat_history: List[Dict[str, Any]]
    file_content: Optional[str]
    file_tree: List[Dict[str, Any]]
    plan: Optional[Dict[str, Any]]
    context_summary: Optional[str]
    proposed_changes: Optional[List[Dict[str, Any]]]
    review_result: Optional[Dict[str, Any]]
    security_result: Optional[Dict[str, Any]]
    test_result: Optional[Dict[str, Any]]
    response_text: Optional[str]
    events: List[Dict[str, Any]]
    action: Optional[Dict[str, Any]]
    error: Optional[str]

def create_agent_graph(provider: LLMProvider, settings: Settings):
    from .planner import planner_node
    from .context import context_node
    from .coder import coder_node
    from .reviewer import reviewer_node
    from .security import security_node
    from .test import test_node

    async def planner_wrapper(state: AgentState):
        res = await planner_node(state, provider, settings)
        if res.get("events"): res["events"][-1]["model"] = settings.GROQ_MODEL_PLANNER
        return res
        
    async def context_wrapper(state: AgentState):
        res = await context_node(state, provider, settings)
        if res.get("events"): res["events"][-1]["model"] = "system"
        return res
        
    async def coder_wrapper(state: AgentState):
        res = await coder_node(state, provider, settings)
        if res.get("events"): res["events"][-1]["model"] = settings.GROQ_MODEL_CODER
        return res
        
    async def reviewer_wrapper(state: AgentState):
        res = await reviewer_node(state, provider, settings)
        if res.get("events"): res["events"][-1]["model"] = getattr(settings, 'GROQ_MODEL_REVIEWER', 'unknown')
        return res
        
    async def security_wrapper(state: AgentState):
        res = await security_node(state, provider, settings)
        if res.get("events"): res["events"][-1]["model"] = "system"
        return res

    async def test_wrapper(state: AgentState):
        res = await test_node(state, provider, settings)
        if res.get("events"): res["events"][-1]["model"] = "system"
        return res

    def route_after_context(state: AgentState) -> str:
        intent = state.get("plan", {}).get("intent", "chat")
        if intent in ["modify", "create", "debug"]:
            return "coder"
        return "respond"
        
    def route_after_security(state: AgentState) -> str:
        if state.get("security_result", {}).get("safe", False):
            return "reviewer"
        return "respond"

    async def respond_node(state: AgentState):
        if state.get("error"):
            events = state.get("events", [])
            events.append({
                "role": "System", "status": "error", 
                "detail": state["error"],
                "timestamp": __import__('datetime').datetime.utcnow().isoformat() + "Z"
            })
            if not state.get("response_text"):
                state["response_text"] = f"Error: {state['error']}"
            # Clear action if security failed
            if (state.get("security_result") or {}).get("safe") == False:
                state["action"] = None
            return {"response_text": state["response_text"], "action": state.get("action"), "events": events}
        
        if not state.get("response_text"):
            # Build rich context for chat/explain responses
            context = state.get("context_summary", "")
            msgs = [
                {"role": "system", "content": f"You are Syncode, an expert AI coding assistant. You help developers understand, write, and debug code. Be concise but thorough. Use markdown formatting for code blocks.\n\nContext:\n{context}"}
            ]
            msgs.extend(state.get("chat_history", []))
            msgs.append({"role": "user", "content": state["message"]})
            resp = await provider.complete(msgs, settings.GROQ_MODEL_PLANNER)
            state["response_text"] = resp
        
        # Clear action if security failed
        if (state.get("security_result") or {}).get("safe") == False:
            state["action"] = None
        
        return {"response_text": state["response_text"], "action": state.get("action"), "events": state.get("events", [])}

    workflow = StateGraph(AgentState)
    workflow.add_node("planner", planner_wrapper)
    workflow.add_node("context", context_wrapper)
    workflow.add_node("coder", coder_wrapper)
    workflow.add_node("security", security_wrapper)
    workflow.add_node("reviewer", reviewer_wrapper)
    workflow.add_node("respond", respond_node)

    workflow.set_entry_point("planner")
    workflow.add_edge("planner", "context")
    workflow.add_conditional_edges("context", route_after_context)
    workflow.add_edge("coder", "security")
    workflow.add_conditional_edges("security", route_after_security)
    workflow.add_edge("reviewer", "respond")
    workflow.add_edge("respond", END)

    return workflow.compile()
