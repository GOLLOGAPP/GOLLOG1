import { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import { supabase } from '../../lib/supabase';
import {
  FiSearch, FiPlus, FiDownload, FiEye, FiEdit2, FiTag, FiX,
  FiUser, FiBriefcase, FiRefreshCw, FiSave
} from 'react-icons/fi';

const statusMap = {
  ativo: { label:'Ativo', cls:'badge-success' },
  inativo: { label:'Inativo', cls:'badge-danger' },
  prospecto: { label:'Prospecto', cls:'badge-warning' },
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newForm, setNewForm] = useState({
    tipo:'PF', nome:'', cpf_cnpj:'', telefone:'', email:'',
    endereco:'', cep:'', cidade:'', estado:'', unidade:'Osasco'
  });

  const fetchClientes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setClientes(data);
    setLoading(false);
  };

  useEffect(() => { fetchClientes(); }, []);

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

  const handleNewCliente = async (e) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('clientes').insert([{
      tipo: newForm.tipo,
      nome_razao_social: newForm.nome,
      cpf_cnpj: newForm.cpf_cnpj,
      telefone: newForm.telefone,
      email: newForm.email,
      endereco_completo: newForm.endereco,
      cep: newForm.cep,
      cidade: newForm.cidade,
      estado: newForm.estado,
      unidade_atendimento: newForm.unidade,
      status: 'ativo',
      tags: [],
    }]);
    setSaving(false);
    if (!error) {
      setShowModal(false);
      setNewForm({ tipo:'PF', nome:'', cpf_cnpj:'', telefone:'', email:'', endereco:'', cep:'', cidade:'', estado:'', unidade:'Osasco' });
      fetchClientes();
    } else {
      alert('Erro: ' + error.message);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';

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
            <button className="btn btn-secondary btn-sm"><FiDownload size={14}/> Exportar</button>
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
                      <tr key={c.id}>
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
                        <td>
                          <div style={{ display:'flex', gap:4 }}>
                            <button className="btn btn-ghost btn-icon btn-sm" title="Ver" onClick={() => setSelectedCliente(c)}>
                              <FiEye size={14}/>
                            </button>
                            <button className="btn btn-ghost btn-icon btn-sm" title="Editar">
                              <FiEdit2 size={14}/>
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

        {/* Client Detail Modal */}
        {selectedCliente && (
          <div className="modal-overlay" onClick={() => setSelectedCliente(null)}>
            <div className="modal" style={{ maxWidth:640 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">Ficha do Cliente</div>
                <button className="btn btn-ghost btn-icon" onClick={() => setSelectedCliente(null)}><FiX/></button>
              </div>
              <div className="modal-body">
                <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:24 }}>
                  <div style={{
                    width:56, height:56, borderRadius:'50%',
                    background:'rgba(243,112,33,0.12)', display:'flex',
                    alignItems:'center', justifyContent:'center',
                    color:'#F37021', fontSize:22
                  }}>
                    {selectedCliente.tipo === 'PJ' ? <FiBriefcase/> : <FiUser/>}
                  </div>
                  <div>
                    <h3 style={{ fontSize:18, fontWeight:700, color:'var(--white)' }}>{selectedCliente.nome_razao_social}</h3>
                    <div style={{ display:'flex', gap:8, marginTop:4 }}>
                      <span className={`badge ${(statusMap[selectedCliente.status] || statusMap.prospecto).cls}`}>
                        {(statusMap[selectedCliente.status] || statusMap.prospecto).label}
                      </span>
                      <span className="badge badge-neutral">{selectedCliente.tipo === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}</span>
                    </div>
                  </div>
                </div>

                <div className="grid-2" style={{ gap:12, marginBottom:20 }}>
                  <div style={{ background:'var(--bg-surface)', padding:12, borderRadius:8 }}>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>📄 Documento</div>
                    <div style={{ fontSize:14, fontWeight:600, fontFamily:'monospace' }}>{selectedCliente.cpf_cnpj || '-'}</div>
                  </div>
                  <div style={{ background:'var(--bg-surface)', padding:12, borderRadius:8 }}>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>📍 Unidade</div>
                    <div style={{ fontSize:14, fontWeight:600 }}>{selectedCliente.unidade_atendimento || '-'}</div>
                  </div>
                  <div style={{ background:'var(--bg-surface)', padding:12, borderRadius:8 }}>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>📞 Telefone</div>
                    <div style={{ fontSize:14, fontWeight:600 }}>{selectedCliente.telefone}</div>
                  </div>
                  <div style={{ background:'var(--bg-surface)', padding:12, borderRadius:8 }}>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>✉️ E-mail</div>
                    <div style={{ fontSize:14, fontWeight:600 }}>{selectedCliente.email || '-'}</div>
                  </div>
                  <div style={{ background:'var(--bg-surface)', padding:12, borderRadius:8, gridColumn:'1/-1' }}>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>🏠 Endereço</div>
                    <div style={{ fontSize:14, fontWeight:600 }}>{selectedCliente.endereco_completo || '-'}</div>
                  </div>
                </div>

                <div className="grid-3" style={{ gap:12 }}>
                  <div style={{ background:'var(--bg-surface)', padding:16, borderRadius:8, textAlign:'center' }}>
                    <div style={{ fontSize:24, fontWeight:800, color:'var(--primary)' }}>{selectedCliente.total_envios || 0}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>Envios</div>
                  </div>
                  <div style={{ background:'var(--bg-surface)', padding:16, borderRadius:8, textAlign:'center' }}>
                    <div style={{ fontSize:24, fontWeight:800, color:'var(--success)' }}>
                      R$ {(selectedCliente.valor_total_gasto || 0).toLocaleString('pt-BR')}
                    </div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>Valor Total</div>
                  </div>
                  <div style={{ background:'var(--bg-surface)', padding:16, borderRadius:8, textAlign:'center' }}>
                    <div style={{ fontSize:24, fontWeight:800, color:'var(--info)' }}>{formatDate(selectedCliente.created_at)}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>Cadastro</div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedCliente(null)}>Fechar</button>
                <button className="btn btn-primary btn-sm"><FiEdit2 size={12}/> Editar Cliente</button>
              </div>
            </div>
          </div>
        )}

        {/* New Client Modal */}
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
      </div>
    </>
  );
}
