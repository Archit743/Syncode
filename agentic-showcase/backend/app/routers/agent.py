import json
import asyncio
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel

from app.database import get_session
from app.models.database import AgentSession, AgentMessage, AgentAction
from app.models.schemas import CreateSessionRequest, CreateSessionResponse, SendMessageRequest, HistoryResponse
from app.providers import get_provider
from app.config import settings
from app.agents.graph import create_agent_graph
from app.routers.files import ensure_workspace_path

router = APIRouter(prefix="/api/agent", tags=["agent"])

@router.post("/sessions", response_model=CreateSessionResponse)
async def create_session(request: CreateSessionRequest, db: Session = Depends(get_session)):
    session = AgentSession(project=request.project)
    db.add(session)
    db.commit()
    db.refresh(session)
    return CreateSessionResponse(sessionId=session.id)

@router.post("/sessions/{session_id}/messages")
async def send_message(session_id: str, request: SendMessageRequest, db: Session = Depends(get_session)):
    session = db.exec(select(AgentSession).where(AgentSession.id == session_id)).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Save user message
    user_msg = AgentMessage(session_id=session_id, role="user", content=request.message)
    db.add(user_msg)
    db.commit()

    previous_messages = db.exec(
        select(AgentMessage)
        .where(AgentMessage.session_id == session_id, AgentMessage.id != user_msg.id)
        .order_by(AgentMessage.created_at)
    ).all()
    chat_history = [{"role": msg.role, "content": msg.content} for msg in previous_messages]

    provider = get_provider(settings)
    graph = create_agent_graph(provider, settings)

    initial_state = {
        "project": session.project,
        "selected_path": request.selectedPath,
        "message": request.message,
        "chat_history": chat_history,
        "file_content": None,
        "file_tree": [],
        "plan": None,
        "context_summary": None,
        "proposed_changes": None,
        "review_result": None,
        "security_result": None,
        "test_result": None,
        "response_text": None,
        "events": [],
        "action": None,
        "error": None
    }

    async def event_generator():
        start_time = datetime.now()
        try:
            accumulated_state = dict(initial_state)
            emitted_event_keys = set()
            
            async for output in graph.astream(initial_state):
                node_name = list(output.keys())[0]
                state_update = output[node_name]
                
                # Merge updates into accumulated state
                for key, value in state_update.items():
                    accumulated_state[key] = value
                
                # Emit new events (deduplicate by role+detail)
                events = state_update.get("events", [])
                for evt in events:
                    evt_key = f"{evt.get('role', '')}:{evt.get('detail', '')}:{evt.get('timestamp', '')}"
                    if evt_key not in emitted_event_keys:
                        emitted_event_keys.add(evt_key)
                        yield {"event": "agent_event", "data": json.dumps(evt)}
            
            # Save assistant message
            response_text = accumulated_state.get("response_text", "Done.")
            asst_msg = AgentMessage(session_id=session_id, role="assistant", content=response_text)
            db.add(asst_msg)
            
            # Save and emit action if present
            action_data = accumulated_state.get("action")
            if action_data:
                action = AgentAction(
                    id=action_data["id"],
                    session_id=session_id,
                    kind=action_data["kind"],
                    path=action_data["path"],
                    project=action_data["project"],
                    status="pending",
                    summary=action_data["summary"],
                    diff=action_data["diff"],
                    before_content=action_data["before"],
                    after_content=action_data["after"]
                )
                db.add(action)
                yield {"event": "action", "data": json.dumps(action_data)}
            
            db.commit()
            
            # Stream response text token by token
            if response_text:
                words = response_text.split(" ")
                for i, word in enumerate(words):
                    yield {
                        "event": "token",
                        "data": json.dumps({"content": word + (" " if i < len(words) - 1 else "")})
                    }
                    await asyncio.sleep(0.02)
            
            latency = (datetime.now() - start_time).total_seconds() * 1000
            yield {
                "event": "done",
                "data": json.dumps({"provider": provider.name, "model": getattr(settings, 'GROQ_MODEL_CODER', 'unknown'), "latencyMs": int(latency)})
            }
        except Exception as e:
            yield {"event": "error", "data": json.dumps({"message": str(e)})}

    return EventSourceResponse(event_generator())

@router.post("/actions/{action_id}/approve")
async def approve_action(action_id: str, db: Session = Depends(get_session)):
    action = db.exec(select(AgentAction).where(AgentAction.id == action_id)).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
        
    if action.status != "pending":
        if action.status == "approved":
            return {
                "action": {
                    "id": action.id,
                    "kind": action.kind,
                    "path": action.path,
                    "project": action.project,
                    "summary": action.summary,
                    "diff": action.diff,
                    "before": action.before_content,
                    "after": action.after_content,
                    "status": action.status
                }
            }
        raise HTTPException(status_code=400, detail="Action is not pending")
        
    try:
        target_path = ensure_workspace_path(action.project, action.path)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(target_path, "w", encoding="utf-8") as f:
            f.write(action.after_content)
            
        action.status = "approved"
        db.add(action)
        db.commit()
        
        # Format response
        return {
            "action": {
                "id": action.id,
                "kind": action.kind,
                "path": action.path,
                "project": action.project,
                "summary": action.summary,
                "diff": action.diff,
                "before": action.before_content,
                "after": action.after_content,
                "status": action.status
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/actions/{action_id}/reject")
async def reject_action(action_id: str, db: Session = Depends(get_session)):
    action = db.exec(select(AgentAction).where(AgentAction.id == action_id)).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
        
    action.status = "rejected"
    db.add(action)
    db.commit()
    
    return {
        "action": {
            "id": action.id,
            "kind": action.kind,
            "path": action.path,
            "project": action.project,
            "summary": action.summary,
            "diff": action.diff,
            "before": action.before_content,
            "after": action.after_content,
            "status": action.status
        }
    }

@router.get("/sessions/{session_id}/history", response_model=HistoryResponse)
async def get_history(session_id: str, db: Session = Depends(get_session)):
    messages = db.exec(select(AgentMessage).where(AgentMessage.session_id == session_id).order_by(AgentMessage.created_at)).all()
    
    res = []
    for m in messages:
        res.append({
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "created_at": m.created_at.isoformat()
        })
        
    return HistoryResponse(messages=res)
