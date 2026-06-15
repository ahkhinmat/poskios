import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom';
import { App as AntApp, ConfigProvider, Spin, theme } from 'antd';
import { AuthProvider, useAuth } from './auth-context';
import { LoginPage } from './pages/LoginPage';
import { PosPage } from './pages/PosPage';

function ProtectedRoute() {
  const { user } = useAuth();

  if (user === undefined) {
    return (
      <div className="screen-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <PosPage />;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route path="/*" element={<ProtectedRoute />} />
    </Routes>
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
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}
