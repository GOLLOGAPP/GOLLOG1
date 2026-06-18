import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { fetchCep, formatCep } from '../../lib/cep';
import { FiCheck, FiLoader, FiTrash2, FiPlus, FiLock } from 'react-icons/fi';

// Todas as bases operacionais GOLLOG — ordenadas por cidade
const BASES = [
  { sigla: 'AJU', cidade: 'Aracaju' },
  { sigla: 'ARU', cidade: 'Araçatuba' },
  { sigla: 'QAT', cidade: 'Atibaia' },
  { sigla: 'QBX', cidade: 'Barueri' },
  { sigla: 'BAU', cidade: 'Bauru' },
  { sigla: 'BEL', cidade: 'Belém' },
  { sigla: 'CNF', cidade: 'Belo Horizonte (Confins)' },
  { sigla: 'PLU', cidade: 'Belo Horizonte (Pampulha)' },
  { sigla: 'BGV', cidade: 'Bento Gonçalves' },
  { sigla: 'BNU', cidade: 'Blumenau' },
  { sigla: 'BVB', cidade: 'Boa Vista' },
  { sigla: 'BSB', cidade: 'Brasília' },
  { sigla: 'DFV', cidade: 'Brasília (2)' },
  { sigla: 'QBQ', cidade: 'Brusque' },
  { sigla: 'CPV', cidade: 'Campina Grande' },
  { sigla: 'VCP', cidade: 'Campinas' },
  { sigla: 'CGL', cidade: 'Campo Grande' },
  { sigla: 'CGR', cidade: 'Campo Grande (Aeroporto)' },
  { sigla: 'CAU', cidade: 'Caruaru' },
  { sigla: 'CKS', cidade: 'Carajás/Parauapebas' },
  { sigla: 'CAC', cidade: 'Cascavel' },
  { sigla: 'CXJ', cidade: 'Caxias do Sul' },
  { sigla: 'XAP', cidade: 'Chapecó' },
  { sigla: 'QNT', cidade: 'Contagem' },
  { sigla: 'QOT', cidade: 'Cotia' },
  { sigla: 'CCM', cidade: 'Criciúma' },
  { sigla: 'CZS', cidade: 'Cruzeiro do Sul' },
  { sigla: 'CGB', cidade: 'Cuiabá' },
  { sigla: 'CWB', cidade: 'Curitiba' },
  { sigla: 'QDM', cidade: 'Diadema' },
  { sigla: 'ETX', cidade: 'Extrema' },
  { sigla: 'QFS', cidade: 'Feira de Santana' },
  { sigla: 'FEN', cidade: 'Fernando de Noronha' },
  { sigla: 'FLN', cidade: 'Florianópolis' },
  { sigla: 'FOR', cidade: 'Fortaleza' },
  { sigla: 'FTZ', cidade: 'Fortaleza (2)' },
  { sigla: 'IGU', cidade: 'Foz do Iguaçu' },
  { sigla: 'FFR', cidade: 'Franca' },
  { sigla: 'GYN', cidade: 'Goiânia (Aeroporto)' },
  { sigla: 'GOD', cidade: 'Goiânia (Centro-Oeste)' },
  { sigla: 'GOI', cidade: 'Goiânia (Setor Ferroviário)' },
  { sigla: 'GRU', cidade: 'Guarulhos' },
  { sigla: 'SPX', cidade: 'Guarulhos (2)' },
  { sigla: 'IOS', cidade: 'Ilhéus' },
  { sigla: 'JJD', cidade: 'Jericoacara/Cruz' },
  { sigla: 'JPA', cidade: 'João Pessoa/Bayeux' },
  { sigla: 'JOI', cidade: 'Joinville' },
  { sigla: 'JDF', cidade: 'Juiz de Fora' },
  { sigla: 'JDO', cidade: 'Juazeiro do Norte' },
  { sigla: 'QDV', cidade: 'Jundiaí' },
  { sigla: 'QLI', cidade: 'Limeira' },
  { sigla: 'LDB', cidade: 'Londrina' },
  { sigla: 'MCP', cidade: 'Macapá' },
  { sigla: 'MCZ', cidade: 'Maceió/Rio Largo' },
  { sigla: 'MAO', cidade: 'Manaus' },
  { sigla: 'QMA', cidade: 'Manaus (2)' },
  { sigla: 'MAB', cidade: 'Marabá' },
  { sigla: 'MGF', cidade: 'Maringá' },
  { sigla: 'MII', cidade: 'Marília' },
  { sigla: 'QMI', cidade: 'Mogi das Cruzes' },
  { sigla: 'MOC', cidade: 'Montes Claros' },
  { sigla: 'NAT', cidade: 'Natal' },
  { sigla: 'QNL', cidade: 'Natal (2)' },
  { sigla: 'NVT', cidade: 'Navegantes' },
  { sigla: 'QNR', cidade: 'Niterói' },
  { sigla: 'NSA', cidade: 'Nova Serrana' },
  { sigla: 'QHV', cidade: 'Novo Hamburgo' },
  { sigla: 'QOZ', cidade: 'Osasco' },
  { sigla: 'PMW', cidade: 'Palmas' },
  { sigla: 'PFB', cidade: 'Passo Fundo' },
  { sigla: 'PET', cidade: 'Pelotas' },
  { sigla: 'PTS', cidade: 'Petrópolis' },
  { sigla: 'PNZ', cidade: 'Petrolina' },
  { sigla: 'QPR', cidade: 'Piracicaba' },
  { sigla: 'POA', cidade: 'Porto Alegre' },
  { sigla: 'RSF', cidade: 'Porto Alegre (2)' },
  { sigla: 'BPS', cidade: 'Porto Seguro' },
  { sigla: 'PVH', cidade: 'Porto Velho' },
  { sigla: 'QRS', cidade: 'Pouso Alegre' },
  { sigla: 'PPB', cidade: 'Presidente Prudente' },
  { sigla: 'RAO', cidade: 'Ribeirão Preto' },
  { sigla: 'GIG', cidade: 'Rio de Janeiro (Galeão)' },
  { sigla: 'SDU', cidade: 'Rio de Janeiro (Santos Dumont)' },
  { sigla: 'RJV', cidade: 'Rio de Janeiro (3)' },
  { sigla: 'RBR', cidade: 'Rio Branco' },
  { sigla: 'REC', cidade: 'Recife' },
  { sigla: 'QBA', cidade: 'Salvador' },
  { sigla: 'SSA', cidade: 'Salvador (Aeroporto)' },
  { sigla: 'QCC', cidade: 'Santa Cruz do Capibaribe' },
  { sigla: 'STM', cidade: 'Santarém' },
  { sigla: 'SBC', cidade: 'São Bernardo do Campo' },
  { sigla: 'QCS', cidade: 'São Caetano do Sul' },
  { sigla: 'SJK', cidade: 'São José dos Campos' },
  { sigla: 'SJP', cidade: 'São José do Rio Preto' },
  { sigla: 'SLZ', cidade: 'São Luís' },
  { sigla: 'CGH', cidade: 'São Paulo (Congonhas)' },
  { sigla: 'CGU', cidade: 'São Paulo (2)' },
  { sigla: 'QBR', cidade: 'São Paulo (Centro)' },
  { sigla: 'QSP', cidade: 'São Paulo (Berrini)' },
  { sigla: 'VGL', cidade: 'São Paulo (Campos Elíseos)' },
  { sigla: 'QIP', cidade: 'São Paulo (Ipiranga)' },
  { sigla: 'VJD', cidade: 'São Paulo (Santo Amaro)' },
  { sigla: 'SPA', cidade: 'São Paulo (República)' },
  { sigla: 'QGL', cidade: 'São Paulo (Vila Carrão)' },
  { sigla: 'SPM', cidade: 'São Paulo (Vila Maria)' },
  { sigla: 'SPO', cidade: 'São Paulo (Vila Leopoldina)' },
  { sigla: 'SPG', cidade: 'São Paulo (Zona Leste)' },
  { sigla: 'SSZ', cidade: 'Santos' },
  { sigla: 'QSE', cidade: 'Santo André' },
  { sigla: 'QSB', cidade: 'Sobral' },
  { sigla: 'SOD', cidade: 'Sorocaba' },
  { sigla: 'QTB', cidade: 'Taubaté' },
  { sigla: 'THE', cidade: 'Teresina' },
  { sigla: 'UDI', cidade: 'Uberlândia' },
  { sigla: 'QDI', cidade: 'Uberlândia (2)' },
  { sigla: 'VAG', cidade: 'Varginha' },
  { sigla: 'QVL', cidade: 'Valinhos' },
  { sigla: 'VNH', cidade: 'Vinhedo' },
  { sigla: 'VDC', cidade: 'Vitória da Conquista' },
  { sigla: 'VIX', cidade: 'Vitória' },
];

