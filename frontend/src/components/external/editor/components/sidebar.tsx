import {ReactNode} from 'react';
import styled from "@emotion/styled";

const Aside = styled.aside`
  width: 280px;
  height: 100%;
  background-color: #000000;
  border-right: 1px solid #333333;
  overflow-y: auto;
  overflow-x: hidden;
  flex-shrink: 0;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: #000000;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #333333;
    border-radius: 0;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: #4a4a4a;
  }
`;

const SidebarHeader = styled.div`
  padding: 12px 16px;
  font-size: 10px;
  font-weight: 400;
  color: #999999;
  text-transform: uppercase;
  letter-spacing: 2px;
  background-color: #000000;
  border-bottom: 1px solid #333333;
  position: sticky;
  top: 0;
  z-index: 1;
  font-family: 'Courier New', monospace;
`;

export const Sidebar = ({children}: { children: ReactNode }) => {
  return (
    <Aside>
      <SidebarHeader>Explorer</SidebarHeader>
      {children}
    </Aside>
  )
}

export default Sidebar
