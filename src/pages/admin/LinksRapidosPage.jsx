import { useState, useEffect, useRef } from 'react';
import Header from '../../components/layout/Header';
import { supabase } from '../../lib/supabase';
import { FiSearch, FiSend, FiUser, FiPhone, FiClock, FiX, FiCheck, FiLink, FiPrinter, FiExternalLink, FiSave, FiCopy } from 'react-icons/fi';
import { QRCodeSVG } from 'qrcode.react';

const APP_URL = window.location.origin;

const LINKS_CONFIG = [
  {
    id: 'cadastro',
    label: 'Cadastro',
    emoji: '📋',
    desc: 'app LOGPROFIT',
    cor: '#F37021',
    buildUrl: (phone) => `${APP_URL}/cadastro/${phone}`,
  },
  {
    id: 'cotacao',
    label: 'Cotação',
    emoji: '💰',
    desc: 'app LOGPROFIT',
    cor: '#F37021',
    buildUrl: () => `${APP_URL}/cotacao`,
  },
  {
    id: 'rastreamento',
    label: 'Rastreamento',
    emoji: '📦',
    desc: 'app LOGPROFIT',
    cor: '#F37021',
    buildUrl: () => `${APP_URL}/rastreamento`,
  },
  {
    id: 'motorista',
    label: 'Cadastro de Motorista',
    emoji: '🚛',
    desc: 'app LOGPROFIT',
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

  // Hub & QR state
  const [activeTab, setActiveTab] = useState('links');
  const [hubConfig, setHubConfig] = useState({
    hub_slug: 'gollog', hub_empresa_nome: 'GOLLOG',
    hub_tagline: 'Logística com qualidade', hub_cor: '#F37021',
    hub_links_ativos: 'cadastro,cotacao,rastreamento,motorista,minuta,malha,dce',
  });
  const [hubSaving, setHubSaving] = useState(false);
  const [hubSaved, setHubSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef(null);

  useEffect(() => {
    fetchConfigs();
    fetchHistorico();
    fetchHubConfig();
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

  const fetchHubConfig = async () => {
    const { data } = await supabase
      .from('configuracoes')
      .select('chave, valor')
      .in('chave', ['hub_slug','hub_empresa_nome','hub_tagline','hub_cor','hub_links_ativos']);
    if (data && data.length > 0) {
      const map = Object.fromEntries(data.map(r => [r.chave, r.valor || '']));
      setHubConfig(prev => ({ ...prev, ...map }));
    }
  };

  const saveHubConfig = async () => {
    setHubSaving(true);
    for (const [chave, valor] of Object.entries(hubConfig)) {
      await supabase.from('configuracoes').upsert({ chave, valor }, { onConflict: 'chave' });
    }
    setHubSaving(false);
    setHubSaved(true);
    setTimeout(() => setHubSaved(false), 2500);
  };

  const handleCopyHub = () => {
    const url = `${APP_URL}/hub/${hubConfig.hub_slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handlePrintQR = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const empresa = hubConfig.hub_empresa_nome || 'GOLLOG';
    const tagline = hubConfig.hub_tagline || '';
    const url = `${APP_URL}/hub/${hubConfig.hub_slug}`;
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>QR Code — ${empresa}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh}.wrap{text-align:center;padding:48px}.logo{height:80px;margin-bottom:24px}svg{display:block;margin:0 auto}.nome{font-size:32px;font-weight:800;color:#1a1a1a;margin:22px 0 6px}.tag{font-size:15px;color:#666;margin-bottom:4px}.url{font-size:13px;color:#aaa;margin-top:18px}@media print{@page{size:A4;margin:20mm}}</style>
</head><body><div class="wrap">
<img class="logo" src="${APP_URL}/logo.png" onerror="this.style.display='none'" />
${svgData}
<div class="nome">${empresa}</div>${tagline ? `<div class="tag">${tagline}</div>` : ''}
<div class="url">${url}</div>
</div></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  const toggleHubLink = (id) => {
    const ativos = hubConfig.hub_links_ativos.split(',').map(s => s.trim()).filter(Boolean);
    const next = ativos.includes(id) ? ativos.filter(x => x !== id) : [...ativos, id];
    setHubConfig(p => ({ ...p, hub_links_ativos: next.join(',') }));
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
      .select('id, tipo, nome_razao_social, nome_contato, telefone, unidade_atendimento')
      .or(`nome_razao_social.ilike.%${search}%,telefone.ilike.%${search}%`)
      .limit(8);
    setSugestoes(data || []);
  };

  // Padrão de nome no BotConversa: PJ = "Responsável - Empresa", PF = nome completo
  const nomeBotConversa = (c) => {
    const razao = (c?.nome_razao_social || '').trim();
    const contato = (c?.nome_contato || '').trim();
    return (c?.tipo === 'PJ' && contato && razao) ? `${contato} - ${razao}` : razao;
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
    // Só envia nome real de cadastro — nunca 'Cliente', que sobrescreveria o
    // nome do contato no BotConversa. PJ vai como "Responsável - Empresa".
    const nome = modo === 'cadastrado' ? nomeBotConversa(selectedCliente) : '';

    const unidade = selectedCliente?.unidade_atendimento || '';
    const linksTexto = selectedLinks
      .map(id => {
        const lk = LINKS_CONFIG.find(l => l.id === id);
        let url = lk.buildUrl(phone);
        if (id === 'cadastro' && unidade) url += `?u=${encodeURIComponent(unidade)}`;
        return `${lk.emoji} *${lk.label}*\n${url}`;
      })
      .join('\n\n');

    const mensagem = `Ola! Segue os links para seus servicos LOGPROFIT:\n\n${linksTexto}`;

    try {
      // Envio via backend (/api/notify/mensagem) em vez do webhook direto:
      // o backend ecoa o nome atual do contato no BotConversa, evitando que a
      // automação apague o nome do cadastro.
      const resp = await fetch('/api/notify/mensagem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, nome, mensagem }),
      });
      const result = await resp.json().catch(() => ({}));
      if (!resp.ok || !result.success) throw new Error('envio falhou');

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

  const hubUrl = `${APP_URL}/hub/${hubConfig.hub_slug}`;
  const hubAtivos = hubConfig.hub_links_ativos.split(',').map(s => s.trim()).filter(Boolean);

  return (
    <>
      <Header title="Links Rápidos" />
      <div className="page-content animate-in">

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
          {[
            { id: 'links', label: '📱 Links Rápidos' },
            { id: 'hub',   label: '🌐 Hub & QR Code' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '8px 20px', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                background: activeTab === t.id ? '#F37021' : 'transparent',
                color: activeTab === t.id ? '#fff' : 'var(--text-muted)',
              }}
            >{t.label}</button>
          ))}
        </div>

      {activeTab === 'links' && <>

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
        </>}

        {/* ── HUB & QR CODE TAB ── */}
        {activeTab === 'hub' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* QR Preview */}
            <div className="card">
              <div className="card-header"><span className="card-title"><FiLink size={14} style={{ marginRight: 6 }} />QR Code do Hub</span></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>

                {/* URL */}
                <div style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <code style={{ fontSize: 13, color: '#F37021', wordBreak: 'break-all' }}>{hubUrl}</code>
                  <button className="btn btn-ghost btn-icon" title="Copiar" onClick={handleCopyHub} style={{ flexShrink: 0 }}>
                    {copied ? <FiCheck size={14} style={{ color: 'var(--success)' }} /> : <FiCopy size={14} />}
                  </button>
                </div>

                {/* QR */}
                <div ref={qrRef} style={{ padding: 16, background: '#fff', borderRadius: 12, display: 'inline-block', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
                  <QRCodeSVG
                    value={hubUrl}
                    size={240}
                    bgColor="#ffffff"
                    fgColor="#1a1a2e"
                    level="H"
                    imageSettings={{ src: '/logo.png', height: 52, width: 52, excavate: true }}
                  />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => window.open(hubUrl, '_blank')}>
                    <FiExternalLink size={13} style={{ marginRight: 6 }} />Abrir Hub
                  </button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={handlePrintQR}>
                    <FiPrinter size={13} style={{ marginRight: 6 }} />Imprimir QR
                  </button>
                </div>
              </div>
            </div>

            {/* Config Editor */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">⚙️ Configurar Hub</span>
                {hubSaved && <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}><FiCheck size={12} style={{ marginRight: 4 }} />Salvo!</span>}
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Slug (URL)</label>
                  <input className="form-input" value={hubConfig.hub_slug}
                    onChange={e => setHubConfig(p => ({ ...p, hub_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                    placeholder="gollog" />
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Somente letras minúsculas, números e hífens.</p>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Nome da empresa</label>
                  <input className="form-input" value={hubConfig.hub_empresa_nome}
                    onChange={e => setHubConfig(p => ({ ...p, hub_empresa_nome: e.target.value }))}
                    placeholder="GOLLOG" />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Tagline</label>
                  <input className="form-input" value={hubConfig.hub_tagline}
                    onChange={e => setHubConfig(p => ({ ...p, hub_tagline: e.target.value }))}
                    placeholder="Logística com qualidade" />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Cor primária</label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input type="color" value={hubConfig.hub_cor}
                      onChange={e => setHubConfig(p => ({ ...p, hub_cor: e.target.value }))}
                      style={{ width: 44, height: 36, padding: 2, borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', background: 'transparent' }} />
                    <input className="form-input" value={hubConfig.hub_cor}
                      onChange={e => setHubConfig(p => ({ ...p, hub_cor: e.target.value }))}
                      style={{ flex: 1 }} placeholder="#F37021" />
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Links ativos no hub</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                    {LINKS_CONFIG.map(link => {
                      const on = hubAtivos.includes(link.id);
                      return (
                        <label key={link.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                          <input type="checkbox" checked={on} onChange={() => toggleHubLink(link.id)}
                            style={{ width: 14, height: 14, accentColor: '#F37021' }} />
                          <span>{link.emoji}</span>
                          <span style={{ color: on ? 'var(--text-primary)' : 'var(--text-muted)' }}>{link.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button className="btn btn-primary" onClick={saveHubConfig} disabled={hubSaving} style={{ marginTop: 4 }}>
                  <FiSave size={13} style={{ marginRight: 6 }} />{hubSaving ? 'Salvando...' : 'Salvar Configurações'}
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </>
  );
}
