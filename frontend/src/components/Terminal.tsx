import { useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { Terminal } from "xterm";
import { FitAddon } from 'xterm-addon-fit';

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
        <div className={`flex-1 min-h-0 ${isVisible ? 'flex' : 'hidden'} flex-col bg-black overflow-hidden`}>
            <div className="px-4 py-2.5 bg-black border-b border-syncode-gray-700 text-[10px] font-normal text-syncode-gray-400 uppercase tracking-[2px] flex items-center gap-2 shrink-0 font-mono">
                <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                Terminal
            </div>
            <div 
                ref={terminalRef} 
                className="flex-1 p-2 overflow-hidden bg-black [&_.xterm]:h-full [&_.xterm]:p-0 [&_.xterm-viewport]:!bg-black"
            />
        </div>
    );
};
