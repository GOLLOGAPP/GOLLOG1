import { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import { supabase } from '../../lib/supabase';
import { FiTruck, FiSearch, FiRefreshCw, FiCheck, FiX } from 'react-icons/fi';

const statusCls = { solicitada:'badge-warning', agendada:'badge-info', coletada:'badge-success', cancelada:'badge-danger' };

export default function ColetasPage() {
  const [coletas, setColetas] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchColetas = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('coletas')
      .select('*, clientes(nome_razao_social)')
      .order('created_at', { ascending: false });
    if (data) setColetas(data);
    setLoading(false);
  };

  useEffect(() => { fetchColetas(); }, []);

  const updateStatus = async (id, status) => {
    await supabase.from('coletas').update({ status }).eq('id', id);
    fetchColetas();
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';

  return (
    <>
      <Header title="Coletas" />
      <div className="page-content animate-in">
        <div className="flex-between mb-24">
          <span style={{ fontSize:13, color:'var(--text-muted)' }}>{coletas.length} coletas</span>
          <button className="btn btn-ghost btn-sm" onClick={fetchColetas}><FiRefreshCw size={14}/> Atualizar</button>
        </div>
        <div className="card">
          {loading ? (
            <div className="empty-state"><p>Carregando...</p></div>
          ) : coletas.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🚚</div>
              <h3>Nenhuma coleta registrada</h3>
              <p>As solicitações de coleta dos clientes aparecerão aqui.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Cliente</th><th>Endereço</th><th>Data</th><th>Horário</th><th>Volumes</th><th>Peso</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  {coletas.map(c => (
                    <tr key={c.id}>
                      <td className="name-cell">{c.clientes?.nome_razao_social || '-'}</td>
                      <td style={{ maxWidth:200, overflow:'hidden', textOverflow:'ellipsis' }}>{c.endereco_coleta || '-'}</td>
                      <td>{formatDate(c.data_solicitada)}</td>
                      <td>{c.horario_preferido || '-'}</td>
                      <td>{c.quantidade_volumes || '-'}</td>
                      <td>{c.peso_total_kg ? `${c.peso_total_kg}kg` : '-'}</td>
                      <td><span className={`badge ${statusCls[c.status] || 'badge-neutral'}`}>{c.status}</span></td>
                      <td>
                        <div style={{ display:'flex', gap:4 }}>
                          {c.status === 'solicitada' && (
                            <button className="btn btn-ghost btn-icon btn-sm" title="Agendar"
                              onClick={() => updateStatus(c.id, 'agendada')}><FiCheck size={14}/></button>
                          )}
                          {c.status === 'agendada' && (
                            <button className="btn btn-ghost btn-icon btn-sm" title="Marcar coletada"
                              onClick={() => updateStatus(c.id, 'coletada')}><FiTruck size={14}/></button>
                          )}
                          {c.status !== 'cancelada' && c.status !== 'coletada' && (
                            <button className="btn btn-ghost btn-icon btn-sm" title="Cancelar"
                              onClick={() => updateStatus(c.id, 'cancelada')}><FiX size={14}/></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
