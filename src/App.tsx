import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CampaignDetail } from './pages/CampaignDetail';
import { Campaigns } from './pages/Campaigns';
import { Contacts } from './pages/Contacts';
import { Leads } from './pages/Leads';
import { NewCampaign } from './pages/NewCampaign';
import { Profile } from './pages/Profile';
import { EmailSettings } from './pages/settings/EmailSettings';
import { McpSettings } from './pages/settings/McpSettings';
import { SettingsLayout } from './pages/settings/SettingsLayout';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Leads />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/new" element={<NewCampaign />} />
        <Route path="/campaigns/:id" element={<CampaignDetail />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<SettingsLayout />}>
          <Route index element={<Navigate to="email" replace />} />
          <Route path="email" element={<EmailSettings />} />
          <Route path="mcp" element={<McpSettings />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
