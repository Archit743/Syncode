import { FileEntry } from './types';

export class ApiClient {
  static async getFiles(project: string): Promise<{ project: string; files: FileEntry[] }> {
    const res = await fetch(`/api/files?project=${project}`);
    if (!res.ok) throw new Error('Failed to fetch files');
    return res.json();
  }

  static async getFileContent(project: string, path: string): Promise<{ project: string; path: string; content: string }> {
    const res = await fetch(`/api/files/content?project=${project}&path=${encodeURIComponent(path)}`);
    if (!res.ok) throw new Error('Failed to fetch file content');
    return res.json();
  }

  static async saveFile(project: string, path: string, content: string): Promise<{ ok: boolean }> {
    const res = await fetch('/api/files/content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, path, content })
    });
    if (!res.ok) throw new Error('Failed to save file');
    return res.json();
  }

  static async createFile(project: string, path: string, content: string = ''): Promise<{ ok: boolean }> {
    const res = await fetch('/api/files/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, path, content })
    });
    if (!res.ok) throw new Error('Failed to create file');
    return res.json();
  }

  static async deleteFile(project: string, path: string): Promise<{ ok: boolean }> {
    const res = await fetch(`/api/files?project=${project}&path=${encodeURIComponent(path)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete file');
    return res.json();
  }

  static async resetWorkspace(project: string): Promise<any> {
    const res = await fetch('/api/workspace/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project })
    });
    if (!res.ok) throw new Error('Failed to reset workspace');
    return res.json();
  }

  static async createSession(project: string): Promise<{ sessionId: string }> {
    const res = await fetch('/api/agent/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project })
    });
    if (!res.ok) throw new Error('Failed to create session');
    return res.json();
  }

  static async sendMessage(sessionId: string, message: string, selectedPath?: string): Promise<ReadableStream<Uint8Array>> {
    const res = await fetch(`/api/agent/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, selectedPath })
    });
    if (!res.ok) throw new Error('Failed to send message');
    return res.body!;
  }

  static async approveAction(actionId: string): Promise<any> {
    const res = await fetch(`/api/agent/actions/${actionId}/approve`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to approve action');
    return res.json();
  }

  static async rejectAction(actionId: string): Promise<any> {
    const res = await fetch(`/api/agent/actions/${actionId}/reject`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to reject action');
    return res.json();
  }

  static async getHistory(sessionId: string): Promise<any> {
    const res = await fetch(`/api/agent/sessions/${sessionId}/history`);
    if (!res.ok) throw new Error('Failed to fetch history');
    return res.json();
  }

  static async getHealth(): Promise<any> {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('Failed to check health');
    return res.json();
  }
}
