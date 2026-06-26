import { useEffect, useState, useCallback } from 'react';
import { Row, Col, Card, Statistic, Typography, Table, Tag, Spin, Modal, Progress } from 'antd';
import {
  DesktopOutlined, CheckCircleOutlined, CloseCircleOutlined,
  WarningOutlined, ClockCircleOutlined, PercentageOutlined,
} from '@ant-design/icons';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getOsDistribution, getStorageUsage,
  getDevicesPerUnit, getAlertHistory, getDevices, getRamDistribution,
  getDiskHealth, getTopSoftware, getDevicesByOs, getDevicesByRam,
  getDevicesByStorageType, getStorageCapacity } from '../api/endpoints';
import { useWebSocket } from '../hooks/useWebSocket';
import type { WSMessage } from '../hooks/useWebSocket';
import { useThemeStore } from '../store/themeStore';
import type { DashboardStats, ChartDataPoint, AlertHistoryPoint, Device } from '../types';

const { Title, Text } = Typography;
const COLORS = ['#1565FF', '#00BFA5', '#FFB020', '#FF4D4F', '#7C3AED', '#0EA5E9', '#F472B6'];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [osData, setOsData] = useState<ChartDataPoint[]>([]);
  const [storageData, setStorageData] = useState<ChartDataPoint[]>([]);
  const [unitData, setUnitData] = useState<ChartDataPoint[]>([]);
  const [alertData, setAlertData] = useState<AlertHistoryPoint[]>([]);
  const [ramData, setRamData] = useState<ChartDataPoint[]>([]);
  const [diskHealth, setDiskHealth] = useState<any[]>([]);
  const [topSoftware, setTopSoftware] = useState<{ name: string; count: number }[]>([]);
  const [storageCapacity, setStorageCapacity] = useState<any[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isDark = useThemeStore((s) => s.mode === 'dark');

  // Drill-down modal state
  const [drillModal, setDrillModal] = useState<{ open: boolean; title: string; data: any[]; columns: any[] }>({
    open: false, title: '', data: [], columns: [],
  });
  const [drillLoading, setDrillLoading] = useState(false);

  const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 };
  const tooltipStyle = { background: isDark ? '#162032' : '#ffffff', border: '1px solid var(--border)', borderRadius: 8, color: isDark ? '#E6EAF0' : '#1a1a2e' };
  const axisColor = isDark ? '#5B6470' : '#9ca3af';
  const gridColor = isDark ? '#1E293B' : '#e5e7eb';

  const deviceColumns = [
    { title: 'Hostname', dataIndex: 'hostname', key: 'hostname',
      render: (t: string, r: any) => <a onClick={() => { setDrillModal(p => ({ ...p, open: false })); navigate(`/devices/${r.id}`); }} style={{ color: '#1565FF' }}>{t}</a> },
    { title: 'Usuário', dataIndex: 'current_user', key: 'user', render: (v: string) => v || '-' },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 90,
      render: (s: string) => <Tag color={s === 'online' ? 'green' : 'red'}>{(s || '').toUpperCase()}</Tag> },
    { title: 'Última Comunicação', dataIndex: 'last_seen', key: 'ls',
      render: (v: string) => v ? new Date(v).toLocaleString('pt-BR') : '-' },
  ];

  // ── Drill-down handlers ──
  const drillOs = async (label: string) => {
    setDrillLoading(true);
    setDrillModal({ open: true, title: `Dispositivos — ${label}`, data: [], columns: [
      ...deviceColumns,
      { title: 'Versão', dataIndex: 'os_version', key: 'ver', render: (v: string) => v || '-' },
    ]});
    const { data } = await getDevicesByOs(label);
    setDrillModal(p => ({ ...p, data }));
    setDrillLoading(false);
  };

  const drillRam = async (label: string) => {
    setDrillLoading(true);
    setDrillModal({ open: true, title: `Dispositivos — RAM ${label}`, data: [], columns: [
      ...deviceColumns,
      { title: 'RAM', dataIndex: 'ram_gb', key: 'ram', render: (v: number) => `${v} GB` },
    ]});
    const { data } = await getDevicesByRam(label);
    setDrillModal(p => ({ ...p, data }));
    setDrillLoading(false);
  };

  const drillStorage = async (label: string) => {
    setDrillLoading(true);
    setDrillModal({ open: true, title: `Discos — ${label}`, data: [], columns: [
      { title: 'Hostname', dataIndex: 'hostname', key: 'hostname',
        render: (t: string, r: any) => <a onClick={() => { setDrillModal(p => ({ ...p, open: false })); navigate(`/devices/${r.id}`); }} style={{ color: '#1565FF' }}>{t}</a> },
      { title: 'Modelo', dataIndex: 'model', key: 'model', ellipsis: true },
      { title: 'Capacidade', dataIndex: 'capacity_gb', key: 'cap', render: (v: number) => `${v} GB` },
      { title: 'Usado', dataIndex: 'used_gb', key: 'used', render: (v: number) => `${v} GB` },
      { title: 'Livre', dataIndex: 'free_gb', key: 'free', render: (v: number) => `${v} GB` },
      { title: 'Saúde', dataIndex: 'health', key: 'health',
        render: (v: string) => <Tag color={v === 'OK' || v === 'Healthy' ? 'green' : v === '-' ? 'default' : 'red'}>{v}</Tag> },
    ]});
    const { data } = await getDevicesByStorageType(label);
    setDrillModal(p => ({ ...p, data }));
    setDrillLoading(false);
  };

  // ── Data loading ──
  const refreshStats = useCallback(async () => {
    try { const { data } = await getDashboardStats(); setStats(data); } catch {}
  }, []);
  const refreshDeviceTable = useCallback(async () => {
    try { const { data } = await getDevices({ page_size: 10 }); setDevices(data); } catch {}
  }, []);
  const refreshCharts = useCallback(async () => {
    try {
      const [osRes, storageRes, unitRes, ramRes, diskRes, swRes, alertRes, capRes] = await Promise.all([
        getOsDistribution(), getStorageUsage(), getDevicesPerUnit(),
        getRamDistribution(), getDiskHealth(), getTopSoftware(10), getAlertHistory(),
        getStorageCapacity(),
      ]);
      setOsData(osRes.data.data); setStorageData(storageRes.data.data);
      setUnitData(unitRes.data.data); setRamData(ramRes.data.data);
      setDiskHealth(diskRes.data); setTopSoftware(swRes.data);
      setAlertData(alertRes.data); setStorageCapacity(capRes.data);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => { await Promise.all([refreshStats(), refreshDeviceTable(), refreshCharts()]); setLoading(false); })();
  }, []);
  useEffect(() => { const i = setInterval(refreshStats, 60000); return () => clearInterval(i); }, [refreshStats]);

  const handleWsMessage = useCallback((msg: WSMessage) => {
    if (msg.type === 'status_change') {
      if (msg.agent_id) setDevices(prev => prev.map(d => d.agent_id === msg.agent_id ? { ...d, status: (msg.status as Device['status']) || d.status, last_seen: msg.last_seen || d.last_seen } : d));
      refreshStats();
    } else if (msg.type === 'heartbeat' && msg.agent_id) {
      setDevices(prev => prev.map(d => d.agent_id === msg.agent_id ? { ...d, status: 'online', last_seen: msg.last_seen || d.last_seen } : d));
    } else if (msg.type === 'inventory_updated') {
      refreshCharts(); refreshDeviceTable(); refreshStats();
    }
  }, [refreshStats, refreshCharts, refreshDeviceTable]);
  useWebSocket(handleWsMessage);

  if (loading) return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />;

  const statCards = [
    { title: 'Total de Ativos', value: stats?.total_devices || 0, icon: <DesktopOutlined />, color: '#1565FF', onClick: () => navigate('/devices') },
    { title: 'Online', value: stats?.online || 0, icon: <CheckCircleOutlined />, color: '#00BFA5', onClick: () => navigate('/devices?status=online') },
    { title: 'Offline', value: stats?.offline || 0, icon: <CloseCircleOutlined />, color: '#FF4D4F', onClick: () => navigate('/devices?status=offline') },
    { title: 'Alertas', value: stats?.alerts || 0, icon: <WarningOutlined />, color: '#FFB020', onClick: () => navigate('/devices?status=offline') },
    { title: 'Uptime Médio', value: `${stats?.avg_uptime_percent || 0}%`, icon: <PercentageOutlined />, color: '#7C3AED', onClick: () => navigate('/devices') },
    { title: 'Tempo Offline Médio', value: `${stats?.avg_offline_hours || 0}h`, icon: <ClockCircleOutlined />, color: '#0EA5E9', onClick: () => navigate('/devices?status=offline') },
  ];

  // Storage capacity grouped for chart
  const capacityByType: Record<string, { total: number; used: number }> = {};
  storageCapacity.forEach(s => {
    const t = s.media_type || 'HDD';
    if (!capacityByType[t]) capacityByType[t] = { total: 0, used: 0 };
    capacityByType[t].total += s.capacity_gb;
    capacityByType[t].used += s.used_gb;
  });
  const capacityChartData = Object.entries(capacityByType).map(([type, v]) => ({
    label: type, total: Math.round(v.total), used: Math.round(v.used), free: Math.round(v.total - v.used),
  }));

  // High usage disks (>80%)
  const highUsageDisks = storageCapacity.filter(s => s.usage_pct >= 80).sort((a, b) => b.usage_pct - a.usage_pct);

  const diskColumns = [
    { title: 'Máquina', dataIndex: 'hostname', key: 'hostname', width: 150,
      render: (t: string, r: any) => <a onClick={() => navigate(`/devices/${r.id}`)} style={{ color: '#1565FF' }}>{t}</a> },
    { title: 'Disco', dataIndex: 'model', key: 'model', ellipsis: true },
    { title: 'Tipo', dataIndex: 'media_type', key: 'type', width: 80,
      render: (v: string) => <Tag color={v === 'NVMe' ? 'purple' : v === 'SSD' ? 'blue' : 'default'}>{v}</Tag> },
    { title: 'Capacidade', dataIndex: 'capacity_gb', key: 'cap', width: 100, render: (v: number) => `${v} GB` },
    { title: 'Saúde', dataIndex: 'health', key: 'health', width: 110,
      render: (v: string) => <Tag color={v === 'OK' || v === 'Healthy' ? 'green' : v === 'Desconhecido' || v === '-' ? 'default' : 'red'}>{v}</Tag> },
  ];

  const tableColumns = [
    { title: 'Hostname', dataIndex: 'hostname', key: 'hostname',
      render: (text: string, record: Device) => <a onClick={() => navigate(`/devices/${record.id}`)} style={{ color: '#1565FF', fontWeight: 500 }}>{text}</a> },
    { title: 'Usuário', dataIndex: 'current_user', key: 'user' },
    { title: 'Processador', dataIndex: 'cpu_model', key: 'cpu', ellipsis: true, render: (v: string) => v || '-' },
    { title: 'RAM', dataIndex: 'ram_total_gb', key: 'ram', width: 80, render: (v: number) => v ? `${v} GB` : '-' },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 90,
      render: (status: string) => <Tag color={status === 'online' ? '#00BFA5' : '#FF4D4F'} style={{ borderRadius: 6, fontWeight: 500 }}>{status.toUpperCase()}</Tag> },
    { title: 'Última Comunicação', dataIndex: 'last_seen', key: 'last_seen',
      render: (v: string) => v ? new Date(v).toLocaleString('pt-BR') : '-' },
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24, color: 'var(--text)', fontFamily: "'Poppins', sans-serif" }}>Dashboard</Title>

      {/* Stat Cards */}
      <Row gutter={[16, 16]}>
        {statCards.map((s, i) => (
          <Col xs={12} sm={8} md={4} key={i}>
            <Card hoverable onClick={s.onClick}
              style={{ ...cardStyle, borderTop: `3px solid ${s.color}`, height: '100%', cursor: 'pointer', transition: 'all 0.2s' }}>
              <Statistic
                title={<span style={{ color: 'var(--text-secondary)', fontFamily: "'Poppins', sans-serif", fontSize: 11 }}>{s.title}</span>}
                value={s.value}
                prefix={<span style={{ color: s.color, fontSize: 18 }}>{s.icon}</span>}
                valueStyle={{ color: 'var(--text)', fontWeight: 700, fontFamily: "'Poppins', sans-serif", fontSize: 22 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* OS + RAM - clickable */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Sistemas Operacionais" style={cardStyle} extra={<Text style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Clique para ver dispositivos</Text>}
            styles={{ header: { borderBottom: '1px solid var(--border)', color: 'var(--text)' } }}>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={osData} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={95}
                  innerRadius={55} label strokeWidth={0} style={{ cursor: 'pointer' }}
                  onClick={(entry) => drillOs(entry.label)}>
                  {osData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Distribuição de RAM" style={cardStyle} extra={<Text style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Clique para ver dispositivos</Text>}
            styles={{ header: { borderBottom: '1px solid var(--border)', color: 'var(--text)' } }}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ramData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="label" stroke={axisColor} />
                <YAxis stroke={axisColor} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill="#7C3AED" radius={[6, 6, 0, 0]} name="Dispositivos"
                  style={{ cursor: 'pointer' }} onClick={(entry) => drillRam(entry.label)} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Storage Type + Capacity */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Armazenamento por Tipo" style={cardStyle} extra={<Text style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Clique para ver discos</Text>}
            styles={{ header: { borderBottom: '1px solid var(--border)', color: 'var(--text)' } }}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={storageData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="label" stroke={axisColor} />
                <YAxis stroke={axisColor} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill="#1565FF" radius={[6, 6, 0, 0]} name="Discos"
                  style={{ cursor: 'pointer' }} onClick={(entry) => drillStorage(entry.label)} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Capacidade Total por Tipo (GB)" style={cardStyle}
            styles={{ header: { borderBottom: '1px solid var(--border)', color: 'var(--text)' } }}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={capacityChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="label" stroke={axisColor} />
                <YAxis stroke={axisColor} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="used" fill="#FF4D4F" stackId="a" name="Usado (GB)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="free" fill="#00BFA5" stackId="a" name="Livre (GB)" radius={[6, 6, 0, 0]} />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Disk usage + Devices per Unit */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title={`Discos com Alto Uso (≥80%) — ${highUsageDisks.length} encontrados`} style={cardStyle}
            styles={{ header: { borderBottom: '1px solid var(--border)', color: 'var(--text)' } }}>
            {highUsageDisks.length === 0 ? (
              <Text style={{ color: 'var(--text-secondary)' }}>Nenhum disco com uso acima de 80%</Text>
            ) : (
              <Table dataSource={highUsageDisks} rowKey={(r) => `${r.hostname}-${r.model}`} size="small" pagination={{ pageSize: 8 }}
                columns={[
                  { title: 'Máquina', dataIndex: 'hostname', key: 'h', width: 140,
                    render: (t: string, r: any) => <a onClick={() => navigate(`/devices/${r.id}`)} style={{ color: '#1565FF' }}>{t}</a> },
                  { title: 'Disco', dataIndex: 'model', key: 'm', ellipsis: true },
                  { title: 'Tipo', dataIndex: 'media_type', key: 't', width: 70,
                    render: (v: string) => <Tag color={v === 'NVMe' ? 'purple' : v === 'SSD' ? 'blue' : 'default'}>{v}</Tag> },
                  { title: 'Uso', dataIndex: 'usage_pct', key: 'u', width: 150,
                    render: (v: number) => <Progress percent={v} size="small"
                      strokeColor={v >= 95 ? '#FF4D4F' : v >= 90 ? '#FFB020' : '#1565FF'} /> },
                  { title: 'Livre', dataIndex: 'free_gb', key: 'f', width: 80, render: (v: number) => `${v} GB` },
                ]} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Dispositivos por Unidade" style={cardStyle}
            styles={{ header: { borderBottom: '1px solid var(--border)', color: 'var(--text)' } }}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={unitData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="label" stroke={axisColor} />
                <YAxis stroke={axisColor} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill="#00BFA5" radius={[6, 6, 0, 0]} name="Dispositivos" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Top Software + Alert History */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Top 10 Softwares Instalados" style={cardStyle}
            styles={{ header: { borderBottom: '1px solid var(--border)', color: 'var(--text)' } }}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topSoftware} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis type="number" stroke={axisColor} />
                <YAxis type="category" dataKey="name" stroke={axisColor} width={180} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#0EA5E9" radius={[0, 6, 6, 0]} name="Instalações" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Histórico de Alterações" style={cardStyle}
            styles={{ header: { borderBottom: '1px solid var(--border)', color: 'var(--text)' } }}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={alertData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" stroke={axisColor} />
                <YAxis stroke={axisColor} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="count" stroke="#FFB020" strokeWidth={2} dot={false} name="Alterações" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Disk Health + Recent Devices */}
      <Card title="Saúde dos Discos" style={{ ...cardStyle, marginTop: 16 }}
        styles={{ header: { borderBottom: '1px solid var(--border)', color: 'var(--text)' } }}>
        <Table dataSource={diskHealth} columns={diskColumns} rowKey={(r) => `${r.hostname}-${r.model}`}
          pagination={{ pageSize: 8 }} size="small" />
      </Card>

      <Card title="Últimos Ativos Cadastrados" style={{ ...cardStyle, marginTop: 16 }}
        styles={{ header: { borderBottom: '1px solid var(--border)', color: 'var(--text)' } }}
        extra={<a onClick={() => navigate('/devices')} style={{ color: '#1565FF' }}>Ver todos</a>}>
        <Table dataSource={devices} columns={tableColumns} rowKey="id" pagination={false} size="small"
          onRow={(record) => ({ onClick: () => navigate(`/devices/${record.id}`), style: { cursor: 'pointer' } })} />
      </Card>

      {/* Drill-down Modal */}
      <Modal title={drillModal.title} open={drillModal.open} footer={null} width={900}
        onCancel={() => setDrillModal(p => ({ ...p, open: false }))}>
        <Table dataSource={drillModal.data} columns={drillModal.columns} rowKey="id"
          loading={drillLoading} size="small" pagination={{ pageSize: 15 }}
          onRow={(r) => ({ onClick: () => { setDrillModal(p => ({ ...p, open: false })); navigate(`/devices/${r.id}`); }, style: { cursor: 'pointer' } })} />
      </Modal>
    </div>
  );
}
