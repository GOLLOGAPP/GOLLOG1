import { useState, useEffect, useCallback } from 'react';
import Header from '../../components/layout/Header';
import { supabase } from '../../lib/supabase';
import {
  FiRefreshCw, FiPlay, FiStar, FiUsers,
  FiCheck, FiSave, FiZap, FiActivity
} from 'react-icons/fi';

const TABS = [
  { id: 'fila', label: 'Fila & Histórico' },
  { id: 'avaliacoes', label: 'Avaliações' },
  { id: 'inativos', label: 'Inativos' },
  { id: 'testes', label: '🧪 Testes' },
  { id: 'config', label: 'Configurações' },
];

const GRUPOS_TESTE = [
  {
    label: '💰 Cotações não contratadas',
    cor: '#448AFF',
    testes: [
      { tipo: 'cotacao_d1', label: 'D+1 — Lembrete suave' },
      { tipo: 'cotacao_d3', label: 'D+3 — Urgência moderada' },
      { tipo: 'cotacao_d7', label: 'D+7 — Última tentativa' },
    ],
  },
  {
    label: '👤 Cadastros sem cotação',
    cor: '#F37021',
    testes: [
      { tipo: 'cadastro_d1', label: 'D+1 — Boas-vindas' },
      { tipo: 'cadastro_d3', label: 'D+3 — Benefícios' },
      { tipo: 'cadastro_d7', label: 'D+7 — Oferta de ajuda' },
    ],
  },
  {
    label: '😴 Clientes inativos',
    cor: '#ffa726',
    testes: [
      { tipo: 'inativo_30d', label: '30 dias — Em risco' },
      { tipo: 'inativo_60d', label: '60 dias — Dormindo' },
      { tipo: 'inativo_90d', label: '90 dias — Reativação' },
    ],
  },
  {
    label: '📦 Rastreamento',
    cor: '#00C853',
    testes: [
      { tipo: 'rastreio_atualizacao', label: 'Mudança de status' },
      { tipo: 'rastreio_entregue', label: 'Entregue + link avaliação' },
    ],
  },
  {
    label: '🚚 Outras automações',
    cor: '#9C27B0',
    testes: [
      { tipo: 'coleta_hoje', label: 'Alerta de coleta do dia' },
      { tipo: 'relatorio_mensal', label: 'Relatório mensal' },
    ],
  },
];

const TIPO_LABELS = {
  cotacao_perdida_d1: 'Cotação D+1',
  cotacao_perdida_d3: 'Cotação D+3',
  cotacao_perdida_d7: 'Cotação D+7',
  cadastro_sem_cotacao_d1: 'Cadastro D+1',
  cadastro_sem_cotacao_d3: 'Cadastro D+3',
  cadastro_sem_cotacao_d7: 'Cadastro D+7',
  inativo_30d: 'Inativo 30d',
  inativo_60d: 'Inativo 60d',
  inativo_90d: 'Inativo 90d',
};

const STATUS_STYLE = {
  enviado: { cls: 'badge-success', label: 'Enviado' },
  pendente: { cls: 'badge-warning', label: 'Pendente' },
  convertido: { cls: 'badge-neutral', label: 'Convertido' },
  falhou: { cls: 'badge-danger', label: 'Falhou' },
  cancelado: { cls: 'badge-danger', label: 'Cancelado' },
};

const NOTA_COR = { 1: '#f44336', 2: '#ff7043', 3: '#ffa726', 4: '#66bb6a', 5: '#00C853' };

