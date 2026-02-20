import { useEffect, useState } from 'react';
import { Socket, io } from 'socket.io-client';
import { Editor } from './Editor';
import { File, RemoteFile, Type } from './external/editor/utils/file-manager';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Output } from './Output';
import { TerminalComponent as Terminal } from './Terminal';
import axios from 'axios';

function useSocket(replId: string, enabled: boolean = true) {
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        if (!enabled || !replId) {
            return;
        }

        const newSocket = io(`http://${replId}.iluvcats.me`, {
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            autoConnect: true,
        });
        
        newSocket.on('connect', () => {
            // Connection successful - silent
        });

        newSocket.on('connect_error', () => {
            // Suppress error logging to avoid console spam
        });

        newSocket.on('disconnect', () => {
            // Silent disconnect
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [replId, enabled]);

    return socket;
}

// Loading screen component
const LoadingScreen = ({ text }: { text: string }) => (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-syncode-black gap-6 overflow-hidden">
        <div className="w-10 h-10 border-2 border-syncode-gray-700 border-t-white rounded-full animate-spin" />
        <div className="text-sm text-syncode-gray-300 font-normal animate-pulse font-mono tracking-widest uppercase">
            {text}
        </div>
    </div>
);

// Toggle button component
const ToggleButton = ({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-[11px] font-normal border border-white cursor-pointer transition-all duration-200 tracking-widest font-mono uppercase active:scale-[0.98] ${
            active 
                ? 'bg-white text-black hover:bg-white' 
                : 'bg-syncode-black text-white hover:bg-syncode-gray-900'
        }`}
    >
        {children}
    </button>
);

// Connection status indicator
const ConnectionStatus = ({ connected }: { connected: boolean }) => (
    <div className={`flex items-center gap-2 text-[10px] tracking-wide font-mono uppercase ${connected ? 'text-white' : 'text-syncode-gray-300'}`}>
        <span 
            className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'bg-syncode-gray-500'}`} 
        />
        {connected ? 'Connected' : 'Connecting...'}
    </div>
);

export const CodingPage = () => {
    const [podCreated, setPodCreated] = useState(false);
    const [searchParams] = useSearchParams();
    const replId = searchParams.get('replId') ?? '';
    
    const SERVICE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

    useEffect(() => {
        if (replId) {
            axios.post(`${SERVICE_URL}/start`, { replId })
                .then(() => setPodCreated(true))
                .catch((err) => console.error(err));
        }

        const handleBeforeUnload = () => {
            if (replId) {
                const blob = new Blob([JSON.stringify({ replId })], { type: 'application/json' });
                navigator.sendBeacon(`${SERVICE_URL}/stop`, blob);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [replId]);

    if (!podCreated) {
        return <LoadingScreen text="Booting your environment..." />;
    }
    return <CodingPagePostPodCreation />
}

export const CodingPagePostPodCreation = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const replId = searchParams.get('replId') ?? '';
    const [loaded, setLoaded] = useState(false);
    const socket = useSocket(replId);
    const [fileStructure, setFileStructure] = useState<RemoteFile[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);
    const [showOutput, setShowOutput] = useState(false);
    const [showTerminal, setShowTerminal] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [showStopDialog, setShowStopDialog] = useState(false);

    useEffect(() => {
        if (socket) {
            socket.on('connect', () => {
                setIsConnected(true);
            });

            socket.on('disconnect', () => {
                setIsConnected(false);
            });

            socket.on('loaded', ({ rootContent }: { rootContent: RemoteFile[]}) => {
                setLoaded(true);
                setFileStructure(rootContent);
            });
        }
    }, [socket]);

    const SERVICE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

    const handleStopEnvironment = async () => {
        setShowStopDialog(false);
        try {
            await axios.post(`${SERVICE_URL}/stop`, { replId });
            navigate('/');
        } catch (error) {
            console.error('Failed to stop environment:', error);
            alert('Failed to stop environment');
        }
    };

    const refreshFiles = () => {
        if (socket) {
            socket.emit("refreshFiles", (rootContent: RemoteFile[]) => {
                setFileStructure(rootContent);
            });
        }
    };

    const onSelect = (file: File) => {
        if (!file) return;
        
        if (file.type === Type.DIRECTORY) {
            socket?.emit("fetchDir", file.path, (data: RemoteFile[]) => {
                setFileStructure(prev => {
                    const allFiles = [...prev, ...data];
                    return allFiles.filter((file, index, self) => 
                        index === self.findIndex(f => f.path === file.path)
                    );
                });
            });
        } else {
            socket?.emit("fetchContent", { path: file.path }, (data: string) => {
                file.content = data;
                setSelectedFile(file);
            });
        }
    };
    
    if (!loaded) {
        return <LoadingScreen text="Loading workspace..." />;
    }

    return (
        <div className="flex flex-col w-screen h-screen bg-syncode-black overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-syncode-black border-b border-white h-12 shrink-0">
                <div className="flex items-center gap-4 text-sm font-normal text-white tracking-[4px] font-mono uppercase">
                    Syncode
                    <ConnectionStatus connected={isConnected} />
                </div>
                <div className="flex gap-3 items-center">
                    <ToggleButton onClick={refreshFiles}>
                        🔄 Refresh Files
                    </ToggleButton>
                    <ToggleButton active={showOutput} onClick={() => setShowOutput(!showOutput)}>
                        {showOutput ? '✓ Output' : 'Show Output'}
                    </ToggleButton>
                    <ToggleButton active={showTerminal} onClick={() => setShowTerminal(!showTerminal)}>
                        {showTerminal ? '✓ Terminal' : 'Show Terminal'}
                    </ToggleButton>
                    <ToggleButton onClick={() => setShowStopDialog(true)}>
                        ⏹ Stop
                    </ToggleButton>
                </div>
            </div>

            {/* Workspace */}
            <div className="flex m-0 text-base w-full flex-1 overflow-hidden">
                <div className="flex-1 min-w-0 flex flex-col border-r border-syncode-gray-700 bg-syncode-black overflow-hidden">
                    <Editor socket={socket!} selectedFile={selectedFile} onSelect={onSelect} files={fileStructure} />
                </div>
                <div 
                    className="flex-1 min-w-0 flex flex-col bg-syncode-black overflow-hidden"
                    style={{ display: (showOutput || showTerminal) ? 'flex' : 'none' }}
                >
                    {showOutput && <Output />}
                    <Terminal socket={socket!} isVisible={showTerminal} />
                </div>
            </div>
            
            {/* Stop Dialog */}
            {showStopDialog && (
                <div 
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1000] backdrop-blur-sm"
                    onClick={() => setShowStopDialog(false)}
                >
                    <div 
                        className="bg-syncode-black border-2 border-white p-8 max-w-[480px] w-[90%] flex flex-col gap-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-base font-normal text-white m-0 tracking-[3px] uppercase font-mono">
                            Stop Environment?
                        </h2>
                        <p className="text-xs text-syncode-gray-300 m-0 leading-relaxed tracking-wide font-mono">
                            Are you sure you want to stop and cleanup this environment? 
                            All unsaved changes will be lost and the environment will be terminated.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button 
                                className="px-5 py-2.5 text-[11px] font-normal bg-syncode-black text-white border border-white cursor-pointer transition-all duration-200 tracking-widest font-mono uppercase hover:bg-syncode-gray-900 hover:scale-[1.02] active:scale-[0.98]"
                                onClick={() => setShowStopDialog(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                className="px-5 py-2.5 text-[11px] font-normal bg-white text-black border border-white cursor-pointer transition-all duration-200 tracking-widest font-mono uppercase hover:scale-[1.02] active:scale-[0.98]"
                                onClick={handleStopEnvironment}
                            >
                                Stop Environment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
