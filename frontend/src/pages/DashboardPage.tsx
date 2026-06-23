import { useEffect, useState, useCallback } from 'react';
import { Row, Col, Card, Statistic, Typography, Table, Tag, Spin } from 'antd';
import {
  DesktopOutlined, CheckCircleOutlined, CloseCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getOsDistribution, getStorageUsage,
  getDevicesPerUnit, getAlertHistory, getDevices } from '../api/endpoints';
import { useWebSocket } from '../hooks/useWebSocket';
import type { DashboardStats, ChartDataPoint, AlertHistoryPoint, Device } from '../types';

const { Title } = Typography;

const COLORS = ['#1565FF', '#00BFA5', '#FFB020', '#FF4D4F', '#7C3AED', '#0EA5E9', '#F472B6'];

const cardStyle = {
  background: '#111927',
  border: '1px solid #1E293B',
  borderRadius: 12,
};

const tooltipStyle = {
  background: '#162032',
  border: '1px solid #1E293B',
  borderRadius: 8,
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [osData, setOsData] = useState<ChartDataPoint[]>([]);
  const [storageData, setStorageData] = useState<ChartDataPoint[]>([]);
  const [unitData, setUnitData] = useState<ChartDataPoint[]>([]);
  const [alertData, setAlertData] = useState<AlertHistoryPoint[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      const [statsRes, osRes, storageRes, unitRes, alertRes, devicesRes] = await Promise.all([
        getDashboardStats(),
        getOsDistribution(),
        getStorageUsage(),
        getDevicesPerUnit(),
        getAlertHistory(),
        getDevices({ page_size: 10 }),
      ]);
      setStats(statsRes.data);
      setOsData(osRes.data.data);
      setStorageData(storageRes.data.data);
      setUnitData(unitRes.data.data);
      setAlertData(alertRes.data);
      setDevices(devicesRes.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleWsMessage = useCallback(() => {
    loadData();
  }, []);

  useWebSocket(handleWsMessage);

  const columns = [
    { title: 'Hostname', dataIndex: 'hostname', key: 'hostname',
      render: (text: string, record: Device) => (
        <a onClick={() => navigate(`/devices/${record.id}`)} style={{ color: '#1565FF', fontWeight: 500 }}>{text}</a>
      ),
    },
    { title: 'Usuário', dataIndex: 'current_user', key: 'user' },
    { title: 'Processador', dataIndex: 'cpu_model', key: 'cpu', ellipsis: true,
      render: (v: string) => v || '-' },
    { title: 'RAM', dataIndex: 'ram_total_gb', key: 'ram', width: 80,
      render: (v: number) => v ? `${v} GB` : '-' },
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
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24, color: '#E6EBF1', fontFamily: "'Poppins', sans-serif" }}>
        Dashboard
      </Title>

      <Row gutter={[16, 16]}>
        {statCards.map((s, i) => (
          <Col xs={12} sm={12} md={6} lg={6} xl={6} key={i}>
            <Card
              style={{ ...cardStyle, borderTop: `3px solid ${s.color}`, cursor: 'pointer', transition: 'all 0.2s', height: '100%' }}
              hoverable
              onClick={s.onClick}
            >
              <Statistic
                title={<span style={{ color: '#5B6470', fontFamily: "'Poppins', sans-serif", fontSize: 12 }}>{s.title}</span>}
                value={s.value}
                prefix={<span style={{ color: s.color, fontSize: 20 }}>{s.icon}</span>}
                valueStyle={{ color: '#E6EBF1', fontWeight: 700, fontFamily: "'Poppins', sans-serif", fontSize: 24 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Sistemas Operacionais" style={cardStyle}
            styles={{ header: { borderBottom: '1px solid #1E293B', color: '#E6EBF1' } }}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={osData} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={100}
                  innerRadius={60} label strokeWidth={0}>
                  {osData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Armazenamento por Tipo" style={cardStyle}
            styles={{ header: { borderBottom: '1px solid #1E293B', color: '#E6EBF1' } }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={storageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="label" stroke="#5B6470" />
                <YAxis stroke="#5B6470" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill="#1565FF" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Dispositivos por Unidade" style={cardStyle}
            styles={{ header: { borderBottom: '1px solid #1E293B', color: '#E6EBF1' } }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={unitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="label" stroke="#5B6470" />
                <YAxis stroke="#5B6470" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill="#00BFA5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Histórico de Alterações" style={cardStyle}
            styles={{ header: { borderBottom: '1px solid #1E293B', color: '#E6EBF1' } }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={alertData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="date" stroke="#5B6470" />
                <YAxis stroke="#5B6470" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="count" stroke="#FFB020" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card title="Últimos Ativos Cadastrados" style={{ ...cardStyle, marginTop: 16 }}
        styles={{ header: { borderBottom: '1px solid #1E293B', color: '#E6EBF1' } }}
        extra={<a onClick={() => navigate('/devices')} style={{ color: '#1565FF' }}>Ver todos</a>}>
        <Table
          dataSource={devices}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
          onRow={(record) => ({
            onClick: () => navigate(`/devices/${record.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>
    </div>
  );
}
