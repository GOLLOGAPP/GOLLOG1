import { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import { supabase } from '../../lib/supabase';
import { FiSave, FiRefreshCw, FiCheck } from 'react-icons/fi';

export default function ConfiguracoesPage() {
  const [configs, setConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchConfigs = async () => {
    setLoading(true);
    const { data } = await supabase.from('configuracoes').select('*');
    if (data) {
      const map = {};
      data.forEach(c => { map[c.chave] = c.valor || ''; });
      setConfigs(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchConfigs(); }, []);

  const handleChange = (key, value) => {
    setConfigs(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    for (const [chave, valor] of Object.entries(configs)) {
      await supabase.from('configuracoes').update({ valor, updated_at: new Date().toISOString() }).eq('chave', chave);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) return <><Header title="Configurações" /><div className="page-content"><div className="empty-state"><p>Carregando...</p></div></div></>;

  return (
    <>
      <Header title="Configurações" />
      <div className="page-content animate-in">
        {saved && (
          <div style={{
            background:'rgba(0,200,83,0.1)', border:'1px solid rgba(0,200,83,0.3)',
            color:'#00C853', padding:'10px 16px', borderRadius:8, marginBottom:20,
            fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:8
          }}>
            <FiCheck size={16}/> Configurações salvas com sucesso!
          </div>
        )}

        <div className="grid-2">
          {/* Unidade Osasco */}
          <div className="card">
            <div className="card-header"><span className="card-title">🏢 Unidade Osasco</span></div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Endereço</label>
                <input className="form-input" value={configs.unidade_osasco_endereco || ''}
                  onChange={e => handleChange('unidade_osasco_endereco', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input className="form-input" value={configs.unidade_osasco_telefone || ''}
                  onChange={e => handleChange('unidade_osasco_telefone', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Unidade Barueri */}
          <div className="card">
            <div className="card-header"><span className="card-title">🏢 Unidade Barueri</span></div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Endereço</label>
                <input className="form-input" value={configs.unidade_barueri_endereco || ''}
                  onChange={e => handleChange('unidade_barueri_endereco', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input className="form-input" value={configs.unidade_barueri_telefone || ''}
                  onChange={e => handleChange('unidade_barueri_telefone', e.target.value)} />
              </div>
            </div>
          </div>

          {/* BotConversa */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header"><span className="card-title">🤖 BotConversa</span></div>
            <div className="card-body">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                <div className="form-group" style={{ margin:0 }}>
                  <label className="form-label">Webhook Menu Direto</label>
                  <input className="form-input" placeholder="https://new-backend.botconversa.com.br/api/v1/webhooks-automation/catch/..."
                    value={configs.botconversa_webhook_url || ''}
                    onChange={e => handleChange('botconversa_webhook_url', e.target.value)} />
                  <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:6 }}>
                    Dispara o fluxo do menu principal após o cadastro do cliente.
                  </p>
                </div>
                <div className="form-group" style={{ margin:0 }}>
                  <label className="form-label">Webhook Notificações</label>
                  <input className="form-input" placeholder="https://new-backend.botconversa.com.br/api/v1/webhooks-automation/catch/..."
                    value={configs.botconversa_webhook_notificacoes || ''}
                    onChange={e => handleChange('botconversa_webhook_notificacoes', e.target.value)} />
                  <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:6 }}>
                    Envia mensagens e notificações gerais ao cliente (cotações, confirmações, etc).
                  </p>
                </div>
              </div>
              <div className="form-group" style={{ marginTop:16, marginBottom:0 }}>
                <label className="form-label">API Key</label>
                <input className="form-input" type="password" placeholder="Sua API Key do BotConversa"
                  value={configs.botconversa_api_key || ''}
                  onChange={e => handleChange('botconversa_api_key', e.target.value)} />
              </div>
              <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:8 }}>
                Webhook de entrada (bot → app):{' '}
                <code style={{ color:'var(--primary)', fontSize:11 }}>{window.location.origin}/api/webhook/botconversa</code>
              </p>
            </div>
          </div>

          {/* API Gollog */}
          <div className="card">
            <div className="card-header"><span className="card-title">📦 API Gollog</span></div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">API Key</label>
                <input className="form-input" type="password" placeholder="Credencial de acesso à API Gollog"
                  value={configs.gollog_api_key || ''}
                  onChange={e => handleChange('gollog_api_key', e.target.value)} />
              </div>
              <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:8 }}>
                Credenciais para integração com rastreamento e cotação da Gollog.
              </p>
            </div>
          </div>
        </div>

        <div style={{ marginTop:20, display:'flex', justifyContent:'flex-end' }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : <><FiSave size={14}/> Salvar Todas as Configurações</>}
          </button>
        </div>
      </div>
    </>
  );
}
