import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { fetchCep, formatCep } from '../../lib/cep';
import {
  FiDollarSign, FiSearch, FiPackage, FiTruck, FiCheckCircle, FiAlertCircle,
  FiArrowRight, FiCopy, FiInfo, FiRefreshCw, FiPlus, FiTrash2, FiFileText,
  FiUser, FiMapPin, FiShield, FiZap, FiChevronDown, FiChevronUp, FiArrowDown
} from 'react-icons/fi';

// Presets de volumes comuns para agilizar no celular
const PRESETS = [
  { id: 'envelope', label: '✉️ Documento', desc: 'Até 0.5 kg', weight: '0.5', height: '2', width: '22', lenght: '32', pieces: '1' },
  { id: 'pequena', label: '📦 Caixa P', desc: 'Até 2 kg (20x20x15cm)', weight: '2.0', height: '15', width: '20', lenght: '20', pieces: '1' },
  { id: 'media', label: '📦 Caixa M', desc: 'Até 5 kg (30x25x20cm)', weight: '5.0', height: '20', width: '25', lenght: '30', pieces: '1' },
  { id: 'grande', label: '📦 Caixa G', desc: 'Até 10 kg (40x35x30cm)', weight: '10.0', height: '30', width: '35', lenght: '40', pieces: '1' },
  { id: 'custom', label: '⚙️ Personalizado', desc: 'Digitar medidas', weight: '', height: '', width: '', lenght: '', pieces: '1' }
];

