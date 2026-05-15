import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FiChevronDown, FiChevronUp, FiSearch } from 'react-icons/fi';

export default function FaqPage() {
  const [faqs, setFaqs] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFaq = async () => {
      const { data } = await supabase
        .from('faq')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });
      if (data) setFaqs(data);
      setLoading(false);
    };
    fetchFaq();
  }, []);

  const filtered = faqs.filter(f =>
    !search || f.pergunta.toLowerCase().includes(search.toLowerCase()) ||
    f.resposta.toLowerCase().includes(search.toLowerCase())
  );

  const categorias = [...new Set(filtered.map(f => f.categoria).filter(Boolean))];

  return (
    <div className="public-page">
      <header className="public-header">
        <img src="/logo.png" alt="GOLLOG" />
        <span style={{ fontSize:14, fontWeight:600, color:'#4A4A4A' }}>Perguntas Frequentes</span>
      </header>
      <div className="public-container" style={{ maxWidth:720 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <h1 style={{ fontSize:28, fontWeight:800, color:'#1A1A1A', marginBottom:8 }}>
            Como podemos ajudar?
          </h1>
          <p style={{ color:'#6B7280', fontSize:15 }}>
            Encontre respostas para as dúvidas mais comuns sobre nossos serviços.
          </p>
          <div style={{ position:'relative', maxWidth:400, margin:'20px auto 0' }}>
            <FiSearch style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }} />
            <input className="public-input" placeholder="Buscar pergunta..."
              style={{ paddingLeft:40 }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:40, color:'#6B7280' }}>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:40, color:'#6B7280' }}>
            Nenhuma pergunta encontrada.
          </div>
        ) : (
          categorias.map(cat => (
            <div key={cat} style={{ marginBottom:24 }}>
              <h3 style={{ fontSize:14, fontWeight:700, color:'#F37021', textTransform:'uppercase',
                letterSpacing:'0.5px', marginBottom:10, paddingLeft:4 }}>
                {cat}
              </h3>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {filtered.filter(f => f.categoria === cat).map(f => (
                  <div key={f.id} style={{
                    background:'white', borderRadius:10, overflow:'hidden',
                    border:'1px solid #E5E7EB', cursor:'pointer',
                    transition:'all 0.2s ease',
                    boxShadow: expanded === f.id ? '0 2px 12px rgba(0,0,0,0.06)' : 'none'
                  }} onClick={() => setExpanded(expanded === f.id ? null : f.id)}>
                    <div style={{
                      padding:'14px 18px', display:'flex', alignItems:'center',
                      justifyContent:'space-between', gap:12
                    }}>
                      <span style={{ fontSize:14, fontWeight:600, color:'#1A1A1A' }}>{f.pergunta}</span>
                      {expanded === f.id ? <FiChevronUp color="#F37021"/> : <FiChevronDown color="#9CA3AF"/>}
                    </div>
                    {expanded === f.id && (
                      <div style={{
                        padding:'0 18px 16px', fontSize:14, color:'#4B5563',
                        lineHeight:1.7, borderTop:'1px solid #F3F4F6'
                      }}>
                        <div style={{ paddingTop:12 }}>{f.resposta}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        <div style={{ textAlign:'center', marginTop:32, padding:24, background:'white',
          borderRadius:12, border:'1px solid #E5E7EB' }}>
          <p style={{ fontSize:15, fontWeight:600, color:'#1A1A1A', marginBottom:4 }}>
            Não encontrou o que procurava?
          </p>
          <p style={{ fontSize:13, color:'#6B7280' }}>
            Entre em contato pelo nosso WhatsApp e selecione a opção <strong>Suporte</strong>.
          </p>
        </div>

        <p style={{ textAlign:'center', marginTop:16, fontSize:12, color:'#9CA3AF' }}>
          © 2026 LOGPROFIT · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
