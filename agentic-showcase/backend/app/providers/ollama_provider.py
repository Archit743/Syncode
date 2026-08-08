from typing import AsyncIterator, List, Dict, Any, Optional

try:
    # Newer LangChain versions moved Ollama integrations here.
    from langchain_ollama import ChatOllama
except ImportError:
    try:
        from langchain_community.chat_models import ChatOllama
    except ImportError:
        ChatOllama = None

from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from .base import LLMProvider

class OllamaProvider(LLMProvider):
    def __init__(self, base_url: str, default_model: str = "llama3.1"):
        if ChatOllama is None:
            raise RuntimeError("langchain-ollama package is not installed. Please install it to use Ollama.")
        self.base_url = base_url
        self.default_model = default_model

    def _convert_messages(self, messages: List[Dict[str, Any]]):
        converted = []
        for msg in messages:
            if msg["role"] == "user":
                converted.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "system":
                converted.append(SystemMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                converted.append(AIMessage(content=msg["content"]))
        return converted

    async def complete(self, messages: List[Dict[str, Any]], model: Optional[str] = None) -> str:
        model_name = model or self.default_model
        llm = ChatOllama(base_url=self.base_url, model=model_name)
        msgs = self._convert_messages(messages)
        resp = await llm.ainvoke(msgs)
        return resp.content

    async def stream(self, messages: List[Dict[str, Any]], model: Optional[str] = None) -> AsyncIterator[str]:
        model_name = model or self.default_model
        llm = ChatOllama(base_url=self.base_url, model=model_name)
        msgs = self._convert_messages(messages)
        async for chunk in llm.astream(msgs):
            if chunk.content:
                yield chunk.content

    @property
    def name(self) -> str:
        return "ollama"
