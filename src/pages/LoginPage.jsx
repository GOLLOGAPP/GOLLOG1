import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLogIn } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signIn(email, senha);
      navigate('/admin/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      if (err.message?.includes('Invalid login')) {
        setError('E-mail ou senha incorretos.');
      } else if (err.message?.includes('Email not confirmed')) {
        setError('E-mail ainda não confirmado. Verifique sua caixa de entrada.');
      } else {
        setError(err.message || 'Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo-area">
          <img src="/logo.png" alt="GOLLOG" />
          <h2>Painel Administrativo</h2>
          <p>Acesse sua conta para gerenciar o sistema</p>
        </div>

        {error && (
          <div style={{
            background:'rgba(255,82,82,0.08)', border:'1px solid rgba(255,82,82,0.3)',
            color:'#FF5252', padding:'10px 14px', borderRadius:8, marginBottom:16, fontSize:13
          }}>{error}</div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input className="form-input" type="email" placeholder="admin@gollog.com.br"
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
