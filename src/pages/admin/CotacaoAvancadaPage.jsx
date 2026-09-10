import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../lib/supabase';
import { fetchCep, formatCep } from '../../lib/cep';
import {
  FiDollarSign, FiSearch, FiPackage, FiTruck, FiCheckCircle, FiAlertCircle,
  FiArrowRight, FiArrowLeft, FiEdit2, FiCopy, FiInfo, FiRefreshCw, FiPlus, FiTrash2, FiFileText,
  FiUser, FiMapPin, FiShield, FiZap, FiChevronDown, FiChevronUp, FiArrowDown,
  FiDownload, FiPrinter, FiX, FiSend, FiSave, FiShare2, FiMessageSquare, FiExternalLink
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
  { sigla: 'QBX', cidade: 'Barueri / Alphaville' }
];

const BASES_ORIGEM = [
  { sigla: 'QOZ', cidade: 'Osasco' },
  { sigla: 'QBX', cidade: 'Barueri / Alphaville' },
  { sigla: 'QVL', cidade: 'Valinhos' }
];

function BaseAutocomplete({ value, onChange, options = BASES, placeholder = "🔍 Digite cidade ou sigla (ex: GRU, Campinas...)" }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const selected = options.find(b => b.sigla === value) || BASES.find(b => b.sigla === value);

  const filtered = options.filter(b => {
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

function formatCurrencyBRL(value) {
  if (!value && value !== 0) return '';
  const clean = String(value).replace(/\D/g, '');
  if (!clean) return '';
  const num = parseInt(clean, 10) / 100;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CotacaoAvancadaPage() {
  const [searchParams] = useSearchParams();
  const urlPhone = searchParams.get('phone') || searchParams.get('telefone') || '';
  const urlName = searchParams.get('name') || searchParams.get('nome') || '';
  const urlCotacao = searchParams.get('cotacao') || searchParams.get('cotacaoId') || searchParams.get('ref') || searchParams.get('protocolo') || '';
  const isClientView = Boolean(urlCotacao);

  // Step state: 1 = Cotação, 2 = Seleção de Serviços, 3 = Minuta & Pedido, 4 = Sucesso
  const [step, setStep] = useState(1);
  const [showInfo, setShowInfo] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('pequena');
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Estados para Proposta Comercial e Cotação sem Minuta
  const [savingQuote, setSavingQuote] = useState(false);
  const [quoteSaveSuccess, setQuoteSaveSuccess] = useState(null);
  const [quoteCopied, setQuoteCopied] = useState(false);
  const [showQuotePrintModal, setShowQuotePrintModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppRecipient, setWhatsAppRecipient] = useState('');
  const [quoteForWhatsApp, setQuoteForWhatsApp] = useState(null);
  const [whatsAppSuccessNotice, setWhatsAppSuccessNotice] = useState(null);
  const [sendingBotConversa, setSendingBotConversa] = useState(false);
  const [currentProtocol, setCurrentProtocol] = useState(urlCotacao);
  const [resumedNotice, setResumedNotice] = useState(null);
  const [loadingResumedQuote, setLoadingResumedQuote] = useState(Boolean(urlCotacao));

  // Form Step 1: Cotação
  const [customerDocument, setCustomerDocument] = useState('');
  const [originPointCode, setOriginPointCode] = useState('QOZ');
  const [originPostalCode, setOriginPostalCode] = useState('');
  const [deliveryType, setDeliveryType] = useState('domicilio'); // 'domicilio' | 'aeroporto'
  const [destinationPointCode, setDestinationPointCode] = useState('BSB');
  const [destinationPostalCode, setDestinationPostalCode] = useState('');
  const [originCity, setOriginCity] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
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
    name: urlName || '',
    documentNumber: '',
    stateRegistration: 'ISENTO',
    email: '',
    phone: urlPhone || '',
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: ''
  });

  const isCnpjTomador = (customerDocument || '').replace(/\D/g, '').length === 14;

  // Ajusta forma de pagamento caso Conta GOL esteja selecionado mas o documento nao seja CNPJ
  useEffect(() => {
    if (!isCnpjTomador && paymentForm === 'Conta GOL') {
      setPaymentForm('Pix');
    }
  }, [customerDocument, isCnpjTomador, paymentForm]);

  const [receiver, setReceiver] = useState({
    name: '',
    documentNumber: '',
    stateRegistration: 'ISENTO',
    email: '',
    phone: '',
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: ''
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

    const urlCotacao = searchParams.get('cotacao') || searchParams.get('cotacaoId') || searchParams.get('ref') || '';
    const urlService = searchParams.get('servico') || searchParams.get('produto') || '';

    if (urlCotacao && !urlDoc) {
      setCurrentProtocol(urlCotacao);

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(urlCotacao);
      let query = supabase.from('cotacoes').select('*');
      if (isUuid) {
        query = query.or(`metadata->>protocolo.eq.${urlCotacao},id.eq.${urlCotacao}`);
      } else {
        query = query.eq('metadata->>protocolo', urlCotacao);
      }

      query.maybeSingle().then(async ({ data, error }) => {
        try {
          if (error) {
            console.warn('Erro ao consultar cotação retomada:', error.message);
          }
          if (data) {
            const m = data.metadata || {};
            setResumedNotice(`Cotação carregada com sucesso (${urlCotacao})! Escolha o serviço desejado abaixo para emitir sua minuta.`);
            if (m.customerDocument) setCustomerDocument(m.customerDocument);
            if (m.originPointCode) setOriginPointCode(m.originPointCode);
            if (m.destinationPointCode) setDestinationPointCode(m.destinationPointCode);
            if (data.cidade_origem) setOriginCity(data.cidade_origem);
            if (data.cidade_destino) setDestinationCity(data.cidade_destino);
            if (data.cep_origem) {
              setOriginPostalCode(formatCep(data.cep_origem));
            }
            setToCollect(Boolean(m.toCollect));
            if (data.cep_destino) {
              setDestinationPostalCode(formatCep(data.cep_destino));
            }
            setToDelivery(Boolean(m.toDelivery));
            setDeliveryType(m.toDelivery ? 'domicilio' : 'aeroporto');
            if (m.volumes && m.volumes.length > 0) setVolumes(m.volumes);
            if (data.valor_declarado) setDeclaredValue(String(data.valor_declarado));

            let availableQuotes = m.quotes || [];

            // Se o registro antigo não tinha a lista de quotes gravada, busca as tarifas imediatamente
            if (!availableQuotes || availableQuotes.length === 0) {
              try {
                const res = await fetch('/api/nexlog?action=cotacao', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    customerDocument: m.customerDocument,
                    originPointCode: m.originPointCode || (urlCotacao.includes('QBX') ? 'QBX' : 'QOZ'),
                    originPostalCode: data.cep_origem ? data.cep_origem.replace(/\D/g, '') : undefined,
                    destinationPointCode: m.destinationPointCode || 'BSB',
                    destinationPostalCode: data.cep_destino ? data.cep_destino.replace(/\D/g, '') : undefined,
                    declaredValue: parseFloat(data.valor_declarado || 0),
                    toCollect: Boolean(m.toCollect || urlCotacao.includes('COL')),
                    toDelivery: Boolean(m.toDelivery),
                    volumes: m.volumes || [{ weight: data.peso_kg || 1, height: 10, width: 10, lenght: 10, pieces: 1 }]
                  })
                });
                const qData = await res.json();
                if (qData.success && qData.quotes?.length > 0) {
                  availableQuotes = qData.quotes;
                }
              } catch (recalcErr) {
                console.warn('Erro ao recalcular cotação em background:', recalcErr);
              }
            }

            // Carrega cotações salvas
            if (availableQuotes && availableQuotes.length > 0) {
              setQuotationData({
                quotes: availableQuotes,
                quotesCount: availableQuotes.length,
                originCity: data.cidade_origem || m.originPointCode || 'Origem',
                destinationCity: data.cidade_destino || m.destinationPointCode || 'Destino'
              });

              if (urlService) {
                const matched = availableQuotes.find(q => 
                  q.productName?.toLowerCase() === urlService.toLowerCase() ||
                  q.serviceCode?.toLowerCase() === urlService.toLowerCase()
                );
                if (matched) {
                  setSelectedQuote(matched);
                  setStep(3); // Vai direto para emissão da Minuta com a modalidade pré-escolhida
                  return;
                }
              }

              // Abre diretamente no Passo 2 (Escolha da melhor opção para você)
              setStep(2);
            }
          } else {
            // Se o protocolo não foi encontrado no Supabase, deduz dados da referência (QBX/QOZ e Coleta)
            const inferredStation = urlCotacao.includes('QBX') ? 'QBX' : 'QOZ';
            const inferredCollect = urlCotacao.includes('COL');
            setOriginPointCode(inferredStation);
            setToCollect(inferredCollect);
            if (inferredStation === 'QBX') setOriginCity('Barueri');
            else setOriginCity('Osasco');

            // Cota automaticamente
            try {
              const res = await fetch('/api/nexlog?action=cotacao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  originPointCode: inferredStation,
                  destinationPointCode: 'BSB',
                  declaredValue: 200,
                  toCollect: inferredCollect,
                  toDelivery: false,
                  volumes: [{ weight: 5, height: 20, width: 20, lenght: 20, pieces: 1 }]
                })
              });
              const qData = await res.json();
              if (qData.success && qData.quotes?.length > 0) {
                setQuotationData(qData);
                setStep(2);
              }
            } catch (fallbackErr) {
              console.warn('Fallback de cotação não pôde calcular:', fallbackErr);
            }
          }
        } finally {
          setLoadingResumedQuote(false);
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
    if (clean.length < 8) {
      setOriginCity('');
      setSender(prev => ({
        ...prev,
        zipCode: formatted,
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: ''
      }));
    } else if (clean.length === 8) {
      setLoadingOriginCep(true);
      const res = await fetchCep(clean);
      setLoadingOriginCep(false);
      if (res && res.cidade) {
        setOriginCity(`${res.cidade} / ${res.estado}`);
        setSender(prev => ({
          ...prev,
          zipCode: formatted,
          street: res.logradouro || '',
          neighborhood: res.bairro || '',
          city: res.cidade || '',
          state: res.estado || ''
        }));
      }
    }
  };

  const handleDestCepChange = async (val) => {
    const formatted = formatCep(val);
    setDestinationPostalCode(formatted);
    const clean = formatted.replace(/\D/g, '');
    if (clean.length < 8) {
      setDestinationCity('');
      setReceiver(prev => ({
        ...prev,
        zipCode: formatted,
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: ''
      }));
    } else if (clean.length === 8) {
      setLoadingDestCep(true);
      const res = await fetchCep(clean);
      setLoadingDestCep(false);
      if (res && res.cidade) {
        setDestinationCity(`${res.cidade} / ${res.estado}`);
        setReceiver(prev => ({
          ...prev,
          zipCode: formatted,
          street: res.logradouro || '',
          neighborhood: res.bairro || '',
          city: res.cidade || '',
          state: res.estado || ''
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

  // Quick Test Fill: QBX (Barueri / Alphaville)
  const handleQuickTestQBX = () => {
    setCustomerDocument('47.944.243/0001-41');
    setToCollect(false);
    setOriginPointCode('QBX');
    setOriginCity('Barueri / Alphaville');
    setOriginPostalCode('06454-000');
    setDeliveryType('aeroporto');
    setDestinationPointCode('BSB');
    setDestinationPostalCode('71608-900');
    setDestinationCity('Brasília / DF');
    setInsuranceType('GOL');
    setCargoDescription('Carga Teste QBX Barueri');
    setDeclaredValue('500.00');
    setToDelivery(false);
    applyPreset(PRESETS[1]); // Caixa P
    setSender(prev => ({
      ...prev,
      name: 'WOD BRASIL LOGISTICA',
      documentNumber: '47.944.243/0001-41',
      phone: '(11) 98888-7777',
      city: 'Barueri',
      state: 'SP',
      postalCode: '06454-000'
    }));
    setReceiver(prev => ({
      ...prev,
      name: 'CLIENTE TESTE RECEBEDOR',
      documentNumber: '000.000.001-91',
      phone: '(61) 99999-8888',
      city: 'Brasília',
      state: 'DF',
      postalCode: '71608-900'
    }));
  };

  // Quick Test Fill: QOZ (Osasco)
  const handleQuickTestQOZ = () => {
    setCustomerDocument('47.944.243/0001-41');
    setToCollect(false);
    setOriginPointCode('QOZ');
    setOriginCity('Osasco');
    setOriginPostalCode('06288-020');
    setDeliveryType('aeroporto');
    setDestinationPointCode('BSB');
    setDestinationPostalCode('71608-900');
    setDestinationCity('Brasília / DF');
    setInsuranceType('GOL');
    setCargoDescription('Carga Teste QOZ Osasco');
    setDeclaredValue('500.00');
    setToDelivery(false);
    applyPreset(PRESETS[1]); // Caixa P
    setSender(prev => ({
      ...prev,
      name: 'WOD BRASIL LOGISTICA',
      documentNumber: '47.944.243/0001-41',
      phone: '(11) 98888-7777',
      city: 'Osasco',
      state: 'SP',
      postalCode: '06288-020'
    }));
    setReceiver(prev => ({
      ...prev,
      name: 'CLIENTE TESTE RECEBEDOR',
      documentNumber: '000.000.001-91',
      phone: '(61) 99999-8888',
      city: 'Brasília',
      state: 'DF',
      postalCode: '71608-900'
    }));
  };

  // Quick Test Fill: Com Coleta (Barueri / Alphaville)
  const handleQuickTestColeta = () => {
    setCustomerDocument('47.944.243/0001-41');
    setToCollect(true);
    setOriginPointCode('QBX');
    setOriginCity('Barueri / Alphaville');
    setOriginPostalCode('06454-000');
    setDeliveryType('aeroporto');
    setDestinationPointCode('BSB');
    setDestinationPostalCode('71608-900');
    setDestinationCity('Brasília / DF');
    setInsuranceType('GOL');
    setCargoDescription('Carga Teste Com Coleta no Endereço');
    setDeclaredValue('500.00');
    setToDelivery(false);
    applyPreset(PRESETS[1]); // Caixa P
    setSender(prev => ({
      ...prev,
      name: 'WOD BRASIL LOGISTICA',
      documentNumber: '47.944.243/0001-41',
      phone: '(11) 98888-7777',
      street: 'Alameda Rio Negro',
      number: '500',
      complement: 'Bloco A',
      neighborhood: 'Alphaville',
      city: 'Barueri',
      state: 'SP',
      postalCode: '06454-000'
    }));
    setReceiver(prev => ({
      ...prev,
      name: 'CLIENTE TESTE RECEBEDOR',
      documentNumber: '000.000.001-91',
      phone: '(61) 99999-8888',
      city: 'Brasília',
      state: 'DF',
      postalCode: '71608-900'
    }));
  };

  const handleQuickTest = handleQuickTestQBX;

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
          originPointCode: originPointCode || undefined,
          originPostalCode: originPostalCode ? originPostalCode.replace(/\D/g, '') : undefined,
          destinationPointCode: destinationPointCode || undefined,
          destinationPostalCode: destinationPostalCode ? destinationPostalCode.replace(/\D/g, '') : undefined,
          declaredValue: insuranceType === 'Sem Seguro' ? 0 : parseFloat(declaredValue || 0),
          toCollect: Boolean(toCollect),
          toDelivery: deliveryType === 'domicilio',
          volumes
        })
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error(`Erro no servidor (${res.status}). Verifique a conexão com a API.`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Erro ao consultar cotação.');
      }

      setQuotationData(data);
      const stationPrefix = (originPointCode || 'QOZ').toUpperCase();
      const collectSuffix = toCollect ? '-COL' : '';
      const protocolNumber = `PRE-${stationPrefix}${collectSuffix}-${Date.now().toString().slice(-6)}`;
      setCurrentProtocol(protocolNumber);

      // Auto-salvar no Supabase para que o link gerado já fique ativo e salvo para o cliente retomar
      try {
        const totalWeight = volumes.reduce((acc, v) => acc + (parseFloat(v.weight) || 0) * (parseInt(v.pieces) || 1), 0);
        const bestQuote = data?.quotes?.[0];
        supabase.from('cotacoes').insert([{
          cliente_id: null,
          cep_origem: originPostalCode ? originPostalCode.replace(/\D/g, '') : null,
          cep_destino: destinationPostalCode ? destinationPostalCode.replace(/\D/g, '') : null,
          cidade_origem: originCity || originPointCode || 'Origem',
          cidade_destino: destinationCity || destinationPointCode || 'Destino',
          peso_kg: totalWeight,
          valor_declarado: parseFloat(declaredValue || 0),
          tipo_servico: bestQuote ? `GOLLOG ${bestQuote.productName}` : 'GOLLOG COTAÇÃO',
          valor_cotado: bestQuote ? bestQuote.totalValue : 0,
          status: 'pendente',
          metadata: {
            is_minuta: false,
            protocolo: protocolNumber,
            customerDocument: customerDocument ? customerDocument.replace(/\D/g, '') : null,
            originPointCode,
            destinationPointCode,
            toCollect: Boolean(toCollect),
            toDelivery: deliveryType === 'domicilio',
            volumes,
            quotes: data?.quotes || [],
            data_cotacao: new Date().toISOString()
          }
        }]).then(({ error: saveErr }) => {
          if (saveErr) console.warn('Aviso ao auto-salvar cotação:', saveErr.message);
        });
      } catch (errAutoSave) {
        console.warn('Erro silencioso ao auto-salvar cotação:', errAutoSave);
      }

      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setQuoteError(err.message || 'Erro de comunicação com a API Nexlog.');
    } finally {
      setLoadingQuotes(false);
    }
  };

  // Select quote & proceed to step 3 (Emissão de Minuta)
  const handleSelectQuote = (quote) => {
    setSelectedQuote(quote);
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Garante que a cotação esteja salva no Supabase para gerar o link de retomada
  const ensureQuoteSaved = async (specificQuote = null) => {
    const stationPrefix = (originPointCode || 'QOZ').toUpperCase();
    const collectSuffix = toCollect ? '-COL' : '';
    const protocolNumber = currentProtocol || `PRE-${stationPrefix}${collectSuffix}-${Date.now().toString().slice(-6)}`;

    try {
      const totalWeight = volumes.reduce((acc, v) => acc + (parseFloat(v.weight) || 0) * (parseInt(v.pieces) || 1), 0);
      const bestQuote = specificQuote || quotationData?.quotes?.[0];

      const { error } = await supabase.from('cotacoes').insert([{
        cliente_id: null,
        cep_origem: originPostalCode ? originPostalCode.replace(/\D/g, '') : null,
        cep_destino: destinationPostalCode ? destinationPostalCode.replace(/\D/g, '') : null,
        cidade_origem: originCity || originPointCode || 'Origem',
        cidade_destino: destinationCity || destinationPointCode || 'Destino',
        peso_kg: totalWeight,
        valor_declarado: parseFloat(declaredValue || 0),
        tipo_servico: bestQuote ? `GOLLOG ${bestQuote.productName}` : 'GOLLOG COTAÇÃO',
        valor_cotado: bestQuote ? bestQuote.totalValue : 0,
        status: 'pendente',
        metadata: {
          is_minuta: false,
          protocolo: protocolNumber,
          customerDocument: customerDocument ? customerDocument.replace(/\D/g, '') : null,
          originPointCode,
          destinationPointCode,
          toCollect: Boolean(toCollect),
          toDelivery: deliveryType === 'domicilio',
          volumes,
          quotes: quotationData?.quotes || [],
          data_cotacao: new Date().toISOString()
        }
      }]);

      if (!error) {
        setCurrentProtocol(protocolNumber);
        return protocolNumber;
      }
    } catch (err) {
      console.warn('Erro ao auto-salvar cotação para link:', err);
    }
    return protocolNumber;
  };

  // Gera texto formatado para proposta comercial com LINK DE RETOMADA DA MINUTA
  const generateCommercialProposalText = (specificQuote = null, protocol = null) => {
    if (!quotationData || !quotationData.quotes) return '';

    const totalWeight = volumes.reduce((acc, v) => acc + (parseFloat(v.weight) || 0) * (parseInt(v.pieces) || 1), 0);
    const totalPieces = volumes.reduce((acc, v) => acc + (parseInt(v.pieces) || 1), 0);
    const effectiveProtocol = protocol || currentProtocol;

    let text = `✈️ *COTAÇÃO DE FRETE AÉREO GOLLOG*\n`;
    if (effectiveProtocol) {
      text += `📋 *Referência / Pré-Emissão:* ${effectiveProtocol}\n`;
    }
    text += `\n`;

    // Origem e Coleta
    text += `📍 *Origem:* ${originCity || originPointCode || 'Origem'}\n`;
    if (toCollect) {
      const enderecoColeta = sender.street ? ` (${sender.street}${sender.number ? ', ' + sender.number : ''}${sender.neighborhood ? ' - ' + sender.neighborhood : ''})` : '';
      text += `   🚚 *Coleta:* SIM, no endereço do remetente${enderecoColeta}\n`;
    } else {
      text += `   🏢 *Despacho:* Balcão / Base GOLLOG (${originPointCode})\n`;
    }

    // Destino e Entrega
    text += `🎯 *Destino:* ${destinationCity || destinationPointCode || 'Destino'}\n`;
    if (toDelivery) {
      const cepDestinoFormatado = destinationPostalCode ? ` (CEP ${destinationPostalCode})` : '';
      text += `   🏠 *Entrega:* No endereço do destinatário${cepDestinoFormatado}\n`;
    } else {
      text += `   ✈️ *Retirada:* Na base/aeroporto GOLLOG (${destinationPointCode})\n`;
    }

    // Dados da Carga
    text += `📦 *Carga:* ${totalPieces} volume(s) · ${totalWeight.toFixed(1)} kg\n`;
    if (cargoDescription) {
      text += `📝 *Conteúdo:* ${cargoDescription}\n`;
    }
    if (parseFloat(declaredValue || 0) > 0) {
      text += `💰 *Valor Declarado:* R$ ${parseFloat(declaredValue).toFixed(2).replace('.', ',')}\n`;
    }

    // Detalhes dos Volumes se houver
    if (volumes && volumes.length > 0) {
      const volDim = volumes.map((v, i) => `${v.pieces || 1}x (${v.lenght || 0}x${v.width || 0}x${v.height || 0}cm - ${v.weight}kg)`).join(', ');
      text += `📐 *Dimensões:* ${volDim}\n`;
    }

    text += `\n*OPÇÕES DISPONÍVEIS:*\n`;

    const quotesToInclude = specificQuote ? [specificQuote] : quotationData.quotes;

    quotesToInclude.forEach((q, idx) => {
      const productName = q.productName || (q.serviceDescription || '').replace(/^GOLLOG\s*/i, '').replace(/^TARIFARIO\s*/i, '') || 'PADRÃO';
      const icon = productName.includes('CHEG') ? '📦' : productName.includes('ECON') ? '🌱' : productName.includes('RAP') ? '⚡' : productName.includes('SAUD') ? '🏥' : '🔥';
      const isRec = idx === 0 || q.badge?.includes('RECOMENDADO');

      text += `\n${icon} *GOLLOG ${productName}* ${isRec ? '⭐ _(Recomendado)_' : ''}\n`;
      text += `   💵 *Valor:* R$ ${q.totalValue.toFixed(2).replace('.', ',')}\n`;
      text += `   ⏱️ *Prazo:* a partir de ${q.timeToDelivery} dias úteis\n`;
      if (q.tag) {
        text += `   🏷️ *Modalidade:* ${q.tag}\n`;
      }
    });

    text += `\n_ℹ️ Valores válidos para despacho imediato sujeitos à confirmação e malha aérea._\n`;

    // INSERÇÃO DO LINK DE RETOMADA PARA EMISSÃO DIRETA DA MINUTA
    if (effectiveProtocol) {
      const originBase = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://www.golcargo.com.br';
      const resumeUrl = specificQuote
        ? `${originBase}/cotacao-avancada?cotacao=${effectiveProtocol}&servico=${encodeURIComponent(specificQuote.productName)}`
        : `${originBase}/cotacao-avancada?cotacao=${effectiveProtocol}`;

      text += `\n🚀 *Deseja formalizar o envio e emitir sua minuta oficial?*\n`;
      text += `Clique no link abaixo para acessar esta cotação e emitir a minuta de embarque agora mesmo:\n`;
      text += `👉 ${resumeUrl}\n`;
    } else {
      text += `\nPara emitir a minuta ou tirar dúvidas, fale conosco!`;
    }

    return text;
  };

  const handleCopyProposal = async (specificQuote = null) => {
    let proto = currentProtocol;
    if (!proto) {
      proto = await ensureQuoteSaved(specificQuote);
    }
    const text = generateCommercialProposalText(specificQuote, proto);
    if (!text) return;
    navigator.clipboard.writeText(text);
    setQuoteCopied(true);
    setTimeout(() => setQuoteCopied(false), 3000);
  };

  const handleOpenWhatsAppModal = async (specificQuote = null) => {
    setQuoteForWhatsApp(specificQuote);
    const initialPhone = sender.phone || urlPhone || '';
    setWhatsAppRecipient(initialPhone);
    setShowWhatsAppModal(true);
    if (!currentProtocol) {
      await ensureQuoteSaved(specificQuote);
    }
  };

  const handleConfirmSendWhatsApp = async () => {
    const rawPhone = whatsAppRecipient || sender.phone || urlPhone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      alert('Por favor, informe um número de WhatsApp válido com DDD (ex: 11988887777).');
      return;
    }

    setSendingBotConversa(true);
    try {
      let proto = currentProtocol;
      if (!proto) {
        proto = await ensureQuoteSaved(quoteForWhatsApp);
      }
      const text = generateCommercialProposalText(quoteForWhatsApp, proto);
      if (!text) throw new Error('Não foi possível gerar a proposta comercial.');

      // Disparo automático no WhatsApp via BotConversa
      const res = await fetch('/api/notify/mensagem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          mensagem: text,
          nome: sender.name || urlName || 'Cliente'
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || (data.success === false && data.erros?.length)) {
        throw new Error(data.erros?.[0] || data.error || 'Falha ao despachar mensagem pelo BotConversa');
      }

      setShowWhatsAppModal(false);
      setWhatsAppSuccessNotice(`✅ Cotações enviadas automaticamente para o WhatsApp (${cleanPhone}) via BotConversa!`);
      setTimeout(() => setWhatsAppSuccessNotice(null), 8000);
    } catch (err) {
      console.error('Erro ao enviar pelo BotConversa:', err);
      const shouldFallback = confirm('Não foi possível enviar automaticamente pelo BotConversa (' + (err.message || 'Erro de conexão') + '). Deseja abrir no seu WhatsApp Web agora?');
      if (shouldFallback) {
        let proto = currentProtocol;
        const text = generateCommercialProposalText(quoteForWhatsApp, proto);
        const encoded = encodeURIComponent(text);
        const url = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${encoded}` : `https://api.whatsapp.com/send?text=${encoded}`;
        window.open(url, '_blank');
        setShowWhatsAppModal(false);
      }
    } finally {
      setSendingBotConversa(false);
    }
  };

  const handleSendWhatsAppProposal = async (specificQuote = null) => {
    handleOpenWhatsAppModal(specificQuote);
  };

  const handleSaveQuoteOnly = async () => {
    setSavingQuote(true);
    setQuoteSaveSuccess(null);
    try {
      const proto = await ensureQuoteSaved();
      if (proto) {
        setQuoteSaveSuccess(`Cotação salva com sucesso! (Protocolo: ${proto})`);
        setTimeout(() => setQuoteSaveSuccess(null), 6000);
      }
    } catch (err) {
      console.error('Erro ao salvar cotação:', err);
      alert('Erro ao salvar cotação no sistema: ' + (err.message || 'Tente novamente.'));
    } finally {
      setSavingQuote(false);
    }
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
          charges: selectedQuote.charges || [],
          volumes,
          sender,
          receiver,
          paymentMethod: Number(paymentMethod) || 1,
          paymentForm,
          protocolo: currentProtocol || undefined
        })
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error(`Erro no servidor (${res.status}). Verifique os dados da minuta.`);
      }

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

        {!isClientView && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleQuickTestQBX}
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
              title="Preenche simulação rápida na base QBX (Barueri / Alphaville)"
            >
              <FiZap /> Teste QBX (Barueri)
            </button>

            <button
              type="button"
              onClick={handleQuickTestQOZ}
              style={{
                background: '#F0FDF4',
                border: '1px solid #86EFAC',
                color: '#15803D',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
              title="Preenche simulação rápida na base QOZ (Osasco)"
            >
              <FiZap /> Teste QOZ (Osasco)
            </button>

            <button
              type="button"
              onClick={handleQuickTestColeta}
              style={{
                background: '#FEF3C7',
                border: '1px solid #FCD34D',
                color: '#92400E',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
              title="Preenche simulação rápida com coleta no endereço do remetente"
            >
              <FiZap /> Teste Com Coleta
            </button>
          </div>
        )}
      </header>

      {/* CONTAINER CENTRAL RESPONSIVO */}
      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '16px' }}>

        {/* BANNER DE COTAÇÃO RETOMADA (VIA LINK EXCLUSIVO) */}
        {resumedNotice && (
          <div className="no-print" style={{
            background: '#ECFDF5',
            border: '1.5px solid #6EE7B7',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            fontSize: '13px',
            color: '#065F46',
            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🔄</span>
              <div>
                <strong>Cotação Retomada:</strong> {resumedNotice}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setResumedNotice(null)}
              style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer', padding: '4px' }}
              title="Fechar aviso"
            >
              <FiX size={18} />
            </button>
          </div>
        )}

        {/* INFORMAÇÕES TÉCNICAS E AMBIENTE: VISÍVEL SOMENTE PARA OPERADORES / ADMIN (NUNCA PARA O CLIENTE) */}
        {!isClientView && (
          <>
            {/* BANNER DE AMBIENTE DE HOMOLOGAÇÃO / TESTES */}
            <div className="no-print" style={{
              background: '#FFFBEB',
              border: '1.5px solid #FCD34D',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '12px',
              color: '#92400E',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <span style={{ fontSize: '20px', flexShrink: 0 }}>🧪</span>
              <div style={{ flex: 1, lineHeight: '1.4' }}>
                <strong style={{ color: '#78350F' }}>Ambiente GOLLOG / Nexlog:</strong> Cotações oficiais e emissão de número de referência / pré-emissão homologadas para as bases <strong>QBX (Barueri)</strong> e <strong>QOZ (Osasco)</strong>.
              </div>
            </div>

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
                  <FiInfo size={16} /> Objetivos, Instruções e Referência de Pré-Emissão GOLLOG
                </div>
                <span style={{ color: '#1E40AF', fontSize: '12px', fontWeight: '600' }}>
                  {showInfo ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                </span>
              </div>

              {showInfo && (
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #DBEAFE', fontSize: '12px', color: '#1E3A8A', lineHeight: '1.5' }}>
                  <p style={{ margin: '0 0 6px 0' }}>
                    🎯 <strong>Objetivo:</strong> Fornecer preços e prazos oficiais da malha aérea GOLLOG com tarifas de contrato e emissão do <strong>Número de Referência Oficial de Pré-Emissão</strong> e Minuta Eletrônica de Carga (CTe/AWB).
                  </p>
                  <p style={{ margin: '0 0 6px 0' }}>
                    📦 <strong>O que é a Referência de Pré-Emissão?</strong> É o número oficial gerado pela GOLLOG após a cotação/reserva da minuta. Ele é o identificador único para apresentar na base de origem (Barueri QBX ou Osasco QOZ), agilizando a pesagem, etiquetação e despacho no balcão sem redigitação.
                  </p>
                  <p style={{ margin: '0 0 6px 0' }}>
                    🏢 <strong>Bases Homologadas:</strong> O sistema gera a referência correta tanto para a origem <strong>QBX (Barueri / Alphaville)</strong> quanto para <strong>QOZ (Osasco)</strong>.
                  </p>
                  <p style={{ margin: '0 0 6px 0' }}>
                    🚚 <strong>Envio Com Coleta:</strong> Ao optar por "Com Coleta", a taxa é calculada na cotação e a ordem de coleta fica vinculada diretamente à Referência Oficial gerada. O motorista da GOLLOG utiliza este número para realizar a busca no endereço do Remetente.
                  </p>
                  <p style={{ margin: '0 0 6px 0' }}>
                    📋 <strong>Apenas Cotação / Proposta Comercial:</strong> Se o cliente deseja apenas a proposta de frete, envie pelo WhatsApp. O cliente recebe um link de retomada para abrir a cotação e emitir a minuta quando aprovar.
                  </p>
                  <p style={{ margin: 0 }}>
                    🧪 <strong>Teste Prático e Fácil:</strong> Use os botões <em>"Teste QBX"</em>, <em>"Teste QOZ"</em> ou <em>"Teste Com Coleta"</em> no topo da tela para carregar em 1 clique um cenário completo pronto para simular ou emitir.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* STEPPER PROGRESS BAR */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          {[
            { n: 1, label: 'Cotação' },
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

        {/* CARREGANDO COTAÇÃO RETOMADA VIA LINK */}
        {loadingResumedQuote && (
          <div className="no-print" style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '48px 24px',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            border: '1.5px solid #FED7AA',
            margin: '20px 0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                border: '4px solid #FED7AA',
                borderTopColor: '#F37021',
                animation: 'spin 0.8s linear infinite'
              }} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1E293B', margin: '0 0 6px 0' }}>
              Carregando Cotação GOLLOG...
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
              Protocolo <strong>{urlCotacao}</strong>. Buscando suas opções e valores de frete...
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            PASSO 1: DADOS DA CARGA & CEPS
        ══════════════════════════════════════════════════════ */}
        {step === 1 && !loadingResumedQuote && (
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

              <div style={{ marginBottom: paymentMethod === '1' ? '14px' : '16px' }}>
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

              {/* Forma de Pagamento só aparece para opção 1 (Pago pelo Remetente) */}
              {paymentMethod === '1' && (
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
              )}

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
                      if (!originPointCode || !['QOZ', 'QBX', 'QVL'].includes(originPointCode)) {
                        setOriginPointCode('QOZ');
                        setOriginCity('Osasco');
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

                  {originPostalCode.replace(/\D/g, '').length === 8 && originCity && (
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
                    options={BASES_ORIGEM}
                    value={originPointCode}
                    placeholder="🔍 Escolha a base de origem (QOZ, QBX ou QVL)"
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
                <FiMapPin color="#F37021" /> Destino *
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

                  {destinationPostalCode.replace(/\D/g, '').length === 8 && destinationCity && (
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
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '10px', fontSize: '14px', fontWeight: '700', color: '#64748B' }}>
                      R$
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      className="public-input"
                      placeholder="0,00"
                      value={formatCurrencyBRL(declaredValue)}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        if (!raw) {
                          setDeclaredValue('');
                          return;
                        }
                        const num = (parseInt(raw, 10) / 100).toFixed(2);
                        setDeclaredValue(num);
                      }}
                      style={{ width: '100%', fontSize: '14px', padding: '10px 12px 10px 38px', borderRadius: '10px', border: '1.5px solid #CBD5E1', background: '#FFFFFF' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 4: VOLUMES E MEDIDAS */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                <FiPackage color="#F37021" /> Tamanho da Encomenda (Volumes)
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
                        style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <FiTrash2 /> Remover
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '2px' }}>Peso Total (kg): *</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        className="public-input"
                        placeholder="Ex: 2.0"
                        value={vol.weight}
                        onChange={(e) => updateVolume(index, 'weight', e.target.value)}
                        style={{ padding: '8px 10px', fontSize: '14px', borderRadius: '8px' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '2px' }}>Qtd. de Peças: *</label>
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
                      <label style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Compr. (cm) *</label>
                      <input
                        type="number"
                        required
                        className="public-input"
                        placeholder="20"
                        value={vol.lenght}
                        onChange={(e) => updateVolume(index, 'lenght', e.target.value)}
                        style={{ padding: '6px 8px', fontSize: '13px', borderRadius: '6px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Largura (cm) *</label>
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
                      <label style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Altura (cm) *</label>
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

              {/* Botão Adicionar Volume */}
              <button
                type="button"
                onClick={addVolume}
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '12px 14px',
                  background: '#FFF7ED',
                  border: '1.5px dashed #F37021',
                  borderRadius: '10px',
                  color: '#C2410C',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                <FiPlus size={16} /> Adicionar Volume
              </button>
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
                  Realizar Cotação <FiArrowRight />
                </>
              )}
            </button>
          </form>
        )}

        {/* ══════════════════════════════════════════════════════
            PASSO 2: COMPARADOR DE TARIFAS OFICIAIS GOLLOG
        ══════════════════════════════════════════════════════ */}
        {step === 2 && quotationData && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#0F172A', margin: '0 0 2px 0' }}>
                  Escolha a melhor opção para você:
                </h2>
                <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                  <span>{originCity} ➔ {destinationCity} ({quotationData.quotesCount} opções disponíveis)</span>
                  {currentProtocol && (
                    <span style={{ background: '#F1F5F9', color: '#0F172A', padding: '2px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '11px', border: '1px solid #CBD5E1' }}>
                      Ref: {currentProtocol}
                    </span>
                  )}
                  <span style={{ background: toCollect ? '#FEF3C7' : '#E0F2FE', color: toCollect ? '#92400E' : '#0369A1', padding: '2px 8px', borderRadius: '6px', fontWeight: '700', fontSize: '11px' }}>
                    {toCollect ? '🚚 Com Coleta' : '🏢 Balcão'}
                  </span>
                </div>
              </div>

              {/* Botões de Ação no Topo do Passo 2 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  style={{
                    background: '#FFFFFF',
                    border: '1.5px solid #CBD5E1',
                    color: '#1E293B',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <FiArrowLeft size={16} /> Voltar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  style={{
                    background: '#FFF7ED',
                    border: '1.5px solid #F37021',
                    color: '#C2410C',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(243, 112, 33, 0.15)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <FiEdit2 size={15} /> Alterar Cotação
                </button>
              </div>
            </div>

            {quotationData.notice && (
              <div style={{ background: '#FEFCE8', border: '1px solid #FEF08A', color: '#854D0E', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', marginBottom: '16px' }}>
                ℹ️ {quotationData.notice}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════
                LISTA CLEAN E COMPACTA DE SERVIÇOS (ESTILO GOLLOG)
            ══════════════════════════════════════════════════════ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {quotationData.quotes.map((q, idx) => {
                const isRecommended = idx === 0 || q.badge?.includes('RECOMENDADO');
                const productName = q.productName || (q.serviceDescription || '').replace(/^GOLLOG\s*/i, '').replace(/^TARIFARIO\s*/i, '') || 'PADRÃO';
                const icon = productName.includes('CHEG') ? '📦' : productName.includes('ECON') ? '💰' : productName.includes('RAP') ? '⚡' : productName.includes('SAUD') ? '🏥' : '🔥';

                return (
                  <div
                    key={q.idQuotation || q.serviceCode || idx}
                    style={{
                      background: isRecommended ? '#FFFDF8' : '#FFFFFF',
                      borderRadius: '14px',
                      border: isRecommended ? '2px solid #F37021' : '1.5px solid #E2E8F0',
                      padding: '16px 20px',
                      boxShadow: isRecommended ? '0 4px 14px rgba(243, 112, 33, 0.12)' : '0 2px 6px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      flexWrap: 'wrap',
                      position: 'relative',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {/* Lado Esquerdo: Identificação do Serviço */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '220px', flex: '1 1 240px' }}>
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        background: isRecommended ? '#FFF7ED' : '#F8FAFC',
                        border: isRecommended ? '1.5px solid #FDBA74' : '1.5px solid #E2E8F0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '22px',
                        flexShrink: 0
                      }}>
                        {icon}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '16px', fontWeight: '900', color: '#0F172A' }}>
                            GOLLOG {productName}
                          </span>
                          {isRecommended && (
                            <span style={{
                              background: '#F37021',
                              color: '#FFFFFF',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '10px',
                              fontWeight: '800',
                              textTransform: 'uppercase',
                              letterSpacing: '0.4px'
                            }}>
                              ★ Recomendado
                            </span>
                          )}
                          {q.isAgreed && (
                            <span style={{
                              background: '#ECFDF5',
                              color: '#047857',
                              border: '1px solid #A7F3D0',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '10px',
                              fontWeight: '800',
                              textTransform: 'uppercase'
                            }}>
                              🏷️ Contrato
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '12px', color: '#64748B', flexWrap: 'wrap' }}>
                          {q.tag && (
                            <span style={{
                              background: '#F1F5F9',
                              color: '#475569',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontWeight: '600'
                            }}>
                              {q.tag.includes('Endereço') ? '🏠 ' : '🏢 '} {q.tag}
                            </span>
                          )}
                          <span>{toCollect ? '🚚 Coleta inclusa no endereço' : '🏢 Postagem no balcão'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Centro: Prazo Estimado */}
                    <div style={{ minWidth: '150px', flex: '1 1 150px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Prazo Estimado
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#1E293B', marginTop: '2px' }}>
                        ⏱️ a partir de <span style={{ color: '#F37021' }}>{q.timeToDelivery} dias úteis</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                        {toDelivery ? 'Entrega no endereço' : 'Retirada na base'}
                      </div>
                    </div>

                    {/* Lado Direito: Preço e Botão Único de Emissão */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', justifyContent: 'flex-end', minWidth: '220px', flex: '1 1 220px' }}>
                      <div style={{ textAlign: 'right', paddingRight: '6px' }}>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Valor Total
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#0F172A', letterSpacing: '-0.5px' }}>
                          R$ {q.totalValue?.toFixed(2).replace('.', ',') ?? '0,00'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectQuote(q)}
                        style={{
                          background: '#F37021',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '12px 20px',
                          fontSize: '13px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 3px 8px rgba(243, 112, 33, 0.3)',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s ease'
                        }}
                        title="Prosseguir para emissão da minuta oficial deste serviço"
                      >
                        Emitir Minuta <FiArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ══════════════════════════════════════════════════════
                PAINEL: ÚNICA OPÇÃO NO FINAL - ENVIAR NO MEU WHATSAPP
            ══════════════════════════════════════════════════════ */}
            {!isClientView && (
              <div style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1.5px solid #E2E8F0',
                padding: '24px 20px',
                marginBottom: '20px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                textAlign: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '24px' }}>📲</span>
                  <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                    Enviar cotações no meu WhatsApp
                  </h3>
                </div>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '0 auto 18px auto', maxWidth: '480px', lineHeight: '1.5' }}>
                  As cotações chegarão automaticamente no seu WhatsApp com os dados completos e link exclusivo para acessar ou emitir a minuta de embarque.
                </p>

                {/* Feedback de Envio Automático */}
                {whatsAppSuccessNotice && (
                  <div style={{
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    color: '#065F46',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '700',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}>
                    <FiCheckCircle color="#10B981" size={18} /> {whatsAppSuccessNotice}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleOpenWhatsAppModal(null)}
                    style={{
                      width: '100%',
                      maxWidth: '440px',
                      background: 'linear-gradient(135deg, #25D366 0%, #1EBE5D 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '15px 24px',
                      fontSize: '15px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      boxShadow: '0 4px 14px rgba(37, 211, 102, 0.35)',
                      transition: 'all 0.2s ease'
                    }}
                    title="Dispara automaticamente as cotações com link da minuta no seu WhatsApp via BotConversa"
                  >
                    <FiSend size={18} /> Enviar cotações no meu WhatsApp
                  </button>
                </div>
              </div>
            )}

            {/* Barra de Voltar no Rodapé do Passo 2 */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px', marginBottom: '24px' }}>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{
                  background: '#FFFFFF',
                  border: '1.5px solid #CBD5E1',
                  color: '#475569',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s ease'
                }}
              >
                <FiArrowLeft size={16} /> Voltar e Alterar Dados da Cotação
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            PASSO 3: DADOS DA MINUTA / PEDIDO
        ══════════════════════════════════════════════════════ */}
        {step === 3 && selectedQuote && (
          <form onSubmit={handleGenerateMinute} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                Dados da Minuta Eletrônica
              </h2>
              <button
                type="button"
                onClick={() => {
                  setStep(2);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{
                  background: '#FFF7ED',
                  border: '1.5px solid #F37021',
                  color: '#C2410C',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(243, 112, 33, 0.15)'
                }}
              >
                <FiArrowLeft size={15} /> Voltar / Trocar Frete
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

            {/* Indicador de Coleta */}
            {toCollect ? (
              <div style={{ background: '#FFFBEB', border: '1.5px solid #FCD34D', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px', flexShrink: 0 }}>🚚</span>
                <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
                  <strong style={{ color: '#92400E' }}>Envio com Coleta em Domicílio Inclusa:</strong>
                  <div style={{ color: '#B45309' }}>
                    O motorista da GOLLOG realizará a coleta no endereço do Expedidor/Remetente abaixo ({sender.street ? `${sender.street}, ${sender.number}` : originPostalCode}). A referência oficial gerada incluirá a ordem de coleta.
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748B' }}>
                <span>🏢</span>
                <span><strong>Sem Coleta:</strong> Despacho direto no balcão da base <strong>{originPointCode}</strong> ({originCity}).</span>
              </div>
            )}

            {/* Condição e Forma de Pagamento */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '18px', border: '1px solid #E2E8F0', display: 'grid', gridTemplateColumns: paymentMethod === '1' ? '1fr 1fr' : '1fr', gap: '12px' }}>
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

              {paymentMethod === '1' && (
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
              )}
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

            {/* Box AWB / Referência */}
            <div style={{ background: '#F8FAFC', padding: '18px', borderRadius: '14px', border: '1.5px dashed #CBD5E1', marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                Número de Referência / Pré-emissão Oficial GOLLOG
              </div>
              <div style={{ fontSize: '26px', fontWeight: '900', color: '#F37021', letterSpacing: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {minuteResult.referenceNumber || minuteResult.orderNumber}
                <button
                  type="button"
                  onClick={() => copyToClipboard(minuteResult.referenceNumber || minuteResult.orderNumber)}
                  style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px' }}
                  title="Copiar código de referência"
                >
                  <FiCopy size={18} />
                </button>
              </div>
              {copied && (
                <div style={{ fontSize: '11px', color: '#10B981', fontWeight: '700', marginTop: '4px' }}>
                  ✓ Código de referência copiado com sucesso!
                </div>
              )}

              {/* Informação da Base e Status Oficial */}
              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', background: '#FEF3C7', color: '#92400E', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', border: '1px solid #FDE68A' }}>
                  🏢 Base de Origem: {minuteResult.originBase === 'QBX' ? 'QBX (Barueri / Alphaville)' : minuteResult.originBase === 'QOZ' ? 'QOZ (Osasco)' : (minuteResult.originBase || 'GOLLOG')}
                </span>
                {(minuteResult.summary?.toCollect ?? toCollect) ? (
                  <span style={{ fontSize: '12px', background: '#FEF3C7', color: '#B45309', fontWeight: '800', padding: '4px 10px', borderRadius: '6px', border: '1.5px solid #F59E0B' }}>
                    🚚 COM COLETA SOLICITADA
                  </span>
                ) : (
                  <span style={{ fontSize: '12px', background: '#F1F5F9', color: '#475569', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                    🏢 SEM COLETA (BALCÃO)
                  </span>
                )}
                {!minuteResult.isSimulation && (
                  <span style={{ fontSize: '12px', background: '#DCFCE7', color: '#166534', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', border: '1px solid #BBF7D0' }}>
                    ✅ Pré-emissão Ativa na GOLLOG
                  </span>
                )}
              </div>

              {(minuteResult.details?.documentToken || minuteResult.minuteDetails?.documentToken) && (
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '8px', background: '#FFFFFF', padding: '6px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'inline-block' }}>
                  Token Oficial Nexlog: <span style={{ color: '#0284C7', fontWeight: '700', fontFamily: 'monospace' }}>{(minuteResult.details?.documentToken || minuteResult.minuteDetails?.documentToken).slice(0, 18)}...</span>
                </div>
              )}

              <p style={{ fontSize: '11px', color: '#64748B', marginTop: '10px', marginBottom: 0 }}>
                💡 Apresente este número de referência na base de despacho para conferência, pesagem e emissão da etiqueta de embarque.
              </p>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #E2E8F0' }}>
                <span>Modalidade de Coleta:</span>
                <strong>{(minuteResult.summary?.toCollect ?? toCollect) ? '🚚 Sim (Coleta no endereço)' : '🏢 Não (Entrega na base)'}</strong>
              </div>
              {(minuteResult.summary?.toCollect ?? toCollect) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #E2E8F0', fontSize: '11px', color: '#92400E', background: '#FFFBEB', paddingLeft: '6px', paddingRight: '6px', borderRadius: '6px' }}>
                  <span>Endereço de Coleta:</span>
                  <span style={{ textAlign: 'right', maxWidth: '65%', fontWeight: '600' }}>
                    {sender.street}, {sender.number} {sender.complement ? `(${sender.complement})` : ''} - {sender.neighborhood}, {sender.city || originCity}/{sender.state || 'SP'} (CEP: {sender.postalCode || originPostalCode})
                  </span>
                </div>
              )}
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
                  <div><strong>Modalidade de Coleta:</strong> {(minuteResult.summary?.toCollect ?? toCollect) ? '🚚 COM COLETA NO EXPEDIDOR' : '🏢 SEM COLETA (ENTREGA NA BASE)'}</div>
                  <div><strong>Prazo Previsto de Entrega:</strong> {selectedQuote.timeToDelivery} dia(s) útil(eis)</div>
                  <div><strong>Condição de Pagamento:</strong> {paymentMethod === '1' ? `Pago na Origem (${paymentForm})` : 'FRAP (Pago pelo Destinatário na Entrega)'}</div>
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

      {/* ══════════════════════════════════════════════════════
          MODAL: ESPELHO DA PROPOSTA COMERCIAL / COTAÇÃO (A4)
      ══════════════════════════════════════════════════════ */}
      {showQuotePrintModal && quotationData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '780px',
            maxHeight: '92vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column'
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
                <FiFileText color="#F37021" /> Proposta Comercial de Frete GOLLOG
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
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
                  onClick={() => setShowQuotePrintModal(false)}
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

            {/* FOLHA DA PROPOSTA COMERCIAL */}
            <div id="cotacao-impressao" style={{ padding: '24px', fontFamily: 'Arial, sans-serif', color: '#111827', fontSize: '12px' }}>
              
              {/* TOPO DA PROPOSTA */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #F37021', paddingBottom: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src="/logo.png" alt="GOLLOG" style={{ height: '36px' }} />
                  <div>
                    <h1 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0, color: '#F37021', textTransform: 'uppercase' }}>
                      GOLLOG Linhas Aéreas S.A.
                    </h1>
                    <div style={{ fontSize: '11px', color: '#4B5563' }}>
                      Proposta Comercial de Transporte Aéreo de Cargas
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', color: '#6B7280', textTransform: 'uppercase' }}>DATA DA COTAÇÃO</div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#111827' }}>
                    {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ fontSize: '10px', color: '#F37021', fontWeight: 'bold' }}>
                    SIMULAÇÃO COMERCIAL
                  </div>
                </div>
              </div>

              {/* ROTA E DADOS DA CARGA */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>TRECHO DE TRANSPORTE</div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A', marginTop: '2px' }}>
                    {originCity || originPointCode} ➔ {destinationCity || destinationPointCode}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                    {toCollect ? '🚚 Coleta no endereço de origem' : '🏢 Entrega na base/aeroporto de origem'} | {toDelivery ? '🏠 Entrega no endereço de destino' : '✈️ Retirada na base/aeroporto de destino'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>DADOS DA CARGA</div>
                  <div style={{ fontSize: '12px', color: '#0F172A', marginTop: '2px' }}>
                    <strong>Total:</strong> {volumes.reduce((a, v) => a + (parseInt(v.pieces) || 1), 0)} vol(s) | <strong>Peso:</strong> {volumes.reduce((a, v) => a + (parseFloat(v.weight) || 0) * (parseInt(v.pieces) || 1), 0).toFixed(1)} kg
                  </div>
                  {parseFloat(declaredValue || 0) > 0 && (
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      <strong>Valor Declarado:</strong> R$ {parseFloat(declaredValue).toFixed(2).replace('.', ',')}
                    </div>
                  )}
                </div>
              </div>

              {/* TABELA COMPARATIVA DE MODALIDADES */}
              <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ background: '#F3F4F6', padding: '8px 12px', fontWeight: 'bold', fontSize: '11px', color: '#374151' }}>
                  OPÇÕES DE FRETE DISPONÍVEIS
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E5E7EB', background: '#FAFAFA' }}>
                      <th style={{ padding: '8px 12px' }}>Modalidade</th>
                      <th style={{ padding: '8px 12px' }}>Tipo de Entrega</th>
                      <th style={{ padding: '8px 12px' }}>Prazo Estimado</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotationData.quotes.map((q, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6', background: idx === 0 ? '#FFFBEB' : '#FFFFFF' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>
                          GOLLOG {q.productName} {idx === 0 && <span style={{ color: '#D97706', fontSize: '10px' }}>(Recomendado)</span>}
                        </td>
                        <td style={{ padding: '8px 12px' }}>{q.tag || 'Padrão'}</td>
                        <td style={{ padding: '8px 12px' }}>a partir de {q.timeToDelivery} dias úteis</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '800', color: '#0F172A', fontSize: '13px' }}>
                          R$ {q.totalValue.toFixed(2).replace('.', ',')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* NOTA DE VALIDADE */}
              <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '10px 12px', fontSize: '10px', color: '#6B7280', lineHeight: '1.4' }}>
                * Os valores e prazos acima são cotações estimativas fornecidas pela malha aérea GOLLOG com base nas dimensões e peso informados. Valores sujeitos a confirmação no momento da emissão da minuta e entrega da carga.
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL: ENVIAR COTAÇÕES NO WHATSAPP COM LINK DA MINUTA
      ══════════════════════════════════════════════════════ */}
      {showWhatsAppModal && quotationData && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '92vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header Modal */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1.5px solid #E2E8F0',
              background: '#F8FAFC'
            }}>
              <div style={{ fontWeight: '800', fontSize: '16px', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>📲</span> Enviar Cotações no WhatsApp
              </div>
              <button
                type="button"
                onClick={() => setShowWhatsAppModal(false)}
                style={{
                  background: '#EDF2F7',
                  border: 'none',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#4A5568'
                }}
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Informação sobre a funcionalidade */}
              <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '10px', padding: '12px 14px', fontSize: '12px', color: '#065F46', lineHeight: '1.4' }}>
                ✅ <strong>Proposta comercial completa:</strong> Esta mensagem incluirá todos os detalhes de origem (com coleta se houver), destino, volumes e a tabela comparativa de frete com o <strong>link direto para geração da minuta</strong>!
              </div>

              {/* Campo de Telefone */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1E293B', marginBottom: '6px' }}>
                  Número do WhatsApp do Cliente (com DDD):
                </label>
                <input
                  type="text"
                  placeholder="(DDD) 99999-9999"
                  value={whatsAppRecipient}
                  onChange={(e) => setWhatsAppRecipient(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '15px',
                    fontWeight: '600',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                
                {/* Botões de Preenchimento Rápido / Teste Fácil */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {sender.phone && (
                    <button
                      type="button"
                      onClick={() => setWhatsAppRecipient(sender.phone)}
                      style={{
                        background: '#F1F5F9',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      👤 Usar telefone do Remetente ({sender.phone})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setWhatsAppRecipient('(11) 98888-7777')}
                    style={{
                      background: '#FFF7ED',
                      border: '1px solid #FDBA74',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#C2410C',
                      cursor: 'pointer'
                    }}
                  >
                    ⚡ Teste Rápido: (11) 98888-7777
                  </button>
                </div>
              </div>

              {/* Seletor de Escopo: Individual vs Todas */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '12px', color: '#334155' }}>
                  {quoteForWhatsApp ? (
                    <span>Enviando opção selecionada: <strong>GOLLOG {quoteForWhatsApp.productName}</strong> (R$ {quoteForWhatsApp.totalValue.toFixed(2).replace('.', ',')})</span>
                  ) : (
                    <span>Enviando resumo com <strong>todas as opções cotadas</strong> ({quotationData.quotes.length} modalidades)</span>
                  )}
                </div>
                {quoteForWhatsApp && (
                  <button
                    type="button"
                    onClick={() => setQuoteForWhatsApp(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#F37021',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Mudar para Todas
                  </button>
                )}
              </div>

              {/* Prévia do Texto */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Prévia da Mensagem Formatada:
                </div>
                <div style={{
                  background: '#0F172A',
                  color: '#E2E8F0',
                  padding: '14px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  whiteHeight: '1.4',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '180px',
                  overflowY: 'auto'
                }}>
                  {generateCommercialProposalText(quoteForWhatsApp, currentProtocol || 'COT-XXXXXX')}
                </div>
              </div>

            </div>

            {/* Rodapé de Ações do Modal */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              padding: '14px 20px',
              borderTop: '1.5px solid #E2E8F0',
              background: '#F8FAFC'
            }}>
              <button
                type="button"
                onClick={() => setShowWhatsAppModal(false)}
                style={{
                  background: '#FFFFFF',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#64748B',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmSendWhatsApp}
                disabled={sendingBotConversa}
                style={{
                  background: sendingBotConversa ? '#94A3B8' : 'linear-gradient(135deg, #25D366 0%, #1EBE5D 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '800',
                  cursor: sendingBotConversa ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: sendingBotConversa ? 'none' : '0 4px 12px rgba(37, 211, 102, 0.35)',
                  transition: 'all 0.2s ease'
                }}
              >
                <FiSend size={16} /> {sendingBotConversa ? 'Enviando via BotConversa...' : 'Enviar no WhatsApp (BotConversa)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ESTILOS DE IMPRESSÃO CSS */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #minuta-impressao, #minuta-impressao *, #cotacao-impressao, #cotacao-impressao * { visibility: visible; }
          #minuta-impressao, #cotacao-impressao {
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
