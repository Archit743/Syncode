import { useAuth0 } from "@auth0/auth0-react";
import { Navbar } from "../components/Navbar";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { ConfirmDialog } from "../components/ConfirmDialog";

interface ProfileUser {
  id: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  website: string | null;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
}

interface PublicProject {
  id: string;
  name: string;
  replId: string;
  language: string;
  visibility: "public" | "private";
  forkedFromReplId?: string | null;
  accessRole?: "owner" | "collaborator";
  createdAt: string;
}

export const Profile = () => {
  const { user: authUser, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const { userId } = useParams();
  const [fetchedUser, setFetchedUser] = useState<ProfileUser | null>(null);
  const [fetchedProjects, setFetchedProjects] = useState<PublicProject[]>([]);
  const [myProfile, setMyProfile] = useState<ProfileUser | null>(null);
  const [formState, setFormState] = useState({ name: "", username: "", bio: "", website: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [forkingReplId, setForkingReplId] = useState<string | null>(null);
  const [projectToFork, setProjectToFork] = useState<PublicProject | null>(null);
  const [activeSection, setActiveSection] = useState<"profile" | "projects" | "edit">("profile");
  const [fetching, setFetching] = useState(false);
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;
  const isOwnProfile = !userId;

  useEffect(() => {
    const loadProfile = async () => {
      if (!isAuthenticated) return;
      setFetching(true);
      try {
        const token = await getAccessTokenSilently();
        const headers = { Authorization: `Bearer ${token}` };

        if (!userId) {
          const me = await axios.get(`${apiUrl}/me/profile`, { headers });
          setMyProfile(me.data);
          setFormState({
            name: me.data.name || "",
            username: me.data.username || "",
            bio: me.data.bio || "",
            website: me.data.website || ""
          });

          const myProjects = await axios.get(`${apiUrl}/projects`, { headers });
          setFetchedProjects(myProjects.data);
          return;
        }

        const targetId = userId;

        // Fetch User
        const userRes = await axios.get(`${apiUrl}/users/${targetId}`, { headers });
        setFetchedUser(userRes.data);

        // Fetch Projects
        const projRes = await axios.get(`${apiUrl}/users/${targetId}/projects`, { headers });
        setFetchedProjects(projRes.data);
      } catch (err) {
        console.error("Failed to fetch profile data", err);
      } finally {
        setFetching(false);
      }
    };

    loadProfile();
  }, [userId, isAuthenticated, getAccessTokenSilently, apiUrl]);

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

  const displayUser = userId ? fetchedUser : myProfile || authUser;

  if (!displayUser && userId) {
    return (
      <div className="flex justify-center items-center h-screen bg-syncode-black text-syncode-gray-500 font-mono">
        User not found
      </div>
    );
  }

  const handleProfileSave = async () => {
    setSavingProfile(true);
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.patch(
        `${apiUrl}/me/profile`,
        {
          name: formState.name,
          username: formState.username,
          bio: formState.bio,
          website: formState.website
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setMyProfile(response.data);
    } catch (error) {
      console.error("Failed to save profile", error);
      alert("Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleForkProject = async () => {
    if (!projectToFork) return;
    setForkingReplId(projectToFork.replId);
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.post(
        `${apiUrl}/projects/${projectToFork.replId}/fork`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setProjectToFork(null);
      navigate(`/coding/?replId=${response.data.replId}`);
    } catch (error: any) {
      console.error("Failed to fork project", error);
      alert(String(error?.response?.data || "Failed to fork project"));
    } finally {
      setForkingReplId(null);
    }
  };

  const renderProfileSection = () => (
    <div className="bg-syncode-dark border border-syncode-gray-700 p-6 rounded-xl flex flex-col gap-4 animate-fade-in">
      <div className="flex items-start gap-5">
        <img
          className="w-[120px] h-[120px] rounded-full border-2 border-white p-1"
          src={(displayUser as any)?.picture || (displayUser as any)?.avatarUrl || ""}
          alt={(displayUser as any)?.name || "profile"}
        />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-light tracking-[2px] uppercase m-0">{displayUser?.name}</h1>
          {(displayUser as any)?.username && (
            <div className="text-syncode-gray-400 text-sm mt-1">@{(displayUser as any)?.username}</div>
          )}
          <div className="text-syncode-gray-300 text-sm mt-3 break-all">{displayUser?.email}</div>
          {(displayUser as any)?.website && (
            <a
              className="text-syncode-gray-300 hover:text-white text-sm mt-2 inline-block"
              href={(displayUser as any)?.website}
              target="_blank"
              rel="noreferrer"
            >
              {(displayUser as any)?.website}
            </a>
          )}
        </div>
      </div>

      {(displayUser as any)?.bio && (
        <div className="bg-syncode-black border border-syncode-gray-700 rounded-lg p-4 text-sm text-syncode-gray-300 leading-relaxed">
          {(displayUser as any)?.bio}
        </div>
      )}

      <div className="text-[11px] uppercase tracking-wide text-syncode-gray-400">
        {userId ? "User" : "You"} · Joined {new Date((displayUser as any)?.createdAt || Date.now()).toLocaleDateString()}
      </div>
    </div>
  );

  const renderProjectsSection = () => (
    <div className="bg-syncode-dark border border-syncode-gray-700 rounded-xl p-5">
      <h2 className="text-lg font-normal border-b border-syncode-gray-700 pb-3 m-0">
        {isOwnProfile ? "REPOSITORIES" : "PUBLIC REPOSITORIES"} ({fetchedProjects.length})
      </h2>

      {fetchedProjects.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
          {fetchedProjects.map((p) => (
            <div
              key={p.id}
              className="bg-syncode-black border border-syncode-gray-700 p-4 rounded-lg transition-all duration-200 flex flex-col gap-3 hover:border-white"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="m-0 text-base font-medium text-white">{p.name}</h3>
                {p.visibility && (
                  <span className="text-[10px] uppercase tracking-wide border border-syncode-gray-700 px-2 py-1 rounded text-syncode-gray-300">
                    {p.visibility}
                  </span>
                )}
              </div>
              <div className="text-xs text-syncode-gray-500 flex justify-between uppercase tracking-wide">
                <span>{p.language}</span>
                <span>{new Date(p.createdAt).toLocaleDateString()}</span>
              </div>
              {p.forkedFromReplId && (
                <div className="text-[10px] uppercase tracking-wide text-syncode-gray-400">
                  Forked from {p.forkedFromReplId}
                </div>
              )}
              <div className="flex gap-2 mt-1">
                <button
                  className="bg-transparent border border-syncode-gray-600 text-syncode-gray-300 px-3 py-1.5 cursor-pointer uppercase font-mono text-[10px] tracking-wide transition-all duration-200 hover:border-white hover:text-white"
                  onClick={() => navigate(`/coding/?replId=${p.replId}`)}
                >
                  Open
                </button>
                {!isOwnProfile && (
                  <button
                    className="bg-transparent border border-syncode-gray-600 text-syncode-gray-300 px-3 py-1.5 cursor-pointer uppercase font-mono text-[10px] tracking-wide transition-all duration-200 hover:border-white hover:text-white"
                    onClick={() => setProjectToFork(p)}
                  >
                    Fork
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-syncode-gray-500 mt-4">No projects available.</div>
      )}
    </div>
  );

  const renderEditSection = () => (
    <div className="bg-syncode-dark border border-syncode-gray-700 p-5 rounded-xl flex flex-col gap-3">
      <h2 className="text-sm uppercase tracking-wider m-0">Edit Profile</h2>
      <input
        className="p-2.5 bg-syncode-black border border-syncode-gray-700 text-white font-mono text-sm focus:outline-none focus:border-white"
        placeholder="Name"
        value={formState.name}
        onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
      />
      <input
        className="p-2.5 bg-syncode-black border border-syncode-gray-700 text-white font-mono text-sm focus:outline-none focus:border-white"
        placeholder="Username"
        value={formState.username}
        onChange={(event) => setFormState((prev) => ({ ...prev, username: event.target.value }))}
      />
      <input
        className="p-2.5 bg-syncode-black border border-syncode-gray-700 text-white font-mono text-sm focus:outline-none focus:border-white"
        placeholder="Website"
        value={formState.website}
        onChange={(event) => setFormState((prev) => ({ ...prev, website: event.target.value }))}
      />
      <textarea
        className="p-2.5 min-h-[110px] bg-syncode-black border border-syncode-gray-700 text-white font-mono text-sm focus:outline-none focus:border-white"
        placeholder="About"
        value={formState.bio}
        onChange={(event) => setFormState((prev) => ({ ...prev, bio: event.target.value }))}
      />
      <div className="flex justify-end">
        <button
          className="bg-white text-black border-none px-4 py-2 cursor-pointer uppercase font-mono text-xs tracking-wide rounded disabled:opacity-50"
          onClick={handleProfileSave}
          disabled={savingProfile}
        >
          {savingProfile ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-syncode-black text-syncode-white font-mono">
      <Navbar />
      <div className="max-w-[1200px] mx-auto px-5 py-8 pb-12">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-syncode-gray-300 hover:text-white transition-colors duration-200 bg-transparent border-none cursor-pointer font-mono text-sm tracking-wide mb-6"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
        <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-6 items-start">
          <aside className="bg-syncode-dark border border-syncode-gray-700 rounded-xl p-3 flex flex-col gap-2">
            <button
              className={`text-left px-3 py-2.5 text-xs uppercase tracking-wide border cursor-pointer transition-all duration-200 ${
                activeSection === "profile"
                  ? "border-white text-white bg-syncode-black"
                  : "border-syncode-gray-700 text-syncode-gray-300 bg-transparent hover:border-white hover:text-white"
              }`}
              onClick={() => setActiveSection("profile")}
            >
              Profile
            </button>
            <button
              className={`text-left px-3 py-2.5 text-xs uppercase tracking-wide border cursor-pointer transition-all duration-200 ${
                activeSection === "projects"
                  ? "border-white text-white bg-syncode-black"
                  : "border-syncode-gray-700 text-syncode-gray-300 bg-transparent hover:border-white hover:text-white"
              }`}
              onClick={() => setActiveSection("projects")}
            >
              Projects
            </button>
            {isOwnProfile && (
              <button
                className={`text-left px-3 py-2.5 text-xs uppercase tracking-wide border cursor-pointer transition-all duration-200 ${
                  activeSection === "edit"
                    ? "border-white text-white bg-syncode-black"
                    : "border-syncode-gray-700 text-syncode-gray-300 bg-transparent hover:border-white hover:text-white"
                }`}
                onClick={() => setActiveSection("edit")}
              >
                Edit Profile
              </button>
            )}
          </aside>

          <main>
            {activeSection === "profile" && renderProfileSection()}
            {activeSection === "projects" && renderProjectsSection()}
            {activeSection === "edit" && isOwnProfile && renderEditSection()}
          </main>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(projectToFork)}
        title="Fork Project"
        message={`Create a fork from ${projectToFork?.name || "this project"} under your account?`}
        confirmText="Fork"
        cancelText="Cancel"
        busy={Boolean(projectToFork && forkingReplId === projectToFork.replId)}
        onCancel={() => {
          if (!forkingReplId) setProjectToFork(null);
        }}
        onConfirm={handleForkProject}
      />
    </div>
  );
};
