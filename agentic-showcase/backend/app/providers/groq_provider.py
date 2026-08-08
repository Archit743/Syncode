import random
import asyncio
from typing import AsyncIterator, List, Dict, Any, Optional
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from .base import LLMProvider

class GroqProvider(LLMProvider):
    def __init__(self, api_keys: List[str], default_model: str = "llama-3.1-8b-instant"):
        self.api_keys = api_keys
        self.default_model = default_model
        self.counter = 0

    def _get_next_key(self) -> str:
        if not self.api_keys:
            raise ValueError("No Groq API keys provided")
        key = self.api_keys[self.counter % len(self.api_keys)]
        self.counter += 1
        return key

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

    async def _invoke_with_retry(self, messages, model_name, stream=False):
        max_retries = min(3, len(self.api_keys)) if self.api_keys else 1
        for i in range(max_retries):
            key = self._get_next_key()
            llm = ChatGroq(api_key=key, model=model_name)
            try:
                if stream:
                    return llm.astream(messages)
                else:
                    return await llm.ainvoke(messages)
            except Exception as e:
                if "429" in str(e) and i < max_retries - 1:
                    await asyncio.sleep(1)
                    continue
                raise e
        raise Exception("Failed after retries")

    async def complete(self, messages: List[Dict[str, Any]], model: Optional[str] = None) -> str:
        model_name = model or self.default_model
        msgs = self._convert_messages(messages)
        resp = await self._invoke_with_retry(msgs, model_name, stream=False)
        return resp.content

    async def stream(self, messages: List[Dict[str, Any]], model: Optional[str] = None) -> AsyncIterator[str]:
        model_name = model or self.default_model
        msgs = self._convert_messages(messages)
        stream_iter = await self._invoke_with_retry(msgs, model_name, stream=True)
        async for chunk in stream_iter:
            if chunk.content:
                yield chunk.content

    @property
    def name(self) -> str:
        return "groq"
