import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { FiTruck, FiCheck } from 'react-icons/fi';

export default function MotoristaAgregadoPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: '', cpf: '', telefone: '', email: '',
    cnh: '', tipo_veiculo: '', placa: '', regiao: ''
  });

  const handleChange = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('motoristas_agregados').insert([{
        nome_completo: form.nome,
        cpf: form.cpf,
        telefone: form.telefone,
        email: form.email,
        cnh_categoria: form.cnh,
        tipo_veiculo: form.tipo_veiculo,
        placa_veiculo: form.placa,
        regiao_atuacao: form.regiao,
        status: 'pendente',
      }]);
      if (error) throw error;
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
            <div style={{
              width:64, height:64, borderRadius:'50%', background:'rgba(0,200,83,0.12)',
              display:'flex', alignItems:'center', justifyContent:'center',
              margin:'0 auto 20px', color:'#00C853', fontSize:28
            }}><FiCheck /></div>
            <h2>Cadastro Enviado!</h2>
            <p className="subtitle" style={{ marginBottom:0 }}>
              Recebemos seu cadastro como motorista agregado. Nossa equipe entrará em contato em breve.
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
        <span style={{ fontSize:14, fontWeight:600, color:'#4A4A4A' }}>Motorista Agregado</span>
      </header>
      <div className="public-container">
        <div className="public-card">
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
            <div style={{
              width:44, height:44, borderRadius:10, background:'rgba(243,112,33,0.1)',
              display:'flex', alignItems:'center', justifyContent:'center', color:'#F37021'
            }}><FiTruck size={22}/></div>
            <div>
              <h2 style={{ marginBottom:0 }}>Seja um Motorista Agregado</h2>
            </div>
          </div>
          <p className="subtitle">Preencha seus dados para se cadastrar como motorista parceiro GOLLOG.</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" style={{ color:'#374151' }}>Nome Completo *</label>
              <input className="public-input" required value={form.nome}
                onChange={e => handleChange('nome', e.target.value)} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div className="form-group">
                <label className="form-label" style={{ color:'#374151' }}>CPF *</label>
                <input className="public-input" required placeholder="000.000.000-00"
                  value={form.cpf} onChange={e => handleChange('cpf', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ color:'#374151' }}>Telefone *</label>
                <input className="public-input" required placeholder="(11) 99999-9999"
                  value={form.telefone} onChange={e => handleChange('telefone', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ color:'#374151' }}>E-mail</label>
              <input className="public-input" type="email" value={form.email}
                onChange={e => handleChange('email', e.target.value)} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div className="form-group">
                <label className="form-label" style={{ color:'#374151' }}>Categoria CNH *</label>
                <select className="public-input" required value={form.cnh}
                  onChange={e => handleChange('cnh', e.target.value)}>
                  <option value="">Selecione</option>
                  <option value="B">B</option><option value="C">C</option>
                  <option value="D">D</option><option value="E">E</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ color:'#374151' }}>Tipo de Veículo *</label>
                <select className="public-input" required value={form.tipo_veiculo}
                  onChange={e => handleChange('tipo_veiculo', e.target.value)}>
                  <option value="">Selecione</option>
                  <option value="Moto">Moto</option>
                  <option value="Fiorino">Fiorino</option>
                  <option value="VUC">VUC</option>
                  <option value="HR/Sprinter">HR / Sprinter</option>
                  <option value="Truck">Truck</option>
                </select>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div className="form-group">
                <label className="form-label" style={{ color:'#374151' }}>Placa do Veículo *</label>
                <input className="public-input" required placeholder="ABC-1D23"
                  value={form.placa} onChange={e => handleChange('placa', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ color:'#374151' }}>Região de Atuação *</label>
                <select className="public-input" required value={form.regiao}
                  onChange={e => handleChange('regiao', e.target.value)}>
                  <option value="">Selecione</option>
                  <option value="Osasco">Osasco e região</option>
                  <option value="Barueri">Barueri e região</option>
                  <option value="São Paulo">Grande São Paulo</option>
                </select>
              </div>
            </div>
            <button type="submit" className="public-btn" disabled={loading} style={{ marginTop:8 }}>
              {loading ? 'Enviando...' : '🚚 Enviar Cadastro'}
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
