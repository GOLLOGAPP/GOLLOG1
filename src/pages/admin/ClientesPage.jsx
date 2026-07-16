import { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';
import {
  FiSearch, FiPlus, FiDownload, FiEye, FiEdit2, FiTrash2, FiX,
  FiUser, FiBriefcase, FiRefreshCw, FiSave, FiAlertTriangle,
  FiPackage, FiDollarSign, FiTruck, FiActivity, FiClock
} from 'react-icons/fi';

const statusMap = {
  ativo: { label:'Ativo', cls:'badge-success' },
  inativo: { label:'Inativo', cls:'badge-danger' },
  prospecto: { label:'Prospecto', cls:'badge-warning' },
};

const TABS = [
  { id:'info', label:'Dados' },
  { id:'historico', label:'Histórico' },
  { id:'cotacoes', label:'Cotações' },
  { id:'coletas', label:'Coletas' },
  { id:'rastreamentos', label:'Rastreamentos' },
];

const formatBotConversaName = (cliente) => {
  const nome = (cliente?.nome_razao_social || '').trim();
  if (cliente?.tipo === 'PF') {
    const partes = nome.split(/\s+/);
    const primeiroNome = partes[0] || '';
    const sobrenome = partes.slice(1).join(' ') || '';
    return { primeiroNome, sobrenome };
  }
  // PJ: padrão "Responsável - Empresa" (quando há responsável cadastrado)
  const contato = (cliente?.nome_contato || '').trim();
  return { primeiroNome: contato ? `${contato} - ${nome}` : nome, sobrenome: '' };
};

const formatBotConversaPhone = (telefone) => {
  let telLimpo = (telefone || '').replace(/\D/g, '');
  if (telLimpo) {
    if (!telLimpo.startsWith('55') && telLimpo.length >= 10) {
      telLimpo = '55' + telLimpo;
    }
  }
  return telLimpo;
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Export states
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('padrao'); // 'padrao' ou 'botconversa'

  // New client modal
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newForm, setNewForm] = useState({
    tipo:'PF', nome:'', cpf_cnpj:'', nome_contato:'', telefone:'', email:'',
    endereco:'', cep:'', cidade:'', estado:'', unidade:'Osasco', status:'ativo'
  });

  // Detail modal
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  const [history, setHistory] = useState({ atividades:[], cotacoes:[], coletas:[], rastreamentos:[] });
  const [histLoading, setHistLoading] = useState(false);

  // Edit modal
  const [editCliente, setEditCliente] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchClientes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setClientes(data);
    setLoading(false);
  };

  const handleExport = () => {
    let exportData = [];

    if (exportFormat === 'botconversa') {
      exportData = filtered.map(c => {
        const { primeiroNome, sobrenome } = formatBotConversaName(c);
        const telefoneFormato = formatBotConversaPhone(c.telefone);
        const etiquetas = Array.isArray(c.tags) ? c.tags.join(', ') : '';

        return {
          'Primeiro nome': primeiroNome,
          'Sobrenome': sobrenome,
          'Telefone': telefoneFormato,
          'Etiquetas': etiquetas,
        };
      });
    } else {
      exportData = filtered.map(c => ({
        'Nome / Razão Social': c.nome_razao_social || '',
        'Tipo': c.tipo === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física',
        'Documento': c.cpf_cnpj || '',
        'Telefone': c.telefone || '',
        'E-mail': c.email || '',
        'Unidade': c.unidade_atendimento || '',
        'Status': c.status || '',
        'Total de Envios': c.total_envios || 0,
        'Valor Total Gasto': c.valor_total_gasto || 0,
        'Data de Cadastro': c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : '',
        'Etiquetas': Array.isArray(c.tags) ? c.tags.join(', ') : '',
      }));
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, exportFormat === 'botconversa' ? 'BotConversa' : 'Clientes');

    // Auto-fit columns
    const maxProps = Object.keys(exportData[0] || {});
    worksheet['!cols'] = maxProps.map(key => ({
      wch: Math.max(key.length + 4, ...exportData.map(row => String(row[key] || '').length + 2))
    }));

    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = exportFormat === 'botconversa' 
      ? `clientes_botconversa_${dateStr}.xlsx` 
      : `clientes_sistema_${dateStr}.xlsx`;

    XLSX.writeFile(workbook, fileName);
    setShowExportModal(false);
  };

  useEffect(() => { fetchClientes(); }, []);

  const fetchHistory = async (clienteId) => {
    setHistLoading(true);
    const [ativ, cot, col, rast] = await Promise.all([
      supabase.from('atividades_log').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false }).limit(50),
      supabase.from('cotacoes').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false }).limit(30),
      supabase.from('coletas').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false }).limit(30),
      supabase.from('rastreamentos').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false }).limit(30),
    ]);
    setHistory({
      atividades: ativ.data || [],
      cotacoes: cot.data || [],
      coletas: col.data || [],
      rastreamentos: rast.data || [],
    });
    setHistLoading(false);
  };

  const openDetail = (c) => {
    setSelectedCliente(c);
    setActiveTab('info');
    fetchHistory(c.id);
  };

  const openEdit = (c, e) => {
    if (e) e.stopPropagation();
    setEditCliente(c);
    setEditForm({
      tipo: c.tipo || 'PF',
      nome: c.nome_razao_social || '',
      nome_contato: c.nome_contato || '',
      cpf_cnpj: c.cpf_cnpj || '',
      telefone: c.telefone || '',
      email: c.email || '',
      endereco: c.endereco_completo || '',
      cep: c.cep || '',
      cidade: c.cidade || '',
      estado: c.estado || '',
      unidade: c.unidade_atendimento || 'Osasco',
      status: c.status || 'ativo',
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    const { error } = await supabase.from('clientes').update({
      tipo: editForm.tipo,
      nome_razao_social: editForm.nome,
      nome_contato: editForm.nome_contato || null,
      cpf_cnpj: editForm.cpf_cnpj,
      telefone: editForm.telefone,
      email: editForm.email || null,
      endereco_completo: editForm.endereco || null,
      cep: editForm.cep || null,
      cidade: editForm.cidade || null,
      estado: editForm.estado || null,
      unidade_atendimento: editForm.unidade,
      status: editForm.status,
    }).eq('id', editCliente.id);
    setEditSaving(false);
    if (!error) {
      setEditCliente(null);
      fetchClientes();
    } else {
      alert('Erro: ' + error.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('clientes').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (!error) {
      setDeleteTarget(null);
      if (selectedCliente?.id === deleteTarget.id) setSelectedCliente(null);
      fetchClientes();
    } else {
      alert('Erro ao excluir: ' + error.message);
    }
  };

  const handleNewCliente = async (e) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('clientes').insert([{
      tipo: newForm.tipo,
      nome_razao_social: newForm.nome,
      nome_contato: newForm.nome_contato || null,
      cpf_cnpj: newForm.cpf_cnpj,
      telefone: newForm.telefone,
      email: newForm.email,
      endereco_completo: newForm.endereco,
      cep: newForm.cep,
      cidade: newForm.cidade,
      estado: newForm.estado,
      unidade_atendimento: newForm.unidade,
      status: newForm.status || 'ativo',
      tags: [],
    }]);
    setSaving(false);
    if (!error) {
      setShowModal(false);
      setNewForm({ tipo:'PF', nome:'', cpf_cnpj:'', nome_contato:'', telefone:'', email:'', endereco:'', cep:'', cidade:'', estado:'', unidade:'Osasco', status:'ativo' });
      fetchClientes();
    } else {
      alert('Erro: ' + error.message);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'short' }) : '-';

  const filtered = clientes.filter(c => {
    const s = search.toLowerCase();
    const matchSearch = !search ||
      (c.nome_razao_social || '').toLowerCase().includes(s) ||
      (c.cpf_cnpj || '').includes(search) ||
      (c.telefone || '').includes(search);
    const matchTipo = !filterTipo || c.tipo === filterTipo;
    const matchStatus = !filterStatus || c.status === filterStatus;
    return matchSearch && matchTipo && matchStatus;
  });

  return (
    <>
      <Header title="Clientes" />
      <div className="page-content animate-in">
        {/* Toolbar */}
        <div className="flex-between mb-24">
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <div className="search-wrapper">
              <FiSearch className="search-icon" />
              <input className="search-input" placeholder="Buscar por nome, CPF/CNPJ, telefone..."
                value={search} onChange={e => setSearch(e.target.value)} style={{ width:320 }} />
            </div>
            <select className="unit-selector" value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
              <option value="">Todos os tipos</option>
              <option value="PF">Pessoa Física</option>
              <option value="PJ">Pessoa Jurídica</option>
            </select>
            <select className="unit-selector" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="prospecto">Prospecto</option>
              <option value="inativo">Inativo</option>
            </select>
            <button className="btn btn-ghost btn-sm" onClick={fetchClientes} title="Atualizar">
              <FiRefreshCw size={14}/>
            </button>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowExportModal(true)}><FiDownload size={14}/> Exportar</button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}><FiPlus size={14}/> Novo Cliente</button>
          </div>
        </div>

        {/* Summary */}
        <div style={{ display:'flex', gap:16, marginBottom:20 }}>
          <span style={{ fontSize:13, color:'var(--text-muted)' }}>
            <strong style={{ color:'var(--text-primary)' }}>{filtered.length}</strong> clientes encontrados
          </span>
          <span style={{ fontSize:13, color:'var(--text-muted)' }}>
            · <strong style={{ color:'var(--success)' }}>{filtered.filter(c=>c.status==='ativo').length}</strong> ativos
            · <strong style={{ color:'var(--warning)' }}>{filtered.filter(c=>c.status==='prospecto').length}</strong> prospectos
          </span>
        </div>

        {/* Table */}
        <div className="card">
          {loading ? (
            <div className="empty-state"><p>Carregando...</p></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="icon">👥</div>
              <h3>Nenhum cliente encontrado</h3>
              <p>Cadastre o primeiro cliente ou ajuste os filtros.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Documento</th>
                    <th>Telefone</th>
                    <th>Unidade</th>
                    <th>Status</th>
                    <th>Envios</th>
                    <th>Valor Total</th>
                    <th>Cadastro</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const tags = Array.isArray(c.tags) ? c.tags : [];
                    const st = statusMap[c.status] || statusMap.prospecto;
                    return (
                      <tr key={c.id} style={{ cursor:'pointer' }} onClick={() => openDetail(c)}>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{
                              width:34, height:34, borderRadius:'50%',
                              background: c.tipo === 'PJ' ? 'rgba(68,138,255,0.12)' : 'rgba(243,112,33,0.12)',
                              display:'flex', alignItems:'center', justifyContent:'center',
                              color: c.tipo === 'PJ' ? '#448AFF' : '#F37021', fontSize:14
                            }}>
                              {c.tipo === 'PJ' ? <FiBriefcase/> : <FiUser/>}
                            </div>
                            <div>
                              <div className="name-cell">{c.nome_razao_social}</div>
                              {tags.length > 0 && (
                                <div style={{ display:'flex', gap:4, marginTop:2 }}>
                                  {tags.map(t => (
                                    <span key={t} style={{
                                      background:'rgba(243,112,33,0.1)', color:'#F37021',
                                      padding:'1px 6px', borderRadius:4, fontSize:10, fontWeight:600
                                    }}>{t}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ fontFamily:'monospace', fontSize:12 }}>{c.cpf_cnpj || '-'}</td>
                        <td>{c.telefone}</td>
                        <td>{c.unidade_atendimento || '-'}</td>
                        <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                        <td style={{ fontWeight:600 }}>{c.total_envios || 0}</td>
                        <td style={{ color:'var(--success)', fontWeight:600 }}>
                          R$ {(c.valor_total_gasto || 0).toLocaleString('pt-BR', { minimumFractionDigits:2 })}
                        </td>
                        <td style={{ color:'var(--text-muted)', fontSize:12 }}>{formatDate(c.created_at)}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display:'flex', gap:4 }}>
                            <button className="btn btn-ghost btn-icon btn-sm" title="Ver" onClick={() => openDetail(c)}>
                              <FiEye size={14}/>
                            </button>
                            <button className="btn btn-ghost btn-icon btn-sm" title="Editar" onClick={(e) => openEdit(c, e)}>
                              <FiEdit2 size={14}/>
                            </button>
                            <button className="btn btn-ghost btn-icon btn-sm" title="Excluir"
                              style={{ color:'var(--danger)' }}
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); }}>
                              <FiTrash2 size={14}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── CLIENT DETAIL MODAL ── */}
        {selectedCliente && (
          <div className="modal-overlay" onClick={() => setSelectedCliente(null)}>
            <div className="modal" style={{ maxWidth:760, width:'95vw' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{
                    width:40, height:40, borderRadius:'50%',
                    background: selectedCliente.tipo === 'PJ' ? 'rgba(68,138,255,0.12)' : 'rgba(243,112,33,0.12)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color: selectedCliente.tipo === 'PJ' ? '#448AFF' : '#F37021', fontSize:16
                  }}>
                    {selectedCliente.tipo === 'PJ' ? <FiBriefcase/> : <FiUser/>}
                  </div>
                  <div>
                    <div className="modal-title" style={{ fontSize:16 }}>{selectedCliente.nome_razao_social}</div>
                    <div style={{ display:'flex', gap:6, marginTop:2 }}>
                      <span className={`badge ${(statusMap[selectedCliente.status] || statusMap.prospecto).cls}`} style={{ fontSize:10 }}>
                        {(statusMap[selectedCliente.status] || statusMap.prospecto).label}
                      </span>
                      <span className="badge badge-neutral" style={{ fontSize:10 }}>
                        {selectedCliente.tipo === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                      </span>
                    </div>
                  </div>
                </div>
                <button className="btn btn-ghost btn-icon" onClick={() => setSelectedCliente(null)}><FiX/></button>
              </div>

              {/* Tabs */}
              <div style={{ display:'flex', borderBottom:'1px solid var(--border)', padding:'0 24px' }}>
                {TABS.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    style={{
                      padding:'10px 16px', fontSize:13, fontWeight:600, border:'none', background:'none',
                      cursor:'pointer', borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                      color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                      marginBottom:-1
                    }}>
                    {tab.label}
                    {tab.id === 'cotacoes' && history.cotacoes.length > 0 &&
                      <span style={{ marginLeft:4, background:'var(--primary)', color:'#fff', borderRadius:8, padding:'1px 5px', fontSize:10 }}>{history.cotacoes.length}</span>}
                    {tab.id === 'coletas' && history.coletas.length > 0 &&
                      <span style={{ marginLeft:4, background:'var(--primary)', color:'#fff', borderRadius:8, padding:'1px 5px', fontSize:10 }}>{history.coletas.length}</span>}
                    {tab.id === 'rastreamentos' && history.rastreamentos.length > 0 &&
                      <span style={{ marginLeft:4, background:'var(--primary)', color:'#fff', borderRadius:8, padding:'1px 5px', fontSize:10 }}>{history.rastreamentos.length}</span>}
                  </button>
                ))}
              </div>

              <div className="modal-body" style={{ maxHeight:'55vh', overflowY:'auto' }}>
                {/* TAB: DADOS */}
                {activeTab === 'info' && (
                  <>
                    <div className="grid-2" style={{ gap:10, marginBottom:16 }}>
                      <div style={{ background:'var(--bg-surface)', padding:12, borderRadius:8 }}>
                        <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>📄 Documento</div>
                        <div style={{ fontSize:13, fontWeight:600, fontFamily:'monospace' }}>{selectedCliente.cpf_cnpj || '-'}</div>
                      </div>
                      <div style={{ background:'var(--bg-surface)', padding:12, borderRadius:8 }}>
                        <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>📍 Unidade</div>
                        <div style={{ fontSize:13, fontWeight:600 }}>{selectedCliente.unidade_atendimento || '-'}</div>
                      </div>
                      <div style={{ background:'var(--bg-surface)', padding:12, borderRadius:8 }}>
                        <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>📞 Telefone</div>
                        <div style={{ fontSize:13, fontWeight:600 }}>{selectedCliente.telefone || '-'}</div>
                      </div>
                      <div style={{ background:'var(--bg-surface)', padding:12, borderRadius:8 }}>
                        <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>✉️ E-mail</div>
                        <div style={{ fontSize:13, fontWeight:600 }}>{selectedCliente.email || '-'}</div>
                      </div>
                      {selectedCliente.nome_contato && (
                        <div style={{ background:'var(--bg-surface)', padding:12, borderRadius:8 }}>
                          <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>👤 Contato</div>
                          <div style={{ fontSize:13, fontWeight:600 }}>{selectedCliente.nome_contato}</div>
                        </div>
                      )}
                      <div style={{ background:'var(--bg-surface)', padding:12, borderRadius:8, gridColumn: selectedCliente.nome_contato ? undefined : '1/-1' }}>
                        <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>🏠 Endereço</div>
                        <div style={{ fontSize:13, fontWeight:600 }}>
                          {[selectedCliente.endereco_completo, selectedCliente.cidade && `${selectedCliente.cidade} - ${selectedCliente.estado}`].filter(Boolean).join(', ') || '-'}
                        </div>
                      </div>
                    </div>
                    <div className="grid-3" style={{ gap:10 }}>
                      <div style={{ background:'var(--bg-surface)', padding:14, borderRadius:8, textAlign:'center' }}>
                        <div style={{ fontSize:22, fontWeight:800, color:'var(--primary)' }}>{selectedCliente.total_envios || 0}</div>
                        <div style={{ fontSize:11, color:'var(--text-muted)' }}>Envios</div>
                      </div>
                      <div style={{ background:'var(--bg-surface)', padding:14, borderRadius:8, textAlign:'center' }}>
                        <div style={{ fontSize:18, fontWeight:800, color:'var(--success)' }}>
                          R$ {(selectedCliente.valor_total_gasto || 0).toLocaleString('pt-BR', { minimumFractionDigits:2 })}
                        </div>
                        <div style={{ fontSize:11, color:'var(--text-muted)' }}>Valor Total</div>
                      </div>
                      <div style={{ background:'var(--bg-surface)', padding:14, borderRadius:8, textAlign:'center' }}>
                        <div style={{ fontSize:15, fontWeight:800, color:'var(--info)' }}>{formatDate(selectedCliente.created_at)}</div>
                        <div style={{ fontSize:11, color:'var(--text-muted)' }}>Cadastro</div>
                      </div>
                    </div>
                  </>
                )}

                {/* TAB: HISTÓRICO */}
                {activeTab === 'historico' && (
                  histLoading ? <div style={{ textAlign:'center', padding:32, color:'var(--text-muted)' }}>Carregando...</div> :
                  history.atividades.length === 0 ? (
                    <div style={{ textAlign:'center', padding:32, color:'var(--text-muted)' }}>
                      <FiActivity size={32} style={{ opacity:0.3 }}/>
                      <p>Nenhuma atividade registrada.</p>
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {history.atividades.map(a => (
                        <div key={a.id} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                          <div style={{
                            width:32, height:32, borderRadius:'50%', flexShrink:0,
                            background:'rgba(243,112,33,0.1)', display:'flex', alignItems:'center',
                            justifyContent:'center', color:'var(--primary)', fontSize:13
                          }}>
                            {a.tipo === 'cotacao' ? <FiDollarSign/> : a.tipo === 'rastreamento' ? <FiPackage/> : a.tipo === 'coleta' ? <FiTruck/> : <FiActivity/>}
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{a.descricao}</div>
                            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2, display:'flex', gap:8 }}>
                              <span><FiClock size={10}/> {formatDateTime(a.created_at)}</span>
                              {a.canal && <span style={{ background:'rgba(68,138,255,0.1)', color:'#448AFF', padding:'0 5px', borderRadius:4 }}>{a.canal}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* TAB: COTAÇÕES */}
                {activeTab === 'cotacoes' && (
                  histLoading ? <div style={{ textAlign:'center', padding:32, color:'var(--text-muted)' }}>Carregando...</div> :
                  history.cotacoes.length === 0 ? (
                    <div style={{ textAlign:'center', padding:32, color:'var(--text-muted)' }}>
                      <FiDollarSign size={32} style={{ opacity:0.3 }}/>
                      <p>Nenhuma cotação encontrada.</p>
                    </div>
                  ) : (
                    <table className="data-table" style={{ fontSize:12 }}>
                      <thead>
                        <tr>
                          <th>Origem → Destino</th>
                          <th>Peso</th>
                          <th>Serviço</th>
                          <th>Valor</th>
                          <th>Status</th>
                          <th>Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.cotacoes.map(c => (
                          <tr key={c.id}>
                            <td>{c.cidade_origem || c.cep_origem} → {c.cidade_destino || c.cep_destino}</td>
                            <td>{c.peso_kg}kg</td>
                            <td>{c.tipo_servico}</td>
                            <td style={{ color:'var(--success)', fontWeight:600 }}>R$ {(c.valor_cotado || 0).toFixed(2)}</td>
                            <td><span className="badge badge-neutral" style={{ fontSize:10 }}>{c.status}</span></td>
                            <td style={{ color:'var(--text-muted)' }}>{formatDate(c.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                )}

                {/* TAB: COLETAS */}
                {activeTab === 'coletas' && (
                  histLoading ? <div style={{ textAlign:'center', padding:32, color:'var(--text-muted)' }}>Carregando...</div> :
                  history.coletas.length === 0 ? (
                    <div style={{ textAlign:'center', padding:32, color:'var(--text-muted)' }}>
                      <FiTruck size={32} style={{ opacity:0.3 }}/>
                      <p>Nenhuma coleta encontrada.</p>
                    </div>
                  ) : (
                    <table className="data-table" style={{ fontSize:12 }}>
                      <thead>
                        <tr>
                          <th>Endereço</th>
                          <th>Data Solicitada</th>
                          <th>Horário</th>
                          <th>Volumes</th>
                          <th>Status</th>
                          <th>Solicitado em</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.coletas.map(c => (
                          <tr key={c.id}>
                            <td>{c.endereco_coleta || '-'}</td>
                            <td>{formatDate(c.data_solicitada)}</td>
                            <td>{c.horario_preferido || '-'}</td>
                            <td>{c.quantidade_volumes || 1}</td>
                            <td><span className="badge badge-neutral" style={{ fontSize:10 }}>{c.status}</span></td>
                            <td style={{ color:'var(--text-muted)' }}>{formatDate(c.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                )}

                {/* TAB: RASTREAMENTOS */}
                {activeTab === 'rastreamentos' && (
                  histLoading ? <div style={{ textAlign:'center', padding:32, color:'var(--text-muted)' }}>Carregando...</div> :
                  history.rastreamentos.length === 0 ? (
                    <div style={{ textAlign:'center', padding:32, color:'var(--text-muted)' }}>
                      <FiPackage size={32} style={{ opacity:0.3 }}/>
                      <p>Nenhum rastreamento encontrado.</p>
                    </div>
                  ) : (
                    <table className="data-table" style={{ fontSize:12 }}>
                      <thead>
                        <tr>
                          <th>Código</th>
                          <th>Status</th>
                          <th>Consultado em</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.rastreamentos.map(r => (
                          <tr key={r.id}>
                            <td style={{ fontFamily:'monospace', fontWeight:600 }}>{r.codigo_rastreio}</td>
                            <td>{r.status_atual}</td>
                            <td style={{ color:'var(--text-muted)' }}>{formatDateTime(r.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                )}
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedCliente(null)}>Fechar</button>
                <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)' }}
                  onClick={() => { setSelectedCliente(null); setDeleteTarget(selectedCliente); }}>
                  <FiTrash2 size={12}/> Excluir
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => { setSelectedCliente(null); openEdit(selectedCliente); }}>
                  <FiEdit2 size={12}/> Editar Cliente
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── EDIT MODAL ── */}
        {editCliente && (
          <div className="modal-overlay" onClick={() => setEditCliente(null)}>
            <div className="modal" style={{ maxWidth:640 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">Editar Cliente</div>
                <button className="btn btn-ghost btn-icon" onClick={() => setEditCliente(null)}><FiX/></button>
              </div>
              <form onSubmit={handleSaveEdit}>
                <div className="modal-body">
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
                    <button type="button" className={`btn ${editForm.tipo === 'PF' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding:12 }} onClick={() => setEditForm(p => ({...p, tipo:'PF'}))}>
                      <FiUser size={14}/> Pessoa Física
                    </button>
                    <button type="button" className={`btn ${editForm.tipo === 'PJ' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding:12 }} onClick={() => setEditForm(p => ({...p, tipo:'PJ'}))}>
                      <FiBriefcase size={14}/> Pessoa Jurídica
                    </button>
                  </div>

                  <div className="form-group">
                    <label className="form-label">{editForm.tipo === 'PJ' ? 'Razão Social' : 'Nome Completo'} *</label>
                    <input className="form-input" required value={editForm.nome}
                      onChange={e => setEditForm(p => ({...p, nome: e.target.value}))} />
                  </div>

                  {editForm.tipo === 'PJ' && (
                    <div className="form-group">
                      <label className="form-label">Nome do Contato</label>
                      <input className="form-input" value={editForm.nome_contato}
                        onChange={e => setEditForm(p => ({...p, nome_contato: e.target.value}))} />
                    </div>
                  )}

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">{editForm.tipo === 'PJ' ? 'CNPJ' : 'CPF'} *</label>
                      <input className="form-input" required value={editForm.cpf_cnpj}
                        onChange={e => setEditForm(p => ({...p, cpf_cnpj: e.target.value}))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Status *</label>
                      <select className="form-input" required value={editForm.status}
                        onChange={e => setEditForm(p => ({...p, status: e.target.value}))}>
                        <option value="ativo">Ativo</option>
                        <option value="prospecto">Prospecto</option>
                        <option value="inativo">Inativo</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Telefone *</label>
                      <input className="form-input" required value={editForm.telefone}
                        onChange={e => setEditForm(p => ({...p, telefone: e.target.value}))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">E-mail</label>
                      <input className="form-input" type="email" value={editForm.email}
                        onChange={e => setEditForm(p => ({...p, email: e.target.value}))} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Endereço Completo</label>
                    <input className="form-input" value={editForm.endereco}
                      onChange={e => setEditForm(p => ({...p, endereco: e.target.value}))} />
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">CEP</label>
                      <input className="form-input" value={editForm.cep}
                        onChange={e => setEditForm(p => ({...p, cep: e.target.value}))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Cidade</label>
                      <input className="form-input" value={editForm.cidade}
                        onChange={e => setEditForm(p => ({...p, cidade: e.target.value}))} />
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Estado</label>
                      <select className="form-input" value={editForm.estado}
                        onChange={e => setEditForm(p => ({...p, estado: e.target.value}))}>
                        <option value="">Selecione</option>
                        {['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'].map(uf => (
                          <option key={uf} value={uf}>{uf}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Unidade *</label>
                      <select className="form-input" required value={editForm.unidade}
                        onChange={e => setEditForm(p => ({...p, unidade: e.target.value}))}>
                        <option value="Osasco">Osasco</option>
                        <option value="Barueri">Barueri</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setEditCliente(null)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={editSaving}>
                    {editSaving ? 'Salvando...' : <><FiSave size={14}/> Salvar Alterações</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── DELETE CONFIRMATION ── */}
        {deleteTarget && (
          <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
            <div className="modal" style={{ maxWidth:420 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title" style={{ color:'var(--danger)' }}>
                  <FiAlertTriangle style={{ marginRight:8, verticalAlign:'middle' }}/>
                  Excluir Cliente
                </div>
                <button className="btn btn-ghost btn-icon" onClick={() => setDeleteTarget(null)}><FiX/></button>
              </div>
              <div className="modal-body">
                <p style={{ fontSize:14, color:'var(--text-secondary)', marginBottom:8 }}>
                  Tem certeza que deseja excluir o cliente:
                </p>
                <p style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)' }}>
                  {deleteTarget.nome_razao_social}
                </p>
                <p style={{ fontSize:13, color:'var(--danger)', marginTop:12, padding:'10px 14px', background:'rgba(255,82,82,0.08)', borderRadius:8, border:'1px solid rgba(255,82,82,0.2)' }}>
                  ⚠️ Esta ação não pode ser desfeita. Todo o histórico vinculado será mantido, mas o cliente será removido.
                </p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancelar</button>
                <button className="btn btn-danger" disabled={deleting} onClick={handleDelete}
                  style={{ background:'var(--danger)', color:'#fff', border:'none' }}>
                  {deleting ? 'Excluindo...' : <><FiTrash2 size={14}/> Confirmar Exclusão</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── NEW CLIENT MODAL ── */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">Novo Cliente</div>
                <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><FiX/></button>
              </div>
              <form onSubmit={handleNewCliente}>
                <div className="modal-body">
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
                    <button type="button" className={`btn ${newForm.tipo === 'PF' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding:14 }} onClick={() => setNewForm(p => ({...p, tipo:'PF'}))}>
                      <FiUser size={16}/> Pessoa Física
                    </button>
                    <button type="button" className={`btn ${newForm.tipo === 'PJ' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding:14 }} onClick={() => setNewForm(p => ({...p, tipo:'PJ'}))}>
                      <FiBriefcase size={16}/> Pessoa Jurídica
                    </button>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{newForm.tipo === 'PJ' ? 'Razão Social' : 'Nome Completo'} *</label>
                    <input className="form-input" required value={newForm.nome}
                      onChange={e => setNewForm(p => ({...p, nome: e.target.value}))} />
                  </div>
                  {newForm.tipo === 'PJ' && (
                    <div className="form-group">
                      <label className="form-label">Nome do Contato</label>
                      <input className="form-input" value={newForm.nome_contato}
                        onChange={e => setNewForm(p => ({...p, nome_contato: e.target.value}))} />
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">{newForm.tipo === 'PJ' ? 'CNPJ' : 'CPF'} *</label>
                    <input className="form-input" required value={newForm.cpf_cnpj}
                      onChange={e => setNewForm(p => ({...p, cpf_cnpj: e.target.value}))} />
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Telefone *</label>
                      <input className="form-input" required value={newForm.telefone}
                        onChange={e => setNewForm(p => ({...p, telefone: e.target.value}))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">E-mail</label>
                      <input className="form-input" value={newForm.email}
                        onChange={e => setNewForm(p => ({...p, email: e.target.value}))} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Endereço Completo</label>
                    <input className="form-input" value={newForm.endereco}
                      onChange={e => setNewForm(p => ({...p, endereco: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unidade *</label>
                    <select className="form-input" value={newForm.unidade}
                      onChange={e => setNewForm(p => ({...p, unidade: e.target.value}))}>
                      <option value="Osasco">Osasco</option>
                      <option value="Barueri">Barueri</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Salvando...' : <><FiSave size={14}/> Cadastrar</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── EXPORT MODAL ── */}
        {showExportModal && (
          <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
            <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">
                  <FiDownload style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--primary)' }} />
                  Exportar Clientes ({filtered.length})
                </div>
                <button className="btn btn-ghost btn-icon" onClick={() => setShowExportModal(false)}><FiX /></button>
              </div>
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                
                {/* Informações e Instruções da funcionalidade */}
                <div style={{
                  background: 'rgba(68,138,255,0.08)',
                  border: '1px solid rgba(68,138,255,0.2)',
                  borderRadius: 8,
                  padding: '12px 16px',
                  marginBottom: 20,
                  fontSize: 13,
                  lineHeight: '1.5'
                }}>
                  <h4 style={{ margin: '0 0 6px 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    ℹ️ Objetivos e Instruções
                  </h4>
                  <p style={{ margin: '0 0 6px 0', color: 'var(--text-secondary)' }}>
                    Esta funcionalidade permite exportar os contatos dos clientes da busca atual (aplicando filtros como tipo, busca e status) em formato Excel.
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-secondary)' }}>
                    <li><strong>Formato Padrão:</strong> Exporta todas as colunas do cadastro do cliente para gestão e backups.</li>
                    <li><strong>Formato BotConversa:</strong> Formata a planilha pronta para importar na plataforma. Se for Pessoa Física (PF), separa nome de sobrenome. Se for Pessoa Jurídica (PJ/CNPJ), usa o padrão <code>Responsável - Empresa</code> em Primeiro nome. Telefones são higienizados e formatados com o prefixo <code>55</code>.</li>
                  </ul>
                </div>

                {/* Seleção do Formato com cards interativos */}
                <label className="form-label" style={{ marginBottom: 8 }}>Selecione o formato de exportação:</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div 
                    onClick={() => setExportFormat('padrao')}
                    style={{
                      border: exportFormat === 'padrao' ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: exportFormat === 'padrao' ? 'rgba(243,112,33,0.05)' : 'var(--bg-surface)',
                      padding: 16,
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4
                    }}
                  >
                    <strong style={{ color: exportFormat === 'padrao' ? 'var(--primary)' : 'var(--text-primary)', fontSize: 14 }}>
                      📁 Formato Padrão
                    </strong>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Planilha completa com todos os campos cadastrais e dados do sistema.
                    </span>
                  </div>
                  
                  <div 
                    onClick={() => setExportFormat('botconversa')}
                    style={{
                      border: exportFormat === 'botconversa' ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: exportFormat === 'botconversa' ? 'rgba(243,112,33,0.05)' : 'var(--bg-surface)',
                      padding: 16,
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4
                    }}
                  >
                    <strong style={{ color: exportFormat === 'botconversa' ? 'var(--primary)' : 'var(--text-primary)', fontSize: 14 }}>
                      🤖 Formato BotConversa
                    </strong>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Colunas otimizadas: Primeiro Nome, Sobrenome, Telefone formatado (55) e Etiquetas.
                    </span>
                  </div>
                </div>

                {/* Seção de Teste Prático (Preview) */}
                <div style={{ marginTop: 16 }}>
                  <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>
                    🔍 Visualização Prévia (Primeiras 3 linhas do resultado):
                  </label>
                  <div className="table-container" style={{ maxHeight: 180, border: '1px solid var(--border)', borderRadius: 6, overflow: 'auto' }}>
                    <table className="data-table" style={{ fontSize: 11, margin: 0 }}>
                      <thead>
                        <tr>
                          {exportFormat === 'botconversa' ? (
                            <>
                              <th>Primeiro nome</th>
                              <th>Sobrenome</th>
                              <th>Telefone</th>
                              <th>Etiquetas</th>
                            </>
                          ) : (
                            <>
                              <th>Nome / Razão Social</th>
                              <th>Tipo</th>
                              <th>Documento</th>
                              <th>Telefone</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.slice(0, 3).map((c, idx) => {
                          if (exportFormat === 'botconversa') {
                            const { primeiroNome, sobrenome } = formatBotConversaName(c);
                            const telefoneFormato = formatBotConversaPhone(c.telefone);
                            const etiquetas = Array.isArray(c.tags) ? c.tags.join(', ') : '';
                            return (
                              <tr key={c.id || idx}>
                                <td style={{ fontWeight: 600 }}>{primeiroNome}</td>
                                <td>{sobrenome || '-'}</td>
                                <td>{telefoneFormato}</td>
                                <td>
                                  {etiquetas ? (
                                    <span style={{ background: 'rgba(243,112,33,0.1)', color: '#F37021', padding: '1px 5px', borderRadius: 4, fontSize: 10 }}>
                                      {etiquetas}
                                    </span>
                                  ) : '-'}
                                </td>
                              </tr>
                            );
                          } else {
                            return (
                              <tr key={c.id || idx}>
                                <td style={{ fontWeight: 600 }}>{c.nome_razao_social}</td>
                                <td>{c.tipo === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}</td>
                                <td>{c.cpf_cnpj || '-'}</td>
                                <td>{c.telefone}</td>
                              </tr>
                            );
                          }
                        })}
                        {filtered.length === 0 && (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                              Nenhum cliente para pré-visualização.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowExportModal(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleExport} disabled={filtered.length === 0}>
                  <FiDownload size={14} style={{ marginRight: 6 }} />
                  Exportar Planilha (.xlsx)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
