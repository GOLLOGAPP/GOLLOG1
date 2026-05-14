import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { FiUser, FiBriefcase, FiCheck, FiLoader } from 'react-icons/fi';
import { supabase } from '../../lib/supabase';
import { fetchCep, formatCep } from '../../lib/cep';

export default function CadastroPage() {
  const { telefone } = useParams();
  const [tipo, setTipo] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    nome: '', cpf_cnpj: '', telefone: telefone ? telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : '',
    email: '', cep: '', endereco: '', cidade: '', estado: '', unidade: 'Osasco'
  });

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleCep = async (value) => {
    const formatted = formatCep(value);
    handleChange('cep', formatted);
    if (formatted.replace(/\D/g, '').length === 8) {
      setCepLoading(true);
      const result = await fetchCep(formatted);
      if (result) {
        setForm(prev => ({
          ...prev,
          cep: formatted,
          endereco: result.logradouro ? `${result.logradouro}, ${result.bairro}` : prev.endereco,
          cidade: result.cidade,
          estado: result.estado,
        }));
      }
      setCepLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: dbError } = await supabase
        .from('clientes')
        .insert([{
          tipo,
          cpf_cnpj: form.cpf_cnpj,
          nome_razao_social: form.nome,
          telefone: form.telefone,
          email: form.email,
          cep: form.cep,
          endereco_completo: form.endereco,
          cidade: form.cidade,
          estado: form.estado,
          unidade_atendimento: form.unidade,
          cliente_gollog: false,
          status: 'prospecto',
          tags: ['Novo', 'WhatsApp'],
        }])
        .select();

      if (dbError) throw dbError;

      // Log the activity
      if (data && data[0]) {
        await supabase.from('atividades_log').insert([{
          cliente_id: data[0].id,
          tipo: 'cadastro',
          descricao: `${form.nome} se cadastrou via WhatsApp (${tipo})`,
          canal: 'whatsapp',
          metadata: { telefone_original: telefone, unidade: form.unidade }
        }]);
      }

      // Adiciona etiqueta "Cliente" no Botconversa (fire-and-forget)
      fetch('/api/notify/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: form.telefone }),
      }).catch(() => {});

      setSubmitted(true);
    } catch (err) {
      console.error('Erro no cadastro:', err);
      setError(err.message || 'Erro ao salvar cadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="public-page">
        <header className="public-header">
          <img src="/logo.png" alt="GOLLOG" />
        </header>
        <div className="public-container">
          <div className="public-card" style={{ textAlign:'center', padding:48 }}>
            <div style={{
              width:64, height:64, borderRadius:'50%', background:'rgba(0,200,83,0.12)',
              display:'flex', alignItems:'center', justifyContent:'center',
              margin:'0 auto 20px', color:'#00C853', fontSize:28
            }}><FiCheck /></div>
            <h2 style={{ marginBottom:8 }}>Cadastro Realizado! ✅</h2>
            <p className="subtitle" style={{ marginBottom:0 }}>
              Seu cadastro foi concluído com sucesso. Você pode voltar ao WhatsApp para continuar o atendimento.
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
        <span style={{ fontSize:14, fontWeight:600, color:'#4A4A4A' }}>Cadastro de Cliente</span>
      </header>
      <div className="public-container">
        <div className="public-card">
          <h2>Cadastre-se na GOLLOG</h2>
          <p className="subtitle">Preencha seus dados para começar a usar nossos serviços.</p>

          {error && (
            <div style={{
              background:'rgba(255,82,82,0.08)', border:'1px solid rgba(255,82,82,0.3)',
              color:'#D32F2F', padding:'10px 14px', borderRadius:8, marginBottom:16, fontSize:13
            }}>{error}</div>
          )}

          {!tipo ? (
            <div className="type-selector">
              <button className="type-option" onClick={() => setTipo('PF')}>
                <div className="icon"><FiUser size={28} color="#F37021"/></div>
                <div className="label">Pessoa Física</div>
              </button>
              <button className="type-option" onClick={() => setTipo('PJ')}>
                <div className="icon"><FiBriefcase size={28} color="#448AFF"/></div>
                <div className="label">Pessoa Jurídica</div>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ display:'flex', gap:8, marginBottom:20 }}>
                <button type="button" className={`type-option ${tipo === 'PF' ? 'selected' : ''}`}
                  onClick={() => setTipo('PF')} style={{ flex:1, padding:10 }}>
                  <span className="label" style={{ fontSize:13 }}>Pessoa Física</span>
                </button>
                <button type="button" className={`type-option ${tipo === 'PJ' ? 'selected' : ''}`}
                  onClick={() => setTipo('PJ')} style={{ flex:1, padding:10 }}>
                  <span className="label" style={{ fontSize:13 }}>Pessoa Jurídica</span>
                </button>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color:'#374151' }}>
                  {tipo === 'PJ' ? 'Razão Social' : 'Nome Completo'} *
                </label>
                <input className="public-input" required placeholder={tipo === 'PJ' ? 'Razão Social da empresa' : 'Seu nome completo'}
                  value={form.nome} onChange={e => handleChange('nome', e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color:'#374151' }}>
                  {tipo === 'PJ' ? 'CNPJ' : 'CPF'} *
                </label>
                <input className="public-input" required placeholder={tipo === 'PJ' ? '00.000.000/0001-00' : '000.000.000-00'}
                  value={form.cpf_cnpj} onChange={e => handleChange('cpf_cnpj', e.target.value)} />
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div className="form-group">
                  <label className="form-label" style={{ color:'#374151' }}>Telefone *</label>
                  <input className="public-input" required placeholder="(11) 99999-9999"
                    value={form.telefone} onChange={e => handleChange('telefone', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ color:'#374151' }}>E-mail *</label>
                  <input className="public-input" type="email" required placeholder="email@exemplo.com"
                    value={form.email} onChange={e => handleChange('email', e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color:'#374151' }}>CEP</label>
                <div style={{ position:'relative' }}>
                  <input className="public-input" placeholder="00000-000" maxLength={9}
                    value={form.cep} onChange={e => handleCep(e.target.value)}
                    style={{ paddingRight: cepLoading ? 36 : undefined }} />
                  {cepLoading && (
                    <div style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'#F37021' }}>
                      <FiLoader size={16} className="spin" />
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color:'#374151' }}>Endereço Completo *</label>
                <input className="public-input" required placeholder="Rua, número, complemento, bairro"
                  value={form.endereco} onChange={e => handleChange('endereco', e.target.value)}
                  style={{ background: form.endereco && cepLoading === false ? '#E8F5E9' : undefined }} />
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div className="form-group">
                  <label className="form-label" style={{ color:'#374151' }}>Cidade *</label>
                  <input className="public-input" required value={form.cidade}
                    onChange={e => handleChange('cidade', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ color:'#374151' }}>Estado *</label>
                  <select className="public-input" required value={form.estado}
                    onChange={e => handleChange('estado', e.target.value)}>
                    <option value="">Selecione</option>
                    {['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'].map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
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

              <button type="submit" className="public-btn" style={{ marginTop:8 }} disabled={loading}>
                {loading ? 'Salvando...' : 'Finalizar Cadastro'}
              </button>
            </form>
          )}
        </div>
        <p style={{ textAlign:'center', marginTop:16, fontSize:12, color:'#9CA3AF' }}>
          © 2026 GOLLOG · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
