from typing import AsyncIterator, List, Dict, Any, Optional
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from .base import LLMProvider

class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str, default_model: str = "gpt-4o-mini"):
        self.api_key = api_key
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
        llm = ChatOpenAI(api_key=self.api_key, model=model_name)
        msgs = self._convert_messages(messages)
        resp = await llm.ainvoke(msgs)
        return resp.content

    async def stream(self, messages: List[Dict[str, Any]], model: Optional[str] = None) -> AsyncIterator[str]:
        model_name = model or self.default_model
        llm = ChatOpenAI(api_key=self.api_key, model=model_name)
        msgs = self._convert_messages(messages)
        async for chunk in llm.astream(msgs):
            if chunk.content:
                yield chunk.content

    @property
    def name(self) -> str:
        return "openai"
