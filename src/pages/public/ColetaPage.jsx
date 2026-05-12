import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { FiTruck, FiCheck, FiMapPin, FiCalendar } from 'react-icons/fi';

export default function ColetaPage() {
  const { clienteId } = useParams();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    endereco: '', cep: '', data: '', horario: '',
    volumes: '1', peso: '', observacoes: '', unidade: 'Osasco'
  });

  const handleChange = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('coletas').insert([{
        cliente_id: clienteId || null,
        endereco_coleta: form.endereco,
        cep_coleta: form.cep,
        data_solicitada: form.data || null,
        horario_preferido: form.horario,
        quantidade_volumes: parseInt(form.volumes) || 1,
        peso_total_kg: parseFloat(form.peso) || null,
        observacoes: form.observacoes,
        status: 'solicitada',
        unidade: form.unidade,
      }]);
      if (error) throw error;

      if (clienteId) {
        await supabase.from('atividades_log').insert([{
          cliente_id: clienteId, tipo: 'coleta',
          descricao: `Coleta solicitada: ${form.endereco} - ${form.volumes} vol(s)`,
          canal: 'whatsapp',
        }]);
      }
      setSubmitted(true);
    } catch (err) {
      alert('Erro: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="public-page">
        <header className="public-header"><img src="/logo.png" alt="GOLLOG" /></header>
        <div className="public-container">
          <div className="public-card" style={{ textAlign:'center', padding:48 }}>
            <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(0,200,83,0.12)',
              display:'flex', alignItems:'center', justifyContent:'center',
              margin:'0 auto 20px', color:'#00C853', fontSize:28 }}><FiCheck /></div>
            <h2>Coleta Solicitada! ✅</h2>
            <p className="subtitle" style={{ marginBottom:0 }}>
              Sua solicitação foi registrada. Entraremos em contato para confirmar o agendamento.
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
        <span style={{ fontSize:14, fontWeight:600, color:'#4A4A4A' }}>Solicitar Coleta</span>
      </header>
      <div className="public-container">
        <div className="public-card">
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
            <div style={{ width:44, height:44, borderRadius:10, background:'rgba(243,112,33,0.1)',
              display:'flex', alignItems:'center', justifyContent:'center', color:'#F37021' }}>
              <FiTruck size={22}/>
            </div>
            <h2 style={{ marginBottom:0 }}>Solicitar Coleta</h2>
          </div>
          <p className="subtitle">Informe os dados para agendar a coleta no seu endereço.</p>

          <form onSubmit={handleSubmit}>
            <div style={{ background:'#F9FAFB', borderRadius:8, padding:16, marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#374151', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                <FiMapPin size={14} color="#F37021"/> Local da Coleta
              </div>
              <div className="form-group">
                <label className="form-label" style={{ color:'#374151' }}>Endereço Completo *</label>
                <input className="public-input" required placeholder="Rua, número, bairro, cidade"
                  value={form.endereco} onChange={e => handleChange('endereco', e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label" style={{ color:'#374151' }}>CEP *</label>
                <input className="public-input" required placeholder="00000-000"
                  value={form.cep} onChange={e => handleChange('cep', e.target.value)} />
              </div>
            </div>

            <div style={{ background:'#F9FAFB', borderRadius:8, padding:16, marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#374151', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                <FiCalendar size={14} color="#F37021"/> Agendamento
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label className="form-label" style={{ color:'#374151' }}>Data Desejada *</label>
                  <input className="public-input" type="date" required
                    value={form.data} onChange={e => handleChange('data', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label className="form-label" style={{ color:'#374151' }}>Horário Preferido *</label>
                  <select className="public-input" required value={form.horario}
                    onChange={e => handleChange('horario', e.target.value)}>
                    <option value="">Selecione</option>
                    <option value="08:00-10:00">08:00 - 10:00</option>
                    <option value="10:00-12:00">10:00 - 12:00</option>
                    <option value="14:00-16:00">14:00 - 16:00</option>
                    <option value="16:00-18:00">16:00 - 18:00</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div className="form-group">
                <label className="form-label" style={{ color:'#374151' }}>Quantidade de Volumes *</label>
                <input className="public-input" type="number" min="1" required
                  value={form.volumes} onChange={e => handleChange('volumes', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ color:'#374151' }}>Peso Total (kg)</label>
                <input className="public-input" type="number" step="0.1" placeholder="Ex: 10.5"
                  value={form.peso} onChange={e => handleChange('peso', e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color:'#374151' }}>Unidade de Atendimento *</label>
              <select className="public-input" required value={form.unidade}
                onChange={e => handleChange('unidade', e.target.value)}>
                <option value="Osasco">📍 Osasco</option>
                <option value="Barueri">📍 Barueri</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color:'#374151' }}>Observações</label>
              <textarea className="public-input" rows={3} placeholder="Informações adicionais sobre a coleta..."
                value={form.observacoes} onChange={e => handleChange('observacoes', e.target.value)}
                style={{ resize:'vertical' }} />
            </div>

            <button type="submit" className="public-btn" disabled={loading}>
              {loading ? 'Enviando...' : '🚚 Solicitar Coleta'}
            </button>
          </form>
        </div>
        <p style={{ textAlign:'center', marginTop:16, fontSize:12, color:'#9CA3AF' }}>
          © 2026 GOLLOG · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
