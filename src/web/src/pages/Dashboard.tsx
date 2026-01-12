import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Guild {
    id: string;
    name: string;
    icon: string;
    isAdmin: boolean;
    botInGuild: boolean;
}

export default function Dashboard() {
    const [guilds, setGuilds] = useState<Guild[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchGuilds = async () => {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch('/api/guilds', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                if (res.status === 401) return navigate('/login');
                const data = await res.json();
                if (Array.isArray(data)) {
                    setGuilds(data);
                } else {
                    console.error('Invalid guilds data:', data);
                    setGuilds([]);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchGuilds();
    }, [navigate]);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
            <nav style={{ 
                borderBottom: '1px solid rgba(255,255,255,0.05)', 
                padding: '1rem 0', 
                background: 'rgba(15, 23, 42, 0.8)', 
                backdropFilter: 'blur(8px)',
                position: 'sticky',
                top: 0,
                zIndex: 10
            }}>
                <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ margin: 0 }} className="text-gradient">Bot Dashboard</h2>
                    <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }} onClick={() => {
                        localStorage.removeItem('token');
                        navigate('/login');
                    }}>Logout</button>
                </div>
            </nav>

            <main className="container" style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <h1>Select a Server</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>Choose a server to view stats or configure settings.</p>
                </div>

                {loading ? (
                    <div style={{ color: 'var(--color-text-muted)' }}>Loading your servers...</div>
                ) : (
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
                        gap: '1.5rem' 
                    }}>
                        {guilds.map(guild => (
                            <div 
                                key={guild.id} 
                                className="card"
                                onClick={() => navigate(`/guilds/${guild.id}`)}
                                style={{ 
                                    cursor: 'pointer', 
                                    textAlign: 'center', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                <div style={{ 
                                    width: '80px', 
                                    height: '80px', 
                                    borderRadius: '50%', 
                                    marginBottom: '1rem',
                                    background: guild.icon ? `url(https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png)` : '#334155',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                    border: '2px solid var(--color-surface-hover)'
                                }}>
                                    {!guild.icon && <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{guild.name.charAt(0)}</span>}
                                </div>
                                
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{guild.name}</h3>
                                
                                {guild.isAdmin && (
                                    <span style={{ 
                                        position: 'absolute', 
                                        top: '1rem', 
                                        right: '1rem', 
                                        fontSize: '0.7rem', 
                                        background: 'rgba(88, 101, 242, 0.2)', 
                                        color: '#818cf8', 
                                        padding: '2px 8px', 
                                        borderRadius: '12px',
                                        border: '1px solid rgba(88, 101, 242, 0.3)',
                                        fontWeight: 600
                                    }}>
                                        ADMIN
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                {!loading && guilds.length === 0 && (
                    <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--color-surface)', borderRadius: '1rem' }}>
                        <h3>No Servers Found</h3>
                        <p style={{ color: 'var(--color-text-muted)' }}>Looks like you don't share any servers with the bot yet.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
