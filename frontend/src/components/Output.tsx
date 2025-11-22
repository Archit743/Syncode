import { useSearchParams } from "react-router-dom";
import styled from "@emotion/styled";
import { useState } from "react";

const OutputContainer = styled.div`
    height: 40vh;
    min-height: 200px;
    background-color: #000000;
    border-bottom: 1px solid #333333;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex-shrink: 0;
`;

const OutputHeader = styled.div`
    padding: 10px 16px;
    background-color: #000000;
    border-bottom: 1px solid #333333;
    font-size: 10px;
    font-weight: 400;
    color: #999999;
    text-transform: uppercase;
    letter-spacing: 2px;
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: 'Courier New', monospace;
`;

const RefreshButton = styled.button`
    padding: 4px 8px;
    font-size: 9px;
    background-color: #000000;
    color: #ffffff;
    border: 1px solid #666666;
    border-radius: 0;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: 'Courier New', monospace;
    letter-spacing: 1px;
    text-transform: uppercase;

    &:hover {
        background-color: #1a1a1a;
        border-color: #999999;
    }

    &:active {
        transform: scale(0.98);
    }
`;

const IframeWrapper = styled.div`
    flex: 1;
    background-color: white;
    overflow: hidden;
    position: relative;
`;

const StyledIframe = styled.iframe`
    width: 100%;
    height: 100%;
    border: none;
`;

const ErrorMessage = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: #000000;
    color: #999999;
    padding: 20px;
    text-align: center;
    gap: 12px;
    font-size: 12px;
    font-family: 'Courier New', monospace;
    letter-spacing: 1px;
`;

const LoadingMessage = styled.div`
    color: #cccccc;
    font-size: 11px;
    font-family: 'Courier New', monospace;
`;

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
        <OutputContainer>
            <OutputHeader>
                <span>Preview - {INSTANCE_URI}</span>
                <RefreshButton onClick={handleRefresh}>↻ Reload</RefreshButton>
            </OutputHeader>
            <IframeWrapper>
                {showError && (
                    <ErrorMessage>
                        <div>⚠️ Unable to load preview</div>
                        <LoadingMessage>
                            Your application might still be starting up.
                            <br />
                            Make sure a web server is running on port 3000.
                        </LoadingMessage>
                        <RefreshButton onClick={handleRefresh}>Try Again</RefreshButton>
                    </ErrorMessage>
                )}
                <StyledIframe 
                    key={iframeKey}
                    src={`${INSTANCE_URI}`}
                    onError={() => setShowError(true)}
                    style={{ display: showError ? 'none' : 'block' }}
                />
            </IframeWrapper>
        </OutputContainer>
    );
} 