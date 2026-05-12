import { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import { supabase } from '../../lib/supabase';
import {
  FiUsers, FiUserPlus, FiDollarSign, FiPackage,
  FiTruck, FiHeadphones, FiTrendingUp, FiTrendingDown,
  FiArrowRight, FiClock
} from 'react-icons/fi';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts';

const chartData = [
  { name:'Jan', clientes:45, cotacoes:32 },
  { name:'Fev', clientes:52, cotacoes:41 },
  { name:'Mar', clientes:61, cotacoes:55 },
  { name:'Abr', clientes:58, cotacoes:48 },
  { name:'Mai', clientes:83, cotacoes:72 },
  { name:'Jun', clientes:71, cotacoes:65 },
  { name:'Jul', clientes:90, cotacoes:80 },
];

const activityColors = {
  cadastro: '#00C853',
  cotacao: '#448AFF',
  rastreamento: '#FFB300',
  coleta: '#7C4DFF',
  suporte: '#FF5252',
  contato: '#F37021',
};

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Agora';
  if (mins < 60) return `Há ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Há ${hrs}h`;
  return `Há ${Math.floor(hrs / 24)}d`;
};

export default function DashboardPage() {
  const [kpiData, setKpiData] = useState({
    totalClientes: 0, novos30d: 0, cotacoes30d: 0,
    rastreios24h: 0, coletasPendentes: 0, ticketsAbertos: 0
  });
  const [activities, setActivities] = useState([]);
  const [topClientes, setTopClientes] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const now = new Date();
    const d30 = new Date(now - 30 * 86400000).toISOString();
    const d24h = new Date(now - 86400000).toISOString();

    // Fetch all counts in parallel
    const [clientesRes, novosRes, cotacoesRes, rastreiosRes, coletasRes, ticketsRes, activitiesRes, topRes] =
      await Promise.all([
        supabase.from('clientes').select('id', { count: 'exact', head: true }),
        supabase.from('clientes').select('id', { count: 'exact', head: true }).gte('created_at', d30),
        supabase.from('cotacoes').select('id', { count: 'exact', head: true }).gte('created_at', d30),
        supabase.from('rastreamentos').select('id', { count: 'exact', head: true }).gte('created_at', d24h),
        supabase.from('coletas').select('id', { count: 'exact', head: true }).eq('status', 'solicitada'),
        supabase.from('suporte_tickets').select('id', { count: 'exact', head: true }).in('status', ['aberto', 'em_atendimento']),
        supabase.from('atividades_log').select('*, clientes(nome_razao_social)').order('created_at', { ascending: false }).limit(8),
        supabase.from('clientes').select('nome_razao_social, tipo, total_envios, valor_total_gasto').order('valor_total_gasto', { ascending: false }).limit(5),
      ]);

    setKpiData({
      totalClientes: clientesRes.count || 0,
      novos30d: novosRes.count || 0,
      cotacoes30d: cotacoesRes.count || 0,
      rastreios24h: rastreiosRes.count || 0,
      coletasPendentes: coletasRes.count || 0,
      ticketsAbertos: ticketsRes.count || 0,
    });

    if (activitiesRes.data) setActivities(activitiesRes.data);
    if (topRes.data) setTopClientes(topRes.data);
  };

  const kpis = [
    { label:'Total Clientes', value: kpiData.totalClientes, icon:FiUsers, color:'#F37021', bg:'rgba(243,112,33,0.12)' },
    { label:'Novos (30d)', value: kpiData.novos30d, icon:FiUserPlus, color:'#00C853', bg:'rgba(0,200,83,0.12)' },
    { label:'Cotações (30d)', value: kpiData.cotacoes30d, icon:FiDollarSign, color:'#448AFF', bg:'rgba(68,138,255,0.12)' },
    { label:'Rastreios (24h)', value: kpiData.rastreios24h, icon:FiPackage, color:'#FFB300', bg:'rgba(255,179,0,0.12)' },
    { label:'Coletas Pendentes', value: kpiData.coletasPendentes, icon:FiTruck, color:'#7C4DFF', bg:'rgba(124,77,255,0.12)' },
    { label:'Tickets Abertos', value: kpiData.ticketsAbertos, icon:FiHeadphones, color:'#FF5252', bg:'rgba(255,82,82,0.12)' },
  ];

  return (
    <>
      <Header title="Dashboard" />
      <div className="page-content animate-in">
        {/* KPI Cards */}
        <div className="kpi-grid">
          {kpis.map((kpi, i) => (
            <div className="kpi-card" key={i} style={{ '--kpi-color': kpi.color, '--kpi-bg': kpi.bg }}>
              <div className="kpi-header">
                <div className="kpi-icon"><kpi.icon /></div>
              </div>
              <div className="kpi-value">{kpi.value}</div>
              <div className="kpi-label">{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid-2 mb-24">
          <div className="card">
            <div className="card-header">
              <span className="card-title">📈 Novos Clientes por Mês</span>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorClientes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F37021" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#F37021" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill:'#6B7280', fontSize:12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:'#6B7280', fontSize:12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background:'#1A1A2E', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'#E8E8F0' }} />
                  <Area type="monotone" dataKey="clientes" stroke="#F37021" strokeWidth={2} fill="url(#colorClientes)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">💰 Cotações Geradas</span>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill:'#6B7280', fontSize:12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:'#6B7280', fontSize:12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background:'#1A1A2E', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'#E8E8F0' }} />
                  <Bar dataKey="cotacoes" fill="#448AFF" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid-2">
          {/* Recent Activities */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">🕐 Atividades Recentes</span>
            </div>
            <div className="card-body">
              {activities.length === 0 ? (
                <div className="empty-state" style={{ padding:30 }}>
                  <p>Nenhuma atividade registrada ainda.</p>
                </div>
              ) : (
                <div className="timeline">
                  {activities.map((act, i) => (
                    <div className="timeline-item" key={i}>
                      <div className="timeline-dot" style={{ background: activityColors[act.tipo] || '#F37021' }} />
                      <div className="timeline-content">
                        <div>{act.descricao}</div>
                        <div className="timeline-time">
                          <FiClock size={10} style={{ marginRight:4 }} />
                          {timeAgo(act.created_at)} · {act.canal}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top Clientes */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">🏆 Top Clientes</span>
            </div>
            <div className="card-body" style={{ padding:0 }}>
              {topClientes.length === 0 ? (
                <div className="empty-state" style={{ padding:30 }}>
                  <p>Cadastre clientes para ver o ranking.</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr><th>Cliente</th><th>Envios</th><th>Valor Total</th></tr>
                  </thead>
                  <tbody>
                    {topClientes.map((c, i) => (
                      <tr key={i}>
                        <td>
                          <span className="name-cell">{c.nome_razao_social}</span>
                          <span className="badge badge-neutral" style={{ marginLeft:6, fontSize:10 }}>{c.tipo}</span>
                        </td>
                        <td>{c.total_envios || 0}</td>
                        <td style={{ color:'#00C853', fontWeight:600 }}>
                          R$ {(c.valor_total_gasto || 0).toLocaleString('pt-BR', { minimumFractionDigits:2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
