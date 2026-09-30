import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { authSessionChangedEvent, authUnauthorizedEvent, getStoredAuthSession } from './api/authStorage';
import { initializeKeycloak } from './api/keycloak';
import { AppLayout } from './components/AppLayout';
import { DocumentsListPage } from './pages/DocumentsListPage';
import { DocumentDetailPage } from './pages/DocumentDetailPage';
import { DocumentCreatePage } from './pages/DocumentCreatePage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { TasksListPage } from './pages/TasksListPage';
import { WorkflowAdminPage } from './pages/WorkflowAdminPage';
import { clearSession, setSession } from './store/authSlice';
import { useAppDispatch, useAppSelector } from './store/hooks';

function ProtectedApp({ children }: PropsWithChildren) {
  const session = useAppSelector((state) => state.auth.session);
  const location = useLocation();

  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;

  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  const dispatch = useAppDispatch();
  const [authInitialized, setAuthInitialized] = useState(false);
  const initializationStarted = useRef(false);

  useEffect(() => {
    const handleUnauthorized = () => {
      dispatch(clearSession());
    };
    const handleSessionChanged = () => {
      const session = getStoredAuthSession();
      if (session) dispatch(setSession(session));
    };

    window.addEventListener(authUnauthorizedEvent, handleUnauthorized);
    window.addEventListener(authSessionChangedEvent, handleSessionChanged);
    if (!initializationStarted.current) {
      initializationStarted.current = true;
      void initializeKeycloak().then((session) => {
        if (session) dispatch(setSession(session));
      }).catch(handleUnauthorized).finally(() => {
        setAuthInitialized(true);
      });
    }
    return () => {
      window.removeEventListener(authUnauthorizedEvent, handleUnauthorized);
      window.removeEventListener(authSessionChangedEvent, handleSessionChanged);
    };
  }, [dispatch]);

  if (!authInitialized) return null;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedApp><HomePage /></ProtectedApp>} />
      <Route path="/documents" element={<ProtectedApp><DocumentsListPage /></ProtectedApp>} />
      <Route path="/documents/new" element={<ProtectedApp><DocumentCreatePage /></ProtectedApp>} />
      <Route path="/documents/:id" element={<ProtectedApp><DocumentDetailPage /></ProtectedApp>} />
      <Route path="/tasks" element={<Navigate to="/tasks/my" replace />} />
      <Route path="/tasks/my" element={<ProtectedApp><TasksListPage queue="MY" /></ProtectedApp>} />
      <Route path="/tasks/available" element={<ProtectedApp><TasksListPage queue="AVAILABLE" /></ProtectedApp>} />
      <Route path="/admin/workflows" element={<ProtectedApp><WorkflowAdminPage /></ProtectedApp>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
