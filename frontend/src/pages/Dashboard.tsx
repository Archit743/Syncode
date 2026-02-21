import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { ConfirmDialog } from "../components/ConfirmDialog";

interface Project {
  id: string;
  name: string;
  replId: string;
  language: string;
  visibility: "public" | "private";
  accessRole: "owner" | "collaborator";
  collaborators: {
    id: string;
    userId: string;
    user: {
      id: string;
      name: string | null;
      email: string;
      avatarUrl: string | null;
    };
  }[];
  createdAt: string;
}

const PROJECT_CACHE_KEY = "dashboard-projects-cache-v1";

interface ProjectsCache {
  timestamp: number;
  projects: Project[];
}

export const Dashboard = () => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibilityUpdating, setVisibilityUpdating] = useState<string | null>(null);
  const [collaboratorBusy, setCollaboratorBusy] = useState<string | null>(null);
  const [collaboratorInput, setCollaboratorInput] = useState<Record<string, string>>({});
  const [deleteBusy, setDeleteBusy] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "public" | "private">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "owner" | "collaborator">("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const navigate = useNavigate();

  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const cached = sessionStorage.getItem(PROJECT_CACHE_KEY);
    if (cached) {
      try {
        const parsed: ProjectsCache = JSON.parse(cached);
        if (Array.isArray(parsed.projects)) {
          setProjects(parsed.projects);
          setLoading(false);
        }
      } catch {
        // ignore invalid cache
      }
    }

    const fetchProjects = async () => {
      if (!isAuthenticated) return;
      try {
        const token = await getAccessTokenSilently();

        // Fetch Projects (user sync now handled by ProtectedRoute)
        const response = await axios.get(`${apiUrl}/projects`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setProjects(response.data);
        sessionStorage.setItem(
          PROJECT_CACHE_KEY,
          JSON.stringify({ timestamp: Date.now(), projects: response.data } satisfies ProjectsCache)
        );
      } catch (error) {
        console.error("Failed to fetch projects", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [isAuthenticated, getAccessTokenSilently, apiUrl]);

  const updateProjectInState = (updated: Project) => {
    setProjects((prev) => {
      const next = prev.map((project) =>
        project.id === updated.id
          ? { ...updated, accessRole: updated.accessRole ?? project.accessRole }
          : project
      );
      sessionStorage.setItem(PROJECT_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), projects: next } satisfies ProjectsCache));
      return next;
    });
  };

  const removeProjectFromState = (projectId: string) => {
    setProjects((prev) => {
      const next = prev.filter((project) => project.id !== projectId);
      sessionStorage.setItem(PROJECT_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), projects: next } satisfies ProjectsCache));
      return next;
    });
  };

  const handleToggleVisibility = async (project: Project, event: React.MouseEvent) => {
    event.stopPropagation();
    if (visibilityUpdating) return;

    const nextVisibility = project.visibility === "private" ? "public" : "private";
    setVisibilityUpdating(project.id);
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.patch(
        `${apiUrl}/projects/${project.replId}/visibility`,
        { visibility: nextVisibility },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setProjects((prev) =>
        prev.map((item) => (item.id === project.id ? { ...item, visibility: response.data.visibility } : item))
      );
    } catch (error) {
      console.error("Failed to update visibility", error);
      alert("Could not update visibility.");
    } finally {
      setVisibilityUpdating(null);
    }
  };

  const handleAddCollaborator = async (project: Project, event: React.MouseEvent) => {
    event.stopPropagation();
    const email = collaboratorInput[project.id]?.trim();
    if (!email) {
      alert("Enter collaborator email");
      return;
    }

    setCollaboratorBusy(project.id);
    try {
      const token = await getAccessTokenSilently();
      await axios.post(
        `${apiUrl}/projects/${project.replId}/collaborators`,
        { email },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      alert("Invitation sent!");
      setCollaboratorInput((prev) => ({ ...prev, [project.id]: "" }));
    } catch (error: any) {
      console.error("Failed to send invitation", error);
      const msg = error?.response?.data || "Could not send invitation.";
      alert(msg);
    } finally {
      setCollaboratorBusy(null);
    }
  };

  const handleRemoveCollaborator = async (project: Project, collaboratorUserId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setCollaboratorBusy(project.id);
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.delete(
        `${apiUrl}/projects/${project.replId}/collaborators/${collaboratorUserId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      updateProjectInState(response.data);
    } catch (error) {
      console.error("Failed to remove collaborator", error);
      alert("Could not remove collaborator.");
    } finally {
      setCollaboratorBusy(null);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    setDeleteBusy(projectToDelete.id);
    try {
      const token = await getAccessTokenSilently();
      await axios.delete(`${apiUrl}/projects/${projectToDelete.replId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      removeProjectFromState(projectToDelete.id);
      setProjectToDelete(null);
    } catch (error) {
      console.error("Failed to delete project", error);
      alert("Could not delete project.");
    } finally {
      setDeleteBusy(null);
    }
  };

  const filteredAndSortedProjects = useMemo(() => {
    const filtered = projects.filter((project) => {
      if (visibilityFilter !== "all" && project.visibility !== visibilityFilter) return false;
      if (roleFilter !== "all" && project.accessRole !== roleFilter) return false;
      if (languageFilter !== "all" && project.language !== languageFilter) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [projects, visibilityFilter, roleFilter, languageFilter, sortBy]);

  const languageOptions = useMemo(() => {
    const allLanguages = new Set(projects.map((project) => project.language));
    return ["all", ...Array.from(allLanguages)];
  }, [projects]);

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

        <div className="flex flex-wrap gap-3 mb-6">
          <select
            className="bg-syncode-dark border border-syncode-gray-700 text-white px-3 py-2 text-xs uppercase tracking-wide font-mono rounded"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as "newest" | "oldest" | "name")}
          >
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="name">Sort: Name</option>
          </select>
          <select
            className="bg-syncode-dark border border-syncode-gray-700 text-white px-3 py-2 text-xs uppercase tracking-wide font-mono rounded"
            value={visibilityFilter}
            onChange={(event) => setVisibilityFilter(event.target.value as "all" | "public" | "private")}
          >
            <option value="all">Visibility: All</option>
            <option value="public">Visibility: Public</option>
            <option value="private">Visibility: Private</option>
          </select>
          <select
            className="bg-syncode-dark border border-syncode-gray-700 text-white px-3 py-2 text-xs uppercase tracking-wide font-mono rounded"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as "all" | "owner" | "collaborator")}
          >
            <option value="all">Role: All</option>
            <option value="owner">Role: Owner</option>
            <option value="collaborator">Role: Collaborator</option>
          </select>
          <select
            className="bg-syncode-dark border border-syncode-gray-700 text-white px-3 py-2 text-xs uppercase tracking-wide font-mono rounded"
            value={languageFilter}
            onChange={(event) => setLanguageFilter(event.target.value)}
          >
            {languageOptions.map((language) => (
              <option key={language} value={language}>
                Language: {language}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5">
          {filteredAndSortedProjects.map((project) => (
            <div
              key={project.id}
              className="bg-syncode-dark border border-syncode-gray-700 p-5 rounded-lg cursor-pointer transition-all duration-200 hover:border-white hover:-translate-y-0.5"
              onClick={() => navigate(`/coding/?replId=${project.replId}`)}
            >
              <div className="flex items-center justify-between mb-2.5 gap-2">
                <h3 className="m-0 text-base font-normal">{project.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider border border-syncode-gray-600 px-2 py-1 rounded">
                    {project.visibility}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider border border-syncode-gray-600 px-2 py-1 rounded">
                    {project.accessRole}
                  </span>
                </div>
              </div>
              <div className="text-xs text-syncode-gray-500 flex justify-between mb-3">
                <span>{project.language}</span>
                <span>{new Date(project.createdAt).toLocaleDateString()}</span>
              </div>

              {project.accessRole === "owner" && (
                <>
                  <div className="flex gap-2 mb-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="bg-transparent border border-syncode-gray-600 text-syncode-gray-300 px-2 py-1 cursor-pointer uppercase font-mono text-[10px] tracking-wide transition-all duration-200 hover:border-white hover:text-white"
                      onClick={(e) => handleToggleVisibility(project, e)}
                      disabled={visibilityUpdating === project.id}
                    >
                      {visibilityUpdating === project.id
                        ? "Updating..."
                        : project.visibility === "private"
                          ? "Make Public"
                          : "Make Private"}
                    </button>
                    <button
                      className="bg-transparent border border-syncode-gray-600 text-syncode-gray-300 px-2 py-1 cursor-pointer uppercase font-mono text-[10px] tracking-wide transition-all duration-200 hover:border-white hover:text-white"
                      onClick={(event) => {
                        event.stopPropagation();
                        setProjectToDelete(project);
                      }}
                    >
                      Delete
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3" onClick={(e) => e.stopPropagation()}>
                    {project.collaborators.length === 0 && (
                      <span className="text-[10px] text-syncode-gray-500 uppercase tracking-wide">No collaborators</span>
                    )}
                    {project.collaborators.map((collaborator) => (
                      <div key={collaborator.id} className="flex items-center gap-1 border border-syncode-gray-700 px-2 py-1 rounded text-[10px] uppercase tracking-wide">
                        <span>{collaborator.user.name || collaborator.user.email}</span>
                        <button
                          className="bg-transparent border-none text-syncode-gray-400 cursor-pointer px-1"
                          onClick={(e) => handleRemoveCollaborator(project, collaborator.userId, e)}
                          disabled={collaboratorBusy === project.id}
                          title="Remove collaborator"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      value={collaboratorInput[project.id] || ""}
                      onChange={(e) => setCollaboratorInput((prev) => ({ ...prev, [project.id]: e.target.value }))}
                      placeholder="Collaborator email"
                      className="flex-1 p-2 bg-syncode-black border border-syncode-gray-700 text-white font-mono text-[11px] rounded focus:outline-none focus:border-white"
                    />
                    <button
                      className="bg-transparent border border-syncode-gray-600 text-syncode-gray-300 px-2 py-1 cursor-pointer uppercase font-mono text-[10px] tracking-wide transition-all duration-200 hover:border-white hover:text-white"
                      onClick={(e) => handleAddCollaborator(project, e)}
                      disabled={collaboratorBusy === project.id}
                    >
                      {collaboratorBusy === project.id ? "Sending..." : "Invite"}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {filteredAndSortedProjects.length === 0 && (
          <div className="text-center text-syncode-gray-500 mt-10">
            No projects match current filters.
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(projectToDelete)}
        title="Delete Project"
        message={`Are you sure you want to delete ${projectToDelete?.name || "this project"}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        danger
        busy={Boolean(projectToDelete && deleteBusy === projectToDelete.id)}
        onCancel={() => {
          if (!deleteBusy) setProjectToDelete(null);
        }}
        onConfirm={handleDeleteProject}
      />
    </div>
  );
};
