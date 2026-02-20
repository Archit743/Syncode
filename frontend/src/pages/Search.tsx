import { useState } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from "../components/Navbar";

export const Search = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const { getAccessTokenSilently } = useAuth0();
    const navigate = useNavigate();

    const handleSearch = async () => {
        try {
            const token = await getAccessTokenSilently();
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/users/search?q=${query}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setResults(response.data);
        } catch (error) {
            console.error("Search failed", error);
        }
    };

    return (
        <div className="min-h-screen bg-syncode-black text-syncode-white font-mono">
            <Navbar />
            <div className="p-10 max-w-[800px] mx-auto">
                <h1 className="text-2xl font-normal tracking-widest uppercase mb-5">Global User Search</h1>
                <div className="flex gap-2.5 mb-8">
                    <input
                        className="p-2.5 w-[300px] bg-syncode-dark border border-syncode-gray-700 text-white font-mono focus:outline-none focus:border-white"
                        placeholder="Search users by name or email..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button 
                        className="p-2.5 bg-syncode-gray-700 text-white border-none cursor-pointer hover:bg-syncode-gray-600 transition-colors"
                        onClick={handleSearch}
                    >
                        Search
                    </button>
                </div>

                <div>
                    {results.map(user => (
                        <div 
                            key={user.id} 
                            className="bg-syncode-dark border border-syncode-gray-700 p-5 mb-2.5 flex items-center gap-4 cursor-pointer hover:border-white transition-colors"
                            onClick={() => navigate(`/profile/${user.id}`)}
                        >
                            <img 
                                className="w-10 h-10 rounded-full" 
                                src={user.avatarUrl} 
                                alt={user.name}
                            />
                            <div>
                                <h3 className="m-0 mb-1 text-base font-normal">{user.name}</h3>
                                <p className="m-0 text-syncode-gray-500 text-xs">{user.email}</p>
                            </div>
                        </div>
                    ))}
                    {results.length === 0 && query && (
                        <div className="text-syncode-gray-500 mt-5">No users found.</div>
                    )}
                </div>
            </div>
        </div>
    );
};
