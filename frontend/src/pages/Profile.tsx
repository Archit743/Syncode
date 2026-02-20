import { useAuth0 } from "@auth0/auth0-react";
import { Navbar } from "../components/Navbar";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

export const Profile = () => {
  const { user: authUser, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const { userId } = useParams();
  const [fetchedUser, setFetchedUser] = useState<any>(null);
  const [fetchedProjects, setFetchedProjects] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId || !isAuthenticated) return;
      setFetching(true);
      try {
        const token = await getAccessTokenSilently();
        const targetId = userId;

        // Fetch User
        const userRes = await axios.get(`${import.meta.env.VITE_API_URL}/users/${targetId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFetchedUser(userRes.data);

        // Fetch Projects
        const projRes = await axios.get(`${import.meta.env.VITE_API_URL}/users/${targetId}/projects`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFetchedProjects(projRes.data);
      } catch (err) {
        console.error("Failed to fetch profile data", err);
      } finally {
        setFetching(false);
      }
    };

    if (userId) {
      loadProfile();
    }
  }, [userId, isAuthenticated, getAccessTokenSilently]);

  if (isLoading || fetching) {
    return (
      <div className="flex justify-center items-center h-screen bg-syncode-black text-syncode-gray-500 font-mono">
        Loading...
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center h-screen bg-syncode-black text-syncode-gray-500 font-mono">
        Please log in
      </div>
    );
  }

  const displayUser = userId ? fetchedUser : authUser;

  if (!displayUser && userId) {
    return (
      <div className="flex justify-center items-center h-screen bg-syncode-black text-syncode-gray-500 font-mono">
        User not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-syncode-black text-syncode-white font-mono">
      <Navbar />
      <div className="max-w-[800px] mx-auto px-5 py-15 flex flex-col items-center gap-10">
        <button
          onClick={() => navigate(-1)}
          className="self-start flex items-center gap-2 text-syncode-gray-300 hover:text-white transition-colors duration-200 bg-transparent border-none cursor-pointer font-mono text-sm tracking-wide"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
        <div className="bg-syncode-dark border border-syncode-gray-700 p-10 rounded-xl flex flex-col items-center gap-6 animate-fade-in">
          <img 
            className="w-[120px] h-[120px] rounded-full border-2 border-white p-1" 
            src={displayUser?.picture || displayUser?.avatarUrl} 
            alt={displayUser?.name} 
          />
          <h1 className="text-3xl font-light tracking-[4px] uppercase m-0">{displayUser?.name}</h1>
          <div className="flex flex-col items-center gap-2 text-syncode-gray-300 text-sm tracking-wide">
            <span>{displayUser?.email}</span>
          </div>
          <span className="bg-syncode-gray-800 text-white px-3 py-1.5 rounded text-[10px] uppercase tracking-widest border border-syncode-gray-700 mt-4">
            {userId ? 'User' : 'You'}
          </span>
        </div>

        {userId && fetchedProjects.length > 0 && (
          <div className="mt-15 w-full">
            <h2 className="text-xl font-normal border-b border-syncode-gray-700 pb-4">
              PROJECTS ({fetchedProjects.length})
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6 mt-5">
              {fetchedProjects.map((p: any) => (
                <div 
                  key={p.id} 
                  className="bg-syncode-dark border border-syncode-gray-700 p-6 rounded-lg cursor-pointer transition-all duration-200 flex flex-col gap-3 hover:border-white hover:-translate-y-1"
                  onClick={() => navigate(`/coding/?replId=${p.replId}`)}
                >
                  <h3 className="m-0 text-lg font-medium text-white">{p.name}</h3>
                  <div className="text-xs text-syncode-gray-500 flex justify-between uppercase tracking-wide">
                    <span>{p.language}</span>
                    <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
