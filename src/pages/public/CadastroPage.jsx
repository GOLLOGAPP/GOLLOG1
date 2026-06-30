import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { FiUser, FiBriefcase, FiCheck, FiLoader, FiMapPin, FiLock } from 'react-icons/fi';
import { supabase } from '../../lib/supabase';
import { fetchCep, formatCep } from '../../lib/cep';

const cleanPhone = (raw) => {
  if (!raw) return '';
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2);
  return d.replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3') || d;
};

export default function CadastroPage() {
  const { telefone } = useParams();
  const [searchParams] = useSearchParams();
  const [tipo, setTipo] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [error, setError] = useState('');
  const [unidadeLocked, setUnidadeLocked] = useState(false);
  const [iniciadoId, setIniciadoId] = useState(null);
  const [form, setForm] = useState({
    nome: '', cpf_cnpj: '', contato: '', telefone: cleanPhone(telefone), telefone2: '',
    email: '', cep: '', endereco: '', numero: '', cidade: '', estado: '', unidade: 'Osasco',
    data_nascimento: ''
  });

  useEffect(() => {
    const detectUnit = async () => {
      // Prioridade 1: parâmetro ?u= na URL (link gerado pelo admin)
      const uParam = searchParams.get('u');
      if (uParam) {
        setForm(prev => ({ ...prev, unidade: uParam }));
        setUnidadeLocked(true);
        return;
      }
      // Prioridade 2: consulta no banco pelo telefone (webhook já processou etiqueta)
      if (telefone) {
        const digits = telefone.replace(/\D/g, '');
        const sem55 = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;
        const norm = (t) => {
          const d = (t || '').replace(/\D/g, '');
          return d.startsWith('55') && d.length >= 12 ? d.slice(2) : d;
        };
        // Busca por últimos 4 dígitos e confirma o match por dígitos no JS
        const { data: candidatos } = await supabase
          .from('clientes')
          .select('telefone, telefone2, unidade_atendimento')
          .or(`telefone.ilike.%${sem55.slice(-4)},telefone2.ilike.%${sem55.slice(-4)}`)
          .not('unidade_atendimento', 'is', null);
        const match = (candidatos || []).find(
          c => norm(c.telefone) === sem55 || norm(c.telefone2) === sem55
        );
        if (match?.unidade_atendimento) {
          setForm(prev => ({ ...prev, unidade: match.unidade_atendimento }));
          setUnidadeLocked(true);
        }
      }
    };
    detectUnit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Registra que o cliente abriu o formulário (gatilho de cadastro abandonado)
  useEffect(() => {
    if (!telefone) return;
    const digits = telefone.replace(/\D/g, '');
    const sem55 = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;
    const norm = (t) => {
      const d = (t || '').replace(/\D/g, '');
      return d.startsWith('55') && d.length >= 12 ? d.slice(2) : d;
    };

    // Não cria followup se o cliente já está cadastrado (comparação só por dígitos)
    supabase
      .from('clientes')
      .select('id, telefone, telefone2')
      .or(`telefone.ilike.%${sem55.slice(-4)},telefone2.ilike.%${sem55.slice(-4)}`)
      .then(({ data: candidatos }) => {
        const clienteExistente = (candidatos || []).some(
          c => norm(c.telefone) === sem55 || norm(c.telefone2) === sem55
        );
        if (clienteExistente) return;

        // Evita duplicata: verifica se já existe um registro pendente para este telefone
        supabase
          .from('followups')
          .select('id')
          .eq('tipo', 'cadastro_iniciado')
          .eq('status', 'pendente')
          .contains('metadata', { telefone: sem55 })
          .maybeSingle()
          .then(({ data: existing }) => {
            if (existing) {
              setIniciadoId(existing.id);
              return;
            }
            const scheduledFor = new Date();
            scheduledFor.setMinutes(scheduledFor.getMinutes() + 30);
            supabase
              .from('followups')
              .insert([{
                tipo: 'cadastro_iniciado',
                status: 'pendente',
                canal: 'whatsapp',
                scheduled_for: scheduledFor.toISOString(),
                metadata: { telefone: sem55, fonte: 'botconversa' },
              }])
              .select('id')
              .single()
              .then(({ data }) => { if (data) setIniciadoId(data.id); });
          });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const buildBotNome = () => {
    if (tipo === 'PJ' && form.contato) {
      const primeiro = form.contato.trim().split(/\s+/)[0];
      return `${primeiro} | ${form.nome}`;
    }
    return form.nome;
  };

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
          nome_contato: form.contato,
          telefone: form.telefone,
          telefone2: form.telefone2 || null,
          email: form.email,
          cep: form.cep,
          endereco_completo: form.numero ? `${form.endereco}, Nº ${form.numero}` : form.endereco,
          cidade: form.cidade,
          estado: form.estado,
          unidade_atendimento: form.unidade,
          data_nascimento: tipo === 'PF' && form.data_nascimento ? form.data_nascimento : null,
          cliente_gollog: false,
          status: 'prospecto',
          tags: ['Novo', 'WhatsApp'],
        }])
        .select();

      if (dbError) {
        // CPF/CNPJ já cadastrado → trata como sucesso e envia menu
        if (dbError.code === '23505') {
          fetch('/api/notify/cadastro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: form.telefone, nome: buildBotNome() }),
          }).catch(() => {});
          setSubmitted(true);
          return;
        }
        throw dbError;
      }

      // Log the activity
      if (data && data[0]) {
        await supabase.from('atividades_log').insert([{
          cliente_id: data[0].id,
          tipo: 'cadastro',
          descricao: `${form.nome} se cadastrou via WhatsApp (${tipo})`,
          canal: 'whatsapp',
          metadata: { telefone_original: telefone, unidade: form.unidade }
        }]);

        // Marca o registro de intenção como convertido para não disparar follow-up de abandono
        if (iniciadoId) {
          supabase
            .from('followups')
            .update({ status: 'convertido', sent_at: new Date().toISOString() })
            .eq('id', iniciadoId)
            .then(() => {});
        }
      }

      // Adiciona etiqueta "Cliente" no Botconversa (fire-and-forget)
      fetch('/api/notify/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: form.telefone, nome: buildBotNome() }),
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
            <p style={{ fontSize:18, fontWeight:700, color:'#F37021', marginBottom:0, letterSpacing:0.5 }}>
              CADASTRO REALIZADO — VOLTE PARA O WHATSAPP
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

              {tipo === 'PJ' && (
                <div className="form-group">
                  <label className="form-label" style={{ color:'#374151' }}>Nome do Contato *</label>
                  <input className="public-input" required
                    placeholder="Nome do responsável pela conta"
                    value={form.contato} onChange={e => handleChange('contato', e.target.value)} />
                </div>
              )}

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label className="form-label" style={{ color:'#374151', display:'flex', alignItems:'center', gap:4 }}>
                    Tel 1 (WhatsApp) <FiLock size={11} color="#9CA3AF" />
                  </label>
                  <div style={{ position:'relative' }}>
                    <input className="public-input" readOnly tabIndex={-1}
                      value={form.telefone}
                      style={{ background:'#F3F4F6', color:'#6B7280', cursor:'not-allowed', paddingRight:34 }} />
                    <FiLock size={13} style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF', pointerEvents:'none' }} />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label className="form-label" style={{ color:'#374151' }}>
                    Tel 2 <span style={{ fontWeight:400, color:'#9CA3AF' }}>(opcional)</span>
                  </label>
                  <input className="public-input" placeholder="(11) 88888-8888"
                    value={form.telefone2} onChange={e => handleChange('telefone2', e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color:'#374151' }}>E-mail *</label>
                <input className="public-input" type="email" required placeholder="email@exemplo.com"
                  value={form.email} onChange={e => handleChange('email', e.target.value)} />
              </div>

              {tipo === 'PF' && (
                <div className="form-group">
                  <label className="form-label" style={{ color:'#374151' }}>Data de Nascimento</label>
                  <input className="public-input" type="date"
                    max={new Date().toISOString().split('T')[0]}
                    value={form.data_nascimento}
                    onChange={e => handleChange('data_nascimento', e.target.value)} />
                </div>
              )}

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

              <div style={{ display:'grid', gridTemplateColumns:'3fr 1fr', gap:12 }}>
                <div className="form-group">
                  <label className="form-label" style={{ color:'#374151' }}>Endereço *</label>
                  <input className="public-input" required placeholder="Rua, bairro"
                    value={form.endereco} onChange={e => handleChange('endereco', e.target.value)}
                    style={{ background: form.endereco && !cepLoading ? '#E8F5E9' : undefined }} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ color:'#374151' }}>Número *</label>
                  <input className="public-input" required placeholder="Nº"
                    value={form.numero} onChange={e => handleChange('numero', e.target.value)} />
                </div>
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
                {unidadeLocked ? (
                  <div style={{
                    background: 'rgba(243,112,33,0.08)', border: '1px solid rgba(243,112,33,0.3)',
                    borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <FiMapPin size={14} color="#F37021" />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#F37021' }}>📍 {form.unidade}</span>
                    <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 'auto' }}>Detectado automaticamente</span>
                  </div>
                ) : (
                  <select className="public-input" required value={form.unidade}
                    onChange={e => handleChange('unidade', e.target.value)}>
                    <option value="Osasco">📍 Osasco</option>
                    <option value="Barueri">📍 Barueri</option>
                  </select>
                )}
              </div>

              <button type="submit" className="public-btn" style={{ marginTop:8 }} disabled={loading}>
                {loading ? 'Salvando...' : 'Finalizar Cadastro'}
              </button>
            </form>
          )}
        </div>
        <p style={{ textAlign:'center', marginTop:16, fontSize:12, color:'#9CA3AF' }}>
          © 2026 LOGPROFIT · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
