import { useState, useEffect, useRef } from 'react';
import Header from '../../components/layout/Header';
import { supabase } from '../../lib/supabase';
import { FiSearch, FiSend, FiUser, FiPhone, FiClock, FiX, FiCheck } from 'react-icons/fi';

const APP_URL = window.location.origin;

const LINKS_CONFIG = [
  {
    id: 'cadastro',
    label: 'Cadastro',
    emoji: '📋',
    desc: 'app GOLLOG',
    cor: '#F37021',
    buildUrl: (phone) => `${APP_URL}/cadastro/${phone}`,
  },
  {
    id: 'cotacao',
    label: 'Cotação',
    emoji: '💰',
    desc: 'app GOLLOG',
    cor: '#F37021',
    buildUrl: () => `${APP_URL}/cotacao`,
  },
  {
    id: 'rastreamento',
    label: 'Rastreamento',
    emoji: '📦',
    desc: 'app GOLLOG',
    cor: '#F37021',
    buildUrl: () => `${APP_URL}/rastreamento`,
  },
  {
    id: 'motorista',
    label: 'Cadastro de Motorista',
    emoji: '🚛',
    desc: 'app GOLLOG',
    cor: '#F37021',
    buildUrl: () => `${APP_URL}/motorista-agregado`,
  },
  {
    id: 'minuta',
    label: 'Minuta de Despacho Eletrônico',
    emoji: '📄',
    desc: 'link externo',
    cor: '#9CA3AF',
    buildUrl: () => 'https://servicos.gollog.com.br/minuta',
  },
  {
    id: 'malha',
    label: 'Malha Aérea',
    emoji: '✈️',
    desc: 'link externo',
    cor: '#9CA3AF',
    buildUrl: () => 'https://servicos.gollog.com.br/malha',
  },
  {
    id: 'dce',
    label: 'DCE (Declaração de Conteúdo Eletrônico)',
    emoji: '📝',
    desc: 'link externo',
    cor: '#9CA3AF',
    buildUrl: () => 'https://servicos.gollog.com.br/dce',
  },
];

const toInternational = (phone) => {
  const d = phone.replace(/\D/g, '');
  return d.startsWith('55') && d.length >= 12 ? d : `55${d}`;
};

