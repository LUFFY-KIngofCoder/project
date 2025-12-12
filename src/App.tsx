import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import Loading from './components/Loading';

function AppContent() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (!user || !profile) {
    return <Login />;
  }

  if (profile.role === 'admin') {
    return <AdminDashboard />;
  }

  return <EmployeeDashboard />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
