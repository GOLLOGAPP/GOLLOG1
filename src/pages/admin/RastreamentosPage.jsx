import { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import { supabase } from '../../lib/supabase';
import { FiPackage, FiSearch, FiRefreshCw, FiExternalLink } from 'react-icons/fi';

const statusCls = {
  'Postado': 'badge-neutral',
  'Em trânsito': 'badge-warning',
  'No centro de distribuição': 'badge-info',
  'Saiu para entrega': 'badge-info',
  'Entregue': 'badge-success',
  'Devolvido': 'badge-danger',
};

export default function RastreamentosPage() {
  const [rastreamentos, setRastreamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [consultaCodigo, setConsultaCodigo] = useState('');

  const fetchRastreamentos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('rastreamentos')
      .select('*, clientes(nome_razao_social)')
      .order('created_at', { ascending: false });
    if (data) setRastreamentos(data);
    setLoading(false);
  };

  useEffect(() => { fetchRastreamentos(); }, []);

  const handleConsulta = async () => {
    if (!consultaCodigo.trim()) return;
    // TODO: integrar com API Gollog real
    const mockStatus = ['Postado', 'Em trânsito', 'No centro de distribuição', 'Saiu para entrega', 'Entregue'];
    const randomStatus = mockStatus[Math.floor(Math.random() * 4)];

    await supabase.from('rastreamentos').insert([{
      codigo_rastreio: consultaCodigo.trim().toUpperCase(),
      status_atual: randomStatus,
      historico_status: [
        { status: 'Postado', data: new Date(Date.now() - 3 * 86400000).toISOString(), local: 'Osasco/SP' },
        { status: randomStatus, data: new Date().toISOString(), local: 'Em trânsito' },
      ],
    }]);

    setConsultaCodigo('');
    fetchRastreamentos();
  };

  const filtered = rastreamentos.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return r.codigo_rastreio.toLowerCase().includes(s) ||
      (r.clientes?.nome_razao_social || '').toLowerCase().includes(s);
  });

  const timeAgo = (d) => {
    if (!d) return '-';
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min atrás`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h atrás`;
    return `${Math.floor(hrs / 24)}d atrás`;
  };

  return (
    <>
      <Header title="Rastreamentos" />
      <div className="page-content animate-in">
        {/* Quick lookup */}
        <div className="card mb-24">
          <div className="card-body" style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
            <div style={{ flex:1 }}>
              <label className="form-label">Consultar código de rastreio</label>
              <input className="form-input" placeholder="Ex: GLL-78432190"
                value={consultaCodigo} onChange={e => setConsultaCodigo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleConsulta()} />
            </div>
            <button className="btn btn-primary" onClick={handleConsulta} style={{ height:42 }}>
              <FiPackage size={14}/> Consultar
            </button>
          </div>
        </div>

        <div className="flex-between mb-24">
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <div className="search-wrapper">
              <FiSearch className="search-icon" />
              <input className="search-input" placeholder="Buscar por código ou cliente..." style={{ width:320 }}
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="btn btn-ghost btn-sm" onClick={fetchRastreamentos}><FiRefreshCw size={14}/></button>
          </div>
          <span style={{ fontSize:13, color:'var(--text-muted)' }}>{filtered.length} registros</span>
        </div>

        <div className="card">
          {loading ? (
            <div className="empty-state"><p>Carregando...</p></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📦</div>
              <h3>Nenhum rastreamento registrado</h3>
              <p>As consultas de rastreio aparecerão aqui.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Código</th><th>Cliente</th><th>Status</th><th>Última Consulta</th></tr></thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontFamily:'monospace', fontWeight:600, color:'var(--primary)' }}>{r.codigo_rastreio}</td>
                      <td className="name-cell">{r.clientes?.nome_razao_social || 'Consulta avulsa'}</td>
                      <td><span className={`badge ${statusCls[r.status_atual] || 'badge-neutral'}`}>{r.status_atual || '-'}</span></td>
                      <td style={{ fontSize:12, color:'var(--text-muted)' }}>{timeAgo(r.ultima_consulta)}</td>
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
