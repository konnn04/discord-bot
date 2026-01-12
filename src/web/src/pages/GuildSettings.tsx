import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function GuildSettings() {
    const { guildId } = useParams();
    const navigate = useNavigate();
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
             const token = localStorage.getItem('token');
            try {
                const res = await fetch(`/api/guilds/${guildId}/settings`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                if (res.status === 401) return navigate('/login');
                if (res.status === 403) return navigate(`/guilds/${guildId}`);
                
                const data = await res.json();
                setSettings(data);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchSettings();
    }, [guildId, navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setSettings({ ...settings, [name]: type === 'checkbox' ? checked : value });
    };

    const handleSave = async () => {
        setSaving(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/guilds/${guildId}/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(settings)
            });
            if (res.ok) alert('Settings saved successfully!');
            else alert('Failed to save settings');
        } catch (err) { console.error(err); } 
        finally { setSaving(false); }
    };

    if (loading) return <div className="container" style={{ paddingTop: '2rem' }}>Loading settings...</div>;

    return (
        <div style={{ minHeight: '100vh', paddingBottom: '3rem', background: 'var(--color-bg)' }}>
            <div className="container" style={{ paddingTop: '2rem' }}>
                <button onClick={() => navigate(`/guilds/${guildId}`)} className="btn btn-secondary" style={{ marginBottom: '2rem' }}>
                    &larr; Back to Stats
                </button>

                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <h1 style={{ marginBottom: '2rem', textAlign: 'center' }}>Server Settings</h1>
                    
                    <div className="card">
                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                padding: '1rem',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: 'var(--radius-md)'
                            }}>
                                <div>
                                    <span style={{ display: 'block', fontWeight: 600, fontSize: '1.1rem' }}>Enable Leveling System</span>
                                    <span style={{ display: 'block', color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                                        Allow users to gain XP and levels in this server.
                                    </span>
                                </div>
                                <input 
                                    type="checkbox" 
                                    name="levelingEnabled" 
                                    checked={settings.levelingEnabled || false} 
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettings({ ...settings, levelingEnabled: e.target.checked })}
                                    style={{ width: '1.5rem', height: '1.5rem', accentColor: 'var(--color-primary)' }}
                                />
                            </label>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Level Up Channel ID</label>
                            <input 
                                type="text" 
                                name="levelUpChannelId" 
                                value={settings.levelUpChannelId || ''} 
                                onChange={handleChange}
                                placeholder="e.g. 123456789012345678"
                            />
                            <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                Leave empty to send level-up messages in the channel where the user leveled up.
                            </p>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Message XP Rate</label>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <input 
                                    type="number" 
                                    name="xpRateMessage" 
                                    value={settings.xpRateMessage || 0} 
                                    onChange={handleChange}
                                    style={{ margin: 0 }}
                                />
                                <span style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>XP per message</span>
                            </div>
                        </div>

                        <button 
                            className="btn btn-primary" 
                            onClick={handleSave} 
                            disabled={saving}
                            style={{ width: '100%' }}
                        >
                            {saving ? 'Saving Changes...' : 'Save Settings'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
