export interface FileEntry {
  path: string;
  name: string;
  type: 'file' | 'dir';
  size?: number;
}

export interface FileTree {
  [key: string]: FileTree | FileEntry;
}

export interface AgentEvent {
  role: string;
  status: 'running' | 'complete' | 'skipped' | 'error';
  detail: string;
  timestamp: string;
  model?: string;
}

export interface AgentAction {
  id: string;
  kind: string;
  path: string;
  project: string;
  summary: string;
  diff?: string;
  before?: string;
  after?: string;
  status?: 'pending' | 'approved' | 'rejected';
}

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  events?: AgentEvent[];
  action?: AgentAction;
  metadata?: any;
}

export interface AgentSession {
  sessionId: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface SSEEvent {
  event: string;
  data: any;
}

export interface TerminalMessage {
  type: string;
  data: string;
}
