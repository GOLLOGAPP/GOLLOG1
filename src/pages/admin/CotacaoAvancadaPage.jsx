import { useState } from 'react';
import {
  FiDollarSign, FiSearch, FiPackage, FiTruck, FiCheckCircle, FiAlertCircle,
  FiArrowRight, FiCopy, FiInfo, FiRefreshCw, FiPlus, FiTrash2, FiFileText, FiUser, FiMapPin, FiShield, FiZap
} from 'react-icons/fi';

export default function CotacaoAvancadaPage() {
  // Step state: 1 = Cotação & Contrato, 2 = Seleção de Serviços, 3 = Minuta & Pedido, 4 = Sucesso
  const [step, setStep] = useState(1);

  // Form Step 1: Cotação
  const [customerDocument, setCustomerDocument] = useState('');
  const [originPostalCode, setOriginPostalCode] = useState('01001000');
  const [destinationPostalCode, setDestinationPostalCode] = useState('70040010');
  const [declaredValue, setDeclaredValue] = useState('500');
  const [toCollect, setToCollect] = useState(false);
  const [toDelivery, setToDelivery] = useState(false);

  const [volumes, setVolumes] = useState([
    { weight: '2.5', height: '15', width: '20', lenght: '30', pieces: '1' }
  ]);

  // Loading & Error states
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [quoteError, setQuoteError] = useState(null);

  // Results Step 2
  const [quotationData, setQuotationData] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);

  // Form Step 3: Minuta
  const [paymentMethod, setPaymentMethod] = useState('1'); // 1 = Pago Origem, 2 = Frap
  const [sender, setSender] = useState({
    name: 'LogProfit Distribuidora LTDA',
    documentNumber: '47.944.243/0001-41',
    stateRegistration: 'ISENTO',
    email: 'atendimento@logprofit.com.br',
    phone: '(11) 98888-7777',
    zipCode: '01001-000',
    street: 'Praça da Sé',
    number: '100',
    complement: 'Bloco A',
    neighborhood: 'Sé',
    city: 'São Paulo',
    state: 'SP'
  });

  const [receiver, setReceiver] = useState({
    name: 'Destinatário Comercial Brasilia EIRELI',
    documentNumber: '12.345.678/0001-90',
    stateRegistration: 'ISENTO',
    email: 'recepcao@destinobrasilia.com.br',
    phone: '(61) 99999-6666',
    zipCode: '70040-010',
    street: 'Esplanada dos Ministérios',
    number: 'S/N',
    complement: 'Anexo II',
    neighborhood: 'Zona Cívico-Administrativa',
    city: 'Brasília',
    state: 'DF'
  });

  const [loadingMinute, setLoadingMinute] = useState(false);
  const [minuteError, setMinuteError] = useState(null);
  const [minuteResult, setMinuteResult] = useState(null);
  const [copied, setCopied] = useState(false);

  // Quick fill helper for practical easy testing
  const handleQuickTest = () => {
    setCustomerDocument('47.944.243/0001-41');
    setOriginPostalCode('01001-000');
    setDestinationPostalCode('70040-010');
    setDeclaredValue('750.00');
    setToCollect(false);
    setToDelivery(true);
    setVolumes([
      { weight: '3.0', height: '20', width: '25', lenght: '35', pieces: '1' }
    ]);
  };

  // Add volume row
  const addVolume = () => {
    setVolumes([...volumes, { weight: '1.0', height: '10', width: '10', lenght: '10', pieces: '1' }]);
  };

  // Remove volume row
  const removeVolume = (index) => {
    if (volumes.length === 1) return;
    setVolumes(volumes.filter((_, i) => i !== index));
  };

  // Update volume row
  const updateVolume = (index, field, value) => {
    const newVols = [...volumes];
    newVols[index][field] = value;
    setVolumes(newVols);
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
          originPostalCode,
          destinationPostalCode,
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
          originPostalCode,
          destinationPointCode: selectedQuote.destinationPoint.code,
          destinationPostalCode,
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
    } catch (err) {
      setMinuteError(err.message || 'Falha ao emitir a minuta.');
    } finally {
      setLoadingMinute(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* HEADER DA PÁGINA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FiDollarSign className="text-primary" /> Cotação Avançada & Minuta Eletrônica
            <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '12px', background: '#e0e7ff', color: '#3730a3', fontWeight: '600' }}>
              MODO HOMOLOGAÇÃO NEXLOG (UserId: 21835)
            </span>
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
            Busca de contratos por CNPJ/CPF, cotações oficiais GOLLOG em tempo real e geração automatizada de Minuta/AWB.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleQuickTest} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FiZap /> Preencher Dados de Teste Rápido
        </button>
      </div>

      {/* CARD OBRIGATÓRIO DE OBJETIVOS, INSTRUÇÕES E INFORMAÇÕES (REQUISITO DE SISTEMA) */}
      <div style={{
        background: 'linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%)',
        border: '1px solid #bfdbfe',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <FiInfo size={20} color="#1d4ed8" />
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e40af', margin: 0 }}>
            Objetivos, Instruções e Informações sobre esta Funcionalidade
          </h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', fontSize: '13px', color: '#1e3a8a' }}>
          <div>
            <strong>🎯 Objetivos:</strong>
            <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
              <li>Permitir cotação baseada em CNPJ/CPF para aplicar tarifas negociadas de acordos comerciais.</li>
              <li>Exibir opções reais de frete GOLLOG (Urgente, Rápido, Chegol, etc.) com detalhamento de taxas.</li>
              <li>Gerar Minuta Eletrônica (CTe) com emissão de número de pedido/AWB oficial em tempo real.</li>
            </ul>
          </div>
          <div>
            <strong>📋 Instruções de Uso:</strong>
            <ol style={{ margin: '4px 0 0 16px', padding: 0 }}>
              <li>Insira o CNPJ/CPF do cliente (opcional) e os CEPs de origem e destino.</li>
              <li>Informe o valor declarado da carga e as dimensões dos volumes.</li>
              <li>Clique em <em>"Calcular Cotação"</em> para ver a lista de modalidades da GOLLOG.</li>
              <li>Escolha a melhor tarifa e confirme a emissão da Minuta Eletrônica com Remetente/Destinatário.</li>
            </ol>
          </div>
          <div>
            <strong>🧪 Forma Prática de Testar:</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              Clique no botão <strong>"Preencher Dados de Teste Rápido"</strong> no topo da página. Ele preencherá automaticamente os CEPs de São Paulo (01001-000) e Brasília (70040-010) com peso de 3kg para simular a resposta da API Nexlog.
            </p>
          </div>
        </div>
      </div>

      {/* STEP INDICATOR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', position: 'relative' }}>
        {[
          { num: 1, label: 'Cotação & Contrato' },
          { num: 2, label: 'Comparador de Serviços' },
          { num: 3, label: 'Dados da Minuta' },
          { num: 4, label: 'Pedido Gerado (AWB)' }
        ].map((s) => (
          <div key={s.num} style={{
            flex: 1,
            textAlign: 'center',
            padding: '12px 8px',
            borderRadius: '8px',
            background: step === s.num ? '#ff6600' : step > s.num ? '#10b981' : '#f3f4f6',
            color: step >= s.num ? '#ffffff' : '#6b7280',
            fontWeight: '600',
            fontSize: '14px',
            margin: '0 4px',
            transition: 'all 0.3s ease'
          }}>
            {step > s.num ? '✓ ' : `${s.num}. `}{s.label}
          </div>
        ))}
      </div>

      {/* ERROR ALERT */}
      {(quoteError || minuteError) && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fca5a5',
          color: '#991b1b',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <FiAlertCircle size={20} />
          <div>{quoteError || minuteError}</div>
        </div>
      )}

      {/* STEP 1: FORMULÁRIO DE COTAÇÃO */}
      {step === 1 && (
        <div className="card" style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiSearch color="#ff6600" /> Passo 1: Informações para Cotação com Contrato
          </h2>

          <form onSubmit={handleCalculateQuotes}>
            {/* Bloco 1: Cliente / CNPJ */}
            <div style={{ background: '#fafafa', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e5e7eb' }}>
              <label style={{ fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                <FiUser style={{ marginRight: '6px' }} /> CNPJ ou CPF do Cliente (Busca de Contrato Comercial):
              </label>
              <input
                type="text"
                className="input"
                placeholder="Ex: 47.944.243/0001-41 (deixe em branco para tarifário padrão público)"
                value={customerDocument}
                onChange={(e) => setCustomerDocument(e.target.value)}
                style={{ width: '100%', padding: '10px', fontSize: '14px' }}
              />
              <span style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                Se o cliente possuir acordo tarifário ativo na GOLLOG/Nexlog, os descontos negociados serão aplicados automaticamente.
              </span>
            </div>

            {/* Bloco 2: Origem & Destino */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                  <FiMapPin style={{ marginRight: '4px' }} /> CEP Origem: *
                </label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="01001-000"
                  value={originPostalCode}
                  onChange={(e) => setOriginPostalCode(e.target.value)}
                  style={{ width: '100%', padding: '10px' }}
                />
              </div>

              <div>
                <label style={{ fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                  <FiMapPin style={{ marginRight: '4px' }} /> CEP Destino: *
                </label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="70040-010"
                  value={destinationPostalCode}
                  onChange={(e) => setDestinationPostalCode(e.target.value)}
                  style={{ width: '100%', padding: '10px' }}
                />
              </div>

              <div>
                <label style={{ fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                  <FiShield style={{ marginRight: '4px' }} /> Valor Declarado (R$): *
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  required
                  placeholder="500.00"
                  value={declaredValue}
                  onChange={(e) => setDeclaredValue(e.target.value)}
                  style={{ width: '100%', padding: '10px' }}
                />
              </div>
            </div>

            {/* Opções de Coleta e Entrega */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '20px', background: '#f9fafb', padding: '12px 16px', borderRadius: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500' }}>
                <input
                  type="checkbox"
                  checked={toCollect}
                  onChange={(e) => setToCollect(e.target.checked)}
                />
                Incluir Serviço de Coleta na Origem
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500' }}>
                <input
                  type="checkbox"
                  checked={toDelivery}
                  onChange={(e) => setToDelivery(e.target.checked)}
                />
                Incluir Serviço de Entrega no Destino
              </label>
            </div>

            {/* Bloco 3: Volumes */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold' }}>
                  <FiPackage style={{ marginRight: '6px' }} /> Volumes da Carga
                </h3>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addVolume}>
                  <FiPlus /> Adicionar Volume
                </button>
              </div>

              {volumes.map((vol, index) => (
                <div key={index} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto',
                  gap: '12px',
                  alignItems: 'center',
                  background: '#f9fafb',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '8px'
                }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#6b7280', display: 'block' }}>Peso (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="input"
                      required
                      value={vol.weight}
                      onChange={(e) => updateVolume(index, 'weight', e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: '#6b7280', display: 'block' }}>Altura (cm)</label>
                    <input
                      type="number"
                      className="input"
                      required
                      value={vol.height}
                      onChange={(e) => updateVolume(index, 'height', e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: '#6b7280', display: 'block' }}>Largura (cm)</label>
                    <input
                      type="number"
                      className="input"
                      required
                      value={vol.width}
                      onChange={(e) => updateVolume(index, 'width', e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: '#6b7280', display: 'block' }}>Comprimento (cm)</label>
                    <input
                      type="number"
                      className="input"
                      required
                      value={vol.lenght}
                      onChange={(e) => updateVolume(index, 'lenght', e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: '#6b7280', display: 'block' }}>Qtd Peças</label>
                    <input
                      type="number"
                      className="input"
                      required
                      value={vol.pieces}
                      onChange={(e) => updateVolume(index, 'pieces', e.target.value)}
                    />
                  </div>

                  {volumes.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon"
                      onClick={() => removeVolume(index)}
                      style={{ color: '#ef4444', marginTop: '16px' }}
                    >
                      <FiTrash2 />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={loadingQuotes}
              style={{
                width: '100%',
                padding: '14px',
                background: '#ff6600',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '16px',
                cursor: loadingQuotes ? 'not-allowed' : 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              {loadingQuotes ? (
                <>
                  <FiRefreshCw className="spin" /> Consultando API Nexlog...
                </>
              ) : (
                <>
                  Calcular Cotação Oficial Nexlog <FiArrowRight />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* STEP 2: COMPARADOR DE SERVIÇOS & ACORDOS */}
      {step === 2 && quotationData && (
        <div>
          {quotationData.notice && (
            <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', color: '#873800' }}>
              <FiInfo style={{ marginRight: '6px' }} /> {quotationData.notice}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>
              Passo 2: Opções de Frete Disponíveis ({quotationData.quotesCount})
            </h2>
            <button className="btn btn-secondary btn-sm" onClick={() => setStep(1)}>
              ← Alterar Parâmetros da Cotação
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {quotationData.quotes.map((q) => (
              <div
                key={q.idQuotation || q.serviceCode}
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: q.isAgreed ? '2px solid #10b981' : '1px solid #e5e7eb',
                  padding: '20px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                {q.isAgreed && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    right: '16px',
                    background: '#10b981',
                    color: '#fff',
                    padding: '2px 10px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}>
                    Acordo Comercial Aplicado
                  </div>
                )}

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                        {q.serviceDescription}
                      </h3>
                      <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>
                        Código: {q.serviceCode}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#ff6600' }}>
                        R$ {q.totalValue.toFixed(2)}
                      </span>
                      <span style={{ fontSize: '11px', color: '#6b7280', display: 'block' }}>Total Estimado</span>
                    </div>
                  </div>

                  <div style={{ background: '#f9fafb', padding: '10px 12px', borderRadius: '6px', fontSize: '13px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>Frete Peso ({q.chargeableWeight} kg):</span>
                      <strong>R$ {q.freightValue.toFixed(2)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>Taxas Adicionais:</span>
                      <strong>R$ {q.chargesValue.toFixed(2)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Prazo Estimado:</span>
                      <strong>{q.timeToDelivery} dia(s) útil(eis)</strong>
                    </div>
                  </div>

                  {q.charges && q.charges.length > 0 && (
                    <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '16px' }}>
                      <strong>Detalhamento das Taxas:</strong>
                      <ul style={{ margin: '2px 0 0 14px', padding: 0 }}>
                        {q.charges.map((c, idx) => (
                          <li key={idx}>{c.description}: R$ {c.value?.toFixed(2)}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div style={{ fontSize: '12px', color: '#4b5563', marginBottom: '16px' }}>
                    <div>📍 <strong>Origem:</strong> {q.originPoint.code} - {q.originPoint.description}</div>
                    <div>📍 <strong>Destino:</strong> {q.destinationPoint.code} - {q.destinationPoint.description}</div>
                  </div>
                </div>

                <button
                  onClick={() => handleSelectQuote(q)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#ff6600',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  Selecionar e Gerar Minuta <FiArrowRight />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3: PREENCHIMENTO DA MINUTA */}
      {step === 3 && selectedQuote && (
        <div className="card" style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiFileText color="#ff6600" /> Passo 3: Dados da Minuta Eletrônica & Reserva
            </h2>
            <button className="btn btn-secondary btn-sm" onClick={() => setStep(2)}>
              ← Escolher Outra Tarifa
            </button>
          </div>

          {/* Resumo da Opção Escolhida */}
          <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', padding: '14px 18px', borderRadius: '8px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '16px', color: '#9a3412' }}>{selectedQuote.serviceDescription}</strong>
                <span style={{ fontSize: '13px', color: '#c2410c', marginLeft: '10px' }}>
                  ({selectedQuote.originPoint.code} → {selectedQuote.destinationPoint.code})
                </span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#c2410c' }}>
                Total: R$ {selectedQuote.totalValue.toFixed(2)}
              </div>
            </div>
          </div>

          <form onSubmit={handleGenerateMinute}>
            {/* Método de Pagamento */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontWeight: '600', display: 'block', marginBottom: '6px' }}>Condição de Pagamento:</label>
              <select
                className="input"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ width: '100%', padding: '10px' }}
              >
                <option value="1">1 - Pago na Origem (Faturamento / Cartão / PIX)</option>
                <option value="2">2 - FRAP (Pago no Destino na Retirada)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              {/* DADOS DO REMETENTE */}
              <div style={{ background: '#fafafa', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '12px', color: '#111827' }}>
                  📤 Dados do Remetente
                </h3>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600' }}>Razão Social / Nome:</label>
                  <input
                    type="text"
                    className="input"
                    required
                    value={sender.name}
                    onChange={(e) => setSender({ ...sender, name: e.target.value })}
                  />
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600' }}>CNPJ ou CPF:</label>
                  <input
                    type="text"
                    className="input"
                    required
                    value={sender.documentNumber}
                    onChange={(e) => setSender({ ...sender, documentNumber: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600' }}>E-mail:</label>
                    <input
                      type="email"
                      className="input"
                      value={sender.email}
                      onChange={(e) => setSender({ ...sender, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600' }}>Telefone:</label>
                    <input
                      type="text"
                      className="input"
                      value={sender.phone}
                      onChange={(e) => setSender({ ...sender, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* DADOS DO DESTINATÁRIO */}
              <div style={{ background: '#fafafa', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '12px', color: '#111827' }}>
                  📥 Dados do Destinatário
                </h3>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600' }}>Razão Social / Nome:</label>
                  <input
                    type="text"
                    className="input"
                    required
                    value={receiver.name}
                    onChange={(e) => setReceiver({ ...receiver, name: e.target.value })}
                  />
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600' }}>CNPJ ou CPF:</label>
                  <input
                    type="text"
                    className="input"
                    required
                    value={receiver.documentNumber}
                    onChange={(e) => setReceiver({ ...receiver, documentNumber: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600' }}>E-mail:</label>
                    <input
                      type="email"
                      className="input"
                      value={receiver.email}
                      onChange={(e) => setReceiver({ ...receiver, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600' }}>Telefone:</label>
                    <input
                      type="text"
                      className="input"
                      value={receiver.phone}
                      onChange={(e) => setReceiver({ ...receiver, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loadingMinute}
              style={{
                width: '100%',
                padding: '14px',
                background: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '16px',
                cursor: loadingMinute ? 'not-allowed' : 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              {loadingMinute ? (
                <>
                  <FiRefreshCw className="spin" /> Gerando Minuta Eletrônica na API Nexlog...
                </>
              ) : (
                <>
                  <FiCheckCircle /> Confirmar & Emitir Minuta Oficial (Gerar Pedido/AWB)
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* STEP 4: RESULTADO DO PEDIDO / MINUTA GERADA */}
      {step === 4 && minuteResult && (
        <div className="card" style={{ background: '#fff', borderRadius: '12px', padding: '32px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            <FiCheckCircle size={36} />
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
            Minuta Eletrônica Emitida com Sucesso!
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            O pedido foi registrado na API Nexlog GOLLOG e o número da Minuta / AWB foi gerado.
          </p>

          <div style={{ background: '#f3f4f6', padding: '20px', borderRadius: '12px', maxWidth: '480px', margin: '0 auto 24px auto' }}>
            <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>
              Número da Minuta / Pedido AWB
            </span>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ff6600', letterSpacing: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              {minuteResult.orderNumber}
              <button
                className="btn btn-ghost btn-sm"
                title="Copiar"
                onClick={() => copyToClipboard(minuteResult.orderNumber)}
              >
                <FiCopy size={18} />
              </button>
            </div>
            {copied && <span style={{ fontSize: '11px', color: '#10b981' }}>Copiado para a área de transferência!</span>}

            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', fontSize: '13px', textAlign: 'left' }}>
              <div><strong>Status:</strong> {minuteResult.status}</div>
              <div><strong>Data de Emissão:</strong> {new Date(minuteResult.issueDate).toLocaleString('pt-BR')}</div>
              <div><strong>Serviço:</strong> {selectedQuote.serviceDescription}</div>
              <div><strong>Valor Total:</strong> R$ {selectedQuote.totalValue.toFixed(2)}</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setStep(1);
                setMinuteResult(null);
                setSelectedQuote(null);
              }}
            >
              Nova Cotação
            </button>

            <a
              href={`/admin/rastreamentos?awb=${minuteResult.orderNumber}`}
              className="btn btn-primary"
              style={{ background: '#ff6600', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <FiTruck /> Acompanhar Rastreamento
            </a>
          </div>
        </div>
      )}

    </div>
  );
}
