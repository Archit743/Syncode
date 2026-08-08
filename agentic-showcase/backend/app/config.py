from pydantic_settings import BaseSettings
from pathlib import Path
from typing import List

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    HOST: str = "127.0.0.1"
    PORT: int = 8765
    LLM_PROVIDER: str = "mock"
    GROQ_API_KEYS: str = ""
    GROQ_MODEL_PLANNER: str = "llama-3.1-8b-instant"
    GROQ_MODEL_CONTEXT: str = "llama-3.1-8b-instant"
    GROQ_MODEL_CODER: str = "llama-3.3-70b-versatile"
    GROQ_MODEL_REVIEWER: str = "llama-3.1-8b-instant"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.1"
    DATABASE_URL: str = "sqlite:///./agent_sessions.db"
    WORKSPACE_ROOT: str = str(BASE_DIR / "workspace")
    TEMPLATE_ROOT: str = str(BASE_DIR / "templates")
    MAX_FILE_BYTES: int = 250_000
    COMMAND_TIMEOUT: int = 15

    @property
    def groq_keys_list(self) -> List[str]:
        if not self.GROQ_API_KEYS:
            return []
        return [k.strip() for k in self.GROQ_API_KEYS.split(",") if k.strip()]

    class Config:
        env_file = ".env"

settings = Settings()
