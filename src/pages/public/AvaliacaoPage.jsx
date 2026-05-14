import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FiStar, FiCheck, FiAlertTriangle, FiExternalLink } from 'react-icons/fi';

const ESTRELAS = [1, 2, 3, 4, 5];

const LABELS = {
  1: 'Muito ruim',
  2: 'Ruim',
  3: 'Regular',
  4: 'Bom',
  5: 'Excelente!',
};

const CORES = {
  1: '#f44336',
  2: '#ff7043',
  3: '#ffa726',
  4: '#66bb6a',
  5: '#00C853',
};

export default function AvaliacaoPage() {
  const { rastreamento_id } = useParams();
  const [nota, setNota] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!nota) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/public/avaliar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rastreamento_id, nota, comentario }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar avaliação');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const estrelaAtiva = hover || nota;
  const cor = CORES[estrelaAtiva] || '#F37021';

  if (result) {
    return (
      <div className="public-page">
        <header className="public-header">
          <img src="/logo.png" alt="GOLLOG" />
        </header>
        <div className="public-container">
          <div className="public-card" style={{ textAlign: 'center', padding: 48 }}>
            {result.tipo === 'negativa' ? (
              <>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,82,82,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px', color: '#f44336', fontSize: 28
                }}><FiAlertTriangle /></div>
                <h2 style={{ marginBottom: 8 }}>Recebemos sua avaliação</h2>
                <p style={{ color: '#666', fontSize: 15, lineHeight: 1.6 }}>
                  Lamentamos que sua experiência não tenha sido a melhor.<br />
                  Nossa equipe entrará em contato em breve para resolver a situação.
                </p>
              </>
            ) : result.tipo === 'excelente' ? (
              <>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,200,83,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px', color: '#00C853', fontSize: 28
                }}><FiCheck /></div>
                <h2 style={{ marginBottom: 8 }}>Obrigado! ⭐⭐⭐⭐⭐</h2>
                <p style={{ color: '#666', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
                  Ficamos muito felizes com sua avaliação máxima!<br />
                  Que tal compartilhar sua experiência no Google?
                </p>
                {result.googleLink && (
                  <a href={result.googleLink} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      background: '#4285F4', color: '#fff', padding: '14px 28px',
                      borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 15
                    }}>
                    <FiExternalLink size={16} /> Avaliar no Google
                  </a>
                )}
              </>
            ) : (
              <>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', background: 'rgba(102,187,106,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px', color: '#66bb6a', fontSize: 28
                }}><FiCheck /></div>
                <h2 style={{ marginBottom: 8 }}>Obrigado pela avaliação!</h2>
                <p style={{ color: '#666', fontSize: 15 }}>
                  Sua opinião é muito importante para continuarmos melhorando.
                </p>
              </>
            )}
            <p style={{ textAlign: 'center', marginTop: 32, fontSize: 12, color: '#9CA3AF' }}>
              Volte para o WhatsApp para continuar o atendimento.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-page">
      <header className="public-header">
        <img src="/logo.png" alt="GOLLOG" />
        <span style={{ fontSize: 14, fontWeight: 600, color: '#4A4A4A' }}>Avaliação do Serviço</span>
      </header>
      <div className="public-container">
        <div className="public-card">
          <h2 style={{ marginBottom: 4 }}>Como foi sua experiência?</h2>
          <p className="subtitle">Sua opinião nos ajuda a melhorar o serviço.</p>

          {error && (
            <div style={{
              background: 'rgba(255,82,82,0.08)', border: '1px solid rgba(255,82,82,0.3)',
              color: '#D32F2F', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13
            }}>{error}</div>
          )}

          {/* Estrelas */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, margin: '32px 0 8px' }}>
            {ESTRELAS.map(n => (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setNota(n)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 4, transition: 'transform 0.15s',
                  transform: (hover || nota) >= n ? 'scale(1.15)' : 'scale(1)',
                }}
              >
                <FiStar
                  size={44}
                  style={{
                    fill: (hover || nota) >= n ? cor : 'transparent',
                    stroke: (hover || nota) >= n ? cor : '#ccc',
                    transition: 'all 0.15s',
                  }}
                />
              </button>
            ))}
          </div>

          {/* Label da nota */}
          <div style={{ textAlign: 'center', height: 24, marginBottom: 24 }}>
            {estrelaAtiva > 0 && (
              <span style={{ fontSize: 16, fontWeight: 700, color: cor }}>
                {LABELS[estrelaAtiva]}
              </span>
            )}
          </div>

          {/* Comentário — só aparece se nota selecionada */}
          {nota > 0 && (
            <div className="form-group">
              <label className="form-label" style={{ color: '#374151' }}>
                {nota <= 3 ? 'O que podemos melhorar?' : 'Deixe um comentário (opcional)'}
              </label>
              <textarea
                className="public-input"
                placeholder={nota <= 3 ? 'Conte o que aconteceu...' : 'Compartilhe sua experiência...'}
                value={comentario}
                onChange={e => setComentario(e.target.value)}
                rows={3}
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
          )}

          <button
            className="public-btn"
            style={{ marginTop: 8, opacity: !nota ? 0.5 : 1 }}
            disabled={!nota || loading}
            onClick={handleSubmit}
          >
            {loading ? 'Enviando...' : 'Enviar Avaliação'}
          </button>
        </div>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#9CA3AF' }}>
          © 2026 GOLLOG · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
