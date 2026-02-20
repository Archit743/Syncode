import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, createContext, useContext, useState } from "react";
import axios from "axios";

// Context to track sync status globally
const SyncContext = createContext<{ isSynced: boolean }>({ isSynced: false });
export const useSyncStatus = () => useContext(SyncContext);

// Component that handles auto-sync after login
const UserSyncProvider = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated, user, getAccessTokenSilently, isLoading } = useAuth0();
    const [isSynced, setIsSynced] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const hasSynced = useRef(false);

    useEffect(() => {
        const syncUser = async () => {
            if (!isAuthenticated || !user || hasSynced.current || isLoading) return;
            
            setIsSyncing(true);
            try {
                const token = await getAccessTokenSilently();
                await axios.post(`${import.meta.env.VITE_API_URL}/verify-user`, {
                    email: user.email,
                    name: user.name,
                    picture: user.picture
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                hasSynced.current = true;
                setIsSynced(true);
            } catch (error) {
                console.error("Failed to sync user:", error);
            } finally {
                setIsSyncing(false);
            }
        };

        syncUser();
    }, [isAuthenticated, user, getAccessTokenSilently, isLoading]);

    if (isSyncing) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-syncode-black gap-6">
                <div className="w-10 h-10 border-2 border-syncode-gray-700 border-t-syncode-white rounded-full animate-spin" />
                <div className="text-sm text-syncode-gray-300 font-mono tracking-widest uppercase">Syncing profile...</div>
            </div>
        );
    }

    return (
        <SyncContext.Provider value={{ isSynced }}>
            {children}
        </SyncContext.Provider>
    );
};

export const AuthProviderWithHistory = ({ children }: { children: React.ReactNode }) => {
    const domain = import.meta.env.VITE_AUTH0_DOMAIN;
    const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
    const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

    const navigate = useNavigate();

    const onRedirectCallback = (appState: any) => {
        navigate(appState?.returnTo || "/");
    };

    if (!(domain && clientId)) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-syncode-black text-syncode-white font-mono text-center p-5">
                <h1 className="text-2xl font-normal tracking-wide mb-4">Configuration Error</h1>
                <p className="text-sm text-syncode-gray-300 max-w-[500px] leading-relaxed">
                    Auth0 configuration is missing. Please ensure VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID 
                    environment variables are set in your .env file.
                </p>
            </div>
        );
    }

    return (
        <Auth0Provider
            domain={domain}
            clientId={clientId}
            authorizationParams={{
                redirect_uri: window.location.origin,
                audience: audience,
            }}
            onRedirectCallback={onRedirectCallback}
        >
            <UserSyncProvider>
                {children}
            </UserSyncProvider>
        </Auth0Provider>
    );
};
