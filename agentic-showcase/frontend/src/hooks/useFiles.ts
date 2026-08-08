import { useState, useCallback } from 'react';
import { ApiClient } from '../lib/api';
import { FileEntry, FileTree } from '../lib/types';

export function useFiles(project: string) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [tree, setTree] = useState<FileTree>({});
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const loadFiles = useCallback(async () => {
    try {
      const { files: newFiles } = await ApiClient.getFiles(project);
      setFiles(newFiles);
      
      const newTree: FileTree = {};
      for (const file of newFiles) {
        const parts = file.path.split('/');
        let current = newTree;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) current[parts[i]] = {} as FileTree;
          current = current[parts[i]] as FileTree;
        }
        current[parts[parts.length - 1]] = file;
      }
      setTree(newTree);
    } catch (e) {
      console.error(e);
    }
  }, [project]);

  const selectFile = useCallback(async (path: string) => {
    try {
      setLoading(true);
      const { content } = await ApiClient.getFileContent(project, path);
      setSelectedFile(path);
      setFileContent(content);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [project]);

  const saveFile = useCallback(async (path: string, content: string) => {
    try {
      await ApiClient.saveFile(project, path, content);
      if (path === selectedFile) {
        setFileContent(content);
      }
    } catch (e) {
      console.error(e);
    }
  }, [project, selectedFile]);

  return { files, tree, selectedFile, fileContent, loading, loadFiles, selectFile, saveFile, setFileContent };
}
