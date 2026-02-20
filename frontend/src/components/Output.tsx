import { useSearchParams } from "react-router-dom";
import { useState } from "react";

const RefreshButton = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button
        onClick={onClick}
        className="px-2 py-1 text-[9px] bg-black text-white border border-syncode-gray-600 rounded-none cursor-pointer transition-all duration-200 font-mono tracking-wider uppercase hover:bg-syncode-dark hover:border-syncode-gray-400 active:scale-[0.98]"
    >
        {children}
    </button>
);

export const Output = () => {
    const [searchParams] = useSearchParams();
    const replId = searchParams.get('replId') ?? '';
    const INSTANCE_URI = `http://${replId}.catclub.tech`;
    const [iframeKey, setIframeKey] = useState(0);
    const [showError, setShowError] = useState(false);

    const handleRefresh = () => {
        setIframeKey(prev => prev + 1);
        setShowError(false);
    };

    return (
        <div className="h-[40vh] min-h-[200px] bg-black border-b border-syncode-gray-700 flex flex-col overflow-hidden shrink-0">
            <div className="px-4 py-2.5 bg-black border-b border-syncode-gray-700 text-[10px] font-normal text-syncode-gray-400 uppercase tracking-[2px] shrink-0 flex justify-between items-center font-mono">
                <span>Preview - {INSTANCE_URI}</span>
                <RefreshButton onClick={handleRefresh}>↻ Reload</RefreshButton>
            </div>
            <div className="flex-1 bg-white overflow-hidden relative">
                {showError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-syncode-gray-400 p-5 text-center gap-3 text-xs font-mono tracking-wider">
                        <div>⚠️ Unable to load preview</div>
                        <div className="text-syncode-gray-300 text-[11px] font-mono">
                            Your application might still be starting up.
                            <br />
                            Make sure a web server is running on port 3000.
                        </div>
                        <RefreshButton onClick={handleRefresh}>Try Again</RefreshButton>
                    </div>
                )}
                <iframe 
                    key={iframeKey}
                    src={`${INSTANCE_URI}`}
                    onError={() => setShowError(true)}
                    className="w-full h-full border-none"
                    style={{ display: showError ? 'none' : 'block' }}
                />
            </div>
        </div>
    );
} 