import { useEffect, useState, useCallback } from 'react';
import { Row, Col, Card, Statistic, Typography, Table, Tag, Spin } from 'antd';
import {
  DesktopOutlined, CheckCircleOutlined, CloseCircleOutlined,
  WarningOutlined, SwapOutlined,
} from '@ant-design/icons';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getOsDistribution, getStorageUsage,
  getDevicesPerUnit, getAlertHistory, getDevices } from '../api/endpoints';
import { useWebSocket } from '../hooks/useWebSocket';
import type { DashboardStats, ChartDataPoint, AlertHistoryPoint, Device } from '../types';

const { Title } = Typography;
const COLORS = ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2', '#eb2f96'];

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
        <a onClick={() => navigate(`/devices/${record.id}`)}>{text}</a>
      ),
    },
    { title: 'IP', dataIndex: 'current_user', key: 'user' },
    { title: 'Status', dataIndex: 'status', key: 'status',
      render: (status: string) => (
        <Tag color={status === 'online' ? 'green' : status === 'offline' ? 'red' : 'default'}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    { title: 'Última Comunicação', dataIndex: 'last_seen', key: 'last_seen',
      render: (v: string) => v ? new Date(v).toLocaleString('pt-BR') : '-',
    },
  ];

  if (loading) return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />;

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24, color: '#fff' }}>Dashboard</Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ background: '#141414', border: '1px solid #303030' }}>
            <Statistic title="Total de Dispositivos" value={stats?.total_devices || 0}
              prefix={<DesktopOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ background: '#141414', border: '1px solid #303030' }}>
            <Statistic title="Online" value={stats?.online || 0}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ background: '#141414', border: '1px solid #303030' }}>
            <Statistic title="Offline" value={stats?.offline || 0}
              prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ background: '#141414', border: '1px solid #303030' }}>
            <Statistic title="Alertas" value={stats?.alerts || 0}
              prefix={<WarningOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Sistemas Operacionais" style={{ background: '#141414', border: '1px solid #303030' }}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={osData} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={100} label>
                  {osData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Armazenamento por Tipo" style={{ background: '#141414', border: '1px solid #303030' }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={storageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#303030" />
                <XAxis dataKey="label" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip contentStyle={{ background: '#1f1f1f', border: '1px solid #303030' }} />
                <Bar dataKey="value" fill="#1677ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Dispositivos por Unidade" style={{ background: '#141414', border: '1px solid #303030' }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={unitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#303030" />
                <XAxis dataKey="label" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip contentStyle={{ background: '#1f1f1f', border: '1px solid #303030' }} />
                <Bar dataKey="value" fill="#52c41a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Histórico de Alterações" style={{ background: '#141414', border: '1px solid #303030' }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={alertData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#303030" />
                <XAxis dataKey="date" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip contentStyle={{ background: '#1f1f1f', border: '1px solid #303030' }} />
                <Line type="monotone" dataKey="count" stroke="#faad14" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card title="Dispositivos Recentes" style={{ background: '#141414', border: '1px solid #303030', marginTop: 16 }}>
        <Table
          dataSource={devices}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
          style={{ background: 'transparent' }}
        />
      </Card>
    </div>
  );
}
