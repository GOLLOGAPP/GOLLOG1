import { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import { supabase } from '../../lib/supabase';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  FiUsers, FiHome, FiTrendingUp, FiCalendar, FiClock, FiRefreshCw
} from 'react-icons/fi';

const TOOLTIP_STYLE = {
  background: '#1A1A2E',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: '#E8E8F0',
};
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const formatDate = (d) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

const formatDateTime = (iso) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });

export default function RecepcaoPage() {
  const [periodo, setPeriodo] = useState('7d');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [acessos, setAcessos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [queryError, setQueryError] = useState(null);

  const getPeriodRange = () => {
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    if (periodo === 'hoje') {
      return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()), end: endOfDay };
    }
    if (periodo === '7d') {
      return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6), end: endOfDay };
    }
    if (periodo === '30d') {
      return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29), end: endOfDay };
    }
    // custom
    const start = dataInicio
      ? new Date(dataInicio + 'T00:00:00')
      : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    const end = dataFim ? new Date(dataFim + 'T23:59:59') : endOfDay;
    return { start, end };
  };

  const fetchAcessos = async () => {
    setLoading(true);
    setQueryError(null);
    const { start, end } = getPeriodRange();
    const { data, error } = await supabase
      .from('acessos_base')
      .select('*')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false });
    if (error) setQueryError(error.message);
    setAcessos(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAcessos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo, dataInicio, dataFim]);

  // ── Aggregations ──────────────────────────────────────────
  const totalOsasco = acessos.filter(a => a.base === 'Osasco').length;
  const totalBarueri = acessos.filter(a => a.base === 'Barueri').length;
  const total = acessos.length;

  // By day (sorted chronologically)
  const byDayMap = {};
  acessos.forEach(a => {
    const d = new Date(a.created_at);
    const key = d.toISOString().split('T')[0]; // YYYY-MM-DD for sort
    if (!byDayMap[key]) byDayMap[key] = { date: formatDate(d), Osasco: 0, Barueri: 0 };
    byDayMap[key][a.base]++;
  });
  const dayData = Object.keys(byDayMap).sort().map(k => byDayMap[k]);

  // By hour of day
  const byHour = Array.from({ length: 24 }, (_, h) => ({
    hora: `${String(h).padStart(2, '0')}h`,
    Osasco: 0,
    Barueri: 0,
  }));
  acessos.forEach(a => {
    byHour[new Date(a.created_at).getHours()][a.base]++;
  });
  // Only show hours with data (or keep all 24 for full context)

  // By weekday
  const byWeekday = DIAS_SEMANA.map(dia => ({ dia, Osasco: 0, Barueri: 0 }));
  acessos.forEach(a => {
    byWeekday[new Date(a.created_at).getDay()][a.base]++;
  });

  const pieData = [
    { name: 'Osasco (QOZ)', value: totalOsasco },
    { name: 'Barueri (QBX)', value: totalBarueri },
  ];

  const mediaPerDay = total > 0 && dayData.length > 0
    ? (total / dayData.length).toFixed(1)
    : '0';

  const PERIODO_OPTIONS = [
    { label: 'Hoje', value: 'hoje' },
    { label: 'Últimos 7 dias', value: '7d' },
    { label: 'Últimos 30 dias', value: '30d' },
    { label: 'Personalizado', value: 'custom' },
  ];

  return (
    <>
      <Header title="Recepção Bot" />
      <div className="page-content animate-in">

        {/* ── Period Filter ── */}
        <div className="card mb-24">
          <div className="card-body" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {PERIODO_OPTIONS.map(op => (
              <button
                key={op.value}
                className={`btn ${periodo === op.value ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPeriodo(op.value)}
              >
                <FiCalendar size={13} style={{ marginRight: 5 }} />
                {op.label}
              </button>
            ))}
            {periodo === 'custom' && (
              <>
                <input
                  type="date"
                  className="input"
                  value={dataInicio}
                  onChange={e => setDataInicio(e.target.value)}
                  style={{ width: 150 }}
                />
                <span style={{ color: '#6B7280' }}>até</span>
                <input
                  type="date"
                  className="input"
                  value={dataFim}
                  onChange={e => setDataFim(e.target.value)}
                  style={{ width: 150 }}
                />
              </>
            )}
            <button
              className="btn btn-ghost btn-icon"
              onClick={fetchAcessos}
              title="Atualizar"
              style={{ marginLeft: 'auto' }}
            >
              <FiRefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* ── Query Error Banner ── */}
        {queryError && (
          <div className="card mb-24" style={{ borderLeft: '4px solid #EF4444', background: 'rgba(239,68,68,0.08)' }}>
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#EF4444' }}>
              <strong>Erro ao buscar dados:</strong> {queryError}
            </div>
          </div>
        )}

        {/* ── KPI Cards ── */}
        <div className="kpi-grid mb-24">
          <div className="kpi-card" style={{ '--kpi-color': '#F37021', '--kpi-bg': 'rgba(243,112,33,0.12)' }}>
            <div className="kpi-header"><div className="kpi-icon"><FiUsers /></div></div>
            <div className="kpi-value">{loading ? '—' : total}</div>
            <div className="kpi-label">Total de Acessos</div>
          </div>
          <div className="kpi-card" style={{ '--kpi-color': '#F37021', '--kpi-bg': 'rgba(243,112,33,0.12)' }}>
            <div className="kpi-header"><div className="kpi-icon"><FiHome /></div></div>
            <div className="kpi-value">{loading ? '—' : totalOsasco}</div>
            <div className="kpi-label">GOLLOG Osasco (QOZ)</div>
          </div>
          <div className="kpi-card" style={{ '--kpi-color': '#448AFF', '--kpi-bg': 'rgba(68,138,255,0.12)' }}>
            <div className="kpi-header"><div className="kpi-icon"><FiHome /></div></div>
            <div className="kpi-value">{loading ? '—' : totalBarueri}</div>
            <div className="kpi-label">GOLLOG Barueri (QBX)</div>
          </div>
          <div className="kpi-card" style={{ '--kpi-color': '#00C853', '--kpi-bg': 'rgba(0,200,83,0.12)' }}>
            <div className="kpi-header"><div className="kpi-icon"><FiTrendingUp /></div></div>
            <div className="kpi-value">{loading ? '—' : total > 0 ? `${Math.round(totalOsasco / total * 100)}%` : '0%'}</div>
            <div className="kpi-label">Share Osasco</div>
          </div>
          <div className="kpi-card" style={{ '--kpi-color': '#7C4DFF', '--kpi-bg': 'rgba(124,77,255,0.12)' }}>
            <div className="kpi-header"><div className="kpi-icon"><FiTrendingUp /></div></div>
            <div className="kpi-value">{loading ? '—' : total > 0 ? `${Math.round(totalBarueri / total * 100)}%` : '0%'}</div>
            <div className="kpi-label">Share Barueri</div>
          </div>
          <div className="kpi-card" style={{ '--kpi-color': '#FFB300', '--kpi-bg': 'rgba(255,179,0,0.12)' }}>
            <div className="kpi-header"><div className="kpi-icon"><FiClock /></div></div>
            <div className="kpi-value">{loading ? '—' : `${mediaPerDay}/dia`}</div>
            <div className="kpi-label">Média por Dia</div>
          </div>
        </div>

        {/* ── Row 1: By Day + Pie ── */}
        <div className="grid-2 mb-24">
          <div className="card">
            <div className="card-header">
              <span className="card-title">📊 Acessos por Dia</span>
            </div>
            <div className="card-body">
              {dayData.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dayData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend />
                    <Bar dataKey="Osasco" fill="#F37021" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Barueri" fill="#448AFF" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">🥧 Distribuição por Base</span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              {total === 0 ? (
                <EmptyChart />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={85}
                        dataKey="value"
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        <Cell fill="#F37021" />
                        <Cell fill="#448AFF" />
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [v, 'Acessos']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', gap: 24, marginTop: 4 }}>
                    <LegendDot color="#F37021" label={`Osasco: ${totalOsasco}`} />
                    <LegendDot color="#448AFF" label={`Barueri: ${totalBarueri}`} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Row 2: By Hour + By Weekday ── */}
        <div className="grid-2 mb-24">
          <div className="card">
            <div className="card-header">
              <span className="card-title">🕐 Acessos por Hora do Dia</span>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="hora" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="Osasco" stackId="h" fill="#F37021" />
                  <Bar dataKey="Barueri" stackId="h" fill="#448AFF" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">📅 Acessos por Dia da Semana</span>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byWeekday}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="dia" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend />
                  <Bar dataKey="Osasco" fill="#F37021" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Barueri" fill="#448AFF" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Recent Accesses Table ── */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">📋 Últimos Acessos</span>
            <span style={{ color: '#6B7280', fontSize: 13 }}>{total} no período</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {acessos.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <p>Nenhum acesso no período selecionado.</p>
                <p style={{ fontSize: 13, marginTop: 8, color: '#6B7280' }}>
                  O Botconversa precisa enviar um webhook <code>POST</code> para{' '}
                  <code>/api/webhook/botconversa</code> com o payload{' '}
                  <code>{`{ "action": "selecao_base", "phone": "...", "name": "...", "data": { "base": "Osasco" } }`}</code>{' '}
                  ao receber a escolha do cliente.
                </p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Telefone</th>
                    <th>Base</th>
                    <th>Data/Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {acessos.slice(0, 100).map((a, i) => (
                    <tr key={i}>
                      <td>{a.nome || '—'}</td>
                      <td style={{ color: '#9CA3AF' }}>{a.telefone || '—'}</td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          background: a.base === 'Osasco' ? 'rgba(243,112,33,0.15)' : 'rgba(68,138,255,0.15)',
                          color: a.base === 'Osasco' ? '#F37021' : '#448AFF',
                          border: `1px solid ${a.base === 'Osasco' ? '#F37021' : '#448AFF'}40`,
                        }}>
                          {a.base} ({a.codigo_base})
                        </span>
                      </td>
                      <td style={{ color: '#6B7280' }}>{formatDateTime(a.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </>
  );
}

function EmptyChart() {
  return (
    <div className="empty-state" style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p>Sem dados no período.</p>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 12, height: 12, borderRadius: 3, background: color }} />
      <span style={{ color: '#9CA3AF', fontSize: 13 }}>{label}</span>
    </div>
  );
}
