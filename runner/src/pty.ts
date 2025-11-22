//@ts-ignore => someone fix this
import { fork, IPty } from 'node-pty';

const SHELL = "bash";

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
            cwd: `/workspace`
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