const formatDateTime = (iso) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function LinksRapidosPage() {
  const [modo, setModo] = useState('cadastrado');
  const [search, setSearch] = useState('');
  const [sugestoes, setSugestoes] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [manualPhone, setManualPhone] = useState('');
  const [selectedLinks, setSelectedLinks] = useState([]);
  const [sending, setSending] = useState(false);
  const [sentOk, setSentOk] = useState(false);
  const [error, setError] = useState('');
  const [historico, setHistorico] = useState([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const searchRef = useRef(null);

  useEffect(() => {
    fetchConfigs();
    fetchHistorico();
  }, []);

  useEffect(() => {
    if (search.length >= 2 && !selectedCliente) {
      buscarClientes();
    } else {
      setSugestoes([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const fetchConfigs = async () => {
    const { data } = await supabase
      .from('configuracoes')
      .select('chave, valor')
      .eq('chave', 'botconversa_webhook_notificacoes')
      .single();
    if (data?.valor) setWebhookUrl(data.valor);
  };

  const fetchHistorico = async () => {
    const { data } = await supabase
      .from('atividades_log')
      .select('*, clientes(nome_razao_social)')
      .eq('tipo', 'contato')
      .ilike('descricao', 'Links rapidos:%')
      .order('created_at', { ascending: false })
      .limit(15);
    setHistorico(data || []);
  };

  const buscarClientes = async () => {
    const { data } = await supabase
      .from('clientes')
      .select('id, nome_razao_social, telefone, unidade_atendimento')
      .or(`nome_razao_social.ilike.%${search}%,telefone.ilike.%${search}%`)
      .limit(8);
    setSugestoes(data || []);
  };

  const selecionarCliente = (c) => {
    setSelectedCliente(c);
    setSearch(c.nome_razao_social);
    setSugestoes([]);
  };

  const limparCliente = () => {
    setSelectedCliente(null);
    setSearch('');
    setSugestoes([]);
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const toggleLink = (id) => {
    setSelectedLinks(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]);
  };

  const getPhone = () => {
    const raw = modo === 'cadastrado' ? selectedCliente?.telefone : manualPhone;
    return raw ? toInternational(raw) : null;
  };

  const handleSend = async () => {
    setError('');
    const phone = getPhone();
    if (!phone) return setError('Selecione um cliente ou informe o telefone.');
    if (selectedLinks.length === 0) return setError('Selecione pelo menos um link.');
    if (!webhookUrl) return setError('Configure o Webhook Notificações em Configurações.');

    setSending(true);
    const nome = modo === 'cadastrado' ? selectedCliente?.nome_razao_social : 'Cliente';

    const linksTexto = selectedLinks
      .map(id => {
        const lk = LINKS_CONFIG.find(l => l.id === id);
        return `${lk.emoji} *${lk.label}*\n${lk.buildUrl(phone)}`;
      })
      .join('\n\n');

    const mensagem = `Ola! Segue os links para seus servicos GOLLOG:\n\n${linksTexto}`;

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, nome, mensagem }),
      });

      await supabase.from('atividades_log').insert([{
        cliente_id: modo === 'cadastrado' ? selectedCliente?.id : null,
        tipo: 'contato',
        descricao: `Links rapidos: ${selectedLinks.map(id => LINKS_CONFIG.find(l => l.id === id)?.label).join(', ')}`,
        canal: 'whatsapp',
        metadata: { links: selectedLinks, telefone: phone, nome },
      }]);

      setSentOk(true);
      setTimeout(() => setSentOk(false), 3000);
      fetchHistorico();
    } catch {
      setError('Erro ao enviar. Verifique o webhook configurado.');
    } finally {
      setSending(false);
    }
  };

  const phoneValido = getPhone();
  const podEnviar = phoneValido && selectedLinks.length > 0 && !sending;

  return (
    <>
      <Header title="Links Rápidos" />
      <div className="page-content animate-in">

        {error && (
          <div style={{ background: 'rgba(255,82,82,0.08)', border: '1px solid rgba(255,82,82,0.3)', color: '#FF5252', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div className="grid-2 mb-16">
          {/* ── Destinatário ── */}
          <div className="card">
            <div className="card-header"><span className="card-title">📱 Destinatário</span></div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button
                  className={`btn ${modo === 'cadastrado' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                  onClick={() => { setModo('cadastrado'); setManualPhone(''); }}
                >
                  <FiUser size={13} style={{ marginRight: 5 }} />
                  Cliente Cadastrado
                </button>
                <button
                  className={`btn ${modo === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                  onClick={() => { setModo('manual'); limparCliente(); }}
                >
                  <FiPhone size={13} style={{ marginRight: 5 }} />
                  Número Manual
                </button>
              </div>

              {modo === 'cadastrado' ? (
                <div style={{ position: 'relative' }}>
                  {selectedCliente ? (
                    <div style={{
                      padding: '12px 14px', borderRadius: 8,
                      background: 'rgba(243,112,33,0.08)', border: '1px solid rgba(243,112,33,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{selectedCliente.nome_razao_social}</div>
                        <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                          {selectedCliente.telefone}
                          {selectedCliente.unidade_atendimento && (
                            <span style={{ marginLeft: 8, color: '#F37021' }}>· {selectedCliente.unidade_atendimento}</span>
                          )}
                        </div>
                      </div>
                      <button className="btn btn-ghost btn-icon" onClick={limparCliente}><FiX size={14} /></button>
                    </div>
                  ) : (
                    <>
                      <div style={{ position: 'relative' }}>
                        <FiSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6B7280', pointerEvents: 'none' }} />
                        <input
                          ref={searchRef}
                          className="form-input"
                          placeholder="Buscar por nome ou telefone..."
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          style={{ paddingLeft: 34 }}
                          autoComplete="off"
                        />
                      </div>
                      {sugestoes.length > 0 && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, marginTop: 4,
                          background: '#1A1A2E', border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        }}>
                          {sugestoes.map(c => (
                            <div
                              key={c.id}
                              onClick={() => selecionarCliente(c)}
                              style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(243,112,33,0.08)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{c.nome_razao_social}</div>
                              <div style={{ fontSize: 11, color: '#9CA3AF' }}>{c.telefone}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {search.length >= 2 && sugestoes.length === 0 && (
                        <p style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>Nenhum cliente encontrado.</p>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div>
                  <label className="form-label">Número WhatsApp</label>
                  <input
                    className="form-input"
                    placeholder="(11) 99999-9999"
                    value={manualPhone}
                    onChange={e => setManualPhone(e.target.value)}
                  />
                  <p style={{ fontSize: 11, color: '#6B7280', marginTop: 6 }}>
                    Com ou sem DDI — o sistema formata automaticamente.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Links ── */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">🔗 Selecionar Links</span>
              {selectedLinks.length > 0 && (
                <span style={{ fontSize: 12, background: 'rgba(243,112,33,0.15)', color: '#F37021', padding: '2px 10px', borderRadius: 20 }}>
                  {selectedLinks.length} selecionado{selectedLinks.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {LINKS_CONFIG.map(link => {
                const ativo = selectedLinks.includes(link.id);
                return (
                  <label
                    key={link.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                      borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                      background: ativo ? 'rgba(243,112,33,0.08)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${ativo ? 'rgba(243,112,33,0.35)' : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={ativo}
                      onChange={() => toggleLink(link.id)}
                      style={{ width: 15, height: 15, accentColor: '#F37021', flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 17, lineHeight: 1 }}>{link.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{link.label}</div>
                      <div style={{ fontSize: 10, color: link.cor }}>{link.desc}</div>
                    </div>
                    {ativo && <FiCheck size={13} style={{ color: '#F37021', flexShrink: 0 }} />}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Send Button ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={!podEnviar}
            style={{ padding: '11px 32px', fontSize: 14, opacity: podEnviar ? 1 : 0.5 }}
          >
            {sentOk
              ? <><FiCheck size={15} style={{ marginRight: 8 }} />Enviado!</>
              : sending
                ? 'Enviando...'
                : <><FiSend size={15} style={{ marginRight: 8 }} />Enviar pelo WhatsApp</>}
          </button>
        </div>

        {/* ── Histórico ── */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><FiClock size={14} style={{ marginRight: 6 }} />Histórico de Envios</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {historico.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <p>Nenhum envio registrado ainda.</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Cliente / Telefone</th>
                    <th>Links Enviados</th>
                    <th>Data/Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((h, i) => (
                    <tr key={i}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                          {h.clientes?.nome_razao_social || h.metadata?.nome || '—'}
                        </div>
                        <div style={{ fontSize: 11, color: '#9CA3AF' }}>{h.metadata?.telefone || ''}</div>
                      </td>
                      <td style={{ fontSize: 12, color: '#9CA3AF', maxWidth: 300 }}>
                        {h.metadata?.links
                          ? h.metadata.links.map(id => {
                              const lk = LINKS_CONFIG.find(l => l.id === id);
                              return lk ? `${lk.emoji} ${lk.label}` : id;
                            }).join(' · ')
                          : h.descricao}
                      </td>
                      <td style={{ color: '#6B7280', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {formatDateTime(h.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </>
  );
}
