import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiSearch, FiPackage, FiMapPin, FiClock, FiCheck, FiTruck, FiLoader } from 'react-icons/fi';

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

export default function RastreamentoPage() {
  const [searchParams] = useSearchParams();
  const docFromUrl = searchParams.get('doc') || '';
  const [docNumber, setDocNumber] = useState(docFromUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!docNumber.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/tracking/gollog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentNumber: docNumber.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Documento não encontrado');
        return;
      }
      setResult(data);
    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-search if doc came from URL
  useState(() => {
    if (docFromUrl) handleSearch();
  }, []);

  return (
    <div className="public-page">
      <header className="public-header">
        <img src="/logo.png" alt="GOLLOG" />
        <span style={{ fontSize:14, fontWeight:600, color:'#4A4A4A' }}>Rastreamento</span>
      </header>
      <div className="public-container">
        {/* Search */}
        <div className="public-card">
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:'rgba(243,112,33,0.1)',
              display:'flex', alignItems:'center', justifyContent:'center', color:'#F37021' }}>
              <FiPackage size={20}/>
            </div>
            <h2 style={{ marginBottom:0 }}>Rastrear Envio</h2>
          </div>
          <p className="subtitle">Digite o número do AWB ou documento de transporte.</p>

          <form onSubmit={handleSearch} style={{ display:'flex', gap:8 }}>
            <input className="public-input" placeholder="Ex: 12732470653"
              value={docNumber} onChange={e => setDocNumber(e.target.value)}
              style={{ flex:1, fontSize:16, letterSpacing:1 }} />
            <button type="submit" className="public-btn" disabled={loading}
              style={{ width:'auto', padding:'12px 24px', display:'flex', alignItems:'center', gap:8 }}>
              {loading ? <FiLoader size={18} className="spin"/> : <FiSearch size={18}/>}
              {loading ? 'Buscando...' : 'Rastrear'}
            </button>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background:'white', borderRadius:12, padding:32, textAlign:'center', marginTop:16,
            boxShadow:'0 2px 12px rgba(0,0,0,0.06)'
          }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🔍</div>
            <h3 style={{ color:'#1A1A1A', marginBottom:6 }}>Não encontrado</h3>
            <p style={{ color:'#6B7280', fontSize:14 }}>{error}</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{ marginTop:16 }}>
            {/* Summary Card */}
            <div className="public-card" style={{ marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:11, color:'#6B7280', fontWeight:600, textTransform:'uppercase', letterSpacing:1 }}>AWB</div>
                  <div style={{ fontSize:22, fontWeight:800, color:'#1A1A1A', letterSpacing:1 }}>{result.summary.awb}</div>
                </div>
                <div style={{
                  background: result.summary.statusCode === 5 ? 'rgba(0,200,83,0.1)' : 'rgba(243,112,33,0.1)',
                  color: result.summary.statusCode === 5 ? '#00C853' : '#F37021',
                  padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:700
                }}>
                  {result.summary.status}
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:8, alignItems:'center',
                background:'#F9FAFB', borderRadius:12, padding:20, marginBottom:16 }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:24, fontWeight:800, color:'#F37021' }}>{result.summary.origin?.station}</div>
                  <div style={{ fontSize:11, color:'#6B7280', marginTop:2 }}>{result.summary.origin?.name}</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                  <FiTruck size={18} color="#F37021"/>
                  <div style={{ width:60, height:2, background:'linear-gradient(90deg, #F37021, #FF8C42)' }}></div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:24, fontWeight:800, color:'#F37021' }}>{result.summary.destination?.station}</div>
                  <div style={{ fontSize:11, color:'#6B7280', marginTop:2 }}>{result.summary.destination?.name}</div>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                <div style={{ textAlign:'center', padding:12, background:'#F9FAFB', borderRadius:8 }}>
                  <div style={{ fontSize:11, color:'#6B7280' }}>Produto</div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#1A1A1A', marginTop:2 }}>{result.summary.product}</div>
                </div>
                <div style={{ textAlign:'center', padding:12, background:'#F9FAFB', borderRadius:8 }}>
                  <div style={{ fontSize:11, color:'#6B7280' }}>Peso</div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#1A1A1A', marginTop:2 }}>{result.summary.totals?.weight} kg</div>
                </div>
                <div style={{ textAlign:'center', padding:12, background:'#F9FAFB', borderRadius:8 }}>
                  <div style={{ fontSize:11, color:'#6B7280' }}>Volumes</div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#1A1A1A', marginTop:2 }}>{result.summary.totals?.pieces}</div>
                </div>
              </div>

              {result.summary.expectedDelivery && (
                <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:16, padding:'10px 14px',
                  background:'rgba(68,138,255,0.08)', borderRadius:8, fontSize:13, color:'#1565C0' }}>
                  <FiClock size={14}/>
                  <span>Previsão de entrega: <strong>{new Date(result.summary.expectedDelivery).toLocaleDateString('pt-BR')}</strong></span>
                </div>
              )}

              {result.summary.description && (
                <div style={{ fontSize:12, color:'#6B7280', marginTop:12 }}>
                  📋 Conteúdo: {result.summary.description}
                  {result.summary.declaredValue && ` | Valor declarado: R$ ${parseFloat(result.summary.declaredValue.replace(',','.')).toLocaleString('pt-BR',{minimumFractionDigits:2})}`}
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="public-card">
              <h3 style={{ fontSize:16, fontWeight:700, color:'#1A1A1A', marginBottom:20, display:'flex', alignItems:'center', gap:8 }}>
                <FiMapPin size={16} color="#F37021"/> Histórico de Eventos
              </h3>

              <div style={{ position:'relative' }}>
                {[...result.events].reverse().map((evt, i) => {
                  const statusInfo = STATUS_ICONS[evt.code] || { icon:'📌', color:'#9E9E9E', label: evt.code };
                  const isFirst = i === 0;
                  return (
                    <div key={i} style={{
                      display:'flex', gap:16, marginBottom: i < result.events.length - 1 ? 0 : 0,
                      position:'relative', paddingBottom:24,
                    }}>
                      {/* Timeline line */}
                      {i < result.events.length - 1 && (
                        <div style={{ position:'absolute', left:19, top:40, bottom:0, width:2,
                          background:'#E5E5E5' }}/>
                      )}
                      {/* Dot */}
                      <div style={{
                        width:40, height:40, borderRadius:'50%', flexShrink:0,
                        background: isFirst ? statusInfo.color : '#F3F4F6',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:18, zIndex:1,
                        boxShadow: isFirst ? `0 0 0 4px ${statusInfo.color}22` : 'none',
                      }}>
                        {statusInfo.icon}
                      </div>
                      {/* Content */}
                      <div style={{ flex:1, paddingTop:2 }}>
                        <div style={{ fontSize:14, fontWeight:600, color:'#1A1A1A' }}>{evt.description}</div>
                        <div style={{ fontSize:12, color:'#6B7280', marginTop:2 }}>
                          📍 {evt.stationName || evt.station}
                          {evt.flightNumber && ` · Voo ${evt.flightNumber}`}
                          {evt.scheduleType && ` (${evt.scheduleType})`}
                        </div>
                        <div style={{ fontSize:11, color:'#9CA3AF', marginTop:4 }}>
                          🕐 {evt.date}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <p style={{ textAlign:'center', marginTop:16, fontSize:12, color:'#9CA3AF' }}>
          © 2026 GOLLOG · Dados em tempo real via API GOLLOG
        </p>
      </div>
    </div>
  );
}
