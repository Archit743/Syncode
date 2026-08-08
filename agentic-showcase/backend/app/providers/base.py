from abc import ABC, abstractmethod
from typing import AsyncIterator, List, Dict, Any, Optional

class LLMProvider(ABC):
    @abstractmethod
    async def complete(self, messages: List[Dict[str, Any]], model: Optional[str] = None) -> str:
        pass

    @abstractmethod
    async def stream(self, messages: List[Dict[str, Any]], model: Optional[str] = None) -> AsyncIterator[str]:
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        pass
