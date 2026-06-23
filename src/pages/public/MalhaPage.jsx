import { useState, useEffect } from 'react';

const AEROPORTOS = {
  // São Paulo
  GRU: 'GRU - Guarulhos/SP',
  CGH: 'CGH - Congonhas/SP',
  VCP: 'VCP - Viracopos/SP',
  // Rio de Janeiro
  GIG: 'GIG - Galeão/RJ',
  SDU: 'SDU - Santos Dumont/RJ',
  // Minas Gerais
  CNF: 'CNF - Confins/MG',
  PLU: 'PLU - Pampulha/MG',
  UDI: 'UDI - Uberlândia/MG',
  UBA: 'UBA - Uberaba/MG',
  MOC: 'MOC - Montes Claros/MG',
  GVR: 'GVR - Gov. Valadares/MG',
  // Brasília / Centro-Oeste
  BSB: 'BSB - Brasília/DF',
  GYN: 'GYN - Goiânia/GO',
  CGB: 'CGB - Cuiabá/MT',
  CGR: 'CGR - Campo Grande/MS',
  PMW: 'PMW - Palmas/TO',
  OPS: 'OPS - Sinop/MT',
  CLV: 'CLV - Caldas Novas/GO',
  BYO: 'BYO - Bonito/MS',
  // Nordeste
  SSA: 'SSA - Salvador/BA',
  REC: 'REC - Recife/PE',
  FOR: 'FOR - Fortaleza/CE',
  NAT: 'NAT - Natal/RN',
  MCZ: 'MCZ - Maceió/AL',
  THE: 'THE - Teresina/PI',
  JPA: 'JPA - João Pessoa/PB',
  AJU: 'AJU - Aracaju/SE',
  SLZ: 'SLZ - São Luís/MA',
  JDO: 'JDO - Juazeiro do Norte/CE',
  IMP: 'IMP - Imperatriz/MA',
  // Bahia interior
  IOS: 'IOS - Ilhéus/BA',
  BPS: 'BPS - Porto Seguro/BA',
  LEC: 'LEC - Lençóis/BA',
  // Norte
  MAO: 'MAO - Manaus/AM',
  BEL: 'BEL - Belém/PA',
  PVH: 'PVH - Porto Velho/RO',
  BVB: 'BVB - Boa Vista/RR',
  MCP: 'MCP - Macapá/AP',
  STM: 'STM - Santarém/PA',
  RBR: 'RBR - Rio Branco/AC',
  // Sul
  CWB: 'CWB - Curitiba/PR',
  POA: 'POA - Porto Alegre/RS',
  FLN: 'FLN - Florianópolis/SC',
  JOI: 'JOI - Joinville/SC',
  NVT: 'NVT - Navegantes/SC',
  XAP: 'XAP - Chapecó/SC',
  LDB: 'LDB - Londrina/PR',
  MGF: 'MGF - Maringá/PR',
  CAC: 'CAC - Cascavel/PR',
  PFB: 'PFB - Passo Fundo/RS',
  // Espírito Santo
  VIX: 'VIX - Vitória/ES',
  // SP interior
  BAU: 'BAU - Bauru/SP',
  ARU: 'ARU - Araçatuba/SP',
};

/** Formata "DD/MM/AAAA" ou "AAAA-MM-DD" → "DD/MM/AAAA" para exibição amigável */
function formatDate(raw) {
  if (!raw) return '';
  // já está no formato dd/mm/aaaa
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) return raw;
  // no formato aaaa-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-');
    return `${d}/${m}/${y}`;
  }
  return raw;
}

/** Converte "DD/MM/AAAA" → "AAAA-MM-DD" para comparar com o input type=date */
function toIso(raw) {
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
    const [d, m, y] = raw.split('/');
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  return '';
}

const WEEKDAY_PT = {
  Monday: 'Segunda', Tuesday: 'Terça', Wednesday: 'Quarta',
  Thursday: 'Quinta', Friday: 'Sexta', Saturday: 'Sábado', Sunday: 'Domingo',
};

function diaSemana(raw) {
  // tenta derivar o dia da semana a partir da data real
  const iso = toIso(raw);
  if (iso) {
    const d = new Date(iso + 'T12:00:00');
    const names = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    return WEEKDAY_PT[names[d.getDay()]] || '';
  }
  return '';
}

