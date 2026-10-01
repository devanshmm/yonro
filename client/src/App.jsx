import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { useAuth } from './stores/auth';
import { useProductivity } from './stores/productivity';
import { useResources } from './stores/resources';
import { Layout } from './components/Layout';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Focus from './pages/Focus';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
export default function App() {
  const init = useAuth((s) => s.init);
  useEffect(() => {
    const expired = () => {
      useAuth.setState({ user: null });
      useProductivity.getState().clear();
      useResources.getState().clear();
    };
    window.addEventListener('lockin:session-expired', expired);
    void init();
    return () => window.removeEventListener('lockin:session-expired', expired);
  }, [init]);
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Auth />} />
        <Route path="/signup" element={<Auth />} />
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="focus" element={<Focus />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
          <Route
            path="*"
            element={
              <div className="empty-state">
                <h1>This page wandered off.</h1>
                <Link to="/">Back to your workspace</Link>
              </div>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
