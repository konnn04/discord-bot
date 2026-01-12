export default function Login() {
    const handleLogin = () => {
        window.location.href = '/api/auth/login'; 
    };

    return (
        <div style={{ 
            minHeight: '100vh', 
            background: 'radial-gradient(circle at top right, #1e1b4b, #0f172a)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div className="glass-panel" style={{ 
                padding: '3rem', 
                borderRadius: '1rem', 
                maxWidth: '400px', 
                textAlign: 'center',
                width: '100%'
            }}>
                <div style={{ 
                    width: '80px', 
                    height: '80px', 
                    background: 'linear-gradient(135deg, #5865F2, #38bdf8)', 
                    borderRadius: '20px', 
                    margin: '0 auto 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '40px',
                    boxShadow: '0 10px 20px -5px rgba(88, 101, 242, 0.5)'
                }}>
                    🤖
                </div>
                
                <h1 style={{ marginBottom: '0.5rem', fontSize: '2rem' }}>Welcome Back</h1>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
                    Manage your Discord server with powerful tools and analytics.
                </p>
                
                <button className="btn btn-primary" onClick={handleLogin} style={{ width: '100%', fontSize: '1.1rem' }}>
                    Login with Discord
                </button>
            </div>
        </div>
    );
}
