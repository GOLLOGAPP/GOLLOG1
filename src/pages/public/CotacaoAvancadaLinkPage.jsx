import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function CotacaoAvancadaLinkPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [erro, setErro] = useState(false);

  useEffect(() => {
    async function resolve() {
      const { data, error } = await supabase
        .from('cotacao_tokens')
        .select('phone, name, unidade, expires_at')
        .eq('token', token)
        .maybeSingle();

      if (error || !data) { setErro(true); return; }
      if (data.expires_at && new Date(data.expires_at) < new Date()) { setErro(true); return; }

      const params = new URLSearchParams({ phone: data.phone || '', unidade: data.unidade || 'Osasco' });
      if (data.name) params.set('name', data.name);

      navigate(`/cotacao-avancada?${params.toString()}`, { replace: true });
    }
    resolve();
  }, [token, navigate]);

  if (erro) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Arial, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 18, marginBottom: 8, fontWeight: 'bold' }}>Link de cotação inválido ou expirado.</p>
          <p style={{ color: '#666' }}>Solicite um novo link de cotação pelo WhatsApp da GOLLOG.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif' }}>
      <p style={{ color: '#ff6600', fontWeight: 'bold' }}>Carregando cotação oficial GOLLOG...</p>
    </div>
  );
}
