import { useState, useCallback } from 'react';
import { ApiClient } from '../lib/api';
import { AgentMessage, AgentAction } from '../lib/types';
import { useSSE } from './useSSE';

export function useAgent(project: string) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [pendingAction, setPendingAction] = useState<AgentAction | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const { parseSSE } = useSSE();

  const clearMessages = useCallback(() => {
    setMessages([]);
    setPendingAction(null);
  }, []);

  const initSession = useCallback(async () => {
    try {
      const { sessionId: newId } = await ApiClient.createSession(project);
      setSessionId(newId);
      setMessages([]);
      setPendingAction(null);
    } catch (e) {
      console.error('Failed to init session', e);
    }
  }, [project]);

  const sendMessage = useCallback(async (text: string, selectedPath?: string) => {
    if (!sessionId) return;
    
    setIsStreaming(true);
    setMessages(prev => [...prev, { role: 'user', content: text, timestamp: new Date().toISOString() }]);
    
    // Add empty assistant message to stream into
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: '', 
      timestamp: new Date().toISOString(),
      events: []
    }]);

    try {
      const stream = await ApiClient.sendMessage(sessionId, text, selectedPath);
      await parseSSE(stream, (event, data) => {
        setMessages(prev => {
          const newMessages = [...prev];
          const lastIdx = newMessages.length - 1;
          const lastMsg = { ...newMessages[lastIdx] };
          
          if (event === 'token') {
            lastMsg.content = (lastMsg.content || '') + data.content;
          } else if (event === 'agent_event') {
            lastMsg.events = [...(lastMsg.events || []), data];
          } else if (event === 'action') {
            lastMsg.action = data;
            setPendingAction(data);
          } else if (event === 'done') {
            lastMsg.metadata = data;
          } else if (event === 'error') {
            lastMsg.events = [...(lastMsg.events || []), { role: 'System', status: 'error', detail: data.message, timestamp: new Date().toISOString() }];
          }
          
          newMessages[lastIdx] = lastMsg;
          return newMessages;
        });
      });
    } catch (e: any) {
      console.error('Stream error', e);
      setMessages(prev => {
        const newMessages = [...prev];
        const lastIdx = newMessages.length - 1;
        const lastMsg = { ...newMessages[lastIdx] };
        lastMsg.events = [...(lastMsg.events || []), { role: 'System', status: 'error', detail: e.message || 'Stream connection failed', timestamp: new Date().toISOString() }];
        newMessages[lastIdx] = lastMsg;
        return newMessages;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [sessionId, parseSSE]);

  const approveAction = useCallback(async (actionId: string) => {
    try {
      await ApiClient.approveAction(actionId);
      setPendingAction(null);
      setMessages(prev => prev.map(m => {
        if (m.action?.id === actionId) {
          return { ...m, action: { ...m.action, status: 'approved' } };
        }
        return m;
      }));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const rejectAction = useCallback(async (actionId: string) => {
    try {
      await ApiClient.rejectAction(actionId);
      setPendingAction(null);
      setMessages(prev => prev.map(m => {
        if (m.action?.id === actionId) {
          return { ...m, action: { ...m.action, status: 'rejected' } };
        }
        return m;
      }));
    } catch (e) {
      console.error(e);
    }
  }, []);

  return { sessionId, messages, pendingAction, isStreaming, initSession, sendMessage, approveAction, rejectAction, clearMessages };
}