const CONFIGS_FOLLOWUP = [
  { group: 'Cotações não contratadas', key: 'followup_cotacao_ativo', isMain: true,
    sub: [
      { key: 'followup_cotacao_d1', label: 'D+1 — Lembrete suave' },
      { key: 'followup_cotacao_d3', label: 'D+3 — Urgência moderada' },
      { key: 'followup_cotacao_d7', label: 'D+7 — Última tentativa' },
    ]
  },
  { group: 'Cadastros sem cotação', key: 'followup_cadastro_ativo', isMain: true,
    sub: [
      { key: 'followup_cadastro_d1', label: 'D+1 — Boas-vindas + link' },
      { key: 'followup_cadastro_d3', label: 'D+3 — Benefícios GOLLOG' },
      { key: 'followup_cadastro_d7', label: 'D+7 — Oferta de ajuda' },
    ]
  },
  { group: 'Clientes inativos', key: 'followup_inativo_ativo', isMain: true,
    sub: [
      { key: 'followup_inativo_30d', label: '30 dias — Em risco' },
      { key: 'followup_inativo_60d', label: '60 dias — Dormindo' },
      { key: 'followup_inativo_90d', label: '90 dias — Perdido (reativação)' },
    ]
  },
  { group: 'Automações', key: null, isMain: false,
    sub: [
      { key: 'followup_rastreio_ativo', label: 'Polling de rastreamentos (2h)' },
      { key: 'followup_avaliacao_ativo', label: 'Avaliação pós-entrega' },
      { key: 'followup_coleta_alerta_ativo', label: 'Alerta de coleta do dia (7h)' },
      { key: 'followup_relatorio_mensal', label: 'Relatório mensal (dia 1)' },
    ]
  },
];

