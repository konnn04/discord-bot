import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AuthCallback from './pages/AuthCallback';
import GuildView from './pages/GuildView';
import GuildSettings from './pages/GuildSettings';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      <Route element={<PrivateRoute />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/guilds/:guildId" element={<GuildView />} />
        <Route path="/guilds/:guildId/settings" element={<GuildSettings />} />
      </Route>
    </Routes>
  );
}

export default App;
