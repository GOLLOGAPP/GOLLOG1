import Header from '../../components/layout/Header';
import { FiPackage, FiSearch, FiRefreshCw } from 'react-icons/fi';

const mockRastreios = [
  { codigo:'GLL-78432190', cliente:'Maria Oliveira', status:'Em trânsito', origem:'Osasco/SP', destino:'Curitiba/PR', atualizado:'12/05 14:30', cls:'badge-warning' },
  { codigo:'GLL-78432185', cliente:'MegaStore LTDA', status:'Entregue', origem:'Osasco/SP', destino:'Salvador/BA', atualizado:'11/05 09:15', cls:'badge-success' },
  { codigo:'GLL-78432180', cliente:'Carlos Mendes', status:'Saiu para entrega', origem:'Barueri/SP', destino:'Rio de Janeiro/RJ', atualizado:'12/05 08:00', cls:'badge-info' },
  { codigo:'GLL-78432175', cliente:'E-Shop Digital', status:'No centro de distribuição', origem:'Osasco/SP', destino:'Brasília/DF', atualizado:'12/05 06:45', cls:'badge-warning' },
  { codigo:'GLL-78432170', cliente:'Ana Beatriz Costa', status:'Postado', origem:'Barueri/SP', destino:'Belo Horizonte/MG', atualizado:'11/05 16:20', cls:'badge-neutral' },
];

export default function RastreamentosPage() {
  return (
    <>
      <Header title="Rastreamentos" />
      <div className="page-content animate-in">
        <div className="flex-between mb-24">
          <div className="search-wrapper">
            <FiSearch className="search-icon" />
            <input className="search-input" placeholder="Buscar por código ou cliente..." style={{ width:320 }}/>
          </div>
          <button className="btn btn-secondary btn-sm"><FiRefreshCw size={14}/> Atualizar Todos</button>
        </div>
        <div className="card">
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Código</th><th>Cliente</th><th>Status</th><th>Origem</th><th>Destino</th><th>Atualizado</th></tr></thead>
              <tbody>
                {mockRastreios.map(r => (
                  <tr key={r.codigo}>
                    <td style={{ fontFamily:'monospace', fontWeight:600, color:'var(--primary)' }}>{r.codigo}</td>
                    <td className="name-cell">{r.cliente}</td>
                    <td><span className={`badge ${r.cls}`}>{r.status}</span></td>
                    <td>{r.origem}</td>
                    <td>{r.destino}</td>
                    <td style={{ fontSize:12, color:'var(--text-muted)' }}>{r.atualizado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
