import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function LinkRedirectPage() {
  const { token } = useParams();
  const [erro, setErro] = useState(false);

  useEffect(() => {
    async function resolve() {
      const { data, error } = await supabase
        .from('link_tokens')
        .select('redirect_url, expires_at')
        .eq('token', token)
        .maybeSingle();

      if (error || !data) { setErro(true); return; }
      if (new Date(data.expires_at) < new Date()) { setErro(true); return; }

      window.location.replace(data.redirect_url);
    }
    resolve();
  }, [token]);

  if (erro) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 18, marginBottom: 8 }}>Link inválido ou expirado.</p>
          <p style={{ color: '#666' }}>Solicite um novo link pelo WhatsApp.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#666' }}>Carregando...</p>
    </div>
  );
}