export default function CotacaoAvancadaPage() {
  const [searchParams] = useSearchParams();
  const urlPhone = searchParams.get('phone') || '';
  const urlName = searchParams.get('name') || '';

  // Step state: 1 = Cotação, 2 = Seleção de Serviços, 3 = Minuta & Pedido, 4 = Sucesso
  const [step, setStep] = useState(1);
  const [showInfo, setShowInfo] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('pequena');

  // Form Step 1: Cotação
  const [customerDocument, setCustomerDocument] = useState('');
  const [originPostalCode, setOriginPostalCode] = useState('01001-000');
  const [destinationPostalCode, setDestinationPostalCode] = useState('70040-010');
  const [originCity, setOriginCity] = useState('São Paulo / SP');
  const [destinationCity, setDestinationCity] = useState('Brasília / DF');
  const [loadingOriginCep, setLoadingOriginCep] = useState(false);
  const [loadingDestCep, setLoadingDestCep] = useState(false);

  const [declaredValue, setDeclaredValue] = useState('500.00');
  const [toCollect, setToCollect] = useState(false);
  const [toDelivery, setToDelivery] = useState(false);

  const [volumes, setVolumes] = useState([
    { weight: '2.0', height: '15', width: '20', lenght: '20', pieces: '1' }
  ]);

  // Loading & Error states
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [quoteError, setQuoteError] = useState(null);

  // Results Step 2
  const [quotationData, setQuotationData] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [expandedCharges, setExpandedCharges] = useState({});

  // Form Step 3: Minuta
  const [paymentMethod, setPaymentMethod] = useState('1'); // 1 = Pago Origem, 2 = Frap
  const [sender, setSender] = useState({
    name: urlName || 'Empresa Remetente LTDA',
    documentNumber: '47.944.243/0001-41',
    stateRegistration: 'ISENTO',
    email: 'contato@remetente.com.br',
    phone: urlPhone || '(11) 98888-7777',
    zipCode: '01001-000',
    street: 'Praça da Sé',
    number: '100',
    complement: '',
    neighborhood: 'Sé',
    city: 'São Paulo',
    state: 'SP'
  });

  const [receiver, setReceiver] = useState({
    name: 'Empresa Destinatária S/A',
    documentNumber: '12.345.678/0001-90',
    stateRegistration: 'ISENTO',
    email: 'recepcao@destinatario.com.br',
    phone: '(61) 99999-6666',
    zipCode: '70040-010',
    street: 'Esplanada dos Ministérios',
    number: 'S/N',
    complement: '',
    neighborhood: 'Zona Cívico-Administrativa',
    city: 'Brasília',
    state: 'DF'
  });

  const [loadingMinute, setLoadingMinute] = useState(false);
  const [minuteError, setMinuteError] = useState(null);
  const [minuteResult, setMinuteResult] = useState(null);
  const [copied, setCopied] = useState(false);

  // Auto-fill from URL params or Supabase client
  useEffect(() => {
    if (urlPhone) {
      const cleanPhone = urlPhone.replace(/\D/g, '');
      supabase.from('clientes')
        .select('*')
        .or(`telefone.eq.${cleanPhone},telefone.eq.${urlPhone}`)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            if (data.cpf_cnpj) setCustomerDocument(data.cpf_cnpj);
            setSender(prev => ({
              ...prev,
              name: data.nome || prev.name,
              documentNumber: data.cpf_cnpj || prev.documentNumber,
              email: data.email || prev.email,
              phone: data.telefone || prev.phone,
              zipCode: data.cep || prev.zipCode,
              street: data.endereco || prev.street,
              city: data.cidade || prev.city,
              state: data.estado || prev.state
            }));
            if (data.cep) {
              const formatted = formatCep(data.cep);
              setOriginPostalCode(formatted);
              handleOriginCepChange(formatted);
            }
          }
        });
    }
  }, [urlPhone]);

  // CEP Lookups
  const handleOriginCepChange = async (val) => {
    const formatted = formatCep(val);
    setOriginPostalCode(formatted);
    const clean = formatted.replace(/\D/g, '');
    if (clean.length === 8) {
      setLoadingOriginCep(true);
      const res = await fetchCep(clean);
      setLoadingOriginCep(false);
      if (res) {
        setOriginCity(`${res.cidade} / ${res.estado}`);
        setSender(prev => ({
          ...prev,
          zipCode: formatted,
          street: res.logradouro || prev.street,
          neighborhood: res.bairro || prev.neighborhood,
          city: res.cidade || prev.city,
          state: res.estado || prev.state
        }));
      }
    }
  };

  const handleDestCepChange = async (val) => {
    const formatted = formatCep(val);
    setDestinationPostalCode(formatted);
    const clean = formatted.replace(/\D/g, '');
    if (clean.length === 8) {
      setLoadingDestCep(true);
      const res = await fetchCep(clean);
      setLoadingDestCep(false);
      if (res) {
        setDestinationCity(`${res.cidade} / ${res.estado}`);
        setReceiver(prev => ({
          ...prev,
          zipCode: formatted,
          street: res.logradouro || prev.street,
          neighborhood: res.bairro || prev.neighborhood,
          city: res.cidade || prev.city,
          state: res.estado || prev.state
        }));
      }
    }
  };

  // Preset Selection
  const applyPreset = (p) => {
    setSelectedPreset(p.id);
    if (p.id !== 'custom') {
      setVolumes([{
        weight: p.weight,
        height: p.height,
        width: p.width,
        lenght: p.lenght,
        pieces: '1'
      }]);
    }
  };

  // Add/Remove volume
  const addVolume = () => {
    setSelectedPreset('custom');
    setVolumes([...volumes, { weight: '1.0', height: '10', width: '10', lenght: '10', pieces: '1' }]);
  };

  const removeVolume = (index) => {
    if (volumes.length === 1) return;
    setVolumes(volumes.filter((_, i) => i !== index));
  };

  const updateVolume = (index, field, value) => {
    setSelectedPreset('custom');
    const newVols = [...volumes];
    newVols[index][field] = value;
    setVolumes(newVols);
  };

  // Quick Test Fill
  const handleQuickTest = () => {
    setCustomerDocument('47.944.243/0001-41');
    setOriginPostalCode('01001-000');
    setDestinationPostalCode('70040-010');
    setOriginCity('São Paulo / SP');
    setDestinationCity('Brasília / DF');
    setDeclaredValue('750.00');
    setToCollect(false);
    setToDelivery(true);
    applyPreset(PRESETS[1]); // Caixa P
  };

  // Submit Step 1 -> Calculate Quotes
  const handleCalculateQuotes = async (e) => {
    if (e) e.preventDefault();
    setLoadingQuotes(true);
    setQuoteError(null);
    setQuotationData(null);
    setSelectedQuote(null);

    try {
      const res = await fetch('/api/nexlog?action=cotacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerDocument,
          originPostalCode: originPostalCode.replace(/\D/g, ''),
          destinationPostalCode: destinationPostalCode.replace(/\D/g, ''),
          declaredValue: parseFloat(declaredValue || 0),
          toCollect,
          toDelivery,
          volumes
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Erro ao consultar cotação.');
      }

      setQuotationData(data);
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setQuoteError(err.message || 'Erro de comunicação com a API Nexlog.');
    } finally {
      setLoadingQuotes(false);
    }
  };

  // Select quote & proceed to step 3
  const handleSelectQuote = (quote) => {
    setSelectedQuote(quote);
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit Step 3 -> Generate Minute
  const handleGenerateMinute = async (e) => {
    if (e) e.preventDefault();
    setLoadingMinute(true);
    setMinuteError(null);

    try {
      const res = await fetch('/api/nexlog?action=minuta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quotationId: selectedQuote.idQuotation,
          serviceCode: selectedQuote.serviceCode,
          originPointCode: selectedQuote.originPoint.code,
          originPostalCode: originPostalCode.replace(/\D/g, ''),
          destinationPointCode: selectedQuote.destinationPoint.code,
          destinationPostalCode: destinationPostalCode.replace(/\D/g, ''),
          declaredValue: selectedQuote.declaredValue,
          toCollect,
          toDelivery,
          volumes,
          sender,
          receiver,
          paymentMethod
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Erro ao gerar minuta eletrônica.');
      }

      setMinuteResult(data);
      setStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setMinuteError(err.message || 'Falha ao emitir a minuta.');
    } finally {
      setLoadingMinute(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const toggleCharges = (code) => {
    setExpandedCharges(prev => ({ ...prev, [code]: !prev[code] }));
  };

  return (
    <div className="public-page" style={{ background: '#F8FAFC', minHeight: '100vh', color: '#0F172A', paddingBottom: '40px' }}>
      
      {/* HEADER ELEGANTE MOBILE */}
      <header style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '14px 20px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="GOLLOG" style={{ height: '30px', objectFit: 'contain' }} />
          <div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#1E293B', lineHeight: '1.2' }}>GOLLOG</div>
            <div style={{ fontSize: '11px', color: '#F37021', fontWeight: '600' }}>Cotação Oficial em Tempo Real</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleQuickTest}
            style={{
              background: '#FFF7ED',
              border: '1px solid #FDBA74',
              color: '#C2410C',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
            title="Preenche dados de demonstração automaticamente"
          >
            <FiZap /> Teste Rápido
          </button>
        </div>
      </header>

      {/* CONTAINER CENTRAL RESPONSIVO */}
      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '16px' }}>

        {/* CARD INFORMATIVO DISCRETO (EXPANSÍVEL) */}
        <div style={{
          background: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '16px'
        }}>
          <div
            onClick={() => setShowInfo(!showInfo)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', color: '#1E40AF' }}>
              <FiInfo size={16} /> Como funciona a cotação oficial?
            </div>
            <span style={{ color: '#1E40AF', fontSize: '12px', fontWeight: '600' }}>
              {showInfo ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
            </span>
          </div>

          {showInfo && (
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #DBEAFE', fontSize: '12px', color: '#1E3A8A', lineHeight: '1.5' }}>
              <p style={{ margin: '0 0 6px 0' }}>
                🎯 <strong>Objetivo:</strong> Fornecer preços e prazos exatos e oficiais da malha aérea GOLLOG com aplicação automática de tarifas negociadas de contrato por CNPJ/CPF.
              </p>
              <p style={{ margin: '0 0 6px 0' }}>
                📋 <strong>Instruções:</strong> Digite seu documento (se tiver contrato), informe CEPs e peso. Escolha a melhor opção de frete e emita sua Minuta Eletrônica/AWB na hora.
              </p>
              <p style={{ margin: 0 }}>
                🧪 <strong>Teste Fácil:</strong> Clique no botão <em>"Teste Rápido"</em> no topo para carregar uma simulação completa de envio entre São Paulo e Brasília.
              </p>
            </div>
          )}
        </div>

        {/* STEPPER PROGRESS BAR */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          {[
            { n: 1, label: 'Carga' },
            { n: 2, label: 'Opções' },
            { n: 3, label: 'Minuta' },
            { n: 4, label: 'Pedido' }
          ].map((s, idx) => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: idx < 3 ? 1 : 'none' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: step === s.n ? '#F37021' : step > s.n ? '#10B981' : '#E2E8F0',
                color: step >= s.n ? '#FFFFFF' : '#64748B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '13px',
                boxShadow: step === s.n ? '0 0 0 3px rgba(243, 112, 33, 0.2)' : 'none',
                transition: 'all 0.2s ease'
              }}>
                {step > s.n ? '✓' : s.n}
              </div>
              <span style={{ fontSize: '11px', fontWeight: '600', color: step >= s.n ? '#0F172A' : '#94A3B8', marginLeft: '6px' }}>
                {s.label}
              </span>
              {idx < 3 && (
                <div style={{
                  flex: 1,
                  height: '2px',
                  background: step > s.n ? '#10B981' : '#E2E8F0',
                  margin: '0 8px'
                }} />
              )}
            </div>
          ))}
        </div>

        {/* MENSAGEM DE ERRO */}
        {(quoteError || minuteError) && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#B91C1C',
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px'
          }}>
            <FiAlertCircle size={20} style={{ flexShrink: 0 }} />
            <div>{quoteError || minuteError}</div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            PASSO 1: DADOS DA CARGA & CEPS
        ══════════════════════════════════════════════════════ */}
        {step === 1 && (
          <form onSubmit={handleCalculateQuotes} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* CARD 1: CLIENTE / CONTRATO */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <FiUser color="#F37021" /> CNPJ ou CPF (Opcional):
              </label>
              <input
                type="text"
                className="public-input"
                placeholder="00.000.000/0000-00"
                value={customerDocument}
                onChange={(e) => setCustomerDocument(e.target.value)}
                style={{ width: '100%', fontSize: '15px', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #CBD5E1' }}
              />
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '6px' }}>
                💡 Se a sua empresa tiver <strong>contrato tarifário GOLLOG</strong>, seus descontos serão aplicados automaticamente.
              </div>
            </div>

            {/* CARD 2: ORIGEM & DESTINO */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#1E293B', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiMapPin color="#F37021" /> Rota do Envio
              </div>

              {/* CEP Origem */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>
                  CEP de Origem (Saída da Carga): *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    className="public-input"
                    placeholder="00000-000"
                    value={originPostalCode}
                    onChange={(e) => handleOriginCepChange(e.target.value)}
                    style={{ width: '100%', fontSize: '15px', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #CBD5E1' }}
                  />
                  {loadingOriginCep && (
                    <span style={{ position: 'absolute', right: '12px', top: '14px', fontSize: '11px', color: '#F37021' }}>
                      Buscando...
                    </span>
                  )}
                </div>
                {originCity && (
                  <div style={{ fontSize: '11px', color: '#059669', fontWeight: '600', marginTop: '4px' }}>
                    📍 {originCity}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                  <FiArrowDown size={14} />
                </div>
              </div>

              {/* CEP Destino */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>
                  CEP de Destino (Entrega da Carga): *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    className="public-input"
                    placeholder="00000-000"
                    value={destinationPostalCode}
                    onChange={(e) => handleDestCepChange(e.target.value)}
                    style={{ width: '100%', fontSize: '15px', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #CBD5E1' }}
                  />
                  {loadingDestCep && (
                    <span style={{ position: 'absolute', right: '12px', top: '14px', fontSize: '11px', color: '#F37021' }}>
                      Buscando...
                    </span>
                  )}
                </div>
                {destinationCity && (
                  <div style={{ fontSize: '11px', color: '#059669', fontWeight: '600', marginTop: '4px' }}>
                    📍 {destinationCity}
                  </div>
                )}
              </div>
            </div>

            {/* CARD 3: VOLUMES E MEDIDAS */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FiPackage color="#F37021" /> Tamanho da Encomenda
                </div>
                <button
                  type="button"
                  onClick={addVolume}
                  style={{ background: 'none', border: 'none', color: '#F37021', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                >
                  <FiPlus /> + Caixa
                </button>
              </div>

              {/* Presets Rápidos com 1 toque */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px', marginBottom: '16px' }}>
                {PRESETS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p)}
                    style={{
                      background: selectedPreset === p.id ? '#FFF7ED' : '#F8FAFC',
                      border: selectedPreset === p.id ? '2px solid #F37021' : '1px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '8px 6px',
                      textAlign: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: '700', color: selectedPreset === p.id ? '#C2410C' : '#1E293B' }}>{p.label}</div>
                    <div style={{ fontSize: '9px', color: '#64748B', marginTop: '2px' }}>{p.desc}</div>
                  </button>
                ))}
              </div>

              {/* Lista de Volumes */}
              {volumes.map((vol, index) => (
                <div key={index} style={{
                  background: '#F8FAFC',
                  borderRadius: '12px',
                  padding: '12px',
                  marginBottom: '10px',
                  border: '1px solid #E2E8F0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                      Volume #{index + 1}
                    </span>
                    {volumes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeVolume(index)}
                        style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}
                      >
                        <FiTrash2 /> Remover
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '2px' }}>Peso Total (kg):</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        className="public-input"
                        placeholder="Ex: 2.5"
                        value={vol.weight}
                        onChange={(e) => updateVolume(index, 'weight', e.target.value)}
                        style={{ padding: '8px 10px', fontSize: '14px', borderRadius: '8px' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '2px' }}>Qtd. de Peças:</label>
                      <input
                        type="number"
                        required
                        className="public-input"
                        placeholder="1"
                        value={vol.pieces}
                        onChange={(e) => updateVolume(index, 'pieces', e.target.value)}
                        style={{ padding: '8px 10px', fontSize: '14px', borderRadius: '8px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Compr. (cm)</label>
                      <input
                        type="number"
                        required
                        className="public-input"
                        placeholder="30"
                        value={vol.lenght}
                        onChange={(e) => updateVolume(index, 'lenght', e.target.value)}
                        style={{ padding: '6px 8px', fontSize: '13px', borderRadius: '6px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Largura (cm)</label>
                      <input
                        type="number"
                        required
                        className="public-input"
                        placeholder="20"
                        value={vol.width}
                        onChange={(e) => updateVolume(index, 'width', e.target.value)}
                        style={{ padding: '6px 8px', fontSize: '13px', borderRadius: '6px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Altura (cm)</label>
                      <input
                        type="number"
                        required
                        className="public-input"
                        placeholder="15"
                        value={vol.height}
                        onChange={(e) => updateVolume(index, 'height', e.target.value)}
                        style={{ padding: '6px 8px', fontSize: '13px', borderRadius: '6px' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* CARD 4: VALOR DECLARADO & SERVIÇOS EXTRAS */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <FiShield color="#F37021" /> Valor Declarado da Carga (R$): *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="public-input"
                  placeholder="500.00"
                  value={declaredValue}
                  onChange={(e) => setDeclaredValue(e.target.value)}
                  style={{ width: '100%', fontSize: '15px', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #CBD5E1' }}
                />
                <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                  Utilizado para o cálculo automático do seguro obrigatório da carga.
                </span>
              </div>

              {/* Coleta & Entrega */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#F8FAFC', padding: '12px', borderRadius: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={toCollect}
                    onChange={(e) => setToCollect(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#F37021' }}
                  />
                  Desejo Coleta no meu endereço
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={toDelivery}
                    onChange={(e) => setToDelivery(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#F37021' }}
                  />
                  Desejo Entrega porta a porta no destino
                </label>
              </div>
            </div>

            {/* BOTÃO PRINCIPAL DE COTAÇÃO */}
            <button
              type="submit"
              disabled={loadingQuotes}
              style={{
                width: '100%',
                padding: '16px',
                background: '#F37021',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '14px',
                fontSize: '16px',
                fontWeight: '800',
                cursor: loadingQuotes ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 4px 14px rgba(243, 112, 33, 0.35)',
                transition: 'all 0.2s ease'
              }}
            >
              {loadingQuotes ? (
                <>
                  <FiRefreshCw className="spin" /> Calculando Valores Oficiais...
                </>
              ) : (
                <>
                  Ver Opções de Frete GOLLOG <FiArrowRight />
                </>
              )}
            </button>
          </form>
        )}

        {/* ══════════════════════════════════════════════════════
            PASSO 2: COMPARADOR DE TARIFAS GOLLOG
        ══════════════════════════════════════════════════════ */}
        {step === 2 && quotationData && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                  Opções Disponíveis ({quotationData.quotesCount})
                </h2>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  {originCity} ➔ {destinationCity}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(1)}
                style={{ background: '#F1F5F9', border: 'none', color: '#475569', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
              >
                Alterar
              </button>
            </div>

            {quotationData.notice && (
              <div style={{ background: '#FEFCE8', border: '1px solid #FEF08A', color: '#854D0E', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', marginBottom: '14px' }}>
                ℹ️ {quotationData.notice}
              </div>
            )}

            {/* Cards de Serviços */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              {quotationData.quotes.map((q) => {
                const isUrgente = q.serviceCode?.includes('URG');
                const isRapido = q.serviceCode?.includes('RAP');
                const isChegol = q.serviceCode?.includes('CHEG') || q.serviceCode?.includes('ECON');

                return (
                  <div
                    key={q.idQuotation || q.serviceCode}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '16px',
                      border: q.isAgreed ? '2px solid #10B981' : '1px solid #E2E8F0',
                      padding: '18px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      position: 'relative'
                    }}
                  >
                    {/* Badge de Acordo Comercial */}
                    {q.isAgreed && (
                      <div style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '16px',
                        background: '#10B981',
                        color: '#FFFFFF',
                        padding: '2px 10px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        🏷️ Desconto de Contrato
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {isUrgente ? '🚀 ' : isRapido ? '⚡ ' : isChegol ? '📦 ' : '✈️ '}
                          {q.serviceDescription}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '500', marginTop: '2px' }}>
                          ⏱ Prazo previsto: <strong>{q.timeToDelivery} dia(s) útil(eis)</strong>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '22px', fontWeight: '900', color: '#F37021' }}>
                          R$ {q.totalValue.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '600' }}>TOTAL COM TAXAS</div>
                      </div>
                    </div>

                    {/* Resumo de frete peso e taxas */}
                    <div style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', color: '#475569', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span>Frete Peso ({q.chargeableWeight} kg):</span>
                        <span>R$ {q.freightValue.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Taxas Operacionais:</span>
                        <span>R$ {q.chargesValue.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Detalhamento das Taxas (Expansível) */}
                    {q.charges && q.charges.length > 0 && (
                      <div style={{ marginBottom: '14px' }}>
                        <button
                          type="button"
                          onClick={() => toggleCharges(q.serviceCode)}
                          style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '11px', fontWeight: '600', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          {expandedCharges[q.serviceCode] ? '▲ Ocultar taxas' : '▼ Ver detalhamento das taxas'}
                        </button>

                        {expandedCharges[q.serviceCode] && (
                          <div style={{ background: '#F1F5F9', borderRadius: '8px', padding: '8px 10px', marginTop: '6px', fontSize: '11px', color: '#475569' }}>
                            {q.charges.map((c, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                                <span>{c.description}:</span>
                                <strong>R$ {c.value?.toFixed(2)}</strong>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Botão Selecionar */}
                    <button
                      type="button"
                      onClick={() => handleSelectQuote(q)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: '#F37021',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      Escolher esta Opção <FiArrowRight />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            PASSO 3: DADOS DA MINUTA / PEDIDO
        ══════════════════════════════════════════════════════ */}
        {step === 3 && selectedQuote && (
          <form onSubmit={handleGenerateMinute} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                Dados da Minuta Eletrônica
              </h2>
              <button
                type="button"
                onClick={() => setStep(2)}
                style={{ background: '#F1F5F9', border: 'none', color: '#475569', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
              >
                Trocar Frete
              </button>
            </div>

            {/* Resumo do Serviço Escolhido */}
            <div style={{ background: '#FFF7ED', border: '1.5px solid #FDBA74', padding: '14px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#9A3412' }}>{selectedQuote.serviceDescription}</div>
                  <div style={{ fontSize: '12px', color: '#C2410C' }}>{originCity} ➔ {destinationCity}</div>
                </div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#C2410C' }}>
                  R$ {selectedQuote.totalValue.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Condição de Pagamento */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '18px', border: '1px solid #E2E8F0' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '6px' }}>
                Quem paga o frete?
              </label>
              <select
                className="public-input"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ width: '100%', fontSize: '14px', padding: '10px 12px', borderRadius: '10px' }}
              >
                <option value="1">1 - Pago pelo Remetente (Na Origem)</option>
                <option value="2">2 - FRAP (Pago pelo Destinatário na Entrega)</option>
              </select>
            </div>

            {/* DADOS DO REMETENTE */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '18px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#1E293B', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📤 Dados do Remetente (Quem Envia)
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748B' }}>Nome ou Razão Social: *</label>
                  <input
                    type="text"
                    required
                    className="public-input"
                    value={sender.name}
                    onChange={(e) => setSender({ ...sender, name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748B' }}>CNPJ ou CPF: *</label>
                    <input
                      type="text"
                      required
                      className="public-input"
                      value={sender.documentNumber}
                      onChange={(e) => setSender({ ...sender, documentNumber: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748B' }}>Telefone WhatsApp: *</label>
                    <input
                      type="text"
                      required
                      className="public-input"
                      value={sender.phone}
                      onChange={(e) => setSender({ ...sender, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748B' }}>E-mail:</label>
                  <input
                    type="email"
                    className="public-input"
                    value={sender.email}
                    onChange={(e) => setSender({ ...sender, email: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* DADOS DO DESTINATÁRIO */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '18px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#1E293B', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📥 Dados do Destinatário (Quem Recebe)
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748B' }}>Nome ou Razão Social: *</label>
                  <input
                    type="text"
                    required
                    className="public-input"
                    value={receiver.name}
                    onChange={(e) => setReceiver({ ...receiver, name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748B' }}>CNPJ ou CPF: *</label>
                    <input
                      type="text"
                      required
                      className="public-input"
                      value={receiver.documentNumber}
                      onChange={(e) => setReceiver({ ...receiver, documentNumber: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748B' }}>Telefone WhatsApp: *</label>
                    <input
                      type="text"
                      required
                      className="public-input"
                      value={receiver.phone}
                      onChange={(e) => setReceiver({ ...receiver, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748B' }}>E-mail:</label>
                  <input
                    type="email"
                    className="public-input"
                    value={receiver.email}
                    onChange={(e) => setReceiver({ ...receiver, email: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* BOTÃO EMITIR MINUTA */}
            <button
              type="submit"
              disabled={loadingMinute}
              style={{
                width: '100%',
                padding: '16px',
                background: '#10B981',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '14px',
                fontSize: '16px',
                fontWeight: '800',
                cursor: loadingMinute ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
              }}
            >
              {loadingMinute ? (
                <>
                  <FiRefreshCw className="spin" /> Gerando Minuta Oficial na GOLLOG...
                </>
              ) : (
                <>
                  <FiCheckCircle /> Confirmar e Emitir Minuta Oficial
                </>
              )}
            </button>
          </form>
        )}

        {/* ══════════════════════════════════════════════════════
            PASSO 4: RESULTADO & NÚMERO DO PEDIDO AWB
        ══════════════════════════════════════════════════════ */}
        {step === 4 && minuteResult && (
          <div style={{ background: '#FFFFFF', borderRadius: '20px', padding: '28px 20px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}>
            <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: '#D1FAE5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', fontSize: '32px' }}>
              <FiCheckCircle />
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0F172A', marginBottom: '6px' }}>
              Minuta Eletrônica Gerada!
            </h2>
            <p style={{ color: '#64748B', fontSize: '13px', margin: '0 0 20px 0' }}>
              Sua encomenda foi registrada na base oficial GOLLOG.
            </p>

            <div style={{ background: '#F8FAFC', padding: '18px', borderRadius: '14px', border: '1.5px dashed #CBD5E1', marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                Número da Minuta / AWB
              </div>
              <div style={{ fontSize: '26px', fontWeight: '900', color: '#F37021', letterSpacing: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {minuteResult.orderNumber}
                <button
                  type="button"
                  onClick={() => copyToClipboard(minuteResult.orderNumber)}
                  style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px' }}
                  title="Copiar código"
                >
                  <FiCopy size={18} />
                </button>
              </div>
              {copied && (
                <div style={{ fontSize: '11px', color: '#10B981', fontWeight: '700', marginTop: '4px' }}>
                  ✓ Código copiado com sucesso!
                </div>
              )}
            </div>

            <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px', fontSize: '12px', color: '#334155', textAlign: 'left', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #E2E8F0' }}>
                <span>Serviço:</span>
                <strong>{selectedQuote.serviceDescription}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #E2E8F0' }}>
                <span>Rota:</span>
                <strong>{originCity} ➔ {destinationCity}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #E2E8F0' }}>
                <span>Remetente:</span>
                <strong>{sender.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #E2E8F0' }}>
                <span>Destinatário:</span>
                <strong>{receiver.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#F37021', fontSize: '14px', fontWeight: '800' }}>
                <span>Valor Total:</span>
                <span>R$ {selectedQuote.totalValue.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a
                href={`/rastreamento?doc=${minuteResult.orderNumber}`}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#F37021',
                  color: '#FFFFFF',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  textDecoration: 'none'
                }}
              >
                <FiTruck /> Acompanhar Rastreamento
              </a>

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setMinuteResult(null);
                  setSelectedQuote(null);
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#F1F5F9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Fazer Nova Cotação
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
