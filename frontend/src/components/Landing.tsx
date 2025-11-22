/** Import necessary libraries */
import axios from 'axios';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';

/** Constants */
const SLUG_WORKS = ["car", "dog", "computer", "person", "inside", "word", "for", "please", "to", "cool", "open", "source"];
const SERVICE_URL = "http://localhost:3001";

/** Animations */
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
`;

const glowFade = keyframes`
  0% {
    color: #ffffff;
    text-shadow: 0 0 15px rgba(255, 255, 255, 0.9), 0 0 25px rgba(255, 255, 255, 0.5);
  }
  50% {
    color: #ffffff;
    text-shadow: 0 0 15px rgba(255, 255, 255, 0.9), 0 0 25px rgba(255, 255, 255, 0.5);
  }
  100% {
    color: #999999;
    text-shadow: none;
  }
`;

/** Styled components */
const Container = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  background-color: #000000;
  overflow: hidden;
  box-sizing: border-box;
  position: relative;
`;

const LeftGrid = styled.div`
  margin-top: 20px;
  position: absolute;
  left: 60px;
  top: 50%;
  transform: translateY(-50%);
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 10px;
  z-index: 1;
  
  @media (max-width: 1024px) {
    display: none;
  }
`;

const GridIcon = styled.div`
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #626262ff;
  cursor: pointer;
  user-select: none;
  transition: none;

  &.glow {
    color: #ffffff;
    text-shadow: 0 0 15px rgba(255, 255, 255, 0.9), 0 0 25px rgba(255, 255, 255, 0.5);
    animation: ${glowFade} 0.5s ease-out forwards;
  }
`;

const BackgroundSphere = styled.div`
  position: absolute;
  top: 20%;
  right: calc(8% - 10px);
  width: 400px;
  height: 400px;
  opacity: 0.35;
  pointer-events: auto;
  perspective: 1000px;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  
  &:active {
    cursor: grabbing;
  }
  
  @media (max-width: 768px) {
    width: 250px;
    height: 250px;
    top: 10%;
    right: -5%;
  }
`;

const SphereWrapper = styled.div<{ $rotateX?: number; $rotateY?: number; $isAnimating?: boolean }>`
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transform: ${props => `rotateX(${props.$rotateX || 0}deg) rotateY(${props.$rotateY || 0}deg)`};
  transition: ${props => props.$isAnimating ? 'none' : 'transform 0.5s ease-out'};
`;

const SphereRing = styled.div<{ angle: number; isLongitude?: boolean }>`
  position: absolute;
  width: 100%;
  height: 100%;
  border: 1px solid white;
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform-origin: center;
  transform-style: preserve-3d;
  transform: ${props => props.isLongitude 
    ? `translate(-50%, -50%) rotateY(${props.angle}deg)`
    : `translate(-50%, -50%) rotateX(${props.angle}deg)`
  };
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 60px;
  border-bottom: 1px solid #1a1a1a;
  background-color: #000000;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(10px);
`;

const Logo = styled.div`
  font-size: 26px;
  font-weight: 300;
  color: white;
  letter-spacing: 4px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;

  &::before {
    content: '';
    display: block;
    width: 32px;
    height: 32px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath d='M50 10 L90 30 L90 70 L50 90 L10 70 L10 30 Z' fill='none' stroke='white' stroke-width='2'/%3E%3Cpath d='M50 10 L50 90 M10 30 L90 70 M10 70 L90 30' stroke='white' stroke-width='2'/%3E%3Ccircle cx='50' cy='50' r='8' fill='white'/%3E%3C/svg%3E");
    background-size: contain;
    background-repeat: no-repeat;
  }
`;

const Nav = styled.nav`
  display: flex;
  gap: 32px;
  align-items: center;
`;

const NavLink = styled.a`
  color: #999;
  text-decoration: none;
  font-size: 12px;
  font-weight: 400;
  transition: color 0.2s ease;
  cursor: pointer;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-family: 'Courier New', monospace;

  &:hover {
    color: white;
  }
`;

const SignInButton = styled.button`
  padding: 8px 20px;
  background-color: transparent;
  color: white;
  border: 1px solid #333;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-family: 'Courier New', monospace;

  &:hover {
    border-color: white;
    background-color: rgba(255, 255, 255, 0.05);
  }
`;

const MainContent = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 60px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  
  @media (max-width: 768px) {
    padding: 20px;
  }
`;

const Hero = styled.section`
  text-align: center;
  max-width: 800px;
  margin-bottom: 30px;
  animation: ${fadeIn} 0.8s ease-out;
  flex-shrink: 0;
