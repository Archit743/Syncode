from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class FileEntry(BaseModel):
    path: str
    name: str
    type: str # 'file'|'dir'
    size: int

class FileListResponse(BaseModel):
    project: str
    files: List[FileEntry]

class FileContentResponse(BaseModel):
    project: str
    path: str
    content: str

class SaveFileRequest(BaseModel):
    project: str
    path: str
    content: str

class CreateFileRequest(BaseModel):
    project: str
    path: str
    content: Optional[str] = None

class ResetWorkspaceRequest(BaseModel):
    project: str

class ResetResponse(BaseModel):
    ok: bool
    project: str
    files: List[FileEntry]

class CreateSessionRequest(BaseModel):
    project: str

class CreateSessionResponse(BaseModel):
    sessionId: str

class SendMessageRequest(BaseModel):
    message: str
    selectedPath: Optional[str] = None

class AgentEventData(BaseModel):
    role: str
    status: str
    detail: str
    timestamp: str

class AgentActionData(BaseModel):
    id: str
    kind: str
    path: str
    project: str
    summary: str
    diff: str
    before: str
    after: str

class ActionResponse(BaseModel):
    action: Dict[str, Any]

class HistoryResponse(BaseModel):
    messages: List[Dict[str, Any]]

class HealthResponse(BaseModel):
    ok: bool
    mode: str
    workspace: str
    providers: List[str]
