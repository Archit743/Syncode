import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Navbar } from "../components/Navbar";

interface Project {
  id: string;
  name: string;
  replId: string;
  language: string;
  createdAt: string;
}

export const Dashboard = () => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      if (!isAuthenticated) return;
      try {
        const token = await getAccessTokenSilently();

        // Fetch Projects (user sync now handled by ProtectedRoute)
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/projects`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setProjects(response.data);
      } catch (error) {
        console.error("Failed to fetch projects", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [isAuthenticated, getAccessTokenSilently]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh] text-syncode-gray-500 font-mono">
        Loading projects...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-syncode-black text-syncode-white font-mono">
      <Navbar />
      <div className="p-10 max-w-[1200px] mx-auto">
        <div className="flex justify-between items-center mb-10 border-b border-syncode-gray-700 pb-5">
          <h1 className="text-2xl font-normal tracking-widest uppercase m-0">My Projects</h1>
          <button 
            className="bg-white text-black border-none px-5 py-2.5 cursor-pointer uppercase font-mono text-xs tracking-wide transition-all duration-200 rounded hover:bg-syncode-gray-200 hover:-translate-y-0.5"
            onClick={() => navigate('/')}
          >
            + New Project
          </button>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5">
          {projects.map((project) => (
            <div 
              key={project.id} 
              className="bg-syncode-dark border border-syncode-gray-700 p-5 rounded-lg cursor-pointer transition-all duration-200 hover:border-white hover:-translate-y-0.5"
              onClick={() => navigate(`/coding/?replId=${project.replId}`)}
            >
              <h3 className="m-0 mb-2.5 text-base font-normal">{project.name}</h3>
              <div className="text-xs text-syncode-gray-500 flex justify-between">
                <span>{project.language}</span>
                <span>{new Date(project.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>

        {projects.length === 0 && (
          <div className="text-center text-syncode-gray-500 mt-10">
            No projects found. Create one to get started!
          </div>
        )}
      </div>
    </div>
  );
};