`;

const Title = styled.h1`
  font-size: 56px;
  font-weight: 200;
  color: white;
  margin: 0 0 16px 0;
  letter-spacing: 8px;
  line-height: 1.1;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;

  span {
    background: linear-gradient(135deg, #ffffff 0%, #aaaaaa 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  @media (max-width: 768px) {
    font-size: 36px;
    letter-spacing: 4px;
  }
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: #999;
  margin: 0 0 20px 0;
  font-weight: 300;
  line-height: 1.8;
  letter-spacing: 1px;
  font-family: 'Courier New', monospace;
  
  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

const CreateSection = styled.section`
  width: 100%;
  max-width: 600px;
  background-color: #000000;
  border: 1px solid #ffffff;
  border-radius: 12px;
  padding: 32px;
  animation: ${fadeIn} 0.8s ease-out 0.2s backwards;
  box-shadow: 0 0 40px rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    padding: 24px;
  }
`;

const SectionTitle = styled.h2`
  font-size: 14px;
  font-weight: 400;
  color: white;
  margin: 0 0 20px 0;
  letter-spacing: 3px;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  font-size: 11px;
  font-weight: 500;
  color: #ffffff;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  font-family: 'Courier New', monospace;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const StyledInput = styled.input`
  width: 100%;
  padding: 14px 16px;
  font-size: 15px;
  border: 1px solid #ffffff;
  border-radius: 8px;
  background-color: #000000;
  color: white;
  transition: all 0.2s ease;
  box-sizing: border-box;
  font-family: 'Inter', 'Courier New', monospace;

  &:focus {
    outline: none;
    border-color: #ffffff;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1);
  }

  &::placeholder {
    color: #666;
  }
`;

const RandomButton = styled.button`
  position: absolute;
  right: 8px;
  padding: 6px 12px;
  background-color: #ffffff;
  color: #000000;
  border: none;
  border-radius: 6px;
  font-size: 9px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  font-family: 'Courier New', monospace;

  &:hover {
    background-color: #e0e0e0;
  }
`;

const LanguageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
`;

const LanguageOption = styled.div<{ selected: boolean }>`
  padding: 15px;
  background-color: #000000;
  border: 2px solid ${props => props.selected ? '#ffffff' : '#555555'};
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s ease;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #ffffff;
  position: relative;
  min-height: 60px;
  box-sizing: border-box;

  &:hover {
    border-color: ${props => props.selected ? '#ffffff' : '#888888'};
  }
  
  ${props => props.selected && `
    &::after {
      content: '✓';
      position: absolute;
      top: 8px;
      right: 8px;
      font-size: 14px;
      color: #ffffff;
      font-weight: bold;
    }
  `}
`;

const LanguageIcon = styled.div`
  font-size: 24px;
`;

const LanguageInfo = styled.div`
  flex: 1;
`;

const LanguageName = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: inherit;
  margin-bottom: 4px;
  letter-spacing: 1px;
  font-family: 'Courier New', monospace;
`;

const LanguageDesc = styled.div`
  font-size: 10px;
  color: inherit;
  opacity: 0.6;
  letter-spacing: 0.5px;
  font-family: 'Courier New', monospace;
`;

const CreateButton = styled.button`
  width: 100%;
  padding: 14px;
  font-size: 12px;
  font-weight: 400;
  background-color: white;
  color: #000000;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 20px;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-family: 'Courier New', monospace;

  &:hover:not(:disabled) {
    background-color: #f0f0f0;
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    animation: ${pulse} 1.5s ease-in-out infinite;
  }
`;

/** Helper function */
function getRandomSlug() {
    let slug = "";
    for (let i = 0; i < 3; i++) {
        slug += SLUG_WORKS[Math.floor(Math.random() * SLUG_WORKS.length)];
        if (i < 2) slug += "-";
    }
    return slug;
}

/** Component */
export const Landing = () => {
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
            // Apply momentum/velocity
            const dampening = 0.95;
            const newVelocity = {
              x: velocity.x * dampening,
              y: velocity.y * dampening
            };
            setVelocity(newVelocity);
            
            // If velocity is very small, switch to auto-rotation
            const isVelocityLow = Math.abs(newVelocity.x) < 0.1 && Math.abs(newVelocity.y) < 0.1;
            
            return {
              x: prev.x + (isVelocityLow ? 0 : newVelocity.x),
              y: prev.y + (isVelocityLow ? 1.5 : newVelocity.y) // Faster idle rotation
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

      setLoading(true);
      try {
        await axios.post(`${SERVICE_URL}/project`, { replId, language });
        navigate(`/coding/?replId=${replId}`);
      } catch (error) {
        console.error('Failed to create project:', error);
        alert("An error occurred. Please try again.");
        setLoading(false);
      }
    };

    // Sphere drag handlers
    const handleSphereMouseDown = (e: React.MouseEvent) => {
      e.preventDefault(); // Prevent text selection
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setLastRotation(sphereRotation);
      setVelocity({ x: 0, y: 0 }); // Reset velocity when starting drag
      setLastMousePos({ x: e.clientX, y: e.clientY, time: Date.now() });
    };

    const handleSphereMouseMove = (e: React.MouseEvent) => {
      if (!isDragging) return;
      
      e.preventDefault(); // Prevent text selection while dragging
      
      const currentTime = Date.now();
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      // Calculate velocity based on movement since last position
      const timeDiff = currentTime - lastMousePos.time;
      if (timeDiff > 0) {
        const velX = (e.clientY - lastMousePos.y) / timeDiff * -10; // Reduced from -25 to -10
        const velY = (e.clientX - lastMousePos.x) / timeDiff * 10; // Reduced from 25 to 10
        setVelocity({ x: velX, y: velY });
      }
      
      setLastMousePos({ x: e.clientX, y: e.clientY, time: currentTime });
      
      setSphereRotation({
        x: lastRotation.x - deltaY * 0.3, // Reduced sensitivity from 0.5 to 0.3
        y: lastRotation.y + deltaX * 0.3  // Reduced sensitivity from 0.5 to 0.3
      });
    };

    const handleSphereMouseUp = () => {
      setIsDragging(false);
      // Velocity is already set from mouse move, will be applied in useEffect
    };

    return (
      <Container>
        {/* Left Interactive Grid */}
        <LeftGrid>
          {[...Array(120)].map((_, i) => {
            return (
              <GridIcon 
                key={i}
                onMouseEnter={(e) => {
                  e.currentTarget.classList.add('glow');
                }}
                onAnimationEnd={(e) => {
                  e.currentTarget.classList.remove('glow');
                }}
              >
                +
              </GridIcon>
            );
          })}
        </LeftGrid>

        {/* Background 3D Sphere */}
        <BackgroundSphere
          onMouseDown={handleSphereMouseDown}
          onMouseMove={handleSphereMouseMove}
          onMouseUp={handleSphereMouseUp}
          onMouseLeave={handleSphereMouseUp}
        >
          <SphereWrapper 
            $rotateX={sphereRotation.x} 
            $rotateY={sphereRotation.y}
            $isAnimating={isDragging}
          >
            {/* Latitude rings */}
            {[0, 20, 40, 60, 80, 100, 120, 140, 160].map((angle) => (
              <SphereRing key={`lat-${angle}`} angle={angle} isLongitude={false} />
            ))}
            
            {/* Longitude rings */}
            {[0, 20, 40, 60, 80, 100, 120, 140, 160].map((angle) => (
              <SphereRing key={`lon-${angle}`} angle={angle} isLongitude={true} />
            ))}
          </SphereWrapper>
        </BackgroundSphere>

        {/* Header */}
        <Header>
          <Logo>Syncode</Logo>
          <Nav>
            <NavLink>Templates</NavLink>
            <NavLink>Community</NavLink>
            <NavLink>Docs</NavLink>
            <SignInButton>Sign In</SignInButton>
          </Nav>
        </Header>

        {/* Main Content */}
        <MainContent>
          {/* Hero Section */}
          <Hero>
            <Title>
              <span>Code anywhere,</span><br />
              <span>anytime.</span>
            </Title>
            <Subtitle>
              A powerful cloud IDE for modern developers.<br />
              Build, collaborate, and deploy without limits.
            </Subtitle>
          </Hero>

          {/* Create Section */}
          <CreateSection>
            <SectionTitle>Create a new project</SectionTitle>
            
            <FormGroup>
              <Label htmlFor="replId">Project ID</Label>
              <InputWrapper>
                <StyledInput
                  id="replId"
                  type="text"
                  value={replId}
                  onChange={(e) => setReplId(e.target.value)}
                  placeholder="my-awesome-project"
                  disabled={loading}
                />
                <RandomButton onClick={handleRandomSlug} disabled={loading}>
                  Random
                </RandomButton>
              </InputWrapper>
            </FormGroup>

            <FormGroup>
              <Label>Choose Language</Label>
              <LanguageGrid>
                {languages.map((lang) => (
                  <LanguageOption
                    key={lang.id}
                    selected={language === lang.id}
                    onClick={() => !loading && setLanguage(lang.id)}
                  >
                    <LanguageIcon>{lang.icon}</LanguageIcon>
                    <LanguageInfo>
                      <LanguageName>{lang.name}</LanguageName>
                      <LanguageDesc>{lang.desc}</LanguageDesc>
                    </LanguageInfo>
                  </LanguageOption>
                ))}
              </LanguageGrid>
            </FormGroup>

            <CreateButton onClick={handleCreateProject} disabled={loading}>
              {loading ? "Creating project..." : "Create Project"}
            </CreateButton>
          </CreateSection>
        </MainContent>
      </Container>
    );
}
