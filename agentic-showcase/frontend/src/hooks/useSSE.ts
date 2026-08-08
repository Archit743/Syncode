import { useCallback } from 'react';
import { createParser } from 'eventsource-parser';

export function useSSE() {
  const parseSSE = useCallback(async (
    stream: ReadableStream<Uint8Array>,
    onEvent: (event: string, data: any) => void
  ) => {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    
    const parser = createParser((event) => {
      try {
        if (event.type === 'event') {
          const data = JSON.parse(event.data);
          onEvent(event.event || 'message', data);
        }
      } catch (e) {
        console.error('Error parsing SSE event', e);
      }
    });

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.feed(decoder.decode(value));
      }
    } finally {
      reader.releaseLock();
    }
  }, []);

  return { parseSSE };
}
