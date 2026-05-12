import Header from '../../components/layout/Header';
import { FiSave, FiGlobe, FiLink, FiUsers } from 'react-icons/fi';

export default function ConfiguracoesPage() {
  return (
    <>
      <Header title="Configurações" />
      <div className="page-content animate-in">
        <div className="grid-2">
          <div className="card">
            <div className="card-header"><span className="card-title">🏢 Dados da Unidade</span></div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Nome da Unidade</label>
                <input className="form-input" defaultValue="GOLLOG Osasco" />
              </div>
              <div className="form-group">
                <label className="form-label">Endereço</label>
                <input className="form-input" defaultValue="Rua Example, 100 - Osasco/SP" />
              </div>
              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input className="form-input" defaultValue="(11) 3333-4444" />
              </div>
              <button className="btn btn-primary btn-sm mt-16"><FiSave size={14}/> Salvar</button>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">🔗 Integrações</span></div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">BotConversa - Webhook URL</label>
                <input className="form-input" placeholder="https://backend.botconversa.com.br/api/v1/..." />
              </div>
              <div className="form-group">
                <label className="form-label">BotConversa - API Key</label>
                <input className="form-input" type="password" placeholder="Sua API Key" />
              </div>
              <div className="form-group">
                <label className="form-label">Gollog API - Credenciais</label>
                <input className="form-input" type="password" placeholder="API Key Gollog" />
              </div>
              <button className="btn btn-primary btn-sm mt-16"><FiSave size={14}/> Salvar</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
