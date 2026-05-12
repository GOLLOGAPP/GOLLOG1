import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiLogIn } from 'react-icons/fi';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    // TODO: Supabase auth
    setTimeout(() => {
      navigate('/admin/dashboard');
    }, 600);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo-area">
          <img src="/logo.png" alt="GOLLOG" />
          <h2>Painel Administrativo</h2>
          <p>Acesse sua conta para gerenciar o sistema</p>
        </div>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input className="form-input" type="email" placeholder="admin@gollog.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Senha</label>
            <input className="form-input" type="password" placeholder="••••••••"
              value={senha} onChange={e => setSenha(e.target.value)} required />
          </div>
          <button className="btn btn-primary btn-lg" type="submit"
            style={{ width:'100%', marginTop:8 }} disabled={loading}>
            {loading ? 'Entrando...' : <><FiLogIn size={16}/> Entrar</>}
          </button>
        </form>
      </div>
    </div>
  );
}
