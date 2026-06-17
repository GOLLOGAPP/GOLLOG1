import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { fetchCep, formatCep } from '../../lib/cep';
import { FiBox, FiCheck, FiLoader, FiTrash2, FiPlus } from 'react-icons/fi';

const ESTADOS_BR = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const EMPTY_COTACAO = {
  tipo_servico: 'Rápido',
  modalidade_pagamento: 'À vista',
  local_entrega_tipo: 'domicilio',
  estado_aeroporto: '',
  cep_destino: '',
  cidade_destino: '',
  seguro: 'Sem Seguro',
  descricao_carga: '',
  valor_nota: '',
  comprimento_cm: '',
  altura_cm: '',
  largura_cm: '',
  peso_kg: '',
};

function ToggleGroup({ options, value, onChange, wrap = false }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: wrap ? 'wrap' : 'nowrap' }}>
      {options.map(opt => {
        const val = opt.val ?? opt;
        const label = opt.label ?? opt;
        const selected = value === val;
        return (
          <button key={val} type="button" onClick={() => onChange(val)}
            style={{
              flex: wrap ? undefined : 1,
              padding: '10px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', border: '1.5px solid', transition: 'all 0.15s',
              textAlign: 'center', lineHeight: 1.3,
              borderColor: selected ? '#F37021' : '#E5E7EB',
              background: selected ? '#FFF3E0' : '#fff',
              color: selected ? '#F37021' : '#6B7280',
            }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function CotacaoPage() {
  const [searchParams] = useSearchParams();
  const phoneFromUrl = searchParams.get('phone') || '';

  const [globalForm, setGlobalForm] = useState({ telefone: '', unidade: 'Osasco', com_coleta: true });
  const [clienteId, setClienteId] = useState(null);
  const [telefoneFound, setTelefoneFound] = useState(false);
  const [telefoneLoading, setTelefoneLoading] = useState(false);

  const [cotacoes, setCotacoes] = useState([]);
  const [current, setCurrent] = useState({ ...EMPTY_COTACAO });
  const [cepLoading, setCepLoading] = useState(false);
  const [showDupDialog, setShowDupDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (phoneFromUrl) lookupPhone(phoneFromUrl);
  }, [phoneFromUrl]);

  const lookupPhone = async (phone) => {
    setTelefoneLoading(true);
    const clean = phone.replace(/\D/g, '');
    const formatted = clean.replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3');
    try {
      const { data: cli } = await supabase
        .from('clientes').select('id')
        .or(`telefone.eq.${formatted},telefone.eq.${clean},telefone.eq.55${clean}`)
        .maybeSingle();
      if (cli) {
        setClienteId(cli.id);
        setTelefoneFound(true);
      }
      setGlobalForm(p => ({ ...p, telefone: formatted || clean }));
    } catch (_) {
      setGlobalForm(p => ({ ...p, telefone: '' }));
    } finally {
      setTelefoneLoading(false);
    }
  };

  const handleCepChange = async (value) => {
    const fmt = formatCep(value);
    setCurrent(p => ({ ...p, cep_destino: fmt, cidade_destino: '' }));
    if (fmt.replace(/\D/g, '').length === 8) {
      setCepLoading(true);
      const res = await fetchCep(fmt);
      if (res) setCurrent(p => ({ ...p, cidade_destino: `${res.cidade}/${res.estado}` }));
      setCepLoading(false);
    }
  };

  const handleAddOutra = () => {
    setCotacoes(prev => [...prev, { ...current }]);
    setShowDupDialog(true);
  };

  const handleDuplicate = (dup) => {
    setShowDupDialog(false);
    if (dup) {
      setCurrent(p => ({
        ...p,
        descricao_carga: '', valor_nota: '',
        comprimento_cm: '', altura_cm: '', largura_cm: '', peso_kg: '',
        cep_destino: '', cidade_destino: '', estado_aeroporto: '',
      }));
    } else {
      setCurrent({ ...EMPTY_COTACAO });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const all = [...cotacoes, { ...current }];
    try {
      const inserts = all.map(c => ({
        cliente_id: clienteId || null,
        cep_destino: c.cep_destino || null,
        cidade_destino: c.cidade_destino || null,
        peso_kg: parseFloat(c.peso_kg) || null,
        altura_cm: parseFloat(c.altura_cm) || null,
        largura_cm: parseFloat(c.largura_cm) || null,
        comprimento_cm: parseFloat(c.comprimento_cm) || null,
        tipo_servico: c.tipo_servico,
        status: 'pendente',
        unidade: globalForm.unidade,
        valor_cotado: 0,
        metadata: {
          modalidade_pagamento: c.modalidade_pagamento,
          local_entrega_tipo: c.local_entrega_tipo,
          estado_aeroporto: c.estado_aeroporto || null,
          seguro: c.seguro,
          descricao_carga: c.descricao_carga,
          valor_nota: c.valor_nota,
          com_coleta: globalForm.com_coleta,
        },
      }));

      await supabase.from('cotacoes').insert(inserts);

      const cleanPhone = globalForm.telefone.replace(/\D/g, '');
      if (cleanPhone) {
        await fetch('/api/notify/cotacao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: cleanPhone,
            global: { unidade: globalForm.unidade, com_coleta: globalForm.com_coleta },
            cotacoes: all,
          }),
        });
      }

      setSubmitted(true);
    } catch (err) {
      alert('Erro ao enviar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    const total = cotacoes.length + 1;
    return (
      <div className="public-page">
        <header className="public-header"><img src="/logo.png" alt="GOLLOG" /></header>
        <div className="public-container">
          <div className="public-card" style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,200,83,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', color: '#00C853', fontSize: 28 }}><FiCheck /></div>
            <h2 style={{ marginBottom: 8 }}>Solicitação Enviada!</h2>
            <p className="subtitle">
              Recebemos {total} {total === 1 ? 'cotação' : 'cotações'}.<br />
              Volte para o seu WhatsApp e confirme os dados para nossa equipe te retornar com a cotação.
            </p>
          </div>
          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#9CA3AF' }}>© 2026 LOGPROFIT · Todos os direitos reservados</p>
        </div>
      </div>
    );
  }

  const cotacaoNum = cotacoes.length + 1;

  return (
    <div className="public-page">
      <header className="public-header">
        <img src="/logo.png" alt="GOLLOG" />
        <span style={{ fontSize: 14, fontWeight: 600, color: '#4A4A4A' }}>Solicitar Cotação</span>
      </header>
      <div className="public-container">

        {/* Dialog duplicar */}
        {showDupDialog && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 340, width: '100%' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Nova cotação #{cotacaoNum}</h3>
              <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px' }}>
                Deseja duplicar os dados da cotação anterior?
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => handleDuplicate(false)}
                  style={{ flex: 1, padding: 12, borderRadius: 8, border: '1.5px solid #E5E7EB',
                    background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
                  Não, novo
                </button>
                <button type="button" onClick={() => handleDuplicate(true)}
                  style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none',
                    background: '#F37021', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Sim, duplicar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de cotações adicionadas */}
        {cotacoes.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', marginBottom: 10 }}>
              ✅ {cotacoes.length} {cotacoes.length === 1 ? 'cotação adicionada' : 'cotações adicionadas'}
            </div>
            {cotacoes.map((c, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0', borderBottom: idx < cotacoes.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                    #{idx + 1} — {c.local_entrega_tipo === 'aeroporto'
                      ? `Retirada Aeroporto / ${c.estado_aeroporto}`
                      : c.cidade_destino || c.cep_destino || 'Destino não informado'}
                  </div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                    {c.tipo_servico} · {c.modalidade_pagamento} · Seguro: {c.seguro}
                    {c.peso_kg ? ` · ${c.peso_kg}kg` : ''}
                  </div>
                </div>
                <button type="button" onClick={() => setCotacoes(p => p.filter((_, i) => i !== idx))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', padding: 4 }}>
                  <FiTrash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Dados globais — só no primeiro preenchimento */}
        {cotacoes.length === 0 && (
          <div className="public-card" style={{ marginBottom: 16 }}>
            <h2 style={{ marginBottom: 4 }}>Solicitar Cotação</h2>
            <p className="subtitle">Preencha os dados abaixo e receba os valores no WhatsApp.</p>

            <div className="form-group">
              <label className="form-label" style={{ color: '#374151' }}>📱 WhatsApp *</label>
              <div style={{ position: 'relative' }}>
                <input className="public-input" required placeholder="(11) 99999-9999"
                  value={globalForm.telefone}
                  readOnly={telefoneFound}
                  onChange={e => setGlobalForm(p => ({ ...p, telefone: e.target.value }))}
                  style={{ background: telefoneFound ? '#F0FDF4' : undefined }} />
                {telefoneLoading && (
                  <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#F37021' }}>
                    <FiLoader size={16} className="spin" />
                  </div>
                )}
                {telefoneFound && !telefoneLoading && (
                  <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#00C853' }}>
                    <FiCheck size={16} />
                  </div>
                )}
              </div>
              {telefoneFound && <div style={{ fontSize: 11, color: '#00C853', marginTop: 4 }}>✓ Cadastro encontrado</div>}
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#374151' }}>Unidade *</label>
              <ToggleGroup
                options={[{ val: 'Osasco', label: '📍 Osasco' }, { val: 'Barueri', label: '📍 Barueri' }]}
                value={globalForm.unidade}
                onChange={v => setGlobalForm(p => ({ ...p, unidade: v }))}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ color: '#374151' }}>Coleta *</label>
              <ToggleGroup
                options={[
                  { val: 'sim', label: '🚚 Com Coleta — buscamos a mercadoria' },
                  { val: 'nao', label: '🏢 Sem Coleta — trago na base' },
                ]}
                value={globalForm.com_coleta ? 'sim' : 'nao'}
                onChange={v => setGlobalForm(p => ({ ...p, com_coleta: v === 'sim' }))}
              />
            </div>
          </div>
        )}

        {/* Formulário da cotação atual */}
        <div className="public-card">
          {cotacoes.length > 0 && (
            <div style={{ background: '#FFF3E0', borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              fontSize: 13, color: '#E65100', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FiPlus size={14} /> Cotação #{cotacaoNum}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {/* Tipo de Serviço */}
            <div className="form-group">
              <label className="form-label" style={{ color: '#374151' }}>Tipo de Serviço *</label>
              <ToggleGroup
                options={[
                  { val: 'Econômico', label: '💰 Econômico\n3-7 dias' },
                  { val: 'Rápido',    label: '⚡ Rápido\n1-2 dias' },
                  { val: 'Urgente',   label: '🔥 Urgente\n1 dia' },
                ]}
                value={current.tipo_servico}
                onChange={v => setCurrent(p => ({ ...p, tipo_servico: v }))}
              />
            </div>

            {/* Modalidade de Pagamento */}
            <div className="form-group">
              <label className="form-label" style={{ color: '#374151' }}>Modalidade de Pagamento *</label>
              <ToggleGroup
                wrap
                options={[
                  { val: 'À vista',        label: '💵 À vista' },
                  { val: 'Conta GOL',      label: '🏦 Conta corrente GOL' },
                  { val: 'Frete a cobrar', label: '📦 Frete a cobrar' },
                ]}
                value={current.modalidade_pagamento}
                onChange={v => setCurrent(p => ({ ...p, modalidade_pagamento: v }))}
              />
            </div>

            {/* Local de Entrega */}
            <div className="form-group">
              <label className="form-label" style={{ color: '#374151' }}>Local de Entrega *</label>
              <ToggleGroup
                options={[
                  { val: 'domicilio',  label: '🏠 Entrega a Domicílio' },
                  { val: 'aeroporto', label: '✈️ Retirada Aeroporto' },
                ]}
                value={current.local_entrega_tipo}
                onChange={v => setCurrent(p => ({
                  ...p, local_entrega_tipo: v,
                  cep_destino: '', cidade_destino: '', estado_aeroporto: '',
                }))}
              />
              <div style={{ marginTop: 12 }}>
                {current.local_entrega_tipo === 'domicilio' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ position: 'relative' }}>
                      <input className="public-input" placeholder="CEP destino" maxLength={9}
                        value={current.cep_destino} onChange={e => handleCepChange(e.target.value)}
                        style={{ paddingRight: cepLoading ? 36 : undefined }} />
                      {cepLoading && (
                        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#F37021' }}>
                          <FiLoader size={14} className="spin" />
                        </div>
                      )}
                    </div>
                    <input className="public-input" placeholder="Cidade/UF"
                      value={current.cidade_destino}
                      onChange={e => setCurrent(p => ({ ...p, cidade_destino: e.target.value }))}
                      style={{ background: current.cidade_destino ? '#E8F5E9' : undefined }} />
                  </div>
                ) : (
                  <select className="public-input" required={current.local_entrega_tipo === 'aeroporto'}
                    value={current.estado_aeroporto}
                    onChange={e => setCurrent(p => ({ ...p, estado_aeroporto: e.target.value }))}>
                    <option value="">Selecione o Estado</option>
                    {ESTADOS_BR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                )}
              </div>
            </div>

            {/* Seguro */}
            <div className="form-group">
              <label className="form-label" style={{ color: '#374151' }}>Seguro *</label>
              <ToggleGroup
                options={[
                  { val: 'GOL',        label: '🛡️ GOL' },
                  { val: 'Próprio',    label: '🔒 Próprio' },
                  { val: 'Sem Seguro', label: '❌ Sem Seguro' },
                ]}
                value={current.seguro}
                onChange={v => setCurrent(p => ({ ...p, seguro: v }))}
              />
            </div>

            {/* Descrição + Valor NF */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ color: '#374151' }}>Descrição da Carga *</label>
                <input className="public-input" required placeholder="Ex: Eletrônicos, roupas..."
                  value={current.descricao_carga}
                  onChange={e => setCurrent(p => ({ ...p, descricao_carga: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ color: '#374151' }}>Valor da Nota (R$) *</label>
                <input className="public-input" required type="number" step="0.01" min="0" placeholder="0,00"
                  value={current.valor_nota}
                  onChange={e => setCurrent(p => ({ ...p, valor_nota: e.target.value }))} />
              </div>
            </div>

            {/* Medidas */}
            <div style={{ background: '#F9FAFB', borderRadius: 8, padding: 16, marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiBox size={14} color="#F37021" /> Medidas do Pacote
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                {[
                  ['comprimento_cm', 'Comp. (cm)'],
                  ['altura_cm',      'Alt. (cm)'],
                  ['largura_cm',     'Larg. (cm)'],
                  ['peso_kg',        'Peso (kg)'],
                ].map(([field, label]) => (
                  <div key={field} className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ color: '#374151', fontSize: 11 }}>{label}</label>
                    <input className="public-input" type="number" step="0.1" min="0" placeholder="0"
                      value={current[field]}
                      onChange={e => setCurrent(p => ({ ...p, [field]: e.target.value }))} />
                  </div>
                ))}
              </div>
            </div>

            {/* Botões */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button type="button" onClick={handleAddOutra}
                style={{ background: '#fff', border: '1.5px solid #F37021', color: '#F37021',
                  borderRadius: 8, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <FiPlus size={14} /> Adicionar Outra
              </button>
              <button type="submit" className="public-btn" disabled={loading} style={{ margin: 0 }}>
                {loading ? 'Enviando...' : '✉️ Enviar Cotações'}
              </button>
            </div>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#9CA3AF' }}>© 2026 LOGPROFIT · Todos os direitos reservados</p>
      </div>
    </div>
  );
}
