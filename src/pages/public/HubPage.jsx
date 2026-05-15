import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const HUB_LINKS = [
  { id: 'cadastro',     label: 'Cadastro de Cliente',     emoji: '📋', desc: 'Crie sua conta gratuitamente',    href: (b) => `${b}/cadastro`,          ext: false },
  { id: 'cotacao',      label: 'Fazer Cotação',           emoji: '💰', desc: 'Calcule seu frete em segundos',   href: (b) => `${b}/cotacao`,           ext: false },
  { id: 'rastreamento', label: 'Rastrear Encomenda',      emoji: '📦', desc: 'Acompanhe seu envio em tempo real', href: (b) => `${b}/rastreamento`,     ext: false },
  { id: 'motorista',    label: 'Cadastro de Motorista',   emoji: '🚛', desc: 'Torne-se motorista parceiro',     href: (b) => `${b}/motorista-agregado`, ext: false },
  { id: 'minuta',       label: 'Minuta Eletrônica',       emoji: '📄', desc: 'Despacho eletrônico GOLLOG',      href: () => 'https://servicos.gollog.com.br/minuta', ext: true },
  { id: 'malha',        label: 'Malha Aérea',             emoji: '✈️', desc: 'Consulte rotas e destinos',       href: () => 'https://servicos.gollog.com.br/malha',  ext: true },
  { id: 'dce',          label: 'DCE',                     emoji: '📝', desc: 'Declaração de Conteúdo Eletrônico', href: () => 'https://servicos.gollog.com.br/dce',  ext: true },
];

function hexToRgb(hex = '#F37021') {
  const clean = hex.replace('#', '');
  return `${parseInt(clean.slice(0,2),16)}, ${parseInt(clean.slice(2,4),16)}, ${parseInt(clean.slice(4,6),16)}`;
}

export default function HubPage() {
  const { slug } = useParams();
  const [cfg, setCfg]     = useState(null);
  const [loading, setLoading] = useState(true);
  const base = window.location.origin;

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('configuracoes')
        .select('chave, valor')
        .in('chave', ['hub_slug','hub_empresa_nome','hub_tagline','hub_cor','hub_links_ativos']);
      const map = Object.fromEntries((data || []).map(r => [r.chave, r.valor]));
      if (!data || map.hub_slug !== slug) { setCfg(null); }
      else setCfg(map);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#F37021', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!cfg) return (
    <div style={{ minHeight: '100vh', background: '#0f0f1a', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
      <div style={{ fontSize: 56 }}>📦</div>
      <h2 style={{ margin: 0 }}>Hub não encontrado</h2>
      <p style={{ color: '#9CA3AF', margin: 0, textAlign: 'center' }}>O link acessado não existe ou foi desativado.</p>
    </div>
  );

  const cor        = cfg.hub_cor || '#F37021';
  const rgb        = hexToRgb(cor);
  const empresa    = cfg.hub_empresa_nome || 'GOLLOG';
  const tagline    = cfg.hub_tagline || '';
  const ativos     = (cfg.hub_links_ativos || '').split(',').map(s => s.trim()).filter(Boolean);
  const links      = HUB_LINKS.filter(l => ativos.includes(l.id));

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0d0d1a 0%, #141428 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '48px 16px 40px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    }}>
      {/* Accent glow */}
      <div style={{
        position: 'fixed', top: -120, left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 280, borderRadius: '50%',
        background: `radial-gradient(ellipse, rgba(${rgb},0.18) 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Logo + nome */}
      <div style={{ textAlign: 'center', marginBottom: 44, position: 'relative' }}>
        <div style={{
          width: 88, height: 88, borderRadius: 22, background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 20px', overflow: 'hidden',
          boxShadow: `0 8px 32px rgba(${rgb},0.25)`,
        }}>
          <img src="/logo.png" alt={empresa} style={{ height: 64, objectFit: 'contain' }} />
        </div>
        <h1 style={{ color: '#fff', fontSize: 30, fontWeight: 800, margin: '0 0 8px', letterSpacing: 0.5 }}>{empresa}</h1>
        {tagline && <p style={{ color: '#9CA3AF', margin: 0, fontSize: 15 }}>{tagline}</p>}
      </div>

      {/* Serviços */}
      <div style={{ width: '100%', maxWidth: 480 }}>
        <p style={{ color: '#6B7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14, textAlign: 'center' }}>
          Acesse nossos serviços
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {links.map(link => (
            <a
              key={link.id}
              href={link.href(base)}
              target={link.ext ? '_blank' : '_self'}
              rel="noopener noreferrer"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                padding: '18px 16px', borderRadius: 14, textDecoration: 'none', color: '#fff',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                transition: 'all 0.2s', cursor: 'pointer',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = `rgba(${rgb},0.12)`;
                e.currentTarget.style.borderColor = `rgba(${rgb},0.45)`;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span style={{ fontSize: 30, marginBottom: 10, lineHeight: 1 }}>{link.emoji}</span>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, lineHeight: 1.3 }}>{link.label}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.4 }}>{link.desc}</div>
            </a>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p style={{ marginTop: 52, fontSize: 11, color: '#374151' }}>
        Powered by <span style={{ color: cor, fontWeight: 700 }}>LOGPROFIT</span>
      </p>
    </div>
  );
}
