import { useState, useEffect } from 'react';

const WEEKDAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const WEEKDAY_PT = { Monday:'Segunda',Tuesday:'Terça',Wednesday:'Quarta',Thursday:'Quinta',Friday:'Sexta',Saturday:'Sábado',Sunday:'Domingo' };

export default function MalhaPage() {
  const [voos, setVoos] = useState([]);
  const [upload, setUpload] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({ origem: '', destino: '', weekday: '', apenas_carga: true });
  const [estacoes, setEstacoes] = useState({ origens: [], destinos: [] });

  useEffect(() => { buscar(); }, []);

  async function buscar() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtros.origem) params.set('origem', filtros.origem);
    if (filtros.destino) params.set('destino', filtros.destino);
    if (filtros.weekday) params.set('weekday', filtros.weekday);
    if (filtros.apenas_carga) params.set('apenas_carga', 'true');

    const res = await fetch(`/api/public/malha?${params}`);
    const data = await res.json();
    setVoos(data.voos || []);
    setUpload(data.upload);
    setDownloadUrl(data.download_url);

    // Extrai estações únicas para os selects
    if (!filtros.origem && !filtros.destino && !filtros.weekday) {
      const origens = [...new Set(data.voos.map(v => v.dept_station).filter(Boolean))].sort();
      const destinos = [...new Set(data.voos.map(v => v.arrival_station).filter(Boolean))].sort();
      setEstacoes({ origens, destinos });
    }
    setLoading(false);
  }

  function handleFiltro(key, value) {
    setFiltros(p => ({ ...p, [key]: value }));
  }

  // Agrupa por dia da semana
  const porDia = WEEKDAYS.reduce((acc, day) => {
    const lista = voos.filter(v => v.weekday?.toLowerCase() === day.toLowerCase());
    if (lista.length > 0) acc[day] = lista;
    return acc;
  }, {});

  const temResultados = Object.keys(porDia).length > 0;

  return (
    <div className="public-page">
      <div className="public-container" style={{ maxWidth: 900 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo.png" alt="GOLLOG" style={{ height: 48, marginBottom: 16 }} onError={e => e.target.style.display='none'} />
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>Malha Aérea GOLLOG</h1>
          <p style={{ color: '#6b7280', fontSize: 14 }}>Consulte os voos disponíveis para envio de carga</p>
          {upload && (
            <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>
              Atualizado em {new Date(upload.uploaded_at).toLocaleDateString('pt-BR')} · {upload.total_voos} voos na base
            </p>
          )}
        </div>

        {/* Filtros */}
        <div className="public-card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div>
              <label className="form-label">Origem</label>
              <select className="form-input" value={filtros.origem} onChange={e => handleFiltro('origem', e.target.value)}>
                <option value="">Todas</option>
                {estacoes.origens.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Destino</label>
              <select className="form-input" value={filtros.destino} onChange={e => handleFiltro('destino', e.target.value)}>
                <option value="">Todos</option>
                {estacoes.destinos.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Dia da semana</label>
              <select className="form-input" value={filtros.weekday} onChange={e => handleFiltro('weekday', e.target.value)}>
                <option value="">Todos</option>
                {WEEKDAYS.map(d => <option key={d} value={d}>{WEEKDAY_PT[d]}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', paddingBottom: 10 }}>
                <input type="checkbox" checked={filtros.apenas_carga}
                  onChange={e => handleFiltro('apenas_carga', e.target.checked)} />
                <span style={{ fontSize: 14 }}>Apenas com carga</span>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={buscar} disabled={loading}>
              {loading ? 'Buscando...' : '🔍 Buscar'}
            </button>
            <button className="btn btn-secondary" onClick={() => {
              setFiltros({ origem: '', destino: '', weekday: '', apenas_carga: true });
              setTimeout(buscar, 50);
            }}>
              Limpar
            </button>
            {downloadUrl && (
              <a href={downloadUrl} download className="btn btn-secondary" style={{ marginLeft: 'auto' }}>
                ⬇ Baixar XLS completo
              </a>
            )}
          </div>
        </div>

        {/* Resultados */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>Carregando...</div>
        ) : !temResultados ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
            Nenhum voo encontrado para os filtros selecionados.
          </div>
        ) : (
          Object.entries(porDia).map(([day, lista]) => (
            <div key={day} className="public-card" style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#F37021', marginBottom: 12 }}>
                {WEEKDAY_PT[day] || day}
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      {['Voo','Origem','Saída','Chegada','Destino','Aeronave','Carga'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((v, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{v.airline}{v.flight_number}</td>
                        <td style={{ padding: '8px 12px' }}>{v.dept_station}</td>
                        <td style={{ padding: '8px 12px' }}>{v.dept_time}</td>
                        <td style={{ padding: '8px 12px' }}>{v.arrival_time}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{v.arrival_station}</td>
                        <td style={{ padding: '8px 12px', color: '#6b7280' }}>{v.aircraft}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{
                            background: v.pode_enviar_carga === 'SIM' ? '#dcfce7' : '#fee2e2',
                            color: v.pode_enviar_carga === 'SIM' ? '#16a34a' : '#dc2626',
                            padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                          }}>
                            {v.pode_enviar_carga === 'SIM' ? 'SIM' : 'NÃO'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
