import { useAuth0 } from "@auth0/auth0-react";
import { useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-syncode-black gap-6">
        <div className="w-10 h-10 border-2 border-syncode-gray-700 border-t-syncode-white rounded-full animate-spin" />
        <div className="text-sm text-syncode-gray-300 font-mono tracking-widest uppercase">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    loginWithRedirect({
      appState: { returnTo: location.pathname + location.search }
    });
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-syncode-black gap-6">
        <div className="w-10 h-10 border-2 border-syncode-gray-700 border-t-syncode-white rounded-full animate-spin" />
        <div className="text-sm text-syncode-gray-300 font-mono tracking-widest uppercase">Redirecting to login...</div>
      </div>
    );
  }

  return <>{children}</>;
};
