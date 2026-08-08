from .base import LLMProvider
from .mock_provider import MockProvider

def get_provider(settings) -> LLMProvider:
    provider = settings.LLM_PROVIDER.lower()
    
    if provider == "groq":
        from .groq_provider import GroqProvider
        return GroqProvider(api_keys=settings.groq_keys_list, default_model=settings.GROQ_MODEL_PLANNER)
    elif provider == "openai":
        from .openai_provider import OpenAIProvider
        return OpenAIProvider(api_key=settings.OPENAI_API_KEY, default_model=settings.OPENAI_MODEL)
    elif provider == "ollama":
        from .ollama_provider import OllamaProvider
        return OllamaProvider(base_url=settings.OLLAMA_BASE_URL, default_model=settings.OLLAMA_MODEL)
    else:
        return MockProvider()
