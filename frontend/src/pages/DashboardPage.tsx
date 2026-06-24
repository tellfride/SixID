import { useEffect, useState, useCallback } from 'react';
import { Row, Col, Card, Statistic, Typography, Table, Tag, Spin } from 'antd';
import {
  DesktopOutlined, CheckCircleOutlined, CloseCircleOutlined,
  WarningOutlined, ClockCircleOutlined, PercentageOutlined,
} from '@ant-design/icons';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getOsDistribution, getStorageUsage,
  getDevicesPerUnit, getAlertHistory, getDevices, getRamDistribution,
  getDiskHealth, getTopSoftware } from '../api/endpoints';
import { useWebSocket } from '../hooks/useWebSocket';
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
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isDark = useThemeStore((s) => s.mode === 'dark');

  const cardStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
  };
  const tooltipStyle = {
    background: isDark ? '#162032' : '#ffffff',
    border: `1px solid var(--border)`,
    borderRadius: 8,
    color: isDark ? '#E6EBF1' : '#1a1a2e',
  };
  const axisColor = isDark ? '#5B6470' : '#9ca3af';
  const gridColor = isDark ? '#1E293B' : '#e5e7eb';

  const loadData = async () => {
    try {
      const [statsRes, osRes, storageRes, unitRes, alertRes, devicesRes, ramRes, diskRes, swRes] = await Promise.all([
        getDashboardStats(),
        getOsDistribution(),
        getStorageUsage(),
        getDevicesPerUnit(),
        getAlertHistory(),
        getDevices({ page_size: 10 }),
        getRamDistribution(),
        getDiskHealth(),
        getTopSoftware(10),
      ]);
      setStats(statsRes.data);
      setOsData(osRes.data.data);
      setStorageData(storageRes.data.data);
      setUnitData(unitRes.data.data);
      setAlertData(alertRes.data);
      setDevices(devicesRes.data);
      setRamData(ramRes.data.data);
      setDiskHealth(diskRes.data);
      setTopSoftware(swRes.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleWsMessage = useCallback(() => { loadData(); }, []);
  useWebSocket(handleWsMessage);

  const columns = [
    { title: 'Hostname', dataIndex: 'hostname', key: 'hostname',
      render: (text: string, record: Device) => (
        <a onClick={() => navigate(`/devices/${record.id}`)} style={{ color: '#1565FF', fontWeight: 500 }}>{text}</a>
      ),
    },
    { title: 'Usuário', dataIndex: 'current_user', key: 'user' },
    { title: 'Processador', dataIndex: 'cpu_model', key: 'cpu', ellipsis: true, render: (v: string) => v || '-' },
    { title: 'RAM', dataIndex: 'ram_total_gb', key: 'ram', width: 80, render: (v: number) => v ? `${v} GB` : '-' },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 90,
      render: (status: string) => (
        <Tag color={status === 'online' ? '#00BFA5' : status === 'offline' ? '#FF4D4F' : '#5B6470'}
          style={{ borderRadius: 6, fontWeight: 500 }}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    { title: 'Última Comunicação', dataIndex: 'last_seen', key: 'last_seen',
      render: (v: string) => v ? new Date(v).toLocaleString('pt-BR') : '-',
    },
  ];

  if (loading) return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />;

  const statCards = [
    { title: 'Total de Ativos', value: stats?.total_devices || 0, icon: <DesktopOutlined />, color: '#1565FF', onClick: () => navigate('/devices') },
    { title: 'Online', value: stats?.online || 0, icon: <CheckCircleOutlined />, color: '#00BFA5', onClick: () => navigate('/devices?status=online') },
    { title: 'Offline', value: stats?.offline || 0, icon: <CloseCircleOutlined />, color: '#FF4D4F', onClick: () => navigate('/devices?status=offline') },
    { title: 'Alertas', value: stats?.alerts || 0, icon: <WarningOutlined />, color: '#FFB020', onClick: () => navigate('/devices?status=offline') },
    { title: 'Uptime Médio', value: `${stats?.avg_uptime_percent || 0}%`, icon: <PercentageOutlined />, color: '#7C3AED', onClick: () => navigate('/devices') },
    { title: 'Tempo Offline Médio', value: `${stats?.avg_offline_hours || 0}h`, icon: <ClockCircleOutlined />, color: '#0EA5E9', onClick: () => navigate('/devices?status=offline') },
  ];

  const diskColumns = [
    { title: 'Máquina', dataIndex: 'hostname', key: 'hostname', width: 150 },
    { title: 'Disco', dataIndex: 'model', key: 'model', ellipsis: true },
    { title: 'Tipo', dataIndex: 'media_type', key: 'type', width: 80,
      render: (v: string) => <Tag color={v === 'NVMe' ? 'purple' : v === 'SSD' ? 'blue' : 'default'}>{v}</Tag> },
    { title: 'Capacidade', dataIndex: 'capacity_gb', key: 'cap', width: 100, render: (v: number) => `${v} GB` },
    { title: 'Saúde', dataIndex: 'health', key: 'health', width: 110,
      render: (v: string) => <Tag color={v === 'OK' || v === 'Healthy' ? 'green' : v === 'Desconhecido' ? 'default' : 'red'}>{v}</Tag> },
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24, color: 'var(--text)', fontFamily: "'Poppins', sans-serif" }}>
        Dashboard
      </Title>

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

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Sistemas Operacionais" style={cardStyle}
            styles={{ header: { borderBottom: `1px solid var(--border)`, color: 'var(--text)' } }}>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={osData} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={95}
                  innerRadius={55} label strokeWidth={0}>
                  {osData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Distribuição de RAM" style={cardStyle}
            styles={{ header: { borderBottom: `1px solid var(--border)`, color: 'var(--text)' } }}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ramData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="label" stroke={axisColor} />
                <YAxis stroke={axisColor} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill="#7C3AED" radius={[6, 6, 0, 0]} name="Dispositivos" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Armazenamento por Tipo" style={cardStyle}
            styles={{ header: { borderBottom: `1px solid var(--border)`, color: 'var(--text)' } }}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={storageData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="label" stroke={axisColor} />
                <YAxis stroke={axisColor} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill="#1565FF" radius={[6, 6, 0, 0]} name="Discos" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Dispositivos por Unidade" style={cardStyle}
            styles={{ header: { borderBottom: `1px solid var(--border)`, color: 'var(--text)' } }}>
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

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Top 10 Softwares Instalados" style={cardStyle}
            styles={{ header: { borderBottom: `1px solid var(--border)`, color: 'var(--text)' } }}>
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
            styles={{ header: { borderBottom: `1px solid var(--border)`, color: 'var(--text)' } }}>
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

      <Card title="Saúde dos Discos" style={{ ...cardStyle, marginTop: 16 }}
        styles={{ header: { borderBottom: `1px solid var(--border)`, color: 'var(--text)' } }}>
        <Table dataSource={diskHealth} columns={diskColumns} rowKey={(r) => `${r.hostname}-${r.model}`}
          pagination={{ pageSize: 8 }} size="small" />
      </Card>

      <Card title="Últimos Ativos Cadastrados" style={{ ...cardStyle, marginTop: 16 }}
        styles={{ header: { borderBottom: `1px solid var(--border)`, color: 'var(--text)' } }}
        extra={<a onClick={() => navigate('/devices')} style={{ color: '#1565FF' }}>Ver todos</a>}>
        <Table dataSource={devices} columns={columns} rowKey="id" pagination={false} size="small"
          onRow={(record) => ({ onClick: () => navigate(`/devices/${record.id}`), style: { cursor: 'pointer' } })} />
      </Card>
    </div>
  );
}
