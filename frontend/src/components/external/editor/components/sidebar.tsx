import {ReactNode} from 'react';

export const Sidebar = ({children}: { children: ReactNode }) => {
  return (
    <aside className="w-[280px] h-full bg-black border-r border-syncode-gray-700 overflow-y-auto overflow-x-hidden shrink-0 scrollbar scrollbar-w-2 scrollbar-track-black scrollbar-thumb-syncode-gray-700 hover:scrollbar-thumb-syncode-gray-500">
      <div className="px-4 py-3 text-[10px] font-normal text-syncode-gray-400 uppercase tracking-[2px] bg-black border-b border-syncode-gray-700 sticky top-0 z-[1] font-mono">
        Explorer
      </div>
      {children}
    </aside>
  )
}

export default Sidebar
