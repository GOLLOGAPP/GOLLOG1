import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiSearch, FiPackage, FiMapPin, FiClock, FiTruck, FiLoader, FiChevronDown, FiChevronUp, FiAlertCircle } from 'react-icons/fi';

const STATUS_ICONS = {
  RCS: { icon: '📦', color: '#448AFF', label: 'Recebida' },
  CIE: { icon: '🏢', color: '#FF9800', label: 'Em trânsito' },
  MAN: { icon: '📋', color: '#9C27B0', label: 'Manifestada' },
  DEP: { icon: '✈️', color: '#2196F3', label: 'Enviada' },
  RCF: { icon: '🛬', color: '#4CAF50', label: 'Desembarcada' },
  DLV: { icon: '✅', color: '#00C853', label: 'Entregue' },
  NFD: { icon: '⚠️', color: '#FF5722', label: 'Tentativa' },
  AWD: { icon: '🏪', color: '#607D8B', label: 'Disponível' },
};

const parseCodes = (input) => [
  ...new Set(
    input.split(/[\s,;]+/)
      .map(s => s.trim())
      .filter(s => s.length > 5)
  )
];

export default function RastreamentoPage() {
  const [searchParams] = useSearchParams();
  const docFromUrl = searchParams.get('doc') || '';
  const [docInput, setDocInput] = useState(docFromUrl);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const detectedCount = parseCodes(docInput).length;

  const handleSearch = async (e) => {
    e?.preventDefault();
    const codes = parseCodes(docInput);
    if (!codes.length) return;

    setLoading(true);
    setResults(codes.map(code => ({ code, status: 'loading', data: null, error: null, expanded: false })));

    await Promise.allSettled(
      codes.map(async (code, idx) => {
        try {
          const res = await fetch('/api/tracking/gollog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentNumber: code }),
          });
          const data = await res.json();
          setResults(prev => prev.map((r, i) =>
            i === idx
              ? { ...r, status: res.ok ? 'found' : 'error', data: res.ok ? data : null, error: res.ok ? null : (data.message || 'Não encontrado'), expanded: codes.length === 1 }
              : r
          ));
        } catch {
          setResults(prev => prev.map((r, i) =>
            i === idx ? { ...r, status: 'error', error: 'Erro de conexão' } : r
          ));
        }
      })
    );

    setLoading(false);
  };

  const toggleExpand = (idx) =>
    setResults(prev => prev.map((r, i) => i === idx ? { ...r, expanded: !r.expanded } : r));

  // Auto-search if doc came from URL
  useState(() => { if (docFromUrl) handleSearch(); }, []);

  const foundCount = results.filter(r => r.status === 'found').length;

  return (
    <div className="public-page">
      <header className="public-header">
        <img src="/logo.png" alt="GOLLOG" />
        <span style={{ fontSize: 14, fontWeight: 600, color: '#4A4A4A' }}>Rastreamento</span>
      </header>
      <div className="public-container">

        <div className="public-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(243,112,33,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F37021' }}>
              <FiPackage size={20} />
            </div>
            <h2 style={{ marginBottom: 0 }}>Rastrear Envio</h2>
          </div>
          <p className="subtitle">Digite um ou mais AWBs separados por vírgula ou espaço.</p>

          <form onSubmit={handleSearch}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  className="public-input"
                  placeholder="Ex: 12732470653, 98710001234"
                  value={docInput}
                  onChange={e => setDocInput(e.target.value)}
                  style={{ fontSize: 15, letterSpacing: 0.5, paddingRight: detectedCount > 1 ? 90 : undefined }}
                />
                {detectedCount > 1 && (
                  <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: '#F37021', color: '#fff', borderRadius: 12, padding: '2px 10px',
                    fontSize: 11, fontWeight: 700, pointerEvents: 'none' }}>
                    {detectedCount} envios
                  </div>
                )}
              </div>
              <button type="submit" className="public-btn" disabled={loading || !detectedCount}
                style={{ width: 'auto', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                {loading ? <FiLoader size={18} className="spin" /> : <FiSearch size={18} />}
                {loading ? 'Buscando...' : detectedCount > 1 ? `Rastrear ${detectedCount}` : 'Rastrear'}
              </button>
            </div>
          </form>
        </div>

        {results.length > 0 && (
          <div style={{ marginTop: 16 }}>
            {results.length > 1 && (
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 10, fontWeight: 500 }}>
                {foundCount} de {results.length} encontrado{foundCount !== 1 ? 's' : ''}
              </div>
            )}
            {results.map((r, idx) => (
              <ResultCard key={r.code} result={r} onToggle={() => toggleExpand(idx)} />
            ))}
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#9CA3AF' }}>
          © 2026 LOGPROFIT · Dados em tempo real via API GOLLOG
        </p>
      </div>
    </div>
  );
}

