import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { fetchCep, formatCep } from '../../lib/cep';
import { FiPackage, FiMapPin, FiBox, FiCheck, FiLoader } from 'react-icons/fi';

export default function CotacaoPage() {
  const { clienteId } = useParams();
  const [searchParams] = useSearchParams();
  const phoneFromUrl = searchParams.get('phone') || '';
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState({ origem: false, destino: false });
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({
    telefone: phoneFromUrl ? phoneFromUrl.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : '',
    cep_origem: '', cidade_origem: '', cep_destino: '', cidade_destino: '',
    peso_kg: '', altura_cm: '', largura_cm: '', comprimento_cm: '',
    tipo_servico: 'Rápido', unidade: 'Osasco'
  });

  const handleChange = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleCepOrigem = async (value) => {
    const formatted = formatCep(value);
    handleChange('cep_origem', formatted);
    if (formatted.replace(/\D/g, '').length === 8) {
      setCepLoading(p => ({ ...p, origem: true }));
      const result = await fetchCep(formatted);
      if (result) handleChange('cidade_origem', `${result.cidade}/${result.estado}`);
      setCepLoading(p => ({ ...p, origem: false }));
    }
  };

  const handleCepDestino = async (value) => {
    const formatted = formatCep(value);
    handleChange('cep_destino', formatted);
    if (formatted.replace(/\D/g, '').length === 8) {
      setCepLoading(p => ({ ...p, destino: true }));
      const result = await fetchCep(formatted);
      if (result) handleChange('cidade_destino', `${result.cidade}/${result.estado}`);
      setCepLoading(p => ({ ...p, destino: false }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let resolvedClienteId = clienteId || null;
      if (!resolvedClienteId && form.telefone) {
        const cleanPhone = form.telefone.replace(/\D/g, '');
        const { data: cliente } = await supabase
          .from('clientes').select('id')
          .or(`telefone.eq.${form.telefone},telefone.eq.${cleanPhone}`)
          .single();
        if (cliente) resolvedClienteId = cliente.id;
      }

      const { data, error } = await supabase.from('cotacoes').insert([{
        cliente_id: resolvedClienteId,
        cep_origem: form.cep_origem, cep_destino: form.cep_destino,
        cidade_origem: form.cidade_origem, cidade_destino: form.cidade_destino,
        peso_kg: parseFloat(form.peso_kg) || 0,
        altura_cm: parseFloat(form.altura_cm) || 0,
        largura_cm: parseFloat(form.largura_cm) || 0,
        comprimento_cm: parseFloat(form.comprimento_cm) || 0,
        tipo_servico: form.tipo_servico, status: 'pendente', unidade: form.unidade,
      }]).select();

      if (error) throw error;

      if (resolvedClienteId) {
        await supabase.from('atividades_log').insert([{
          cliente_id: resolvedClienteId, tipo: 'cotacao',
          descricao: `Cotação: ${form.cidade_origem || form.cep_origem} → ${form.cidade_destino || form.cep_destino} (${form.peso_kg}kg)`,
          canal: 'whatsapp',
        }]);
      }

      const peso = parseFloat(form.peso_kg) || 1;
      const cubagem = ((parseFloat(form.altura_cm) || 10) * (parseFloat(form.largura_cm) || 10) * (parseFloat(form.comprimento_cm) || 10)) / 6000;
      const pesoFinal = Math.max(peso, cubagem);
      const basePrice = form.tipo_servico === 'Rápido' ? 15 : form.tipo_servico === 'Urgente' ? 25 : 8;
      const valorEstimado = (pesoFinal * basePrice + 18).toFixed(2);
      const prazo = form.tipo_servico === 'Rápido' ? '1-2 dias úteis' : form.tipo_servico === 'Urgente' ? '1 dia útil' : '3-7 dias úteis';

      setResult({
        id: data?.[0]?.id,
        origem: form.cidade_origem || form.cep_origem,
        destino: form.cidade_destino || form.cep_destino,
        peso: form.peso_kg, servico: form.tipo_servico, valor: valorEstimado, prazo
      });

      if (data?.[0]?.id) {
        await supabase.from('cotacoes').update({ valor_cotado: parseFloat(valorEstimado), status: 'enviada' }).eq('id', data[0].id);
      }

      // Notify BotConversa
      const cleanPhone = form.telefone.replace(/\D/g, '');
      if (cleanPhone) {
        try {
          await fetch('/api/notify/cotacao', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: cleanPhone,
              cotacao: {
                cep_origem: form.cep_origem, cep_destino: form.cep_destino,
                cidade_origem: form.cidade_origem || form.cep_origem,
                cidade_destino: form.cidade_destino || form.cep_destino,
                peso_kg: form.peso_kg, tipo_servico: form.tipo_servico,
                valor: valorEstimado, prazo,
              }
            })
          });
        } catch (notifyErr) { console.log('Notify:', notifyErr); }
      }
    } catch (err) {
      alert('Erro ao gerar cotação: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="public-page">
        <header className="public-header"><img src="/logo.png" alt="GOLLOG" /></header>
        <div className="public-container">
          <div className="public-card" style={{ textAlign:'center' }}>
            <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(0,200,83,0.12)',
              display:'flex', alignItems:'center', justifyContent:'center',
              margin:'0 auto 20px', color:'#00C853', fontSize:28 }}><FiCheck /></div>
            <h2 style={{ marginBottom:4 }}>Cotação Gerada!</h2>
            <p className="subtitle">Confira os detalhes abaixo</p>
            <div style={{ background:'#F9FAFB', borderRadius:12, padding:24, textAlign:'left', marginTop:20 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                <div><div style={{ fontSize:11, color:'#6B7280', marginBottom:2 }}>Origem</div><div style={{ fontSize:15, fontWeight:600, color:'#1A1A1A' }}>{result.origem}</div></div>
                <div><div style={{ fontSize:11, color:'#6B7280', marginBottom:2 }}>Destino</div><div style={{ fontSize:15, fontWeight:600, color:'#1A1A1A' }}>{result.destino}</div></div>
                <div><div style={{ fontSize:11, color:'#6B7280', marginBottom:2 }}>Peso</div><div style={{ fontSize:15, fontWeight:600, color:'#1A1A1A' }}>{result.peso} kg</div></div>
                <div><div style={{ fontSize:11, color:'#6B7280', marginBottom:2 }}>Serviço</div><div style={{ fontSize:15, fontWeight:600, color:'#1A1A1A' }}>GOLLOG {result.servico}</div></div>
              </div>
              <div style={{ borderTop:'1px solid #E5E5E5', marginTop:20, paddingTop:20, textAlign:'center' }}>
                <div style={{ fontSize:12, color:'#6B7280' }}>Valor Estimado</div>
                <div style={{ fontSize:36, fontWeight:800, color:'#F37021' }}>R$ {result.valor}</div>
                <div style={{ fontSize:13, color:'#6B7280', marginTop:4 }}>Prazo: {result.prazo}</div>
              </div>
            </div>
            <p style={{ fontSize:12, color:'#9CA3AF', marginTop:16 }}>* Valores sujeitos à confirmação. O resultado também foi enviado ao seu WhatsApp! 📱</p>
          </div>
        </div>
      </div>
    );
  }

  const CepInput = ({ label, value, onChange, loading: isLoading }) => (
    <div className="form-group" style={{ marginBottom:0, position:'relative' }}>
      <label className="form-label" style={{ color:'#374151' }}>{label}</label>
      <div style={{ position:'relative' }}>
        <input className="public-input" required placeholder="00000-000" maxLength={9}
          value={value} onChange={e => onChange(e.target.value)}
          style={{ paddingRight: isLoading ? 36 : undefined }} />
        {isLoading && (
          <div style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50)', color:'#F37021' }}>
            <FiLoader size={16} className="spin" />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="public-page">
      <header className="public-header">
        <img src="/logo.png" alt="GOLLOG" />
        <span style={{ fontSize:14, fontWeight:600, color:'#4A4A4A' }}>Cotação de Envio</span>
      </header>
      <div className="public-container">
        <div className="public-card">
          <h2>Calcular Envio</h2>
          <p className="subtitle">Preencha os dados para receber a cotação do seu envio.</p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" style={{ color:'#374151' }}>📱 Seu Telefone (WhatsApp) *</label>
              <input className="public-input" required placeholder="(11) 99999-9999"
                value={form.telefone} onChange={e => handleChange('telefone', e.target.value)} />
              <div style={{ fontSize:11, color:'#9CA3AF', marginTop:4 }}>O resultado será enviado também no seu WhatsApp</div>
            </div>

            <div style={{ background:'#F9FAFB', borderRadius:8, padding:16, marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#374151', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                <FiMapPin size={14} color="#F37021"/> Origem e Destino
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <CepInput label="CEP Origem *" value={form.cep_origem} onChange={handleCepOrigem} loading={cepLoading.origem} />
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label className="form-label" style={{ color:'#374151' }}>Cidade Origem</label>
                  <input className="public-input" placeholder="São Paulo/SP" value={form.cidade_origem}
                    onChange={e => handleChange('cidade_origem', e.target.value)}
                    style={{ background: form.cidade_origem ? '#E8F5E9' : undefined }} />
                </div>
                <CepInput label="CEP Destino *" value={form.cep_destino} onChange={handleCepDestino} loading={cepLoading.destino} />
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label className="form-label" style={{ color:'#374151' }}>Cidade Destino</label>
                  <input className="public-input" placeholder="Curitiba/PR" value={form.cidade_destino}
                    onChange={e => handleChange('cidade_destino', e.target.value)}
                    style={{ background: form.cidade_destino ? '#E8F5E9' : undefined }} />
                </div>
              </div>
            </div>

            <div style={{ background:'#F9FAFB', borderRadius:8, padding:16, marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#374151', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                <FiBox size={14} color="#F37021"/> Dimensões do Pacote
              </div>
              <div className="form-group">
                <label className="form-label" style={{ color:'#374151' }}>Peso (kg) *</label>
                <input className="public-input" type="number" step="0.1" required placeholder="Ex: 5.0"
                  value={form.peso_kg} onChange={e => handleChange('peso_kg', e.target.value)} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label className="form-label" style={{ color:'#374151' }}>Altura (cm)</label>
                  <input className="public-input" type="number" placeholder="30"
                    value={form.altura_cm} onChange={e => handleChange('altura_cm', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label className="form-label" style={{ color:'#374151' }}>Largura (cm)</label>
                  <input className="public-input" type="number" placeholder="20"
                    value={form.largura_cm} onChange={e => handleChange('largura_cm', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label className="form-label" style={{ color:'#374151' }}>Comprimento (cm)</label>
                  <input className="public-input" type="number" placeholder="40"
                    value={form.comprimento_cm} onChange={e => handleChange('comprimento_cm', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color:'#374151' }}>Tipo de Serviço *</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                {[
                  { val:'Econômico', label:'Econômico', desc:'3-7 dias', icon:'💰' },
                  { val:'Rápido', label:'Rápido', desc:'1-2 dias', icon:'⚡' },
                  { val:'Urgente', label:'Urgente', desc:'1 dia', icon:'🔥' }
                ].map(s => (
                  <button key={s.val} type="button"
                    className={`type-option ${form.tipo_servico === s.val ? 'selected' : ''}`}
                    onClick={() => handleChange('tipo_servico', s.val)} style={{ padding:12 }}>
                    <div style={{ fontSize:20 }}>{s.icon}</div>
                    <div className="label" style={{ fontSize:13 }}>{s.label}</div>
                    <div style={{ fontSize:11, color:'#6B7280' }}>{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color:'#374151' }}>Unidade de Atendimento *</label>
              <select className="public-input" value={form.unidade} onChange={e => handleChange('unidade', e.target.value)}>
                <option value="Osasco">📍 Osasco</option>
                <option value="Barueri">📍 Barueri</option>
              </select>
            </div>

            <button type="submit" className="public-btn" disabled={loading}>
              {loading ? 'Calculando...' : '📦 Calcular Cotação'}
            </button>
          </form>
        </div>
        <p style={{ textAlign:'center', marginTop:16, fontSize:12, color:'#9CA3AF' }}>© 2026 GOLLOG · Todos os direitos reservados</p>
      </div>
    </div>
  );
}
