import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom';
import { App as AntApp, ConfigProvider, Spin, theme } from 'antd';
import { AuthProvider, useAuth } from './auth-context';
import { setOnForbidden } from './api';

const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const PosPage = lazy(() => import('./pages/PosPage').then((m) => ({ default: m.PosPage })));

function PageLoading() {
  return (
    <div className="screen-center">
      <Spin size="large" />
    </div>
  );
}

function ProtectedRoute() {
  const { user } = useAuth();

  if (user === undefined) {
    return <PageLoading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <PosPage />;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route path="/*" element={<ProtectedRoute />} />
      </Routes>
    </Suspense>
  );
}

function ForbiddenHandler() {
  const { message } = AntApp.useApp();

  useEffect(() => {
    setOnForbidden((msg) => {
      message.error(msg);
    });

    return () => setOnForbidden(null);
  }, [message]);

  return null;
}

function AppInner() {
  return (
    <>
      <ForbiddenHandler />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </>
  );
}

export function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#16a34a',
          borderRadius: 12,
          fontFamily:
            '"Be Vietnam Pro","Segoe UI",system-ui,-apple-system,sans-serif',
        },
      }}
    >
      <AntApp>
        <AppInner />
      </AntApp>
    </ConfigProvider>
  );
}
