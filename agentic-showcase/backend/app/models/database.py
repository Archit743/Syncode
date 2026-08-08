from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional
import uuid

class AgentSession(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    project: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class AgentMessage(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    session_id: str = Field(foreign_key="agentsession.id")
    role: str # 'user'|'assistant'|'system'|'agent_event'
    content: str
    metadata_json: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AgentAction(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    session_id: str = Field(foreign_key="agentsession.id")
    kind: str
    path: str
    project: str
    status: str # 'pending'|'approved'|'rejected'
    summary: str
    diff: str
    before_content: str
    after_content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
