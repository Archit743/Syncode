import { useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { Terminal } from "xterm";
import { FitAddon } from 'xterm-addon-fit';
import styled from "@emotion/styled";

const OPTIONS_TERM = {
    useStyle: true,
    screenKeys: true,
    cursorBlink: true,
    theme: {
        background: "#000000",
        foreground: "#ffffff",
        cursor: "#ffffff",
        selection: "#333333",
        black: "#000000",
        brightBlack: "#666666",
        red: "#ffffff",
        brightRed: "#ffffff",
        green: "#ffffff",
        brightGreen: "#ffffff",
        yellow: "#ffffff",
        brightYellow: "#ffffff",
        blue: "#ffffff",
        brightBlue: "#ffffff",
        magenta: "#ffffff",
        brightMagenta: "#ffffff",
        cyan: "#ffffff",
        brightCyan: "#ffffff",
        white: "#cccccc",
        brightWhite: "#ffffff"
    },
    scrollback: 1000,
    convertEol: true,
    fontFamily: "'Courier New', monospace",
    fontSize: 13,
    lineHeight: 1.3,
};

const TerminalContainer = styled.div<{ isVisible: boolean }>`
    flex: 1;
    min-height: 0;
    display: ${props => props.isVisible ? 'flex' : 'none'};
    flex-direction: column;
    background-color: #000000;
    overflow: hidden;
`;

const TerminalHeader = styled.div`
    padding: 10px 16px;
    background-color: #000000;
    border-bottom: 1px solid #333333;
    font-size: 10px;
    font-weight: 400;
    color: #999999;
    text-transform: uppercase;
    letter-spacing: 2px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    font-family: 'Courier New', monospace;
`;

const StatusIndicator = styled.div`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #ffffff;
    box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
`;

const TerminalWrapper = styled.div`
    flex: 1;
    padding: 8px;
    overflow: hidden;
    background-color: #000000;
    
    .xterm {
        height: 100%;
        padding: 0;
    }
    
    .xterm-viewport {
        background-color: #000000 !important;
    }
`;

export const TerminalComponent = ({ socket, isVisible = true }: { socket: Socket, isVisible?: boolean }) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const termInstanceRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);
    const handlersAttachedRef = useRef(false);

    useEffect(() => {
        if (!terminalRef.current || !socket) return;

        // If terminal instance doesn't exist, create it
        if (!termInstanceRef.current) {
            const fitAddon = new FitAddon();
            fitAddonRef.current = fitAddon;

            const term = new Terminal(OPTIONS_TERM);
            term.loadAddon(fitAddon);
            term.open(terminalRef.current);
            termInstanceRef.current = term;
            
            // Fit the terminal to container
            setTimeout(() => {
                fitAddon.fit();
                // Send terminal size to backend
                socket.emit('resizeTerminal', { 
                    cols: term.cols, 
                    rows: term.rows 
                });
            }, 0);

            // Add resize observer to refit on container size changes
            resizeObserverRef.current = new ResizeObserver(() => {
                try {
                    fitAddon.fit();
                    // Send new size to backend after resize
                    socket.emit('resizeTerminal', { 
                        cols: term.cols, 
                        rows: term.rows 
                    });
                } catch (e) {
                    // Ignore errors during resize
                }
            });

            resizeObserverRef.current.observe(terminalRef.current);

            // Send keystrokes to server
            term.onData((data) => {
                socket.emit('terminalData', { data });
            });
        } else if (terminalRef.current && termInstanceRef.current) {
            // Re-attach existing terminal to new container
            termInstanceRef.current.open(terminalRef.current);
            setTimeout(() => {
                fitAddonRef.current?.fit();
                // Send terminal size to backend when re-attached
                socket.emit('resizeTerminal', { 
                    cols: termInstanceRef.current!.cols, 
                    rows: termInstanceRef.current!.rows 
                });
            }, 0);

            if (resizeObserverRef.current && terminalRef.current) {
                resizeObserverRef.current.observe(terminalRef.current);
            }
        }

        // Attach socket handlers only once
        if (!handlersAttachedRef.current) {
            handlersAttachedRef.current = true;

            // Request a terminal from the server
            socket.emit("requestTerminal");

            // Handler for terminal data from server
            const terminalHandler = ({ data }: { data: string | ArrayBuffer | Uint8Array }) => {
                const str = typeof data === "string" ? data : new TextDecoder("utf-8").decode(data);
                termInstanceRef.current?.write(str);
            };

            socket.on("terminal", terminalHandler);

            // Optionally, send an initial newline to trigger prompt
            socket.emit('terminalData', { data: '\n' });
        }

        return () => {
            // Don't dispose terminal, just disconnect observer
            if (resizeObserverRef.current && terminalRef.current) {
                resizeObserverRef.current.unobserve(terminalRef.current);
            }
        };
    }, [terminalRef, socket]);

    // Re-fit terminal when visibility changes
    useEffect(() => {
        if (isVisible && termInstanceRef.current && fitAddonRef.current) {
            setTimeout(() => {
                try {
                    fitAddonRef.current?.fit();
                    // Send terminal size to backend when becoming visible
                    socket.emit('resizeTerminal', { 
                        cols: termInstanceRef.current!.cols, 
                        rows: termInstanceRef.current!.rows 
                    });
                } catch (e) {
                    // Ignore errors
                }
            }, 0);
        }
    }, [isVisible, socket]);

    return (
        <TerminalContainer isVisible={isVisible}>
            <TerminalHeader>
                <StatusIndicator />
                Terminal
            </TerminalHeader>
            <TerminalWrapper ref={terminalRef} />
        </TerminalContainer>
    );
};
