import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../lib/supabase';
import { fetchCep, formatCep } from '../../lib/cep';
import {
  FiDollarSign, FiSearch, FiPackage, FiTruck, FiCheckCircle, FiAlertCircle,
  FiArrowRight, FiCopy, FiInfo, FiRefreshCw, FiPlus, FiTrash2, FiFileText,
  FiUser, FiMapPin, FiShield, FiZap, FiChevronDown, FiChevronUp, FiArrowDown,
  FiDownload, FiPrinter, FiX
} from 'react-icons/fi';

// Todas as bases operacionais GOLLOG
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

function BaseAutocomplete({ value, onChange, placeholder = "🔍 Digite cidade ou sigla (ex: GRU, Campinas...)" }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const selected = BASES.find(b => b.sigla === value);

  const filtered = BASES.filter(b => {
    const q = search.toLowerCase();
    return !q || b.sigla.toLowerCase().includes(q) || b.cidade.toLowerCase().includes(q);
  }).slice(0, 50);

  return (
    <div style={{ position: 'relative' }}>
      <input
        className="public-input"
        placeholder={placeholder}
        value={open ? search : (selected ? `${selected.sigla} - ${selected.cidade}` : (value || ''))}
        onFocus={() => { setOpen(true); setSearch(''); }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onChange={e => setSearch(e.target.value)}
        autoComplete="off"
        style={{
          width: '100%',
          fontSize: '15px',
          padding: '12px 14px',
          borderRadius: '10px',
          border: '1.5px solid #CBD5E1',
          background: '#FFFFFF'
        }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 100,
          background: '#FFFFFF',
          border: '1.5px solid #CBD5E1',
          borderRadius: '10px',
          maxHeight: '230px',
          overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          marginTop: '4px'
        }}>
          {filtered.map(b => (
            <div
              key={b.sigla}
              onMouseDown={() => {
                onChange(b);
                setOpen(false);
              }}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                fontSize: '13px',
                borderBottom: '1px solid #F1F5F9',
                background: b.sigla === value ? '#FFF7ED' : '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span style={{ fontWeight: '800', color: '#F37021', minWidth: '40px' }}>{b.sigla}</span>
              <span style={{ color: '#1E293B', fontWeight: '500' }}>{b.cidade}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Form Step 1: Cotação
  const [customerDocument, setCustomerDocument] = useState('');
  const [originPointCode, setOriginPointCode] = useState('CGH');
  const [originPostalCode, setOriginPostalCode] = useState('01001-000');
  const [deliveryType, setDeliveryType] = useState('domicilio'); // 'domicilio' | 'aeroporto'
  const [destinationPointCode, setDestinationPointCode] = useState('BSB');
  const [destinationPostalCode, setDestinationPostalCode] = useState('70040-010');
  const [originCity, setOriginCity] = useState('São Paulo (Congonhas)');
  const [destinationCity, setDestinationCity] = useState('Brasília / DF');
  const [loadingOriginCep, setLoadingOriginCep] = useState(false);
  const [loadingDestCep, setLoadingDestCep] = useState(false);

  const [insuranceType, setInsuranceType] = useState('GOL'); // 'GOL' | 'Proprio' | 'Sem Seguro'
  const [cargoDescription, setCargoDescription] = useState('Mercadorias diversas');
  const [declaredValue, setDeclaredValue] = useState('500.00');
  const [toCollect, setToCollect] = useState(false);
  const [toDelivery, setToDelivery] = useState(true);

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
  const [paymentForm, setPaymentForm] = useState('Pix'); // Dinheiro, Pix, Cartão, Conta GOL
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

  const isCnpjTomador = (customerDocument || '').replace(/\D/g, '').length === 14;

  // Ajusta forma de pagamento caso Conta GOL esteja selecionado mas o documento nao seja CNPJ
  useEffect(() => {
    if (!isCnpjTomador && paymentForm === 'Conta GOL') {
      setPaymentForm('Pix');
    }
  }, [customerDocument, isCnpjTomador, paymentForm]);

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

  const urlDoc = searchParams.get('doc') || '';

  // Auto-fill from URL params or Supabase client
  useEffect(() => {
    if (urlDoc) {
      // 1. Abre imediatamente o Passo 4 com a Minuta
      setStep(4);
      setMinuteResult({
        orderNumber: urlDoc,
        status: 'EMITIDA / RESERVADA',
        whatsappNotified: true
      });
      setSelectedQuote({
        serviceDescription: 'GOLLOG RÁPIDO',
        serviceCode: 'RAPIDO',
        originPoint: { code: 'SPA', description: 'São Paulo' },
        destinationPoint: { code: 'BSB', description: 'Brasília' },
        timeToDelivery: 1,
        totalValue: 245.50,
        freightValue: 200.00,
        chargesValue: 45.50,
        chargeableWeight: 2.0
      });

      // 2. Busca os dados exatos salvos no Supabase
      supabase.from('cotacoes')
        .select('*')
        .eq('metadata->>orderNumber', urlDoc)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.metadata) {
            const m = data.metadata;
            if (m.sender) setSender(m.sender);
            if (m.receiver) setReceiver(m.receiver);
            if (m.volumes) setVolumes(m.volumes);
            if (m.originPostalCode) {
              setOriginPostalCode(m.originPostalCode);
              setOriginCity(m.sender?.city ? `${m.sender.city} / ${m.sender.state || 'SP'}` : 'São Paulo / SP');
            }
            if (m.destinationPostalCode) {
              setDestinationPostalCode(m.destinationPostalCode);
              setDestinationCity(m.receiver?.city ? `${m.receiver.city} / ${m.receiver.state || 'DF'}` : 'Brasília / DF');
            }
            if (data.valor_cotado) {
              setSelectedQuote(prev => ({
                ...prev,
                serviceDescription: data.tipo_servico || prev.serviceDescription,
                totalValue: parseFloat(data.valor_cotado) || prev.totalValue
              }));
            }
          }
        });
    }

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
  }, [urlPhone, urlDoc]);

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
    setToCollect(false);
    setOriginPointCode('CGH');
    setOriginCity('São Paulo (Congonhas)');
    setOriginPostalCode('01001-000');
    setDeliveryType('domicilio');
    setDestinationPointCode('BSB');
    setDestinationPostalCode('70040-010');
    setDestinationCity('Brasília / DF');
    setInsuranceType('GOL');
    setCargoDescription('Eletrônicos e Acessórios');
    setDeclaredValue('750.00');
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
          originPointCode: !toCollect && originPointCode ? originPointCode : undefined,
          originPostalCode: toCollect || !originPointCode ? originPostalCode.replace(/\D/g, '') : undefined,
          destinationPointCode: deliveryType === 'aeroporto' && destinationPointCode ? destinationPointCode : undefined,
          destinationPostalCode: deliveryType === 'domicilio' || !destinationPointCode ? destinationPostalCode.replace(/\D/g, '') : undefined,
          declaredValue: insuranceType === 'Sem Seguro' ? 0 : parseFloat(declaredValue || 0),
          toCollect,
          toDelivery: deliveryType === 'domicilio',
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
          originPointCode: selectedQuote.originPoint?.code || selectedQuote.originPointCode || 'SPA',
          originPostalCode: originPostalCode.replace(/\D/g, ''),
          destinationPointCode: selectedQuote.destinationPoint?.code || selectedQuote.destinationPointCode || 'BSB',
          destinationPostalCode: destinationPostalCode.replace(/\D/g, ''),
          declaredValue: selectedQuote.declaredValue || parseFloat(declaredValue || 0),
          toCollect,
          toDelivery,
          volumes,
          sender,
          receiver,
          paymentMethod,
          paymentForm
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

  // Download / Print PDF Handler
  const handleDownloadPdf = async () => {
    if (!minuteResult?.orderNumber) return;
    setDownloadingPdf(true);

    try {
      // Tenta baixar DACTE direto da API Nexlog
      const res = await fetch(`/api/nexlog?action=dacte&documentNumber=${minuteResult.orderNumber}`);
      if (res.ok && res.headers.get('content-type')?.includes('pdf')) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Minuta_GOLLOG_${minuteResult.orderNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setDownloadingPdf(false);
        return;
      }
    } catch (e) {
      console.warn('DACTE API download fallback to printable voucher', e);
    }

    setDownloadingPdf(false);
    setShowPdfModal(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="public-page" style={{ background: '#F8FAFC', minHeight: '100vh', color: '#0F172A', paddingBottom: '40px' }}>
      
      {/* HEADER ELEGANTE MOBILE */}
      <header className="no-print" style={{
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
            <div style={{ fontSize: '11px', color: '#F37021', fontWeight: '600' }}>Cotação Oficial & Minuta</div>
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
        <div className="no-print" style={{
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
              <FiInfo size={16} /> Como funciona a cotação oficial e minuta?
            </div>
            <span style={{ color: '#1E40AF', fontSize: '12px', fontWeight: '600' }}>
              {showInfo ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
            </span>
          </div>

          {showInfo && (
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #DBEAFE', fontSize: '12px', color: '#1E3A8A', lineHeight: '1.5' }}>
              <p style={{ margin: '0 0 6px 0' }}>
                🎯 <strong>Objetivo:</strong> Fornecer preços e prazos oficiais da malha aérea GOLLOG com aplicação de tarifas negociadas de contrato por CNPJ/CPF e emissão de Minuta Eletrônica de Carga (CTe/AWB) com download em PDF.
              </p>
              <p style={{ margin: '0 0 6px 0' }}>
                📋 <strong>Instruções:</strong> Digite seu documento (se tiver contrato), informe CEPs e peso. Escolha a melhor opção de frete, preencha os dados e gere o PDF da sua Minuta na hora.
              </p>
              <p style={{ margin: 0 }}>
                🧪 <strong>Teste Fácil:</strong> Clique no botão <em>"Teste Rápido"</em> no topo para carregar uma simulação completa de envio entre São Paulo e Brasília.
              </p>
            </div>
          )}
        </div>

        {/* STEPPER PROGRESS BAR */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
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
          <div className="no-print" style={{
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
            
            {/* CARD 1: CLIENTE / TOMADOR */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <FiUser color="#F37021" /> CNPJ ou CPF (Tomador):
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

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '6px' }}>
                  Quem paga o frete?
                </label>
                <select
                  className="public-input"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ width: '100%', fontSize: '14px', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #CBD5E1', background: '#FFFFFF' }}
                >
                  <option value="1">1 - Pago pelo Remetente (Na Origem)</option>
                  <option value="2">2 - FRAP (Pago pelo Destinatário na Entrega)</option>
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '6px' }}>
                  Forma de Pagamento:
                </label>
                <select
                  className="public-input"
                  value={paymentForm}
                  onChange={(e) => setPaymentForm(e.target.value)}
                  style={{ width: '100%', fontSize: '14px', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #CBD5E1', background: '#FFFFFF' }}
                >
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Pix">Pix</option>
                  <option value="Cartão">Cartão</option>
                  {isCnpjTomador && <option value="Conta GOL">Conta GOL (Faturado)</option>}
                </select>
              </div>

              {/* SELETOR DE ORIGEM */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '8px' }}>
                  Origem *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setToCollect(true)}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '12px',
                      border: toCollect ? '2px solid #F37021' : '1.5px solid #E2E8F0',
                      background: toCollect ? '#FFF7ED' : '#FFFFFF',
                      color: toCollect ? '#C2410C' : '#64748B',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                      boxShadow: toCollect ? '0 2px 6px rgba(243, 112, 33, 0.15)' : 'none'
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      🚚 Com Coleta
                    </div>
                    <div style={{ fontSize: '11px', marginTop: '2px', opacity: 0.9 }}>
                      buscamos a mercadoria
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setToCollect(false);
                      if (!originPointCode) {
                        setOriginPointCode('CGH');
                        setOriginCity('São Paulo (Congonhas)');
                      }
                    }}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '12px',
                      border: !toCollect ? '2px solid #F37021' : '1.5px solid #E2E8F0',
                      background: !toCollect ? '#FFF7ED' : '#FFFFFF',
                      color: !toCollect ? '#C2410C' : '#64748B',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                      boxShadow: !toCollect ? '0 2px 6px rgba(243, 112, 33, 0.15)' : 'none'
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      🏢 Sem Coleta
                    </div>
                    <div style={{ fontSize: '11px', marginTop: '2px', opacity: 0.9 }}>
                      trago na base
                    </div>
                  </button>
                </div>
              </div>

              {/* ORIGEM: CEP (COM COLETA) OU BASE GOLLOG (SEM COLETA) */}
              {toCollect ? (
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    📦 CEP de Origem (endereço onde vamos coletar): *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      required
                      className="public-input"
                      placeholder="00000-000"
                      value={originPostalCode}
                      onChange={(e) => handleOriginCepChange(e.target.value)}
                      style={{ width: '100%', fontSize: '15px', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #CBD5E1', background: '#FFFFFF' }}
                    />
                    {loadingOriginCep && (
                      <span style={{ position: 'absolute', right: '12px', top: '14px', fontSize: '11px', color: '#F37021' }}>
                        Buscando...
                      </span>
                    )}
                  </div>

                  {originCity && (
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input
                        type="text"
                        className="public-input"
                        placeholder="Logradouro (Rua / Av)"
                        value={sender.street || ''}
                        onChange={(e) => setSender(prev => ({ ...prev, street: e.target.value }))}
                        style={{ width: '100%', fontSize: '14px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F8FAFC' }}
                      />

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <input
                          type="text"
                          required
                          className="public-input"
                          placeholder="Número *"
                          value={sender.number || ''}
                          onChange={(e) => setSender(prev => ({ ...prev, number: e.target.value }))}
                          style={{ width: '100%', fontSize: '14px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF' }}
                        />
                        <input
                          type="text"
                          className="public-input"
                          placeholder="Complemento (opcional)"
                          value={sender.complement || ''}
                          onChange={(e) => setSender(prev => ({ ...prev, complement: e.target.value }))}
                          style={{ width: '100%', fontSize: '14px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <input
                          type="text"
                          className="public-input"
                          placeholder="Bairro"
                          value={sender.neighborhood || ''}
                          onChange={(e) => setSender(prev => ({ ...prev, neighborhood: e.target.value }))}
                          style={{ width: '100%', fontSize: '14px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F8FAFC' }}
                        />
                        <input
                          type="text"
                          readOnly
                          className="public-input"
                          placeholder="Cidade/UF"
                          value={originCity}
                          style={{ width: '100%', fontSize: '14px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F1F5F9', color: '#059669', fontWeight: '600' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    🏢 Base GOLLOG de Origem (onde você vai levar a carga): *
                  </label>
                  <BaseAutocomplete
                    value={originPointCode}
                    onChange={(b) => {
                      setOriginPointCode(b.sigla);
                      setOriginCity(b.cidade);
                    }}
                  />
                  {originCity && (
                    <div style={{ fontSize: '11px', color: '#059669', fontWeight: '600', marginTop: '4px' }}>
                      📍 Base Selecionada: <strong>{originPointCode}</strong> — {originCity}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* CARD 2: DESTINO DA CARGA */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#1E293B', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiMapPin color="#F37021" /> Local de Entrega *
              </div>

              {/* SELETOR DE LOCAL DE ENTREGA */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryType('domicilio');
                      setToDelivery(true);
                    }}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '12px',
                      border: deliveryType === 'domicilio' ? '2px solid #F37021' : '1.5px solid #E2E8F0',
                      background: deliveryType === 'domicilio' ? '#FFF7ED' : '#FFFFFF',
                      color: deliveryType === 'domicilio' ? '#C2410C' : '#64748B',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                      boxShadow: deliveryType === 'domicilio' ? '0 2px 6px rgba(243, 112, 33, 0.15)' : 'none'
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      🏠 Entrega a Domicílio
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryType('aeroporto');
                      setToDelivery(false);
                      if (!destinationPointCode) {
                        setDestinationPointCode('BSB');
                        setDestinationCity('Brasília');
                      }
                    }}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '12px',
                      border: deliveryType === 'aeroporto' ? '2px solid #F37021' : '1.5px solid #E2E8F0',
                      background: deliveryType === 'aeroporto' ? '#FFF7ED' : '#FFFFFF',
                      color: deliveryType === 'aeroporto' ? '#C2410C' : '#64748B',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                      boxShadow: deliveryType === 'aeroporto' ? '0 2px 6px rgba(243, 112, 33, 0.15)' : 'none'
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      ✈️ Retirada na Base
                    </div>
                  </button>
                </div>
              </div>

              {/* DESTINO: CEP (ENTREGA A DOMICILIO) OU BASE GOLLOG (RETIRADA NA BASE) */}
              {deliveryType === 'domicilio' ? (
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    📦 CEP de Destino (endereço de entrega): *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      required
                      className="public-input"
                      placeholder="00000-000"
                      value={destinationPostalCode}
                      onChange={(e) => handleDestCepChange(e.target.value)}
                      style={{ width: '100%', fontSize: '15px', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #CBD5E1', background: '#FFFFFF' }}
                    />
                    {loadingDestCep && (
                      <span style={{ position: 'absolute', right: '12px', top: '14px', fontSize: '11px', color: '#F37021' }}>
                        Buscando...
                      </span>
                    )}
                  </div>

                  {destinationCity && (
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input
                        type="text"
                        className="public-input"
                        placeholder="Logradouro (Rua / Av)"
                        value={receiver.street || ''}
                        onChange={(e) => setReceiver(prev => ({ ...prev, street: e.target.value }))}
                        style={{ width: '100%', fontSize: '14px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F8FAFC' }}
                      />

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <input
                          type="text"
                          required
                          className="public-input"
                          placeholder="Número *"
                          value={receiver.number || ''}
                          onChange={(e) => setReceiver(prev => ({ ...prev, number: e.target.value }))}
                          style={{ width: '100%', fontSize: '14px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF' }}
                        />
                        <input
                          type="text"
                          className="public-input"
                          placeholder="Complemento (opcional)"
                          value={receiver.complement || ''}
                          onChange={(e) => setReceiver(prev => ({ ...prev, complement: e.target.value }))}
                          style={{ width: '100%', fontSize: '14px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <input
                          type="text"
                          className="public-input"
                          placeholder="Bairro"
                          value={receiver.neighborhood || ''}
                          onChange={(e) => setReceiver(prev => ({ ...prev, neighborhood: e.target.value }))}
                          style={{ width: '100%', fontSize: '14px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F8FAFC' }}
                        />
                        <input
                          type="text"
                          readOnly
                          className="public-input"
                          placeholder="Cidade/UF"
                          value={destinationCity}
                          style={{ width: '100%', fontSize: '14px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F1F5F9', color: '#059669', fontWeight: '600' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    🏢 Base GOLLOG de Destino (para retirada): *
                  </label>
                  <BaseAutocomplete
                    value={destinationPointCode}
                    placeholder="🔍 Digite cidade ou sigla de destino (ex: BSB, SSA...)"
                    onChange={(b) => {
                      setDestinationPointCode(b.sigla);
                      setDestinationCity(b.cidade);
                    }}
                  />
                  {destinationCity && (
                    <div style={{ fontSize: '11px', color: '#059669', fontWeight: '600', marginTop: '4px' }}>
                      📍 Base de Retirada: <strong>{destinationPointCode}</strong> — {destinationCity}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* CARD 3: SEGURO & DADOS DA CARGA */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}>
              {/* SEGURO */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '8px' }}>
                  Seguro *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {[
                    { id: 'GOL', label: '🛡️ GOL' },
                    { id: 'Proprio', label: '🔒 Próprio' },
                    { id: 'Sem Seguro', label: '❌ Sem Seguro' }
                  ].map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setInsuranceType(s.id)}
                      style={{
                        padding: '10px 6px',
                        borderRadius: '10px',
                        border: insuranceType === s.id ? '2px solid #F37021' : '1.5px solid #E2E8F0',
                        background: insuranceType === s.id ? '#FFF7ED' : '#FFFFFF',
                        color: insuranceType === s.id ? '#C2410C' : '#64748B',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '700',
                        textAlign: 'center',
                        transition: 'all 0.2s ease',
                        boxShadow: insuranceType === s.id ? '0 2px 6px rgba(243, 112, 33, 0.15)' : 'none'
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* DESCRIÇÃO DA CARGA & VALOR DA NOTA */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '6px' }}>
                    Descrição da Carga *
                  </label>
                  <input
                    type="text"
                    required
                    className="public-input"
                    placeholder="Ex: Eletrônicos, roupas..."
                    value={cargoDescription}
                    onChange={(e) => setCargoDescription(e.target.value)}
                    style={{ width: '100%', fontSize: '14px', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #CBD5E1', background: '#FFFFFF' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '6px' }}>
                    Valor da Nota (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="public-input"
                    placeholder="0,00"
                    value={declaredValue}
                    onChange={(e) => setDeclaredValue(e.target.value)}
                    style={{ width: '100%', fontSize: '14px', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #CBD5E1', background: '#FFFFFF' }}
                  />
                </div>
              </div>
            </div>

            {/* CARD 4: VOLUMES E MEDIDAS */}
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
                          R$ {q.totalValue?.toFixed(2) ?? '0.00'}
                        </div>
                        <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '600' }}>TOTAL COM TAXAS</div>
                      </div>
                    </div>

                    {/* Resumo de frete peso e taxas */}
                    <div style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', color: '#475569', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span>Frete Peso ({q.chargeableWeight || q.totalChargeableWeight || 1} kg):</span>
                        <span>R$ {q.freightValue?.toFixed(2) ?? '0.00'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Taxas Operacionais:</span>
                        <span>R$ {q.chargesValue?.toFixed(2) ?? '0.00'}</span>
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
                                <strong>R$ {c.value?.toFixed(2) ?? '0.00'}</strong>
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

            {/* Condição e Forma de Pagamento */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '18px', border: '1px solid #E2E8F0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
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

              <div>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '6px' }}>
                  Forma de Pagamento:
                </label>
                <select
                  className="public-input"
                  value={paymentForm}
                  onChange={(e) => setPaymentForm(e.target.value)}
                  style={{ width: '100%', fontSize: '14px', padding: '10px 12px', borderRadius: '10px' }}
                >
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Pix">Pix</option>
                  <option value="Cartão">Cartão</option>
                  {isCnpjTomador && <option value="Conta GOL">Conta GOL (Faturado)</option>}
                </select>
              </div>
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
            PASSO 4: RESULTADO & NÚMERO DO PEDIDO AWB + PDF DOWNLOAD
        ══════════════════════════════════════════════════════ */}
        {step === 4 && minuteResult && (
          <div style={{ background: '#FFFFFF', borderRadius: '20px', padding: '28px 20px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}>
            <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: '#D1FAE5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', fontSize: '32px' }}>
              <FiCheckCircle />
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0F172A', marginBottom: '6px' }}>
              Minuta Eletrônica Gerada com Sucesso!
            </h2>
            <p style={{ color: '#64748B', fontSize: '13px', margin: '0 0 20px 0' }}>
              Sua encomenda foi registrada na base oficial GOLLOG.
            </p>

            {/* Box AWB */}
            <div style={{ background: '#F8FAFC', padding: '18px', borderRadius: '14px', border: '1.5px dashed #CBD5E1', marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                Número da Minuta / AWB Oficial
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

            {minuteResult.whatsappNotified && (
              <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '600', marginBottom: '16px' }}>
                📲 Uma cópia da minuta e o link do PDF foram enviados para o seu WhatsApp!
              </div>
            )}

            {/* BOTÕES DE AÇÃO: BAIXAR PDF / IMPRIMIR */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                style={{
                  padding: '14px',
                  background: '#0284C7',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
                }}
              >
                {downloadingPdf ? <FiRefreshCw className="spin" /> : <FiDownload />}
                Baixar Minuta em PDF
              </button>

              <button
                type="button"
                onClick={() => setShowPdfModal(true)}
                style={{
                  padding: '14px',
                  background: '#334155',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <FiPrinter /> Visualizar / Imprimir
              </button>
            </div>

            {/* Resumo da Minuta */}
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

            {/* Rastreamento & Nova Cotação */}
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

      {/* ══════════════════════════════════════════════════════
          MODAL DE VISUALIZAÇÃO & IMPRESSÃO DA MINUTA ELETRÔNICA (PDF A4)
      ══════════════════════════════════════════════════════ */}
      {showPdfModal && minuteResult && selectedQuote && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          overflowY: 'auto'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            
            {/* Header da Janela Modal */}
            <div className="no-print" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid #E2E8F0',
              position: 'sticky',
              top: 0,
              background: '#FFFFFF',
              zIndex: 10
            }}>
              <div style={{ fontWeight: '800', fontSize: '16px', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiFileText color="#F37021" /> Minuta Eletrônica de Transporte
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handlePrint}
                  style={{
                    background: '#F37021',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontWeight: '700',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <FiPrinter /> Imprimir / Salvar PDF
                </button>

                <button
                  type="button"
                  onClick={() => setShowPdfModal(false)}
                  style={{
                    background: '#F1F5F9',
                    border: 'none',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748B'
                  }}
                >
                  <FiX size={18} />
                </button>
              </div>
            </div>

            {/* FOLHA OFICIAL DA MINUTA ELETRÔNICA (ESTILO DACTE A4) */}
            <div id="minuta-impressao" style={{ padding: '24px', fontFamily: 'Arial, sans-serif', color: '#111827', fontSize: '12px' }}>
              
              {/* TOPO DA MINUTA */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #F37021', paddingBottom: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src="/logo.png" alt="GOLLOG" style={{ height: '36px' }} />
                  <div>
                    <h1 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0, color: '#F37021', textTransform: 'uppercase' }}>
                      GOLLOG Linhas Aéreas S.A.
                    </h1>
                    <div style={{ fontSize: '11px', color: '#4B5563' }}>
                      Minuta Eletrônica de Carga / Despacho Aéreo
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', color: '#6B7280', textTransform: 'uppercase' }}>Nº DO CONHECIMENTO / AWB</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', letterSpacing: '1px' }}>
                    {minuteResult.orderNumber}
                  </div>
                  <div style={{ fontSize: '10px', color: '#059669', fontWeight: 'bold' }}>
                    STATUS: EMITIDA / CONFIRMADA
                  </div>
                </div>
              </div>

              {/* QR CODE & DADOS DO DESPACHO */}
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '16px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <div style={{ background: '#FFFFFF', padding: '6px', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                  <QRCodeSVG value={`https://www.golcargo.com.br/rastreamento?doc=${minuteResult.orderNumber}`} size={85} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                  <div><strong>Serviço Contratado:</strong> {selectedQuote.serviceDescription} ({selectedQuote.serviceCode})</div>
                  <div><strong>Data de Emissão:</strong> {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                  <div><strong>Origem Operacional:</strong> {selectedQuote.originPoint.code} - {selectedQuote.originPoint.description}</div>
                  <div><strong>Destino Operacional:</strong> {selectedQuote.destinationPoint.code} - {selectedQuote.destinationPoint.description}</div>
                  <div><strong>Prazo Previsto de Entrega:</strong> {selectedQuote.timeToDelivery} dia(s) útil(eis)</div>
                  <div><strong>Condição de Pagamento:</strong> {paymentMethod === '1' ? 'Pago na Origem' : 'FRAP (Pago no Destino)'} · {paymentForm}</div>
                </div>
              </div>

              {/* REMETENTE E DESTINATÁRIO */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                {/* Remetente */}
                <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#F37021', borderBottom: '1px solid #F3F4F6', paddingBottom: '4px', marginBottom: '6px' }}>
                    EXPEDIDOR / REMETENTE
                  </div>
                  <div><strong>Razão Social:</strong> {sender.name}</div>
                  <div><strong>CNPJ/CPF:</strong> {sender.documentNumber}</div>
                  <div><strong>Telefone:</strong> {sender.phone}</div>
                  <div><strong>E-mail:</strong> {sender.email || 'N/A'}</div>
                  <div><strong>Endereço:</strong> {sender.street}, {sender.number} - {sender.neighborhood}, {sender.city}/{sender.state} (CEP: {originPostalCode})</div>
                </div>

                {/* Destinatário */}
                <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#F37021', borderBottom: '1px solid #F3F4F6', paddingBottom: '4px', marginBottom: '6px' }}>
                    DESTINATÁRIO / RECEBEDOR
                  </div>
                  <div><strong>Razão Social:</strong> {receiver.name}</div>
                  <div><strong>CNPJ/CPF:</strong> {receiver.documentNumber}</div>
                  <div><strong>Telefone:</strong> {receiver.phone}</div>
                  <div><strong>E-mail:</strong> {receiver.email || 'N/A'}</div>
                  <div><strong>Endereço:</strong> {receiver.street}, {receiver.number} - {receiver.neighborhood}, {receiver.city}/{receiver.state} (CEP: {destinationPostalCode})</div>
                </div>
              </div>

              {/* TABELA DE VOLUMES */}
              <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ background: '#F3F4F6', padding: '6px 10px', fontWeight: 'bold', fontSize: '11px' }}>
                  CARACTERÍSTICAS DA CARGA E VOLUMES
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E5E7EB', background: '#FAFAFA' }}>
                      <th style={{ padding: '6px 10px' }}>Vol</th>
                      <th style={{ padding: '6px 10px' }}>Peças</th>
                      <th style={{ padding: '6px 10px' }}>Dimensões (CxLxA cm)</th>
                      <th style={{ padding: '6px 10px' }}>Peso Real (kg)</th>
                      <th style={{ padding: '6px 10px' }}>Valor Declarado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {volumes.map((v, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '6px 10px' }}>#{i + 1}</td>
                        <td style={{ padding: '6px 10px' }}>{v.pieces || 1}</td>
                        <td style={{ padding: '6px 10px' }}>{v.lenght} x {v.width} x {v.height} cm</td>
                        <td style={{ padding: '6px 10px' }}>{v.weight} kg</td>
                        <td style={{ padding: '6px 10px' }}>R$ {parseFloat(declaredValue || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* COMPOSIÇÃO DOS VALORES E TOTAIS */}
              <div style={{ background: '#FFF7ED', border: '1px solid #FDBA74', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#9A3412', marginBottom: '6px' }}>
                  COMPOSIÇÃO DO VALOR DO FRETE
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '11px' }}>
                  <div>
                    <span style={{ color: '#6B7280', display: 'block' }}>Frete Peso:</span>
                    <strong>R$ {selectedQuote.freightValue.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6B7280', display: 'block' }}>Taxas / Seguro:</span>
                    <strong>R$ {selectedQuote.chargesValue.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6B7280', display: 'block' }}>Peso Tarifado:</span>
                    <strong>{selectedQuote.chargeableWeight} kg</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6B7280', display: 'block' }}>VALOR TOTAL:</span>
                    <strong style={{ color: '#F37021', fontSize: '14px' }}>R$ {selectedQuote.totalValue.toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              {/* CANHOTO DE ASSINATURA E TERMO */}
              <div style={{ borderTop: '1px dashed #CBD5E1', paddingTop: '12px', marginTop: '16px', fontSize: '9px', color: '#64748B', lineHeight: '1.4' }}>
                <p style={{ margin: '0 0 16px 0' }}>
                  Declaro que as mercadorias informadas nesta minuta não contêm artigos perigosos, materiais proibidos pelo DAC/ANAC ou valores não declarados. O transporte aéreo será regido pelas Condições Gerais de Transporte da GOLLOG.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', textAlign: 'center', paddingTop: '10px' }}>
                  <div>
                    <div style={{ borderBottom: '1px solid #94A3B8', height: '24px', marginBottom: '4px' }} />
                    <div>Assinatura do Expedidor / Remetente</div>
                  </div>
                  <div>
                    <div style={{ borderBottom: '1px solid #94A3B8', height: '24px', marginBottom: '4px' }} />
                    <div>Agente GOLLOG Responsável</div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ESTILOS DE IMPRESSÃO CSS */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #minuta-impressao, #minuta-impressao * { visibility: visible; }
          #minuta-impressao {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            background: white !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

    </div>
  );
}
