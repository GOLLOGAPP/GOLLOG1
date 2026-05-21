import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { fetchCep, formatCep } from '../../lib/cep';
import { FiMapPin, FiBox, FiCheck, FiLoader, FiTrash2, FiPlus } from 'react-icons/fi';

const calcValor = (form) => {
  const peso = parseFloat(form.peso_kg) || 1;
  const cubagem = ((parseFloat(form.altura_cm) || 10) * (parseFloat(form.largura_cm) || 10) * (parseFloat(form.comprimento_cm) || 10)) / 6000;
  const pesoFinal = Math.max(peso, cubagem);
  const basePrice = form.tipo_servico === 'Rápido' ? 15 : form.tipo_servico === 'Urgente' ? 25 : 8;
  return (pesoFinal * basePrice + 18).toFixed(2);
};

const calcPrazo = (tipo) =>
  tipo === 'Rápido' ? '1-2 dias úteis' : tipo === 'Urgente' ? '1 dia útil' : '3-7 dias úteis';

const EMPTY_DIMS = { cep_origem: '', cidade_origem: '', cep_destino: '', cidade_destino: '', peso_kg: '', altura_cm: '', largura_cm: '', comprimento_cm: '', tipo_servico: 'Rápido' };

export default function CotacaoPage() {
  const { clienteId } = useParams();
  const [searchParams] = useSearchParams();
  const phoneFromUrl = searchParams.get('phone') || '';

  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState({ origem: false, destino: false });
  const [lastResult, setLastResult] = useState(null);
  const [items, setItems] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    telefone: phoneFromUrl ? phoneFromUrl.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : '',
    unidade: 'Osasco',
    ...EMPTY_DIMS,
  });

  const handleChange = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleCepOrigem = async (value) => {
    const formatted = formatCep(value);
    handleChange('cep_origem', formatted);
    if (formatted.replace(/\D/g, '').length === 8) {
      setCepLoading(p => ({ ...p, origem: true }));
      const res = await fetchCep(formatted);
      if (res) handleChange('cidade_origem', `${res.cidade}/${res.estado}`);
      setCepLoading(p => ({ ...p, origem: false }));
    }
  };

  const handleCepDestino = async (value) => {
    const formatted = formatCep(value);
    handleChange('cep_destino', formatted);
    if (formatted.replace(/\D/g, '').length === 8) {
      setCepLoading(p => ({ ...p, destino: true }));
      const res = await fetchCep(formatted);
      if (res) handleChange('cidade_destino', `${res.cidade}/${res.estado}`);
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

      const valorEstimado = calcValor(form);
      const prazo = calcPrazo(form.tipo_servico);

      const { data, error } = await supabase.from('cotacoes').insert([{
        cliente_id: resolvedClienteId,
        cep_origem: form.cep_origem, cep_destino: form.cep_destino,
        cidade_origem: form.cidade_origem, cidade_destino: form.cidade_destino,
        peso_kg: parseFloat(form.peso_kg) || 0,
        altura_cm: parseFloat(form.altura_cm) || 0,
        largura_cm: parseFloat(form.largura_cm) || 0,
        comprimento_cm: parseFloat(form.comprimento_cm) || 0,
        tipo_servico: form.tipo_servico, status: 'pendente',
        unidade: form.unidade, valor_cotado: parseFloat(valorEstimado),
      }]).select();

      if (error) throw error;

      if (resolvedClienteId) {
        await supabase.from('atividades_log').insert([{
          cliente_id: resolvedClienteId, tipo: 'cotacao',
          descricao: `Cotação: ${form.cidade_origem || form.cep_origem} → ${form.cidade_destino || form.cep_destino} (${form.peso_kg}kg)`,
          canal: 'whatsapp',
        }]);
      }

      setLastResult({
        id: data?.[0]?.id,
        origem: form.cidade_origem || form.cep_origem,
        destino: form.cidade_destino || form.cep_destino,
        peso: form.peso_kg,
        servico: form.tipo_servico,
        valor: valorEstimado,
        prazo,
      });
    } catch (err) {
      alert('Erro ao gerar cotação: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMore = () => {
    if (lastResult) setItems(prev => [...prev, lastResult]);
    setLastResult(null);
    setForm(prev => ({ ...prev, ...EMPTY_DIMS }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRemoveItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const handleSendAll = async () => {
    const allItems = lastResult ? [...items, lastResult] : items;
    if (!allItems.length) return;
    setLoading(true);
    try {
      const ids = allItems.filter(i => i.id).map(i => i.id);
      if (ids.length) await supabase.from('cotacoes').update({ status: 'enviada' }).in('id', ids);

      const cleanPhone = form.telefone.replace(/\D/g, '');
      if (cleanPhone) {
        const total = allItems.reduce((acc, i) => acc + parseFloat(i.valor), 0);
        try {
          await fetch('/api/notify/cotacao', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: cleanPhone, cotacoes: allItems, total: total.toFixed(2), multi: true }),
          });
        } catch (_) {}
      }

      setItems(allItems);
      setLastResult(null);
      setSubmitted(true);
    } catch (err) {
      alert('Erro ao enviar cotação: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitted) {
    const total = items.reduce((acc, i) => acc + parseFloat(i.valor), 0);
    return (
      <div className="public-page">
        <header className="public-header"><img src="/logo.png" alt="GOLLOG" /></header>
        <div className="public-container">
          <div className="public-card">
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,200,83,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', color: '#00C853', fontSize: 28 }}><FiCheck /></div>
              <h2 style={{ marginBottom: 4 }}>Cotação Enviada!</h2>
              <p className="subtitle">Resumo completo enviado ao seu WhatsApp 📱</p>
            </div>

            <div style={{ background: '#F9FAFB', borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
              <div style={{ padding: '12px 20px', background: '#1A1A1A', color: '#fff', fontSize: 13, fontWeight: 600 }}>
                {items.length} {items.length === 1 ? 'Pacote Cotado' : 'Pacotes Cotados'}
              </div>
              <div style={{ padding: '8px 20px' }}>
                {items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 0', borderBottom: idx < items.length - 1 ? '1px solid #E5E7EB' : 'none' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>
                        #{idx + 1} — {item.origem} → {item.destino}
                      </div>
                      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                        {item.peso}kg · GOLLOG {item.servico} · {item.prazo}
                      </div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#F37021' }}>R$ {item.valor}</div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '16px 0 8px', borderTop: '2px solid #1A1A1A', marginTop: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>TOTAL GERAL</div>
                  <div style={{ fontSize: 30, fontWeight: 800, color: '#F37021' }}>R$ {total.toFixed(2)}</div>
                </div>
              </div>
            </div>

            <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 16 }}>
              * Valores estimados sujeitos à confirmação. Nossa equipe entrará em contato em breve!
            </p>
          </div>
          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#9CA3AF' }}>© 2026 LOGPROFIT · Todos os direitos reservados</p>
        </div>
      </div>
    );
  }

  // ── CepInput helper ─────────────────────────────────────────────────────────
  const CepInput = ({ label, value, onChange, loading: isLoading }) => (
    <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
      <label className="form-label" style={{ color: '#374151' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input className="public-input" required placeholder="00000-000" maxLength={9}
          value={value} onChange={e => onChange(e.target.value)}
          style={{ paddingRight: isLoading ? 36 : undefined }} />
        {isLoading && (
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#F37021' }}>
            <FiLoader size={16} className="spin" />
          </div>
        )}
      </div>
    </div>
  );

  const itemNum = items.length + 1;

  // ── Main form ───────────────────────────────────────────────────────────────
  return (
    <div className="public-page">
      <header className="public-header">
        <img src="/logo.png" alt="GOLLOG" />
        <span style={{ fontSize: 14, fontWeight: 600, color: '#4A4A4A' }}>Cotação de Envio</span>
      </header>
      <div className="public-container">

        {/* Accumulated items panel */}
        {items.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16,
            border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', marginBottom: 10 }}>
              📦 Pacotes adicionados ({items.length})
            </div>
            {items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 0', borderBottom: idx < items.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                    #{idx + 1}  {item.origem} → {item.destino}
                  </div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                    {item.peso}kg · GOLLOG {item.servico} · {item.prazo}
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#F37021', whiteSpace: 'nowrap' }}>
                  R$ {item.valor}
                </div>
                <button type="button" onClick={() => handleRemoveItem(idx)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', padding: 4, lineHeight: 0 }}>
                  <FiTrash2 size={14} />
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginTop: 12, paddingTop: 12, borderTop: '1.5px solid #1A1A1A' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                Subtotal ({items.length} {items.length === 1 ? 'pacote' : 'pacotes'})
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#F37021' }}>
                R$ {items.reduce((acc, i) => acc + parseFloat(i.valor), 0).toFixed(2)}
              </div>
            </div>
          </div>
        )}

        <div className="public-card">
          {items.length > 0 && (
            <div style={{ background: '#FFF3E0', borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              fontSize: 13, color: '#E65100', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FiPlus size={14} /> Adicionando pacote #{itemNum}
            </div>
          )}

          <h2 style={{ marginBottom: items.length === 0 ? undefined : 4 }}>
            {items.length === 0 ? 'Calcular Envio' : `Pacote #${itemNum}`}
          </h2>
          {items.length === 0 && <p className="subtitle">Preencha os dados para receber a cotação do seu envio.</p>}

          <form onSubmit={handleSubmit}>
            {items.length === 0 && (
              <div className="form-group">
                <label className="form-label" style={{ color: '#374151' }}>📱 Seu Telefone (WhatsApp) *</label>
                <input className="public-input" required placeholder="(11) 99999-9999"
                  value={form.telefone} onChange={e => handleChange('telefone', e.target.value)} />
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>O resultado também será enviado no seu WhatsApp</div>
              </div>
            )}

            <div style={{ background: '#F9FAFB', borderRadius: 8, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiMapPin size={14} color="#F37021" /> Origem e Destino
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <CepInput label="CEP Origem *" value={form.cep_origem} onChange={handleCepOrigem} loading={cepLoading.origem} />
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#374151' }}>Cidade Origem</label>
                  <input className="public-input" placeholder="São Paulo/SP" value={form.cidade_origem}
                    onChange={e => handleChange('cidade_origem', e.target.value)}
                    style={{ background: form.cidade_origem ? '#E8F5E9' : undefined }} />
                </div>
                <CepInput label="CEP Destino *" value={form.cep_destino} onChange={handleCepDestino} loading={cepLoading.destino} />
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#374151' }}>Cidade Destino</label>
                  <input className="public-input" placeholder="Curitiba/PR" value={form.cidade_destino}
                    onChange={e => handleChange('cidade_destino', e.target.value)}
                    style={{ background: form.cidade_destino ? '#E8F5E9' : undefined }} />
                </div>
              </div>
            </div>

            <div style={{ background: '#F9FAFB', borderRadius: 8, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiBox size={14} color="#F37021" /> Dimensões do Pacote
              </div>
              <div className="form-group">
                <label className="form-label" style={{ color: '#374151' }}>Peso (kg) *</label>
                <input className="public-input" type="number" step="0.1" required placeholder="Ex: 5.0"
                  value={form.peso_kg} onChange={e => handleChange('peso_kg', e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {[['altura_cm', 'Altura (cm)', '30'], ['largura_cm', 'Largura (cm)', '20'], ['comprimento_cm', 'Comprimento (cm)', '40']].map(([field, label, placeholder]) => (
                  <div key={field} className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ color: '#374151' }}>{label}</label>
                    <input className="public-input" type="number" placeholder={placeholder}
                      value={form[field]} onChange={e => handleChange(field, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#374151' }}>Tipo de Serviço *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { val: 'Econômico', label: 'Econômico', desc: '3-7 dias', icon: '💰' },
                  { val: 'Rápido', label: 'Rápido', desc: '1-2 dias', icon: '⚡' },
                  { val: 'Urgente', label: 'Urgente', desc: '1 dia', icon: '🔥' },
                ].map(s => (
                  <button key={s.val} type="button"
                    className={`type-option ${form.tipo_servico === s.val ? 'selected' : ''}`}
                    onClick={() => handleChange('tipo_servico', s.val)} style={{ padding: 12 }}>
                    <div style={{ fontSize: 20 }}>{s.icon}</div>
                    <div className="label" style={{ fontSize: 13 }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {items.length === 0 && (
              <div className="form-group">
                <label className="form-label" style={{ color: '#374151' }}>Unidade de Atendimento *</label>
                <select className="public-input" value={form.unidade} onChange={e => handleChange('unidade', e.target.value)}>
                  <option value="Osasco">📍 Osasco</option>
                  <option value="Barueri">📍 Barueri</option>
                </select>
              </div>
            )}

            <button type="submit" className="public-btn" disabled={loading}>
              {loading ? 'Calculando...' : '📦 Calcular'}
            </button>
          </form>

          {/* Inline result card */}
          {lastResult && (
            <div style={{ marginTop: 20, background: '#F0FDF4', borderRadius: 12, padding: 20,
              border: '1px solid #BBF7D0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#00C853',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }}>
                  <FiCheck />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#14532D' }}>
                  Pacote #{itemNum} calculado!
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                {[
                  ['Origem', lastResult.origem],
                  ['Destino', lastResult.destino],
                  ['Serviço', `GOLLOG ${lastResult.servico}`],
                  ['Prazo', lastResult.prazo],
                ].map(([lbl, val]) => (
                  <div key={lbl}>
                    <div style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>{lbl}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{val}</div>
                  </div>
                ))}
              </div>

              <div style={{ textAlign: 'center', padding: '10px 0', borderTop: '1px solid #BBF7D0',
                borderBottom: '1px solid #BBF7D0', marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: '#6B7280' }}>Valor Estimado</div>
                <div style={{ fontSize: 30, fontWeight: 800, color: '#F37021' }}>R$ {lastResult.valor}</div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>{lastResult.prazo}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button type="button" onClick={handleAddMore}
                  style={{ background: '#fff', border: '1.5px solid #F37021', color: '#F37021',
                    borderRadius: 8, padding: '11px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <FiPlus size={14} /> Adicionar Outro
                </button>
                <button type="button" onClick={handleSendAll} disabled={loading}
                  style={{ background: '#F37021', border: 'none', color: '#fff',
                    borderRadius: 8, padding: '11px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {loading ? 'Enviando...' : '✉️ Enviar Cotação'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#9CA3AF' }}>© 2026 LOGPROFIT · Todos os direitos reservados</p>
      </div>
    </div>
  );
}
