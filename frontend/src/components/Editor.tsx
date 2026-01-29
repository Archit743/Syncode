import { useEffect, useMemo} from "react";
import Sidebar from "./external/editor/components/sidebar";
import { Code } from "./external/editor/editor/code";
import styled from "@emotion/styled";
import { File, buildFileTree, RemoteFile } from "./external/editor/utils/file-manager";
import { FileTree } from "./external/editor/components/file-tree";
import { Socket } from "socket.io-client";

const EditorContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #000000;
`;

const Main = styled.main`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

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
    <EditorContainer>
      <Main>
        <Sidebar>
          <FileTree
            rootDir={rootDir}
            selectedFile={selectedFile}
            onSelect={onSelect}
          />
        </Sidebar>
        <Code socket={socket} selectedFile={selectedFile} />
      </Main>
    </EditorContainer>
  );
};