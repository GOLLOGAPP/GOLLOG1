import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminLayout from './components/layout/AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/admin/DashboardPage';
import ClientesPage from './pages/admin/ClientesPage';
import CotacoesPage from './pages/admin/CotacoesPage';
import RastreamentosPage from './pages/admin/RastreamentosPage';
import ColetasPage from './pages/admin/ColetasPage';
import SuportePage from './pages/admin/SuportePage';
import MotoristasPage from './pages/admin/MotoristasPage';
import FaqAdminPage from './pages/admin/FaqAdminPage';
import ConfiguracoesPage from './pages/admin/ConfiguracoesPage';
import CadastroPage from './pages/public/CadastroPage';
import CotacaoPage from './pages/public/CotacaoPage';
import ColetaPage from './pages/public/ColetaPage';
import FaqPage from './pages/public/FaqPage';
import MotoristaAgregadoPage from './pages/public/MotoristaAgregadoPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Pages (links sent via WhatsApp) */}
          <Route path="/cadastro/:telefone?" element={<CadastroPage />} />
          <Route path="/cotacao/:clienteId?" element={<CotacaoPage />} />
          <Route path="/coleta/:clienteId?" element={<ColetaPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/motorista-agregado" element={<MotoristaAgregadoPage />} />

          {/* Login */}
          <Route path="/login" element={<LoginPage />} />

          {/* Admin Dashboard (Protected) */}
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="clientes" element={<ClientesPage />} />
            <Route path="cotacoes" element={<CotacoesPage />} />
            <Route path="rastreamentos" element={<RastreamentosPage />} />
            <Route path="coletas" element={<ColetasPage />} />
            <Route path="suporte" element={<SuportePage />} />
            <Route path="motoristas" element={<MotoristasPage />} />
            <Route path="faq" element={<FaqAdminPage />} />
            <Route path="configuracoes" element={<ConfiguracoesPage />} />
          </Route>

          {/* Default */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
