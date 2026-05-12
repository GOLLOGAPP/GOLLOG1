import { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import { supabase } from '../../lib/supabase';
import { FiDollarSign, FiSearch, FiEye, FiSend, FiRefreshCw } from 'react-icons/fi';

const statusCls = { pendente:'badge-warning', enviada:'badge-info', aceita:'badge-success', expirada:'badge-neutral' };

export default function CotacoesPage() {
  const [cotacoes, setCotacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchCotacoes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('cotacoes')
      .select('*, clientes(nome_razao_social)')
      .order('created_at', { ascending: false });
    if (data) setCotacoes(data);
    setLoading(false);
  };

  useEffect(() => { fetchCotacoes(); }, []);

  const filtered = cotacoes.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (c.clientes?.nome_razao_social || '').toLowerCase().includes(s) ||
           (c.cidade_origem || '').toLowerCase().includes(s) ||
           (c.cidade_destino || '').toLowerCase().includes(s);
  });

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';

  return (
    <>
      <Header title="Cotações" />
      <div className="page-content animate-in">
        <div className="flex-between mb-24">
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <div className="search-wrapper">
              <FiSearch className="search-icon" />
              <input className="search-input" placeholder="Buscar cotação..." style={{ width:300 }}
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="btn btn-ghost btn-sm" onClick={fetchCotacoes}><FiRefreshCw size={14}/></button>
          </div>
          <span style={{ fontSize:13, color:'var(--text-muted)' }}>{filtered.length} cotações</span>
        </div>
        <div className="card">
          {loading ? (
            <div className="empty-state"><p>Carregando...</p></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="icon">💰</div>
              <h3>Nenhuma cotação encontrada</h3>
              <p>As cotações feitas pelos clientes via WhatsApp aparecerão aqui.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Cliente</th><th>Origem</th><th>Destino</th><th>Peso</th><th>Serviço</th><th>Valor</th><th>Status</th><th>Data</th></tr></thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id}>
                      <td className="name-cell">{c.clientes?.nome_razao_social || 'Sem vínculo'}</td>
                      <td>{c.cidade_origem || c.cep_origem || '-'}</td>
                      <td>{c.cidade_destino || c.cep_destino || '-'}</td>
                      <td>{c.peso_kg ? `${c.peso_kg}kg` : '-'}</td>
                      <td>{c.tipo_servico || '-'}</td>
                      <td style={{ fontWeight:600, color:'var(--success)' }}>
                        {c.valor_cotado ? `R$ ${parseFloat(c.valor_cotado).toFixed(2)}` : '-'}
                      </td>
                      <td><span className={`badge ${statusCls[c.status] || 'badge-neutral'}`}>{c.status}</span></td>
                      <td style={{ fontSize:12, color:'var(--text-muted)' }}>{formatDate(c.created_at)}</td>
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
