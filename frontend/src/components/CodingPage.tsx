import { useEffect, useState } from 'react';
import { Socket, io } from 'socket.io-client';
import { Editor } from './Editor';
import { File, RemoteFile, Type } from './external/editor/utils/file-manager';
import { useSearchParams, useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
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

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background-color: #000000;
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background-color: #000000;
  border-bottom: 1px solid #ffffff;
  height: 48px;
  flex-shrink: 0;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 14px;
  font-weight: 400;
  color: white;
  letter-spacing: 4px;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const ToggleButton = styled.button<{ active?: boolean }>`
  padding: 8px 16px;
  font-size: 11px;
  font-weight: 400;
  background-color: ${props => props.active ? '#ffffff' : '#000000'};
  color: ${props => props.active ? '#000000' : '#ffffff'};
  border: 1px solid #ffffff;
  border-radius: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 2px;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;

  &:hover {
    background-color: ${props => props.active ? '#ffffff' : '#1a1a1a'};
    color: ${props => props.active ? '#000000' : '#ffffff'};
  }

  &:active {
    transform: scale(0.98);
  }
`;

const Workspace = styled.div`
  display: flex;
  margin: 0;
  font-size: 16px;
  width: 100%;
  flex: 1;
  overflow: hidden;
`;

const LeftPanel = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #333333;
  background-color: #000000;
  overflow: hidden;
`;

const RightPanel = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background-color: #000000;
  overflow: hidden;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100vw;
  background-color: #000000;
  gap: 24px;
  overflow: hidden;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 2px solid #333333;
  border-top-color: white;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const LoadingText = styled.div`
  font-size: 14px;
  color: #999999;
  font-weight: 400;
  animation: ${pulse} 1.5s ease-in-out infinite;
  font-family: 'Courier New', monospace;
  letter-spacing: 2px;
  text-transform: uppercase;
`;

const ConnectionStatus = styled.div<{ connected: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: ${props => props.connected ? '#ffffff' : '#999999'};
  letter-spacing: 1px;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
  
  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: ${props => props.connected ? '#ffffff' : '#666666'};
    box-shadow: ${props => props.connected ? '0 0 8px rgba(255, 255, 255, 0.5)' : 'none'};
  }
`;

const ConfirmDialog = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`;

const DialogBox = styled.div`
  background-color: #000000;
  border: 2px solid #ffffff;
  padding: 32px;
  max-width: 480px;
  width: 90%;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const DialogTitle = styled.h2`
  font-size: 16px;
  font-weight: 400;
  color: #ffffff;
  margin: 0;
  letter-spacing: 3px;
  text-transform: uppercase;
  font-family: 'Courier New', monospace;
`;

const DialogMessage = styled.p`
  font-size: 12px;
  color: #999999;
  margin: 0;
  line-height: 1.6;
  letter-spacing: 1px;
  font-family: 'Courier New', monospace;
`;

const DialogActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const DialogButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 10px 20px;
  font-size: 11px;
  font-weight: 400;
  background-color: ${props => props.variant === 'primary' ? '#ffffff' : '#000000'};
  color: ${props => props.variant === 'primary' ? '#000000' : '#ffffff'};
  border: 1px solid #ffffff;
  border-radius: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 2px;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;

  &:hover {
    background-color: ${props => props.variant === 'primary' ? '#ffffff' : '#1a1a1a'};
    transform: scale(1.02);
  }

  &:active {
    transform: scale(0.98);
  }
`;


export const CodingPage = () => {
    const [podCreated, setPodCreated] = useState(false);
    const [searchParams] = useSearchParams();
    const replId = searchParams.get('replId') ?? '';
    
    useEffect(() => {
        if (replId) {
            axios.post(`http://localhost:3002/start`, { replId })
                .then(() => setPodCreated(true))
                .catch((err) => console.error(err));
        }

        // Cleanup on browser close/tab close (beforeunload event)
        const handleBeforeUnload = () => {
            if (replId) {
                // Use sendBeacon for reliable cleanup on page unload
                const blob = new Blob([JSON.stringify({ replId })], { type: 'application/json' });
                navigator.sendBeacon('http://localhost:3002/stop', blob);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [replId]);

    if (!podCreated) {
        return (
            <LoadingContainer>
                <Spinner />
                <LoadingText>Booting your environment...</LoadingText>
            </LoadingContainer>
        );
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

    const handleStopEnvironment = async () => {
        setShowStopDialog(false);
        try {
            await axios.post(`http://localhost:3002/stop`, { replId });
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
        return (
            <LoadingContainer>
                <Spinner />
                <LoadingText>Loading workspace...</LoadingText>
            </LoadingContainer>
        );
    }

    return (
        <Container>
            <Header>
                <Logo>
                    Syncode
                    <ConnectionStatus connected={isConnected}>
                        {isConnected ? 'Connected' : 'Connecting...'}
                    </ConnectionStatus>
                </Logo>
                <ButtonContainer>
                    <ToggleButton 
                        onClick={refreshFiles}
                    >
                        🔄 Refresh Files
                    </ToggleButton>
                    <ToggleButton 
                        active={showOutput}
                        onClick={() => setShowOutput(!showOutput)}
                    >
                        {showOutput ? '✓ Output' : 'Show Output'}
                    </ToggleButton>
                    <ToggleButton 
                        active={showTerminal}
                        onClick={() => setShowTerminal(!showTerminal)}
                    >
                        {showTerminal ? '✓ Terminal' : 'Show Terminal'}
                    </ToggleButton>
                    <ToggleButton 
                        onClick={() => setShowStopDialog(true)}
                    >
                        ⏹ Stop
                    </ToggleButton>
                </ButtonContainer>
            </Header>
            <Workspace>
                <LeftPanel>
                    <Editor socket={socket!} selectedFile={selectedFile} onSelect={onSelect} files={fileStructure} />
                </LeftPanel>
                <RightPanel style={{ display: (showOutput || showTerminal) ? 'flex' : 'none' }}>
                    {showOutput && <Output />}
                    <Terminal socket={socket!} isVisible={showTerminal} />
                    {/* changed socket to socket! */}
                </RightPanel>
            </Workspace>
            
            {showStopDialog && (
                <ConfirmDialog onClick={() => setShowStopDialog(false)}>
                    <DialogBox onClick={(e) => e.stopPropagation()}>
                        <DialogTitle>Stop Environment?</DialogTitle>
                        <DialogMessage>
                            Are you sure you want to stop and cleanup this environment? 
                            All unsaved changes will be lost and the environment will be terminated.
                        </DialogMessage>
                        <DialogActions>
                            <DialogButton onClick={() => setShowStopDialog(false)}>
                                Cancel
                            </DialogButton>
                            <DialogButton variant="primary" onClick={handleStopEnvironment}>
                                Stop Environment
                            </DialogButton>
                        </DialogActions>
                    </DialogBox>
                </ConfirmDialog>
            )}
        </Container>
    );
}
