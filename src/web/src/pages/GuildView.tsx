import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface UserStats {
    xp: number;
    level: number;
    messageCount: number;
    voiceSeconds: number;
    rank: number;
}

interface GuildInfo {
    id: string;
    name: string;
    icon: string | null;
    memberCount: number;
    isAdmin?: boolean;
}

export default function GuildView() {
    const { guildId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<{ guild: GuildInfo, userStats: UserStats } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`/api/guilds/${guildId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.status === 401) return navigate('/login');
                const json = await res.json();
                setData(json);
            } catch (err) { console.error(err); } 
            finally { setLoading(false); }
        };
        fetchData();
    }, [guildId, navigate]);

    if (loading) return <div className="container" style={{ paddingTop: '2rem' }}>Loading stats...</div>;
    if (!data) return <div className="container">Guild not found.</div>;

    const { guild, userStats } = data;

    return (
        <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
            {/* Header Banner */}
            <div style={{ 
                background: 'linear-gradient(to right, #1e293b, #0f172a)', 
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                padding: '3rem 0 2rem'
            }}>
                <div className="container">
                    <button onClick={() => navigate('/dashboard')} className="btn btn-secondary" style={{ marginBottom: '2rem', padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                        &larr; Time traveled back?
                    </button>
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            {guild.icon ? (
                                <img src={guild.icon} alt={guild.name} style={{ width: '80px', height: '80px', borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} />
                            ) : (
                                <div style={{ width: '80px', height: '80px', borderRadius: '20px', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold' }}>{guild.name[0]}</div>
                            )}
                            <div>
                                <h1 style={{ marginBottom: '0.25rem', fontSize: '2.5rem' }}>{guild.name}</h1>
                                <span style={{ color: 'var(--color-text-muted)', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.9rem' }}>
                                    👥 {guild.memberCount} Members
                                </span>
                            </div>
                        </div>

                        {guild.isAdmin && (
                            <button className="btn btn-primary" onClick={() => navigate(`/guilds/${guildId}/settings`)}>
                                ⚙️ Server Settings
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="container" style={{ marginTop: '2rem' }}>
                <h2 style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--color-primary)', paddingLeft: '1rem' }}>Your Statistics</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                    <StatCard title="Current Rank" value={`#${userStats.rank || '—'}`} icon="🏆" color="var(--color-accent)" />
                    <StatCard title="Level" value={userStats.level} icon="⭐" color="#fbbf24" />
                    <StatCard title="Total XP" value={userStats.xp?.toLocaleString()} icon="✨" color="#f472b6" />
                    <StatCard title="Messages Sent" value={userStats.messageCount?.toLocaleString()} icon="💬" color="#4ade80" />
                    <StatCard title="Voice Time" value={`${Math.ceil((userStats.voiceSeconds || 0) / 60)}m`} icon="🎙️" color="#818cf8" />
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color }: { title: string, value: string | number, icon: string, color: string }) {
    return (
        <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '5rem', opacity: 0.05, filter: 'grayscale(1)' }}>{icon}</div>
            <h4 style={{ color: 'var(--color-text-muted)', margin: '0 0 0.5rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h4>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: color, lineHeight: 1 }}>{value}</div>
        </div>
    );
}
