import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { Layout } from './components/Layout';
import { CampaignDetail } from './pages/CampaignDetail';
import { Campaigns } from './pages/Campaigns';
import { Leads } from './pages/Leads';
import { Login } from './pages/Login';
import { NewCampaign } from './pages/NewCampaign';
import { Profile } from './pages/Profile';
import { Register } from './pages/Register';

function Guard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="boot">Loading desk…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function Guest({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="boot">Loading desk…</div>;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <Guest>
            <Login />
          </Guest>
        }
      />
      <Route
        path="/register"
        element={
          <Guest>
            <Register />
          </Guest>
        }
      />
      <Route
        element={
          <Guard>
            <Layout />
          </Guard>
        }
      >
        <Route path="/" element={<Leads />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/new" element={<NewCampaign />} />
        <Route path="/campaigns/:id" element={<CampaignDetail />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
