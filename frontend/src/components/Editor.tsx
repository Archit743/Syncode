import { useEffect, useMemo} from "react";
import Sidebar from "./external/editor/components/sidebar";
import { Code } from "./external/editor/editor/code";
import { File, buildFileTree, RemoteFile } from "./external/editor/utils/file-manager";
import { FileTree } from "./external/editor/components/file-tree";
import { Socket } from "socket.io-client";

export const Editor = ({
    files,
    onSelect,
    selectedFile,
    socket
}: {
    files: RemoteFile[];
    onSelect: (file: File) => void;
    selectedFile: File | undefined;
    socket: Socket;
}) => {
  const rootDir = useMemo(() => {
    return buildFileTree(files);
  }, [files]);

  useEffect(() => {
    if (!selectedFile && rootDir.files.length > 0 && rootDir.files[0]) {
      onSelect(rootDir.files[0])
    }
  }, [selectedFile, rootDir])

  return (
    <div className="flex flex-col h-full bg-black">
      <main className="flex flex-1 overflow-hidden">
        <Sidebar>
          <FileTree
            rootDir={rootDir}
            selectedFile={selectedFile}
            onSelect={onSelect}
          />
        </Sidebar>
        <Code socket={socket} selectedFile={selectedFile} />
      </main>
    </div>
  );
};