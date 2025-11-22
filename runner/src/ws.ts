import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { saveToS3 } from "./aws";
import path from "path";
import { fetchDir, fetchFileContent, saveFile } from "./fs";
import { TerminalManager } from "./pty";

const terminalManager = new TerminalManager();

export function initWs(httpServer: HttpServer) {
    const io = new Server(httpServer, {
        cors: {
            // Should restrict this more!
            origin: "*",
            methods: ["GET", "POST"],
        },
    });
      
    io.on("connection", async (socket) => {
        // Auth checks should happen here
        const host = socket.handshake.headers.host;
        console.log(`host is ${host}`);
        // Split the host by '.' and take the first part as replId
        const replId = host?.split('.')[0];
    
        if (!replId) {
            socket.disconnect();
            terminalManager.clear(socket.id);
            return;
        }

        socket.emit("loaded", {
            rootContent: await fetchDir("/workspace", "")
        });

        initHandlers(socket, replId);

        // Handle disconnect - cleanup terminal
        socket.on("disconnect", () => {
            console.log(`User disconnected from ${replId}`);
            terminalManager.clear(socket.id);
        });
    });
}

function initHandlers(socket: Socket, replId: string) {

    socket.on("disconnect", () => {
        console.log("user disconnected");
        terminalManager.clear(socket.id);
    });

    socket.on("fetchDir", async (dir: string, callback) => {
        const dirPath = `/workspace/${dir}`;
        const contents = await fetchDir(dirPath, dir);
        callback(contents);
    });

    socket.on("fetchContent", async ({ path: filePath }: { path: string }, callback) => {
        const fullPath = `/workspace/${filePath}`;
        const data = await fetchFileContent(fullPath);
        callback(data);
    });

    // Add a refresh handler to reload the entire file tree
    socket.on("refreshFiles", async (callback) => {
        const rootContent = await fetchDir("/workspace", "");
        callback(rootContent);
    });

    // TODO: contents should be diff, not full file
    // Should be validated for size
    // Should be throttled before updating S3 (or use an S3 mount)
    socket.on("updateContent", async ({ path: filePath, content }: { path: string, content: string }) => {
        const fullPath =  `/workspace/${filePath}`;
        await saveFile(fullPath, content);
        await saveToS3(`code/${replId}`, filePath, content);
    });

    socket.on("requestTerminal", async () => {
        terminalManager.createPty(socket.id, replId, (data, id) => {
            socket.emit('terminal', {
                data: Buffer.from(data,"utf-8")
            });
        });
    });
    
    socket.on("terminalData", async ({ data }: { data: string, terminalId: number }) => {
        terminalManager.write(socket.id, data);
    });

    socket.on("resizeTerminal", async ({ cols, rows }: { cols: number, rows: number }) => {
        terminalManager.resize(socket.id, cols, rows);
    });

}