const EMPTY_VOLUME = { comprimento_cm: '', altura_cm: '', largura_cm: '', peso_kg: '' };

const EMPTY_COTACAO = {
  tipo_servico: 'Rápido',
  modalidade_pagamento: 'À vista',
  local_entrega_tipo: 'domicilio',
  aeroporto_sigla: '',
  aeroporto_cidade: '',
  cep_destino: '',
  cidade_destino: '',
  seguro: 'Sem Seguro',
  descricao_carga: '',
  valor_nota: '',
  volumes: [{ ...EMPTY_VOLUME }],
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
              textAlign: 'center', lineHeight: 1.3, whiteSpace: 'pre-line',
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

function BaseAutocomplete({ value, onChange }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const selected = BASES.find(b => b.sigla === value);

  const filtered = BASES.filter(b => {
    const q = search.toLowerCase();
    return !q || b.sigla.toLowerCase().includes(q) || b.cidade.toLowerCase().includes(q);
  }).slice(0, 40);

  return (
    <div style={{ position: 'relative' }}>
      <input
        className="public-input"
        placeholder="🔍 Digite cidade ou sigla (ex: GRU, Campinas...)"
        value={open ? search : (selected ? `${selected.sigla} — ${selected.cidade}` : '')}
        onFocus={() => { setOpen(true); setSearch(''); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={e => setSearch(e.target.value)}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: '#fff', border: '1px solid #E5E7EB',
          borderRadius: '0 0 10px 10px', maxHeight: 220, overflowY: 'auto',
          boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
        }}>
          {filtered.map(b => (
            <div key={b.sigla}
              onMouseDown={() => { onChange(b); }}
              style={{
                padding: '10px 14px', cursor: 'pointer', fontSize: 13,
                borderBottom: '1px solid #F9FAFB',
                background: b.sigla === value ? '#FFF3E0' : '#fff',
              }}>
              <span style={{ fontWeight: 700, color: '#F37021', marginRight: 6 }}>{b.sigla}</span>
              {b.cidade}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CotacaoPage() {
  const [searchParams] = useSearchParams();
  const phoneFromUrl = searchParams.get('phone') || '';
  const nameFromUrl = searchParams.get('name') || '';
  const unidadeFromUrl = searchParams.get('unidade') || 'Osasco';

  const [globalForm, setGlobalForm] = useState({
    telefone: '',
    com_coleta: true,
    cep_origem: '',
    cidade_origem: '',
  });
  const [clienteId, setClienteId] = useState(null);
  const [telefoneLoading, setTelefoneLoading] = useState(false);
  const [cepOrigemLoading, setCepOrigemLoading] = useState(false);

  const [cotacoes, setCotacoes] = useState([]);
  const [current, setCurrent] = useState({ ...EMPTY_COTACAO, volumes: [{ ...EMPTY_VOLUME }] });
  const [cepDestinoLoading, setCepDestinoLoading] = useState(false);
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
      if (cli) setClienteId(cli.id);
    } catch (_) {}
    setGlobalForm(p => ({ ...p, telefone: formatted || clean }));
    setTelefoneLoading(false);
  };

  const handleCepOrigemChange = async (value) => {
    const fmt = formatCep(value);
    setGlobalForm(p => ({ ...p, cep_origem: fmt, cidade_origem: '' }));
    if (fmt.replace(/\D/g, '').length === 8) {
      setCepOrigemLoading(true);
      const res = await fetchCep(fmt);
      if (res) setGlobalForm(p => ({ ...p, cidade_origem: `${res.cidade}/${res.estado}` }));
      setCepOrigemLoading(false);
    }
  };

  const handleCepDestinoChange = async (value) => {
    const fmt = formatCep(value);
    setCurrent(p => ({ ...p, cep_destino: fmt, cidade_destino: '' }));
    if (fmt.replace(/\D/g, '').length === 8) {
      setCepDestinoLoading(true);
      const res = await fetchCep(fmt);
      if (res) setCurrent(p => ({ ...p, cidade_destino: `${res.cidade}/${res.estado}` }));
      setCepDestinoLoading(false);
    }
  };

  const updateVolume = (idx, field, value) =>
    setCurrent(p => ({
      ...p,
      volumes: p.volumes.map((v, i) => i === idx ? { ...v, [field]: value } : v),
    }));

  const addVolume = () =>
    setCurrent(p => ({ ...p, volumes: [...p.volumes, { ...EMPTY_VOLUME }] }));

  const removeVolume = (idx) =>
    setCurrent(p => ({ ...p, volumes: p.volumes.filter((_, i) => i !== idx) }));

  const totalPeso = (volumes) =>
    volumes.reduce((s, v) => s + (parseFloat(v.peso_kg) || 0), 0);

  const handleAddOutra = () => {
    setCotacoes(prev => [...prev, { ...current }]);
    setShowDupDialog(true);
  };

  const handleDuplicate = (dup) => {
    setShowDupDialog(false);
    if (dup) {
      setCurrent(p => ({
        ...p,
        descricao_carga: '',
        valor_nota: '',
        cep_destino: '',
        cidade_destino: '',
        aeroporto_sigla: '',
        aeroporto_cidade: '',
        volumes: [{ ...EMPTY_VOLUME }],
      }));
    } else {
      setCurrent({ ...EMPTY_COTACAO, volumes: [{ ...EMPTY_VOLUME }] });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const all = [...cotacoes, { ...current }];
    try {
      const inserts = all.map(c => {
        const peso = totalPeso(c.volumes);
        const firstVol = c.volumes[0] || {};
        return {
          cliente_id: clienteId || null,
          cep_destino: c.cep_destino || null,
          cidade_destino: c.cidade_destino || c.aeroporto_cidade || null,
          peso_kg: peso || null,
          altura_cm: parseFloat(firstVol.altura_cm) || null,
          largura_cm: parseFloat(firstVol.largura_cm) || null,
          comprimento_cm: parseFloat(firstVol.comprimento_cm) || null,
          tipo_servico: c.tipo_servico,
          status: 'pendente',
          unidade: unidadeFromUrl,
          valor_cotado: 0,
          metadata: {
            modalidade_pagamento: c.modalidade_pagamento,
            local_entrega_tipo: c.local_entrega_tipo,
            aeroporto_sigla: c.aeroporto_sigla || null,
            aeroporto_cidade: c.aeroporto_cidade || null,
            seguro: c.seguro,
            descricao_carga: c.descricao_carga,
            valor_nota: c.valor_nota,
            com_coleta: globalForm.com_coleta,
            cep_origem: globalForm.cep_origem || null,
            cidade_origem: globalForm.cidade_origem || null,
            volumes: c.volumes,
          },
        };
      });

      await supabase.from('cotacoes').insert(inserts);

      const cleanPhone = globalForm.telefone.replace(/\D/g, '');
      if (cleanPhone) {
        await fetch('/api/notify/cotacao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: cleanPhone,
            global: {
              nome: nameFromUrl,
              unidade: unidadeFromUrl,
              com_coleta: globalForm.com_coleta,
              cep_origem: globalForm.cep_origem,
              cidade_origem: globalForm.cidade_origem,
            },
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
    window.scrollTo(0, 0);
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
  const pesoAtual = totalPeso(current.volumes);

  return (
    <div className="public-page">
      <header className="public-header">
        <img src="/logo.png" alt="GOLLOG" />
        <span style={{ fontSize: 14, fontWeight: 600, color: '#4A4A4A' }}>Solicitar Cotação</span>
      </header>
      <div className="public-container">

        {/* Dialog duplicar */}
        {showDupDialog && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 340, width: '100%' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Nova cotação #{cotacaoNum}</h3>
              <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px' }}>
                Deseja duplicar o tipo de serviço e pagamento da cotação anterior?
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
                      ? `${c.aeroporto_sigla} — ${c.aeroporto_cidade}`
                      : c.cidade_destino || c.cep_destino || 'Destino não informado'}
                  </div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                    {c.tipo_servico} · {c.modalidade_pagamento} · {totalPeso(c.volumes)}kg ({c.volumes.length} vol.)
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

        {/* Dados globais — só na primeira cotação */}
        {cotacoes.length === 0 && (
          <div className="public-card" style={{ marginBottom: 16 }}>
            <h2 style={{ marginBottom: 4 }}>Solicitar Cotação</h2>
            <p className="subtitle" style={{ marginBottom: 16 }}>
              Unidade: <strong>{unidadeFromUrl}</strong>
            </p>

            <div className="form-group">
              <label className="form-label" style={{ color: '#374151' }}>📱 WhatsApp *</label>
              <div style={{ position: 'relative' }}>
                <input className="public-input" required placeholder="(11) 99999-9999"
                  value={globalForm.telefone}
                  readOnly={!!phoneFromUrl}
                  onChange={e => setGlobalForm(p => ({ ...p, telefone: e.target.value }))}
                  style={{ background: phoneFromUrl ? '#F9FAFB' : undefined, paddingRight: 36 }} />
                <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  color: phoneFromUrl ? '#9CA3AF' : 'transparent' }}>
                  {telefoneLoading ? <FiLoader size={15} /> : phoneFromUrl ? <FiLock size={15} /> : null}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#374151' }}>Coleta *</label>
              <ToggleGroup
                options={[
                  { val: 'sim', label: '🚚 Com Coleta\nbuscamos a mercadoria' },
                  { val: 'nao', label: '🏢 Sem Coleta\ntrago na base' },
                ]}
                value={globalForm.com_coleta ? 'sim' : 'nao'}
                onChange={v => setGlobalForm(p => ({ ...p, com_coleta: v === 'sim', cep_origem: '', cidade_origem: '' }))}
              />
            </div>

            {globalForm.com_coleta && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ color: '#374151' }}>📦 CEP de Origem (endereço de coleta) *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ position: 'relative' }}>
                    <input className="public-input" placeholder="00000-000" maxLength={9}
                      value={globalForm.cep_origem}
                      onChange={e => handleCepOrigemChange(e.target.value)}
                      style={{ paddingRight: cepOrigemLoading ? 36 : undefined }} />
                    {cepOrigemLoading && (
                      <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#F37021' }}>
                        <FiLoader size={14} />
                      </div>
                    )}
                  </div>
                  <input className="public-input" placeholder="Cidade/UF"
                    value={globalForm.cidade_origem}
                    onChange={e => setGlobalForm(p => ({ ...p, cidade_origem: e.target.value }))}
                    style={{ background: globalForm.cidade_origem ? '#E8F5E9' : undefined }} />
                </div>
              </div>
            )}
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
              <ToggleGroup wrap
                options={[
                  { val: 'À vista',        label: '💵 À vista' },
                  { val: 'Conta GOL',      label: '🏦 Conta GOL' },
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
                  { val: 'domicilio', label: '🏠 Entrega a Domicílio' },
                  { val: 'aeroporto', label: '✈️ Retirada na Base' },
                ]}
                value={current.local_entrega_tipo}
                onChange={v => setCurrent(p => ({
                  ...p, local_entrega_tipo: v,
                  cep_destino: '', cidade_destino: '', aeroporto_sigla: '', aeroporto_cidade: '',
                }))}
              />
              <div style={{ marginTop: 12 }}>
                {current.local_entrega_tipo === 'domicilio' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ position: 'relative' }}>
                      <input className="public-input" placeholder="CEP destino" maxLength={9}
                        value={current.cep_destino}
                        onChange={e => handleCepDestinoChange(e.target.value)}
                        style={{ paddingRight: cepDestinoLoading ? 36 : undefined }} />
                      {cepDestinoLoading && (
                        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#F37021' }}>
                          <FiLoader size={14} />
                        </div>
                      )}
                    </div>
                    <input className="public-input" placeholder="Cidade/UF"
                      value={current.cidade_destino}
                      onChange={e => setCurrent(p => ({ ...p, cidade_destino: e.target.value }))}
                      style={{ background: current.cidade_destino ? '#E8F5E9' : undefined }} />
                  </div>
                ) : (
                  <BaseAutocomplete
                    value={current.aeroporto_sigla}
                    onChange={b => setCurrent(p => ({ ...p, aeroporto_sigla: b.sigla, aeroporto_cidade: b.cidade }))}
                  />
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

            {/* Volumes */}
            <div style={{ background: '#F9FAFB', borderRadius: 10, padding: 14, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                  📦 Volumes ({current.volumes.length})
                </div>
                <button type="button" onClick={addVolume}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F37021',
                    border: 'none', borderRadius: 6, padding: '5px 10px', color: '#fff',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  <FiPlus size={12} /> Adicionar volume
                </button>
              </div>

              {/* Cabeçalho da tabela */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 28px', gap: 6, marginBottom: 6 }}>
                {['Comp. (cm)', 'Alt. (cm)', 'Larg. (cm)', 'Peso (kg)', ''].map((h, i) => (
                  <div key={i} style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textAlign: 'center' }}>{h}</div>
                ))}
              </div>

              {current.volumes.map((vol, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr)) 28px', gap: 6, marginBottom: 6, minWidth: 0 }}>
                  {['comprimento_cm', 'altura_cm', 'largura_cm', 'peso_kg'].map(field => (
                    <input key={field} className="public-input" type="number" step="0.1" min="0" placeholder="0"
                      value={vol[field]}
                      onChange={e => updateVolume(idx, field, e.target.value)}
                      style={{ textAlign: 'center', padding: '8px 4px', fontSize: 13 }} />
                  ))}
                  <button type="button" onClick={() => removeVolume(idx)}
                    disabled={current.volumes.length === 1}
                    style={{ background: 'none', border: 'none', cursor: current.volumes.length === 1 ? 'default' : 'pointer',
                      color: current.volumes.length === 1 ? '#E5E7EB' : '#EF4444',
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FiTrash2 size={13} />
                  </button>
                </div>
              ))}

              {pesoAtual > 0 && (
                <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#374151',
                  marginTop: 8, paddingTop: 8, borderTop: '1px solid #E5E7EB' }}>
                  ⚖️ Peso total: {pesoAtual.toFixed(1)} kg
                </div>
              )}
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