export default function FollowUpPage() {
  const [activeTab, setActiveTab] = useState('fila');
  const [followups, setFollowups] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [inativos, setInativos] = useState({ r30: [], r60: [], r90: [] });
  const [configs, setConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(null);
  const [configSaving, setConfigSaving] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [statusFila, setStatusFila] = useState('todos');
  const [stats, setStats] = useState({ enviados: 0, convertidos: 0, avaliacoes: 0, pendentes: 0 });

  // Test state
  const [testPhone, setTestPhone] = useState('');
  const [testNome, setTestNome] = useState('João Teste');
  const [testEmail, setTestEmail] = useState('');
  const [testCodigo, setTestCodigo] = useState('GLL-12345678');
  const [testOrigem, setTestOrigem] = useState('Osasco/SP');
  const [testDestino, setTestDestino] = useState('São Paulo/SP');
  const [testEnviar, setTestEnviar] = useState(false);
  const [testResults, setTestResults] = useState({});
  const [testLoading, setTestLoading] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [fuRes, avRes, cfgRes] = await Promise.all([
      supabase.from('followups').select('*, clientes(nome_razao_social, telefone)')
        .order('created_at', { ascending: false }).limit(100),
      supabase.from('avaliacoes').select('*, clientes(nome_razao_social, telefone)')
        .order('created_at', { ascending: false }).limit(50),
      supabase.from('configuracoes').select('chave, valor'),
    ]);

    const fus = fuRes.data || [];
    setFollowups(fus);
    setAvaliacoes(avRes.data || []);

    const cfg = Object.fromEntries((cfgRes.data || []).map(r => [r.chave, r.valor || '']));
    setConfigs(cfg);

    setStats({
      enviados: fus.filter(f => f.status === 'enviado').length,
      convertidos: fus.filter(f => f.status === 'convertido').length,
      pendentes: fus.filter(f => f.status === 'pendente').length,
      avaliacoes: (avRes.data || []).length,
    });

    // Clientes inativos
    const now = new Date();
    const cutoff = (d) => { const x = new Date(now); x.setDate(x.getDate() - d); return x.toISOString(); };
    const [i30, i60, i90] = await Promise.all([
      supabase.from('clientes').select('id, nome_razao_social, telefone, ultimo_contato, total_envios')
        .eq('status', 'ativo').gte('ultimo_contato', cutoff(40)).lte('ultimo_contato', cutoff(28)).order('ultimo_contato'),
      supabase.from('clientes').select('id, nome_razao_social, telefone, ultimo_contato, total_envios')
        .eq('status', 'ativo').gte('ultimo_contato', cutoff(75)).lte('ultimo_contato', cutoff(55)).order('ultimo_contato'),
      supabase.from('clientes').select('id, nome_razao_social, telefone, ultimo_contato, total_envios')
        .eq('status', 'ativo').lte('ultimo_contato', cutoff(88)).order('ultimo_contato'),
    ]);
    setInativos({ r30: i30.data || [], r60: i60.data || [], r90: i90.data || [] });
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const runCron = async (endpoint) => {
    setRunning(endpoint);
    try {
      const res = await fetch(`/api/cron/${endpoint}`, { method: 'POST' });
      const data = await res.json();
      alert(`✅ Executado com sucesso!\n\n${JSON.stringify(data, null, 2)}`);
      fetchAll();
    } catch {
      alert('Erro ao executar.');
    } finally {
      setRunning(null);
    }
  };

  const saveConfigs = async () => {
    setConfigSaving(true);
    const keys = CONFIGS_FOLLOWUP.flatMap(g => [
      ...(g.key ? [g.key] : []),
      ...g.sub.map(s => s.key),
    ]);
    const extraKeys = ['google_review_link', 'resend_api_key', 'resend_from_email', 'app_base_url', 'numero_interno_suporte'];
    for (const key of [...keys, ...extraKeys]) {
      if (configs[key] !== undefined) {
        await supabase.from('configuracoes')
          .update({ valor: configs[key], updated_at: new Date().toISOString() })
          .eq('chave', key);
      }
    }
    setConfigSaving(false);
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 3000);
  };

  const toggle = (key) => {
    setConfigs(p => ({ ...p, [key]: p[key] === 'true' ? 'false' : 'true' }));
  };

  const runTest = async (tipo) => {
    setTestLoading(tipo);
    try {
      const res = await fetch('/api/test/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          phone: testPhone,
          nome: testNome,
          email: testEmail,
          codigo: testCodigo,
          origem: testOrigem,
          destino: testDestino,
          enviar: testEnviar,
          valor: '45.90',
          servico: 'Rápido',
          status: 'Em trânsito',
          endereco: 'Rua Exemplo, 100 — Osasco',
          horario: '14h–18h',
          volumes: '2',
          enviosMes: '5',
          totalEnvios: '23',
        }),
      });
      const data = await res.json();
      setTestResults(prev => ({ ...prev, [tipo]: data }));
    } catch (err) {
      setTestResults(prev => ({ ...prev, [tipo]: { error: err.message } }));
    } finally {
      setTestLoading(null);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-';
  const daysAgo = (d) => {
    if (!d) return '-';
    const diff = Math.floor((Date.now() - new Date(d)) / 86400000);
    return diff === 0 ? 'Hoje' : `${diff}d atrás`;
  };

  const filaFiltrada = statusFila === 'todos' ? followups : followups.filter(f => f.status === statusFila);

  return (
    <>
      <Header title="Follow-Up" />
      <div className="page-content animate-in">

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Mensagens Enviadas', value: stats.enviados, icon: <FiActivity />, cor: 'var(--primary)' },
            { label: 'Conversões', value: stats.convertidos, icon: <FiCheck />, cor: 'var(--success)' },
            { label: 'Avaliações', value: stats.avaliacoes, icon: <FiStar />, cor: '#ffa726' },
            { label: 'Clientes Inativos', value: inativos.r30.length + inativos.r60.length + inativos.r90.length, icon: <FiUsers />, cor: 'var(--warning)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: s.cor }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
                </div>
                <div style={{ color: s.cor, opacity: 0.5, fontSize: 22 }}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Ações rápidas */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button className="btn btn-primary btn-sm" disabled={!!running}
            onClick={() => runCron('followup')}>
            {running === 'followup' ? <><FiRefreshCw size={13} className="spin" /> Executando...</> : <><FiPlay size={13} /> Rodar Follow-Up Agora</>}
          </button>
          <button className="btn btn-secondary btn-sm" disabled={!!running}
            onClick={() => runCron('rastreio')}>
            {running === 'rastreio' ? <><FiRefreshCw size={13} className="spin" /> Executando...</> : <><FiZap size={13} /> Polling Rastreios Agora</>}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={fetchAll} disabled={loading}>
            <FiRefreshCw size={13} /> Atualizar
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 18px', fontSize: 13, fontWeight: 600, border: 'none', background: 'none',
                cursor: 'pointer', borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                marginBottom: -1,
              }}>
              {tab.label}
              {tab.id === 'inativos' && (inativos.r30.length + inativos.r60.length + inativos.r90.length) > 0 &&
                <span style={{ marginLeft: 6, background: 'var(--warning)', color: '#fff', borderRadius: 8, padding: '1px 6px', fontSize: 10 }}>
                  {inativos.r30.length + inativos.r60.length + inativos.r90.length}
                </span>}
            </button>
          ))}
        </div>

        {loading ? <div className="empty-state"><p>Carregando...</p></div> : (
          <>
            {/* ── FILA ── */}
            {activeTab === 'fila' && (
              <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="card-title">Histórico de Follow-Ups</span>
                  <select className="unit-selector" value={statusFila} onChange={e => setStatusFila(e.target.value)}>
                    <option value="todos">Todos</option>
                    <option value="enviado">Enviados</option>
                    <option value="pendente">Pendentes</option>
                    <option value="convertido">Convertidos</option>
                    <option value="falhou">Falhou</option>
                  </select>
                </div>
                {filaFiltrada.length === 0 ? (
                  <div className="empty-state">
                    <div className="icon">📬</div>
                    <h3>Nenhum follow-up encontrado</h3>
                    <p>Execute o motor de follow-up para processar a fila.</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Tipo</th>
                          <th>Cliente</th>
                          <th>Canal</th>
                          <th>Status</th>
                          <th>Enviado em</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filaFiltrada.map(f => {
                          const st = STATUS_STYLE[f.status] || STATUS_STYLE.pendente;
                          return (
                            <tr key={f.id}>
                              <td>
                                <span style={{ fontSize: 12, background: 'rgba(243,112,33,0.1)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                                  {TIPO_LABELS[f.tipo] || f.tipo}
                                </span>
                              </td>
                              <td>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{f.clientes?.nome_razao_social || '—'}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.clientes?.telefone}</div>
                              </td>
                              <td style={{ fontSize: 12 }}>📱 {f.canal}</td>
                              <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                              <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(f.sent_at || f.created_at)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── AVALIAÇÕES ── */}
            {activeTab === 'avaliacoes' && (
              <div className="card">
                <div className="card-header"><span className="card-title">Avaliações de Serviço</span></div>
                {avaliacoes.length === 0 ? (
                  <div className="empty-state">
                    <div className="icon">⭐</div>
                    <h3>Nenhuma avaliação ainda</h3>
                    <p>As avaliações aparecem automaticamente após a entrega.</p>
                  </div>
                ) : (
                  <>
                    {/* Resumo */}
                    <div style={{ display: 'flex', gap: 16, padding: '0 0 16px', flexWrap: 'wrap' }}>
                      {[5, 4, 3, 2, 1].map(n => {
                        const count = avaliacoes.filter(a => a.nota === n).length;
                        const pct = avaliacoes.length > 0 ? (count / avaliacoes.length * 100).toFixed(0) : 0;
                        return (
                          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: NOTA_COR[n] }}>{'★'.repeat(n)}</span>
                            <div style={{ width: 60, height: 6, background: 'var(--bg-surface)', borderRadius: 3 }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: NOTA_COR[n], borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{count}</span>
                          </div>
                        );
                      })}
                      <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#ffa726' }}>
                          {(avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length).toFixed(1)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>média geral</div>
                      </div>
                    </div>
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Cliente</th>
                            <th>Nota</th>
                            <th>Código</th>
                            <th>Comentário</th>
                            <th>Ticket</th>
                            <th>Data</th>
                          </tr>
                        </thead>
                        <tbody>
                          {avaliacoes.map(a => (
                            <tr key={a.id}>
                              <td>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{a.clientes?.nome_razao_social || '—'}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.clientes?.telefone}</div>
                              </td>
                              <td>
                                <span style={{ fontWeight: 800, color: NOTA_COR[a.nota], fontSize: 16 }}>
                                  {'★'.repeat(a.nota)}
                                </span>
                              </td>
                              <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{a.codigo_rastreio}</td>
                              <td style={{ fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {a.comentario || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                              </td>
                              <td>
                                {a.ticket_criado
                                  ? <span className="badge badge-danger" style={{ fontSize: 10 }}>Criado</span>
                                  : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                              </td>
                              <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(a.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── INATIVOS ── */}
            {activeTab === 'inativos' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: '🔴 Em Risco (30 dias)', data: inativos.r30, cor: '#f44336' },
                  { label: '🟡 Dormindo (60 dias)', data: inativos.r60, cor: '#ffa726' },
                  { label: '⚫ Perdidos (90+ dias)', data: inativos.r90, cor: '#9e9e9e' },
                ].map(seg => (
                  <div key={seg.label} className="card">
                    <div className="card-header" style={{ borderLeft: `3px solid ${seg.cor}`, paddingLeft: 12 }}>
                      <span className="card-title">{seg.label}</span>
                      <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }}>{seg.data.length} cliente(s)</span>
                    </div>
                    {seg.data.length === 0 ? (
                      <div style={{ padding: '16px 20px', fontSize: 13, color: 'var(--text-muted)' }}>
                        Nenhum cliente neste segmento. ✅
                      </div>
                    ) : (
                      <div className="table-container">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Cliente</th>
                              <th>Telefone</th>
                              <th>Envios</th>
                              <th>Último Contato</th>
                              <th>Inatividade</th>
                            </tr>
                          </thead>
                          <tbody>
                            {seg.data.map(c => (
                              <tr key={c.id}>
                                <td style={{ fontWeight: 600, fontSize: 13 }}>{c.nome_razao_social}</td>
                                <td style={{ fontSize: 12 }}>{c.telefone}</td>
                                <td style={{ fontWeight: 600 }}>{c.total_envios || 0}</td>
                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                  {c.ultimo_contato ? new Date(c.ultimo_contato).toLocaleDateString('pt-BR') : '-'}
                                </td>
                                <td>
                                  <span style={{ color: seg.cor, fontWeight: 700, fontSize: 13 }}>
                                    {daysAgo(c.ultimo_contato)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── TESTES ── */}
            {activeTab === 'testes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Painel de dados de teste */}
                <div className="card">
                  <div className="card-header"><span className="card-title">⚙️ Dados para o teste</span></div>
                  <div className="card-body">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Nome</label>
                        <input className="form-input" value={testNome}
                          onChange={e => setTestNome(e.target.value)} placeholder="João Teste" />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Telefone (com DDI)</label>
                        <input className="form-input" value={testPhone}
                          onChange={e => setTestPhone(e.target.value)} placeholder="5511999999999" />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">E-mail (opcional)</label>
                        <input className="form-input" type="email" value={testEmail}
                          onChange={e => setTestEmail(e.target.value)} placeholder="teste@email.com" />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Código de rastreio</label>
                        <input className="form-input" value={testCodigo}
                          onChange={e => setTestCodigo(e.target.value)} placeholder="GLL-12345678" />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Cidade origem</label>
                        <input className="form-input" value={testOrigem}
                          onChange={e => setTestOrigem(e.target.value)} placeholder="Osasco/SP" />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Cidade destino</label>
                        <input className="form-input" value={testDestino}
                          onChange={e => setTestDestino(e.target.value)} placeholder="São Paulo/SP" />
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: testEnviar ? 'rgba(243,112,33,0.08)' : 'var(--bg-surface)', borderRadius: 8, border: `1px solid ${testEnviar ? 'rgba(243,112,33,0.3)' : 'var(--border)'}` }}>
                      <ToggleSwitch value={testEnviar} onChange={() => setTestEnviar(v => !v)} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: testEnviar ? 'var(--primary)' : 'var(--text-secondary)' }}>
                          {testEnviar ? '📱 Envio real ativado' : '👁️ Modo preview (sem envio)'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {testEnviar
                            ? 'A mensagem será enviada de verdade para o telefone acima via BotConversa'
                            : 'Gera a mensagem mas NÃO envia — seguro para ver o texto antes'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grupos de teste */}
                {GRUPOS_TESTE.map(grupo => (
                  <div key={grupo.label} className="card">
                    <div className="card-header" style={{ borderLeft: `3px solid ${grupo.cor}`, paddingLeft: 12 }}>
                      <span className="card-title">{grupo.label}</span>
                    </div>
                    <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {grupo.testes.map(t => {
                        const res = testResults[t.tipo];
                        const isLoading = testLoading === t.tipo;
                        return (
                          <div key={t.tipo} style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                            {/* Header do teste */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-surface)' }}>
                              <div>
                                <span style={{ fontSize: 13, fontWeight: 600 }}>{t.label}</span>
                                <span style={{ marginLeft: 8, fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{t.tipo}</span>
                              </div>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                {res && !res.error && (
                                  <>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: res.wppEnviado ? 'var(--success)' : res.mensagem ? 'var(--text-muted)' : undefined }}>
                                      {res.wppEnviado ? '✅ WPP enviado' : res.mensagem ? '📱 WPP preview' : ''}
                                    </span>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: res.emailEnviado ? 'var(--success)' : res.emailSubject ? 'var(--text-muted)' : undefined }}>
                                      {res.emailEnviado ? '✅ Email enviado' : res.emailSubject ? '📧 Email preview' : ''}
                                    </span>
                                  </>
                                )}
                                {res?.error && <span style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600 }}>❌ Erro</span>}
                                <button
                                  className="btn btn-primary btn-sm"
                                  disabled={isLoading}
                                  onClick={() => runTest(t.tipo)}
                                  style={{ background: grupo.cor, border: 'none', minWidth: 90 }}
                                >
                                  {isLoading
                                    ? <><FiRefreshCw size={12} className="spin" /> Gerando...</>
                                    : <><FiPlay size={12} /> Testar</>}
                                </button>
                              </div>
                            </div>

                            {/* Preview WhatsApp + Email */}
                            {res && !res.error && res.mensagem && (
                              <div style={{ borderTop: '1px solid var(--border)' }}>
                                {/* WhatsApp */}
                                <div style={{ padding: '12px 14px', background: '#0d1117' }}>
                                  <div style={{ fontSize: 10, color: '#666', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span>📱</span> WhatsApp
                                    {res.wppEnviado && <span style={{ color: 'var(--success)', fontWeight: 700 }}>• Enviado</span>}
                                    {testEnviar && !res.wppEnviado && testPhone && <span style={{ color: 'var(--danger)', fontWeight: 700 }}>• Falhou</span>}
                                  </div>
                                  <div style={{
                                    background: '#dcf8c6', color: '#111', padding: '10px 12px',
                                    borderRadius: '8px 8px 0 8px', fontSize: 13, lineHeight: 1.6,
                                    maxWidth: 380, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                                  }}>
                                    {res.mensagem}
                                  </div>
                                  {res.link_avaliacao && (
                                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                                      🔗 Link avaliação: <a href={res.link_avaliacao} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>{res.link_avaliacao}</a>
                                    </div>
                                  )}
                                </div>

                                {/* Email */}
                                {res.emailSubject && (
                                  <div style={{ padding: '12px 14px', background: '#111827', borderTop: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: 10, color: '#666', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <span>📧</span> Email
                                      {res.emailEnviado && <span style={{ color: 'var(--success)', fontWeight: 700 }}>• Enviado</span>}
                                      {testEnviar && !res.emailEnviado && testEmail && <span style={{ color: 'var(--danger)', fontWeight: 700 }}>• Falhou (sem API Key Resend?)</span>}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                                      <strong style={{ color: 'var(--text-secondary)' }}>Assunto:</strong> {res.emailSubject}
                                    </div>
                                    <iframe
                                      srcDoc={res.emailHtml}
                                      style={{ width: '100%', height: 320, border: '1px solid var(--border)', borderRadius: 8, background: '#fff' }}
                                      title="preview-email"
                                      sandbox="allow-same-origin"
                                    />
                                  </div>
                                )}

                                {/* Erros */}
                                {res.erros && res.erros.length > 0 && (
                                  <div style={{ padding: '10px 14px', background: 'rgba(255,82,82,0.08)', borderTop: '1px solid var(--border)' }}>
                                    {res.erros.map((e, i) => (
                                      <div key={i} style={{ fontSize: 12, color: 'var(--danger)' }}>⚠️ {e}</div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            {res?.error && (
                              <div style={{ padding: '10px 14px', background: 'rgba(255,82,82,0.08)', fontSize: 12, color: 'var(--danger)' }}>
                                {res.error}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── CONFIGURAÇÕES ── */}
            {activeTab === 'config' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {configSaved && (
                  <div style={{ background: 'rgba(0,200,83,0.1)', border: '1px solid rgba(0,200,83,0.3)', color: '#00C853', padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FiCheck size={16} /> Configurações salvas!
                  </div>
                )}

                {/* Automações por grupo */}
                {CONFIGS_FOLLOWUP.map(grupo => (
                  <div key={grupo.group} className="card">
                    <div className="card-header">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span className="card-title">{grupo.group}</span>
                        {grupo.key && (
                          <ToggleSwitch
                            value={configs[grupo.key] === 'true'}
                            onChange={() => toggle(grupo.key)}
                            label={configs[grupo.key] === 'true' ? 'Ativo' : 'Pausado'}
                          />
                        )}
                      </div>
                    </div>
                    <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {grupo.sub.map(item => (
                        <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.label}</span>
                          <ToggleSwitch
                            value={configs[item.key] === 'true'}
                            onChange={() => toggle(item.key)}
                            disabled={grupo.key && configs[grupo.key] !== 'true'}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Configurações de integração */}
                <div className="card">
                  <div className="card-header"><span className="card-title">🔗 Integrações</span></div>
                  <div className="card-body">
                    <div className="form-group">
                      <label className="form-label">Link Google Minha Empresa (avaliação 5 estrelas)</label>
                      <input className="form-input" placeholder="https://g.page/r/seu-negocio/review"
                        value={configs.google_review_link || ''}
                        onChange={e => setConfigs(p => ({ ...p, google_review_link: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">URL Base do App</label>
                      <input className="form-input" placeholder="https://gollog-1.vercel.app"
                        value={configs.app_base_url || ''}
                        onChange={e => setConfigs(p => ({ ...p, app_base_url: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Número interno (alertas avaliações negativas)</label>
                      <input className="form-input" placeholder="5511999999999 (com DDI)"
                        value={configs.numero_interno_suporte || ''}
                        onChange={e => setConfigs(p => ({ ...p, numero_interno_suporte: e.target.value }))} />
                    </div>
                  </div>
                </div>

                {/* E-mail (Resend) */}
                <div className="card">
                  <div className="card-header"><span className="card-title">📧 E-mail Transacional (Resend)</span></div>
                  <div className="card-body">
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                      Configure uma conta gratuita em <strong>resend.com</strong> para envio de emails (até 3.000/mês grátis).
                    </p>
                    <div className="form-group">
                      <label className="form-label">API Key do Resend</label>
                      <input className="form-input" type="password" placeholder="re_..."
                        value={configs.resend_api_key || ''}
                        onChange={e => setConfigs(p => ({ ...p, resend_api_key: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">E-mail Remetente</label>
                      <input className="form-input" placeholder="GOLLOG <noreply@seudominio.com>"
                        value={configs.resend_from_email || ''}
                        onChange={e => setConfigs(p => ({ ...p, resend_from_email: e.target.value }))} />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={saveConfigs} disabled={configSaving}>
                    {configSaving ? 'Salvando...' : <><FiSave size={14} /> Salvar Configurações</>}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function ToggleSwitch({ value, onChange, label = '', disabled = false }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1 }}>
      {label && <span style={{ fontSize: 12, color: value ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600 }}>{label}</span>}
      <div
        onClick={disabled ? undefined : onChange}
        style={{
          width: 40, height: 22, borderRadius: 11,
          background: value ? 'var(--primary)' : 'var(--border)',
          position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        }}>
        <div style={{
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          position: 'absolute', top: 3, left: value ? 21 : 3,
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </div>
    </label>
  );
}
