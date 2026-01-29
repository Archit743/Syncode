//@ts-ignore => someone fix this
import { fork, IPty } from 'node-pty';

const SHELL = "bash";

// Environment variables that should NOT be exposed to user terminal
const SENSITIVE_ENV_KEYS = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'S3_BUCKET',
    'S3_ENDPOINT',
    'AWS_SESSION_TOKEN',
    'AWS_SECURITY_TOKEN',
];

// Create a sanitized environment for user terminals
const getSanitizedEnv = (): NodeJS.ProcessEnv => {
    const sanitizedEnv: NodeJS.ProcessEnv = {};
    for (const [key, value] of Object.entries(process.env)) {
        if (!SENSITIVE_ENV_KEYS.includes(key)) {
            sanitizedEnv[key] = value;
        }
    }
    // Add safe defaults for user terminal
    sanitizedEnv['TERM'] = 'xterm-256color';
    sanitizedEnv['HOME'] = '/workspace';
    return sanitizedEnv;
};

export class TerminalManager {
    private sessions: { [id: string]: {terminal: IPty, replId: string;} } = {};

    constructor() {
        this.sessions = {};
    }
    
    createPty(id: string, replId: string, onData: (data: string, id: number) => void, cols: number = 100, rows: number = 30) {
        let term = fork(SHELL, [], {
            cols: cols,
            rows: rows,
            name: 'xterm',
            cwd: `/workspace`,
            env: getSanitizedEnv() // Use sanitized env without sensitive credentials
        });
    
        term.on('data', (data: string) => onData(data, term.pid));
        this.sessions[id] = {
            terminal: term,
            replId
        };
        term.on('exit', () => {
            delete this.sessions[term.pid];
        });
        return term;
    }

    write(terminalId: string, data: string) {
        this.sessions[terminalId]?.terminal.write(data);
    }

    resize(terminalId: string, cols: number, rows: number) {
        this.sessions[terminalId]?.terminal.resize(cols, rows);
    }

    clear(terminalId: string) {
        this.sessions[terminalId].terminal.kill();
        delete this.sessions[terminalId];
    }
}
