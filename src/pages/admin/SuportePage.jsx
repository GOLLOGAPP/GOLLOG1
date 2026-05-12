import { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import { supabase } from '../../lib/supabase';
import { FiRefreshCw } from 'react-icons/fi';

const priorCls = { baixa:'badge-neutral', media:'badge-info', alta:'badge-warning', urgente:'badge-danger' };
const statusCls = { aberto:'badge-danger', em_atendimento:'badge-warning', resolvido:'badge-success', fechado:'badge-neutral' };
const statusLabel = { aberto:'Aberto', em_atendimento:'Em Atendimento', resolvido:'Resolvido', fechado:'Fechado' };

export default function SuportePage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('suporte_tickets')
      .select('*, clientes(nome_razao_social)')
      .order('created_at', { ascending: false });
    if (data) setTickets(data);
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, []);

  const updateStatus = async (id, status) => {
    await supabase.from('suporte_tickets').update({ status }).eq('id', id);
    fetchTickets();
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';

  return (
    <>
      <Header title="Suporte" />
      <div className="page-content animate-in">
        <div className="flex-between mb-24">
          <span style={{ fontSize:13, color:'var(--text-muted)' }}>{tickets.length} tickets</span>
          <button className="btn btn-ghost btn-sm" onClick={fetchTickets}><FiRefreshCw size={14}/></button>
        </div>
        <div className="card">
          {loading ? (
            <div className="empty-state"><p>Carregando...</p></div>
          ) : tickets.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🎧</div>
              <h3>Nenhum ticket de suporte</h3>
              <p>Os tickets abertos pelos clientes aparecerão aqui.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Cliente</th><th>Assunto</th><th>Prioridade</th><th>Status</th><th>Data</th><th>Ações</th></tr></thead>
                <tbody>
                  {tickets.map(t => (
                    <tr key={t.id}>
                      <td className="name-cell">{t.clientes?.nome_razao_social || '-'}</td>
                      <td>{t.assunto}</td>
                      <td><span className={`badge ${priorCls[t.prioridade] || 'badge-neutral'}`}>{t.prioridade}</span></td>
                      <td><span className={`badge ${statusCls[t.status] || 'badge-neutral'}`}>{statusLabel[t.status] || t.status}</span></td>
                      <td style={{ fontSize:12, color:'var(--text-muted)' }}>{formatDate(t.created_at)}</td>
                      <td>
                        <select className="unit-selector" style={{ fontSize:11, padding:'4px 8px' }}
                          value={t.status} onChange={e => updateStatus(t.id, e.target.value)}>
                          <option value="aberto">Aberto</option>
                          <option value="em_atendimento">Em Atendimento</option>
                          <option value="resolvido">Resolvido</option>
                          <option value="fechado">Fechado</option>
                        </select>
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
