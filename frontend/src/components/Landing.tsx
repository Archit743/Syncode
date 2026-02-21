import axios from 'axios';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from "@auth0/auth0-react";
import { Navbar } from "../components/Navbar";

const SLUG_WORKS = ["car", "dog", "computer", "person", "inside", "word", "for", "please", "to", "cool", "open", "source"];
const SERVICE_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";

function getRandomSlug() {
  let slug = "";
  for (let i = 0; i < 3; i++) {
    slug += SLUG_WORKS[Math.floor(Math.random() * SLUG_WORKS.length)];
    if (i < 2) slug += "-";
  }
  return slug;
}

export const Landing = () => {
  const { isAuthenticated, getAccessTokenSilently, loginWithRedirect } = useAuth0();
  const [language, setLanguage] = useState("node-js");
  const [replId, setReplId] = useState(getRandomSlug());
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Sphere rotation state
  const [sphereRotation, setSphereRotation] = useState({ x: 20, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastRotation, setLastRotation] = useState({ x: 20, y: 0 });
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0, time: 0 });

  // Auto-rotate sphere when not dragging
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isDragging) {
        setSphereRotation(prev => {
          const dampening = 0.95;
          const newVelocity = {
            x: velocity.x * dampening,
            y: velocity.y * dampening
          };
          setVelocity(newVelocity);
          const isVelocityLow = Math.abs(newVelocity.x) < 0.1 && Math.abs(newVelocity.y) < 0.1;
          return {
            x: prev.x + (isVelocityLow ? 0 : newVelocity.x),
            y: prev.y + (isVelocityLow ? 1.5 : newVelocity.y)
          };
        });
      }
    }, 50);
    return () => clearInterval(interval);
  }, [isDragging, velocity]);

  const languages = [
    { id: 'node-js', name: 'Node.js', icon: '📗', desc: 'JavaScript runtime' },
    { id: 'python', name: 'Python', icon: '🐍', desc: 'Popular scripting language' }
  ];

  const handleRandomSlug = () => {
    setReplId(getRandomSlug());
  };

  const handleCreateProject = async () => {
    if (!replId.trim()) {
      alert("Please enter a project ID");
      return;
    }

    if (!isAuthenticated) {
      loginWithRedirect({
        appState: { returnTo: window.location.pathname }
      });
      return;
    }

    setLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${SERVICE_URL}/projects`, { replId, language, name: replId }, { headers });
      navigate(`/coding/?replId=${replId}`);
    } catch (error: any) {
      console.error('Failed to create project:', error);
      const message = error?.response?.data || error?.message || "Project creation failed. Please try again.";
      alert(String(message));
      setLoading(false);
    }
  };

  const handleSphereMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setLastRotation(sphereRotation);
    setVelocity({ x: 0, y: 0 });
    setLastMousePos({ x: e.clientX, y: e.clientY, time: Date.now() });
  };

  const handleSphereMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const currentTime = Date.now();
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    const timeDiff = currentTime - lastMousePos.time;
    if (timeDiff > 0) {
      const velX = (e.clientY - lastMousePos.y) / timeDiff * -10;
      const velY = (e.clientX - lastMousePos.x) / timeDiff * 10;
      setVelocity({ x: velX, y: velY });
    }
    setLastMousePos({ x: e.clientX, y: e.clientY, time: currentTime });
    setSphereRotation({
      x: lastRotation.x - deltaY * 0.3,
      y: lastRotation.y + deltaX * 0.3
    });
  };

  const handleSphereMouseUp = () => {
    setIsDragging(false);
  };

  const sphereAngles = [0, 20, 40, 60, 80, 100, 120, 140, 160];

  return (
    <div className="h-screen w-screen flex flex-col bg-syncode-black overflow-hidden box-border relative">
      {/* Left Grid - Hidden on smaller screens */}
      <div className="mt-5 absolute left-[60px] top-1/2 -translate-y-1/2 grid grid-cols-8 gap-2.5 z-[1] max-lg:hidden">
        {[...Array(120)].map((_, i) => (
          <div
            key={i}
            className="w-7 h-7 flex items-center justify-center text-base text-syncode-gray-600 cursor-pointer select-none hover:animate-grid-glow"
          >
            +
          </div>
        ))}
      </div>

      {/* Background Sphere */}
      <div
        className="absolute top-[20%] right-[calc(8%-10px)] w-[400px] h-[400px] opacity-35 cursor-grab select-none max-md:w-[250px] max-md:h-[250px] max-md:top-[10%] max-md:right-[-5%] active:cursor-grabbing"
        style={{ perspective: '1000px' }}
        onMouseDown={handleSphereMouseDown}
        onMouseMove={handleSphereMouseMove}
        onMouseUp={handleSphereMouseUp}
        onMouseLeave={handleSphereMouseUp}
      >
        <div
          className="w-full h-full relative"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${sphereRotation.x}deg) rotateY(${sphereRotation.y}deg)`,
            transition: isDragging ? 'none' : 'transform 0.5s ease-out'
          }}
        >
          {sphereAngles.map((angle) => (
            <div
              key={`lat-${angle}`}
              className="absolute w-full h-full border border-white rounded-full top-1/2 left-1/2"
              style={{
                transformOrigin: 'center',
                transformStyle: 'preserve-3d',
                transform: `translate(-50%, -50%) rotateX(${angle}deg)`
              }}
            />
          ))}
          {sphereAngles.map((angle) => (
            <div
              key={`lon-${angle}`}
              className="absolute w-full h-full border border-white rounded-full top-1/2 left-1/2"
              style={{
                transformOrigin: 'center',
                transformStyle: 'preserve-3d',
                transform: `translate(-50%, -50%) rotateY(${angle}deg)`
              }}
            />
          ))}
        </div>
      </div>

      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center px-15 py-10 max-w-[1400px] mx-auto w-full max-md:p-5">
        <section className="text-center max-w-[800px] mb-8 animate-fade-in shrink-0">
          <h1 className="text-[56px] font-extralight text-white mb-4 tracking-[8px] leading-tight font-mono uppercase max-md:text-4xl max-md:tracking-[4px]">
            <span className="bg-gradient-to-br from-white to-syncode-gray-400 bg-clip-text text-transparent">Code anywhere,</span><br />
            <span className="bg-gradient-to-br from-white to-syncode-gray-400 bg-clip-text text-transparent">anytime.</span>
          </h1>
          <p className="text-base text-syncode-gray-300 mb-5 font-light leading-relaxed tracking-wide font-mono max-md:text-sm">
            A powerful cloud IDE for modern developers.<br />
            Build, collaborate, and deploy without limits.
          </p>
        </section>

        <section className="w-full max-w-[600px] bg-syncode-black border border-white rounded-xl p-8 shadow-[0_0_40px_rgba(255,255,255,0.1)] shrink-0 mb-5 animate-fade-in max-md:p-6">
          <h2 className="text-sm font-normal text-white mb-5 tracking-[3px] font-mono uppercase">Create a new project</h2>

          <div className="mb-5">
            <label htmlFor="replId" className="block text-[11px] font-medium text-white mb-2 uppercase tracking-[1.5px] font-mono">
              Project ID
            </label>
            <div className="relative flex items-center">
              <input
                id="replId"
                type="text"
                value={replId}
                onChange={(e) => setReplId(e.target.value)}
                placeholder="my-awesome-project"
                disabled={loading}
                className="w-full px-4 py-3.5 text-[15px] border border-white rounded-lg bg-syncode-black text-white transition-all duration-200 box-border font-sans focus:outline-none focus:ring-2 focus:ring-white/10 placeholder:text-syncode-gray-500 disabled:opacity-50"
              />
              <button
                onClick={handleRandomSlug}
                disabled={loading}
                className="absolute right-2 px-3 py-1.5 bg-transparent text-white border border-white rounded-md text-[9px] font-medium cursor-pointer transition-all duration-300 uppercase tracking-[1.5px] font-mono hover:bg-white hover:text-black hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] active:scale-95 disabled:opacity-50"
              >
                Random
              </button>
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-[11px] font-medium text-white mb-2 uppercase tracking-[1.5px] font-mono">
              Choose Language
            </label>
            <div className="grid grid-cols-2 gap-3">
              {languages.map((lang) => (
                <div
                  key={lang.id}
                  className={`p-4 bg-syncode-black border-2 rounded-lg cursor-pointer transition-colors duration-200 flex items-center gap-3 text-white relative min-h-[60px] box-border ${
                    language === lang.id 
                      ? 'border-white' 
                      : 'border-syncode-gray-600 hover:border-syncode-gray-400'
                  }`}
                  onClick={() => !loading && setLanguage(lang.id)}
                >
                  <div className="text-2xl">{lang.icon}</div>
                  <div className="flex-1">
                    <div className="text-[13px] font-normal mb-1 tracking-wide font-mono">{lang.name}</div>
                    <div className="text-[10px] opacity-60 tracking-wide font-mono">{lang.desc}</div>
                  </div>
                  {language === lang.id && (
                    <div className="absolute top-2 right-2 text-sm font-bold">✓</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreateProject}
            disabled={loading}
            className={`w-full py-3.5 text-xs font-normal bg-transparent text-white border border-white rounded-lg cursor-pointer transition-all duration-200 mt-5 tracking-widest uppercase font-mono hover:bg-white hover:text-black active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${loading ? 'animate-pulse' : ''}`}
          >
            {loading ? "Creating project..." : "Create Project"}
          </button>
        </section>
      </main>
    </div>
  );
}
