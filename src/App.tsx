import { useEffect, type PropsWithChildren } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { authSessionChangedEvent, authUnauthorizedEvent, getStoredAuthSession } from './api/authStorage';
import { AppLayout } from './components/AppLayout';
import { DocumentsListPage } from './pages/DocumentsListPage';
import { DocumentDetailPage } from './pages/DocumentDetailPage';
import { DocumentCreatePage } from './pages/DocumentCreatePage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
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
    return () => {
      window.removeEventListener(authUnauthorizedEvent, handleUnauthorized);
      window.removeEventListener(authSessionChangedEvent, handleSessionChanged);
    };
  }, [dispatch]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedApp><HomePage /></ProtectedApp>} />
      <Route path="/documents" element={<ProtectedApp><DocumentsListPage /></ProtectedApp>} />
      <Route path="/documents/new" element={<ProtectedApp><DocumentCreatePage /></ProtectedApp>} />
      <Route path="/documents/:id" element={<ProtectedApp><DocumentDetailPage /></ProtectedApp>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