export default function MalhaPage() {
  const [voos, setVoos] = useState([]);
  const [upload, setUpload] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({ origem: '', destino: '', data: '' });
  const [estacoes, setEstacoes] = useState({ origens: [], destinos: [] });

  useEffect(() => { buscar(); }, []);

  async function buscar() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtros.origem) params.set('origem', filtros.origem);
    if (filtros.destino) params.set('destino', filtros.destino);
    // Sem filtro de weekday e sem apenas_carga — mostra tudo

    const res = await fetch(`/api/public/malha?${params}`);
    const data = await res.json();

    let lista = data.voos || [];

    // Filtra por data no frontend (campo day_date)
    if (filtros.data) {
      lista = lista.filter(v => toIso(v.day_date) === filtros.data);
    }

    setVoos(lista);
    setUpload(data.upload);
    setDownloadUrl(data.download_url);

    // Atualiza sempre as estações a partir dos dados brutos (sem filtro de data)
    const todosVoos = data.voos || [];
    if (!filtros.origem && !filtros.destino) {
      const origens = [...new Set(todosVoos.map(v => v.dept_station).filter(Boolean))].sort();
      const destinos = [...new Set(todosVoos.map(v => v.arrival_station).filter(Boolean))].sort();
      setEstacoes({ origens, destinos });
    }
    setLoading(false);
  }

  function handleFiltro(key, value) {
    setFiltros(p => ({ ...p, [key]: value }));
  }

  function limpar() {
    setFiltros({ origem: '', destino: '', data: '' });
    setTimeout(() => buscarSemFiltro(), 50);
  }

  async function buscarSemFiltro() {
    setLoading(true);
    const res = await fetch('/api/public/malha');
    const data = await res.json();
    setVoos(data.voos || []);
    setUpload(data.upload);
    setDownloadUrl(data.download_url);
    const origens = [...new Set((data.voos || []).map(v => v.dept_station).filter(Boolean))].sort();
    const destinos = [...new Set((data.voos || []).map(v => v.arrival_station).filter(Boolean))].sort();
    setEstacoes({ origens, destinos });
    setLoading(false);
  }

  // Agrupa por data real → dentro de cada data, exibe os voos
  const porData = {};
  voos.forEach(v => {
    const key = v.day_date || '—';
    if (!porData[key]) porData[key] = [];
    porData[key].push(v);
  });

  // Ordena as datas cronologicamente; '—' (sem data) sempre por último
  const datasOrdenadas = Object.keys(porData).sort((a, b) => {
    if (a === '—') return 1;
    if (b === '—') return -1;
    const ia = toIso(a), ib = toIso(b);
    if (ia && ib) return ia.localeCompare(ib);
    return a.localeCompare(b);
  });

  const temResultados = datasOrdenadas.length > 0;

  return (
    <div className="public-page">
      <div className="public-container" style={{ maxWidth: 900 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo.png" alt="GOLLOG" style={{ height: 48, marginBottom: 16 }}
            onError={e => e.target.style.display = 'none'} />
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>
            Malha Aérea GOLLOG
          </h1>
          <p style={{ color: '#6b7280', fontSize: 14 }}>
            Consulte os voos disponíveis para envio de carga
          </p>
          {upload && (
            <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>
              Atualizado em {new Date(upload.uploaded_at).toLocaleDateString('pt-BR')} · {upload.total_voos} voos na base
            </p>
          )}
        </div>

        {/* Filtros */}
        <div className="public-card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>

            {/* Origem */}
            <div>
              <label className="form-label">Origem</label>
              <select className="form-input" value={filtros.origem}
                onChange={e => handleFiltro('origem', e.target.value)}>
                <option value="">Todas</option>
                {estacoes.origens.map(o => (
                  <option key={o} value={o}>{AEROPORTOS[o] || o}</option>
                ))}
              </select>
            </div>

            {/* Destino */}
            <div>
              <label className="form-label">Destino</label>
              <select className="form-input" value={filtros.destino}
                onChange={e => handleFiltro('destino', e.target.value)}>
                <option value="">Todos</option>
                {estacoes.destinos.map(d => (
                  <option key={d} value={d}>{AEROPORTOS[d] || d}</option>
                ))}
              </select>
            </div>

            {/* Data */}
            <div>
              <label className="form-label">Data</label>
              <input
                type="date"
                className="form-input"
                value={filtros.data}
                onChange={e => handleFiltro('data', e.target.value)}
                style={{ cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Botões — alinhados em linha, BAIXAR MALHA à direita */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={buscar} disabled={loading}
              style={{ minWidth: 110 }}>
              {loading ? 'Buscando...' : '🔍 Buscar'}
            </button>
            <button className="btn btn-secondary" onClick={limpar}
              style={{ minWidth: 90 }}>
              Limpar
            </button>
            {downloadUrl && (
              <a
                href={downloadUrl}
                download
                className="btn btn-secondary"
                style={{ marginLeft: 'auto', minWidth: 130, textAlign: 'center', textDecoration: 'none' }}
              >
                ⬇ BAIXAR MALHA
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
          datasOrdenadas.map(data => {
            const lista = porData[data];
            const dataFmt = formatDate(data);
            const diaSem = diaSemana(data);
            return (
              <div key={data} className="public-card" style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#F37021', marginBottom: 12 }}>
                  {dataFmt}{diaSem ? ` — ${diaSem}` : ''}
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        {['Voo', 'Origem', 'Saída', 'Chegada', 'Destino', 'Aeronave', 'Carga'].map(h => (
                          <th key={h} style={{
                            padding: '8px 12px', textAlign: 'left', fontWeight: 600,
                            color: '#374151', borderBottom: '1px solid #e5e7eb',
                          }}>{h}</th>
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
            );
          })
        )}
      </div>
    </div>
  );
}