function ResultCard({ result, onToggle }) {
  const { code, status, data, error, expanded } = result;

  if (status === 'loading') {
    return (
      <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', marginBottom: 12,
        border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 12 }}>
        <FiLoader size={18} className="spin" color="#F37021" />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{code}</div>
          <div style={{ fontSize: 11, color: '#9CA3AF' }}>Consultando API GOLLOG...</div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ background: '#FFF5F5', borderRadius: 12, padding: '16px 20px', marginBottom: 12,
        border: '1px solid #FECACA', display: 'flex', alignItems: 'center', gap: 12 }}>
        <FiAlertCircle size={18} color="#EF4444" />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{code}</div>
          <div style={{ fontSize: 11, color: '#EF4444' }}>{error}</div>
        </div>
      </div>
    );
  }

  const { summary, events } = data;
  const lastEvent = events?.[events.length - 1];
  const lastStatusInfo = lastEvent ? (STATUS_ICONS[lastEvent.code] || { icon: '📌', color: '#9E9E9E' }) : { icon: '📦', color: '#9E9E9E' };
  const isDelivered = summary.statusCode === 5;

  return (
    <div style={{ background: '#fff', borderRadius: 12, marginBottom: 12,
      border: '1px solid #E5E7EB', overflow: 'hidden',
      boxShadow: expanded ? '0 4px 20px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.05)' }}>

      {/* Collapsed header */}
      <div onClick={onToggle} style={{ padding: '14px 20px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 12,
        background: expanded ? '#FAFAFA' : '#fff', userSelect: 'none' }}>
        <div style={{ fontSize: 22, lineHeight: 1 }}>{lastStatusInfo.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', letterSpacing: 0.5 }}>
              {summary.awb}
            </div>
            <div style={{
              background: isDelivered ? 'rgba(0,200,83,0.1)' : 'rgba(243,112,33,0.1)',
              color: isDelivered ? '#00C853' : '#F37021',
              padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
            }}>
              {summary.status}
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>
            {summary.origin?.station} → {summary.destination?.station}
            {lastEvent && ` · ${lastEvent.description}`}
          </div>
        </div>
        <div style={{ color: '#9CA3AF', flexShrink: 0 }}>
          {expanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid #F3F4F6' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center',
            background: '#F9FAFB', borderRadius: 12, padding: 16, margin: '16px 0' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#F37021' }}>{summary.origin?.station}</div>
              <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>{summary.origin?.name}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <FiTruck size={16} color="#F37021" />
              <div style={{ width: 40, height: 2, background: 'linear-gradient(90deg, #F37021, #FF8C42)' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#F37021' }}>{summary.destination?.station}</div>
              <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>{summary.destination?.name}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            {[['Produto', summary.product], ['Peso', `${summary.totals?.weight} kg`], ['Volumes', summary.totals?.pieces]].map(([lbl, val]) => (
              <div key={lbl} style={{ textAlign: 'center', padding: 10, background: '#F9FAFB', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: '#6B7280' }}>{lbl}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A', marginTop: 2 }}>{val}</div>
              </div>
            ))}
          </div>

          {summary.expectedDelivery && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '10px 14px',
              background: 'rgba(68,138,255,0.08)', borderRadius: 8, fontSize: 13, color: '#1565C0' }}>
              <FiClock size={14} />
              <span>Previsão de entrega: <strong>{new Date(summary.expectedDelivery).toLocaleDateString('pt-BR')}</strong></span>
            </div>
          )}

          <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', marginBottom: 14,
            display: 'flex', alignItems: 'center', gap: 6 }}>
            <FiMapPin size={13} color="#F37021" /> Histórico de Eventos
          </div>

          <div style={{ position: 'relative' }}>
            {[...events].reverse().map((evt, i) => {
              const statusInfo = STATUS_ICONS[evt.code] || { icon: '📌', color: '#9E9E9E' };
              const isFirst = i === 0;
              return (
                <div key={i} style={{ display: 'flex', gap: 12, position: 'relative', paddingBottom: 20 }}>
                  {i < events.length - 1 && (
                    <div style={{ position: 'absolute', left: 15, top: 32, bottom: 0, width: 2, background: '#E5E5E5' }} />
                  )}
                  <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: isFirst ? statusInfo.color : '#F3F4F6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, zIndex: 1,
                    boxShadow: isFirst ? `0 0 0 4px ${statusInfo.color}22` : 'none' }}>
                    {statusInfo.icon}
                  </div>
                  <div style={{ flex: 1, paddingTop: 2 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{evt.description}</div>
                    <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                      📍 {evt.stationName || evt.station}
                      {evt.flightNumber && ` · Voo ${evt.flightNumber}`}
                      {evt.scheduleType && ` (${evt.scheduleType})`}
                    </div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>🕐 {evt.date}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {summary.description && (
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
              📋 {summary.description}
              {summary.declaredValue && ` · Valor declarado: R$ ${parseFloat(summary.declaredValue.replace(',', '.')).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
