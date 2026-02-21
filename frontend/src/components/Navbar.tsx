import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Notifications } from './Notifications';

export const Navbar = () => {
    const { user, logout, isAuthenticated, loginWithRedirect } = useAuth0();
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <nav className="flex justify-between items-center px-10 py-5 bg-black/80 backdrop-blur-sm border-b border-syncode-gray-700 sticky top-0 z-[100]">
            <div
                className="text-xl font-normal text-white tracking-[4px] font-mono uppercase cursor-pointer flex items-center gap-3"
                onClick={() => navigate('/')}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-90">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Syncode
            </div>

            <div className="flex gap-8 items-center">
                {isAuthenticated && (
                    <>
                        <a
                            className={`no-underline text-xs font-normal cursor-pointer tracking-widest uppercase font-mono transition-colors duration-200 hover:text-white ${location.pathname === '/dashboard' ? 'text-white' : 'text-syncode-gray-300'
                                }`}
                            onClick={() => navigate('/dashboard')}
                        >
                            Dashboard
                        </a>
                        <a
                            className={`no-underline text-xs font-normal cursor-pointer tracking-widest uppercase font-mono transition-colors duration-200 hover:text-white ${location.pathname === '/search' ? 'text-white' : 'text-syncode-gray-300'
                                }`}
                            onClick={() => navigate('/search')}
                        >
                            Search
                        </a>
                    </>
                )}
            </div>

            <div className="flex items-center gap-4">
                {isAuthenticated ? (
                    <>
                        {/* Notifications */}
                        <Notifications />

                        <img
                            className="w-8 h-8 rounded-full border border-syncode-gray-700 cursor-pointer transition-colors duration-200 hover:border-white"
                            src={user?.picture}
                            alt={user?.name}
                            onClick={() => navigate('/profile')}
                            title="View Profile"
                        />
                        <button
                            className="bg-transparent border border-syncode-gray-700 text-syncode-gray-300 px-3 py-1.5 cursor-pointer uppercase font-mono text-[10px] tracking-wide transition-all duration-200 hover:border-white hover:text-white"
                            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                        >
                            Logout
                        </button>
                    </>
                ) : (
                    <button
                        className="bg-syncode-dark text-syncode-gray-200 border border-syncode-gray-700 px-4 py-2 rounded-md cursor-pointer text-xs uppercase tracking-widest font-mono transition-all duration-300 hover:border-syncode-gray-400 hover:text-white hover:brightness-110"
                        onClick={() => loginWithRedirect()}
                    >
                        Login
                    </button>
                )}
            </div>
        </nav>
    );
};
