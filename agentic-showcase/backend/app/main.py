from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path
import os
import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from app.database import create_db_and_tables
from app.routers import files, agent, terminal
from app.config import settings
from pydantic import BaseModel
from typing import Optional

class SettingsUpdate(BaseModel):
    provider: Optional[str] = None
    groq_model_planner: Optional[str] = None
    groq_model_coder: Optional[str] = None  
    groq_model_reviewer: Optional[str] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(
    title="Syncode Agent Service",
    description="Agentic IDE backend",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(files.router)
app.include_router(files.workspace_router)
app.include_router(agent.router)
app.include_router(terminal.router)

@app.get("/api/health")
async def health_check():
    return {
        "ok": True,
        "mode": settings.LLM_PROVIDER,
        "workspace": settings.WORKSPACE_ROOT,
        "providers": ["mock", "groq", "openai", "ollama"]
    }

@app.get("/api/settings")
async def get_settings():
    return {
        "provider": settings.LLM_PROVIDER,
        "groq_model_planner": settings.GROQ_MODEL_PLANNER,
        "groq_model_coder": settings.GROQ_MODEL_CODER,
        "groq_model_reviewer": settings.GROQ_MODEL_REVIEWER,
        "has_groq_keys": bool(settings.groq_keys_list),
        "has_openai_key": bool(settings.OPENAI_API_KEY),
        "available_providers": ["mock", "groq", "openai", "ollama"]
    }

@app.post("/api/settings")
async def update_settings(update: SettingsUpdate):
    if update.provider is not None:
        settings.LLM_PROVIDER = update.provider
    if update.groq_model_planner is not None:
        settings.GROQ_MODEL_PLANNER = update.groq_model_planner
    if update.groq_model_coder is not None:
        settings.GROQ_MODEL_CODER = update.groq_model_coder
    if update.groq_model_reviewer is not None:
        settings.GROQ_MODEL_REVIEWER = update.groq_model_reviewer
    return {"ok": True}

# Mount static frontend if exists
frontend_dist = Path(__file__).resolve().parent.parent.parent.parent / "frontend-v2" / "dist"
if frontend_dist.exists() and frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
