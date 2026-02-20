import React, {useState} from 'react'
import {Directory, File, sortDir, sortFile} from "../utils/file-manager";
import {getIcon} from "./icon";

interface FileTreeProps {
  rootDir: Directory;   // 根目录
  selectedFile: File | undefined;   // 当前选中文件
  onSelect: (file: File) => void;  // 更改选中时触发事件
}

export const FileTree = (props: FileTreeProps) => {
  return <SubTree directory={props.rootDir} {...props}/>
}

interface SubTreeProps {
  directory: Directory;   // 根目录
  selectedFile: File | undefined;   // 当前选中文件
  onSelect: (file: File) => void;  // 更改选中时触发事件
}

const SubTree = (props: SubTreeProps) => {
  return (
    <div>
      {
        props.directory.dirs
          .sort(sortDir)
          .map(dir => (
            <React.Fragment key={dir.id}>
              <DirDiv
                directory={dir}
                selectedFile={props.selectedFile}
                onSelect={props.onSelect}/>
            </React.Fragment>
          ))
      }
      {
        props.directory.files
          .sort(sortFile)
          .map(file => (
            <React.Fragment key={file.id}>
              <FileDiv
                file={file}
                selectedFile={props.selectedFile}
                onClick={() => props.onSelect(file)}/>
            </React.Fragment>
          ))
      }
    </div>
  )
}

const FileDiv = ({file, icon, selectedFile, onClick}: {
  file: File | Directory; // 当前文件
  icon?: string;          // 图标名称
  selectedFile: File | undefined;     // 选中的文件
  onClick: () => void;    // 点击事件
}) => {
  const isSelected = (selectedFile && selectedFile.id === file.id) as boolean;
  const depth = file.depth;
  return (
    <div
      className={`
        flex items-center py-1.5 pr-3 text-xs transition-all duration-150 font-mono tracking-[0.5px] cursor-pointer
        ${isSelected 
          ? 'bg-syncode-dark text-white border-l-2 border-syncode-gray-600' 
          : 'bg-transparent text-syncode-gray-400 border-l-2 border-transparent hover:bg-syncode-black hover:text-white'
        }
      `}
      style={{ paddingLeft: `${12 + depth * 16}px` }}
      onClick={onClick}
    >
      <FileIcon
        name={icon}
        extension={file.name.split('.').pop() || ""}/>
      <span className="ml-0.5">
        {file.name}
      </span>
    </div>
  )
}

const DirDiv = ({directory, selectedFile, onSelect}: {
  directory: Directory;  // 当前目录
  selectedFile: File | undefined;    // 选中的文件
  onSelect: (file: File) => void;  // 点击事件
}) => {
  let defaultOpen = false;
  if (selectedFile)
    defaultOpen = isChildSelected(directory, selectedFile)
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <FileDiv
        file={directory}
        icon={open ? "openDirectory" : "closedDirectory"}
        selectedFile={selectedFile}
        onClick={() => {
          if (!open) {
            onSelect(directory)
          }
          setOpen(!open)
        }}/>
      {
        open ? (
          <SubTree
            directory={directory}
            selectedFile={selectedFile}
            onSelect={onSelect}/>
        ) : null
      }
    </>
  )
}

const isChildSelected = (directory: Directory, selectedFile: File) => {
  let res: boolean = false;

  function isChild(dir: Directory, file: File) {
    if (selectedFile.parentId === dir.id) {
      res = true;
      return;
    }
    if (selectedFile.parentId === '0') {
      res = false;
      return;
    }
    dir.dirs.forEach((item) => {
      isChild(item, file);
    })
  }

  isChild(directory, selectedFile);
  return res;
}

const FileIcon = ({extension, name}: { name?: string, extension?: string }) => {
  let icon = getIcon(extension || "", name || "");
  return (
    <span className="flex w-6 h-6 justify-center items-center mr-2 shrink-0">
      {icon}
    </span>
  )
}

