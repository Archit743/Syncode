import asyncio
import os
import sys
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pathlib import Path
from app.config import settings

router = APIRouter(tags=["terminal"])

@router.websocket("/ws/terminal")
async def terminal_websocket(websocket: WebSocket, project: str = "python"):
    await websocket.accept()
    
    if project not in ["node", "python"]:
        await websocket.close(code=1008, reason="Invalid project")
        return
        
    cwd = Path(settings.WORKSPACE_ROOT) / project
    cwd.mkdir(parents=True, exist_ok=True)
    
    process = None
    
    try:
        if sys.platform == "win32":
            try:
                from winpty import PtyProcess
                process = PtyProcess.spawn(
                    "cmd.exe",
                    cwd=str(cwd),
                    dimensions=(24, 80)
                )
                
                async def read_output():
                    while process.isalive():
                        try:
                            data = await asyncio.to_thread(process.read, 4096)
                            if data:
                                await websocket.send_text(data)
                        except EOFError:
                            break
                        except Exception:
                            break
                
                read_task = asyncio.create_task(read_output())
                
                try:
                    while True:
                        data = await websocket.receive_text()
                        try:
                            msg = json.loads(data)
                            if msg.get("type") == "resize":
                                cols = msg.get("cols", 80)
                                rows = msg.get("rows", 24)
                                process.setwinsize(rows, cols)
                                continue
                        except (json.JSONDecodeError, ValueError):
                            pass
                        if process.isalive():
                            process.write(data)
                except WebSocketDisconnect:
                    pass
                finally:
                    read_task.cancel()
                    
            except ImportError:
                # Fallback: no pywinpty available
                await _fallback_subprocess_terminal(websocket, cwd)
        else:
            # Unix: use pty module
            await _unix_pty_terminal(websocket, cwd)
                
    finally:
        if process is not None:
            try:
                if hasattr(process, 'isalive') and process.isalive():
                    process.terminate()
            except Exception:
                pass


async def _fallback_subprocess_terminal(websocket: WebSocket, cwd: Path):
    """Fallback for when pywinpty is not available. Limited interactivity."""
    import subprocess
    
    shell = "cmd.exe" if sys.platform == "win32" else "/bin/bash"
    process = subprocess.Popen(
        [shell],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        cwd=str(cwd),
        env=os.environ.copy(),
        text=False,
        bufsize=0
    )
    
    async def relay_output():
        while True:
            if process.stdout is None:
                break
            data = await asyncio.to_thread(process.stdout.read, 1024)
            if not data:
                break
            await websocket.send_text(data.decode("utf-8", errors="replace"))
    
    output_task = asyncio.create_task(relay_output())
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "resize":
                    continue
            except json.JSONDecodeError:
                pass
            if process.stdin and process.poll() is None:
                await asyncio.to_thread(process.stdin.write, data.encode("utf-8"))
                await asyncio.to_thread(process.stdin.flush)
    except WebSocketDisconnect:
        pass
    finally:
        output_task.cancel()
        if process.poll() is None:
            try:
                process.terminate()
            except Exception:
                pass


async def _unix_pty_terminal(websocket: WebSocket, cwd: Path):
    """Unix PTY-based terminal."""
    import pty
    import select
    import termios
    import struct
    import fcntl
    
    master_fd, slave_fd = pty.openpty()
    
    process = await asyncio.create_subprocess_exec(
        "/bin/bash",
        stdin=slave_fd,
        stdout=slave_fd,
        stderr=slave_fd,
        cwd=str(cwd),
        env=os.environ.copy()
    )
    
    os.close(slave_fd)
    
    async def read_output():
        loop = asyncio.get_event_loop()
        while True:
            try:
                data = await loop.run_in_executor(None, lambda: os.read(master_fd, 4096))
                if not data:
                    break
                await websocket.send_text(data.decode("utf-8", errors="replace"))
            except OSError:
                break
    
    read_task = asyncio.create_task(read_output())
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "resize":
                    cols = msg.get("cols", 80)
                    rows = msg.get("rows", 24)
                    winsize = struct.pack("HHHH", rows, cols, 0, 0)
                    fcntl.ioctl(master_fd, termios.TIOCSWINSZ, winsize)
                    continue
            except (json.JSONDecodeError, ValueError):
                pass
            os.write(master_fd, data.encode("utf-8"))
    except WebSocketDisconnect:
        pass
    finally:
        read_task.cancel()
        os.close(master_fd)
        if process.returncode is None:
            try:
                process.terminate()
            except Exception:
                pass
