import { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import { supabase } from '../../lib/supabase';
import { FiPlus, FiEdit2, FiTrash2, FiChevronDown, FiChevronUp, FiSave, FiX, FiRefreshCw } from 'react-icons/fi';

export default function FaqAdminPage() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newFaq, setNewFaq] = useState({ pergunta: '', resposta: '', categoria: '' });

  const fetchFaqs = async () => {
    setLoading(true);
    const { data } = await supabase.from('faq').select('*').order('ordem', { ascending: true });
    if (data) setFaqs(data);
    setLoading(false);
  };

  useEffect(() => { fetchFaqs(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('faq').insert([{
      ...newFaq,
      ordem: faqs.length + 1,
      ativo: true,
    }]);
    if (!error) {
      setShowModal(false);
      setNewFaq({ pergunta: '', resposta: '', categoria: '' });
      fetchFaqs();
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Excluir esta pergunta?')) {
      await supabase.from('faq').delete().eq('id', id);
      fetchFaqs();
    }
  };

  const toggleAtivo = async (id, ativo) => {
    await supabase.from('faq').update({ ativo: !ativo }).eq('id', id);
    fetchFaqs();
  };

  return (
    <>
      <Header title="FAQ - Perguntas Frequentes" />
      <div className="page-content animate-in">
        <div className="flex-between mb-24">
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <span style={{ color:'var(--text-muted)', fontSize:13 }}>{faqs.length} perguntas</span>
            <button className="btn btn-ghost btn-sm" onClick={fetchFaqs}><FiRefreshCw size={14}/></button>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            <FiPlus size={14}/> Nova Pergunta
          </button>
        </div>

        {loading ? (
          <div className="empty-state"><p>Carregando...</p></div>
        ) : faqs.length === 0 ? (
          <div className="card"><div className="empty-state">
            <div className="icon">❓</div>
            <h3>Nenhuma pergunta cadastrada</h3>
          </div></div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {faqs.map(f => (
              <div className="card" key={f.id} style={{ cursor:'pointer', opacity: f.ativo ? 1 : 0.5 }}
                onClick={() => setExpanded(expanded === f.id ? null : f.id)}>
                <div className="card-header" style={{ borderBottom: expanded === f.id ? undefined : 'none' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span className="badge badge-info">{f.categoria || 'Geral'}</span>
                    <span className="card-title">{f.pergunta}</span>
                    {!f.ativo && <span className="badge badge-neutral">Inativo</span>}
                  </div>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <button className="btn btn-ghost btn-icon btn-sm"
                      onClick={e => { e.stopPropagation(); toggleAtivo(f.id, f.ativo); }}
                      title={f.ativo ? 'Desativar' : 'Ativar'}>
                      {f.ativo ? '👁' : '👁‍🗨'}
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm"
                      onClick={e => { e.stopPropagation(); handleDelete(f.id); }}>
                      <FiTrash2 size={13}/>
                    </button>
                    {expanded === f.id ? <FiChevronUp size={16}/> : <FiChevronDown size={16}/>}
                  </div>
                </div>
                {expanded === f.id && (
                  <div className="card-body" style={{ color:'var(--text-secondary)', fontSize:14 }}>
                    {f.resposta}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* New FAQ Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">Nova Pergunta</div>
                <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><FiX/></button>
              </div>
              <form onSubmit={handleAdd}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Categoria</label>
                    <input className="form-input" placeholder="Ex: Prazos, Rastreamento, Embalagem"
                      value={newFaq.categoria} onChange={e => setNewFaq(p => ({...p, categoria: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pergunta *</label>
                    <input className="form-input" required value={newFaq.pergunta}
                      onChange={e => setNewFaq(p => ({...p, pergunta: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Resposta *</label>
                    <textarea className="form-input" required rows={4} value={newFaq.resposta}
                      onChange={e => setNewFaq(p => ({...p, resposta: e.target.value}))}
                      style={{ resize:'vertical' }} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary"><FiSave size={14}/> Salvar</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
