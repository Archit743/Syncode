from fastapi import APIRouter, HTTPException, Depends
from pathlib import Path
import shutil
import os
from app.models.schemas import (
    FileListResponse, FileEntry, FileContentResponse, 
    SaveFileRequest, CreateFileRequest, ResetResponse, ResetWorkspaceRequest
)
from app.config import settings

router = APIRouter(prefix="/api/files", tags=["files"])
workspace_router = APIRouter(prefix="/api/workspace", tags=["workspace"])

def ensure_workspace_path(project: str, rel_path: str = "") -> Path:
    if project not in ["node", "python"]:
        raise HTTPException(status_code=400, detail="Invalid project type")
    
    base_path = Path(settings.WORKSPACE_ROOT) / project
    if not base_path.exists():
        base_path.mkdir(parents=True, exist_ok=True)
    
    if not rel_path:
        return base_path
        
    target_path = (base_path / rel_path).resolve()
    
    try:
        target_path.relative_to(base_path)
    except ValueError:
        raise HTTPException(status_code=403, detail="Path traversal detected")
        
    return target_path

def _get_file_tree(dir_path: Path, base_path: Path) -> list[FileEntry]:
    files = []
    for item in dir_path.iterdir():
        if item.name.startswith(".") or item.name == "node_modules" or item.name == "__pycache__":
            continue
            
        rel_path = str(item.relative_to(base_path)).replace("\\", "/")
        
        if item.is_dir():
            files.append(FileEntry(path=rel_path, name=item.name, type="dir", size=0))
            files.extend(_get_file_tree(item, base_path))
        else:
            files.append(FileEntry(path=rel_path, name=item.name, type="file", size=item.stat().st_size))
            
    return files

@router.get("", response_model=FileListResponse)
async def list_files(project: str):
    base_path = ensure_workspace_path(project)
    files = _get_file_tree(base_path, base_path)
    return FileListResponse(project=project, files=files)

@router.get("/content", response_model=FileContentResponse)
async def get_file_content(project: str, path: str):
    target_path = ensure_workspace_path(project, path)
    if not target_path.exists() or not target_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
        
    if target_path.stat().st_size > settings.MAX_FILE_BYTES:
        raise HTTPException(status_code=400, detail="File too large")
        
    with open(target_path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()
        
    return FileContentResponse(project=project, path=path, content=content)

@router.put("/content")
async def update_file_content(request: SaveFileRequest):
    target_path = ensure_workspace_path(request.project, request.path)
    if not target_path.exists() or not target_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
        
    with open(target_path, "w", encoding="utf-8") as f:
        f.write(request.content)
        
    return {"ok": True}

@router.post("/create")
async def create_file(request: CreateFileRequest):
    target_path = ensure_workspace_path(request.project, request.path)
    if target_path.exists():
        raise HTTPException(status_code=400, detail="File already exists")
        
    target_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(target_path, "w", encoding="utf-8") as f:
        if request.content:
            f.write(request.content)
            
    return {"ok": True}

@router.delete("")
async def delete_file(project: str, path: str):
    target_path = ensure_workspace_path(project, path)
    if not target_path.exists():
        raise HTTPException(status_code=404, detail="Not found")
        
    if target_path.is_file():
        target_path.unlink()
    elif target_path.is_dir():
        shutil.rmtree(target_path)
        
    return {"ok": True}

@workspace_router.post("/reset", response_model=ResetResponse)
async def reset_workspace(request: ResetWorkspaceRequest):
    project = request.project
    target_path = ensure_workspace_path(project)
    template_path = Path(settings.TEMPLATE_ROOT) / project
    
    if not template_path.exists():
        raise HTTPException(status_code=400, detail="Template not found")
        
    if target_path.exists():
        shutil.rmtree(target_path)
        
    shutil.copytree(template_path, target_path)
    
    files = _get_file_tree(target_path, target_path)
    return ResetResponse(ok=True, project=project, files=files)
