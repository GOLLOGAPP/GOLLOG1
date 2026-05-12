import { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import { supabase } from '../../lib/supabase';
import { FiCheck, FiX, FiEye, FiRefreshCw } from 'react-icons/fi';

const statusCls = { pendente:'badge-warning', aprovado:'badge-info', ativo:'badge-success', rejeitado:'badge-danger' };

export default function MotoristasPage() {
  const [motoristas, setMotoristas] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMotoristas = async () => {
    setLoading(true);
    const { data } = await supabase.from('motoristas_agregados').select('*').order('created_at', { ascending: false });
    if (data) setMotoristas(data);
    setLoading(false);
  };

  useEffect(() => { fetchMotoristas(); }, []);

  const updateStatus = async (id, status) => {
    await supabase.from('motoristas_agregados').update({ status }).eq('id', id);
    fetchMotoristas();
  };

  return (
    <>
      <Header title="Motoristas Agregados" />
      <div className="page-content animate-in">
        <div className="flex-between mb-24">
          <span style={{ fontSize:13, color:'var(--text-muted)' }}>{motoristas.length} cadastros</span>
          <button className="btn btn-ghost btn-sm" onClick={fetchMotoristas}><FiRefreshCw size={14}/></button>
        </div>
        <div className="card">
          {loading ? (
            <div className="empty-state"><p>Carregando...</p></div>
          ) : motoristas.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🚚</div>
              <h3>Nenhum motorista cadastrado</h3>
              <p>Os cadastros de motoristas agregados aparecerão aqui.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Nome</th><th>Telefone</th><th>CNH</th><th>Veículo</th><th>Placa</th><th>Região</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  {motoristas.map(m => (
                    <tr key={m.id}>
                      <td className="name-cell">{m.nome_completo}</td>
                      <td>{m.telefone}</td>
                      <td>{m.cnh_categoria || '-'}</td>
                      <td>{m.tipo_veiculo || '-'}</td>
                      <td style={{ fontFamily:'monospace' }}>{m.placa_veiculo || '-'}</td>
                      <td>{m.regiao_atuacao || '-'}</td>
                      <td><span className={`badge ${statusCls[m.status] || 'badge-neutral'}`}>{m.status}</span></td>
                      <td>
                        <div style={{ display:'flex', gap:4 }}>
                          {m.status === 'pendente' && (
                            <>
                              <button className="btn btn-ghost btn-icon btn-sm" title="Aprovar"
                                onClick={() => updateStatus(m.id, 'aprovado')}><FiCheck size={14}/></button>
                              <button className="btn btn-ghost btn-icon btn-sm" title="Rejeitar"
                                onClick={() => updateStatus(m.id, 'rejeitado')}><FiX size={14}/></button>
                            </>
                          )}
                          {m.status === 'aprovado' && (
                            <button className="btn btn-ghost btn-icon btn-sm" title="Ativar"
                              onClick={() => updateStatus(m.id, 'ativo')}><FiCheck size={14}/></button>
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
