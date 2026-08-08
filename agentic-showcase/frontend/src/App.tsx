import React, { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { FileTree } from './components/FileTree';
import { CodeEditor } from './components/CodeEditor';
import { DiffViewer } from './components/DiffViewer';
import { AgentPanel } from './components/AgentPanel';
import { Terminal } from './components/Terminal';
import { StatusBar } from './components/StatusBar';
import { SettingsModal } from './components/SettingsModal';
import { useFiles } from './hooks/useFiles';
import { useAgent } from './hooks/useAgent';
import { ApiClient } from './lib/api';
import { AgentAction } from './lib/types';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';

export default function App() {
  const [project, setProject] = useState('node');
  const [showTerminal, setShowTerminal] = useState(true);
  const [showAgent, setShowAgent] = useState(true);
  const [diffAction, setDiffAction] = useState<AgentAction | null>(null);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [health, setHealth] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [commandToRun, setCommandToRun] = useState<string | null>(null);

  const { files, tree, selectedFile, fileContent, loadFiles, selectFile, saveFile } = useFiles(project);
  const agentSession = useAgent(project);

  useEffect(() => {
    ApiClient.getHealth().then(setHealth).catch(console.error);
  }, []);

  useEffect(() => {
    loadFiles();
    agentSession.initSession();
    setDiffAction(null);
  }, [project]);

  const handleReset = async () => {
    await ApiClient.resetWorkspace(project);
    loadFiles();
    setDiffAction(null);
  };

  const handleApprove = async (actionId: string) => {
    await agentSession.approveAction(actionId);
    setDiffAction(null);
    if (selectedFile) selectFile(selectedFile); // reload current file
  };

  const handleReject = async (actionId: string) => {
    await agentSession.rejectAction(actionId);
    setDiffAction(null);
  };

  const handleRunFile = () => {
    if (!selectedFile) return;
    
    let cmd = '';
    const ext = selectedFile.split('.').pop();
    const filename = selectedFile.split('/').pop();
    
    if (ext === 'js') cmd = `node ${filename}\r`;
    else if (ext === 'py') cmd = `python ${filename}\r`;
    else if (ext === 'ts') cmd = `npx ts-node ${filename}\r`;
    else cmd = `cat ${filename}\r`;

    setCommandToRun(cmd);
    setShowTerminal(true);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)] text-sm">
      <TopBar 
        project={project} 
        setProject={setProject} 
        activePath={selectedFile}
        toggleTerminal={() => setShowTerminal(!showTerminal)}
        toggleAgent={() => setShowAgent(!showAgent)}
        resetWorkspace={handleReset}
        onOpenSettings={() => setShowSettings(true)}
        onRunFile={handleRunFile}
      />

      <div className="flex-1 overflow-hidden min-h-0 h-full w-full">
        <PanelGroup orientation="horizontal" className="h-full w-full" style={{ display: 'flex', flexDirection: 'row', width: '100%', height: '100%' }}>
          <Panel id="file-tree" defaultSize="20" minSize="10" maxSize="30">
            <FileTree 
              tree={tree} 
              selectedPath={selectedFile} 
              onSelect={selectFile} 
            />
          </Panel>
          
          <PanelResizeHandle className="w-[6px] bg-[var(--border)] hover:bg-[var(--accent)] transition-colors cursor-col-resize z-10" />
          
          <Panel id="editor-area" defaultSize={showAgent ? "55" : "80"} minSize="30">
            <div className="h-full flex flex-col min-w-0 relative">
              {showTerminal ? (
                <PanelGroup orientation="vertical" className="h-full w-full" style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
                  <Panel id="editor" defaultSize="70" minSize="30">
                    <CodeEditor 
                      filePath={selectedFile}
                      initialContent={fileContent}
                      onSave={saveFile}
                      onCursorChange={setCursorPos}
                    />
                  </Panel>
                  <PanelResizeHandle className="h-[6px] bg-[var(--border)] hover:bg-[var(--accent)] transition-colors cursor-row-resize z-10" />
                  <Panel id="terminal" defaultSize="30" minSize="10">
                    <Terminal 
                      project={project} 
                      onClose={() => setShowTerminal(false)} 
                      commandToRun={commandToRun}
                      onCommandSent={() => setCommandToRun(null)}
                    />
                  </Panel>
                </PanelGroup>
              ) : (
                <CodeEditor 
                  filePath={selectedFile}
                  initialContent={fileContent}
                  onSave={saveFile}
                  onCursorChange={setCursorPos}
                />
              )}
              
              {diffAction && (
                <DiffViewer
                  original={diffAction.before || ''}
                  modified={diffAction.after || ''}
                  path={diffAction.path}
                  onApprove={() => handleApprove(diffAction.id)}
                  onReject={() => handleReject(diffAction.id)}
                  onClose={() => setDiffAction(null)}
                />
              )}
            </div>
          </Panel>

          {showAgent && (
            <PanelResizeHandle className="w-[6px] bg-[var(--border)] hover:bg-[var(--accent)] transition-colors cursor-col-resize z-10" />
          )}
          {showAgent && (
            <Panel id="agent-panel" defaultSize="25" minSize="20" maxSize="40">
              <AgentPanel 
                isOpen={showAgent}
                onClose={() => setShowAgent(false)}
                session={agentSession}
                activePath={selectedFile}
                onViewDiff={setDiffAction}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            </Panel>
          )}
        </PanelGroup>
      </div>

      <StatusBar 
        activePath={selectedFile}
        position={cursorPos}
        providerMode={health?.mode || 'unknown'}
        modelName={health?.mode === 'mock' ? 'mock' : undefined}
      />
      
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
