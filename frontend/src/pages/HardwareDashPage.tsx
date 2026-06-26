import { useEffect, useState } from 'react';
import { Card, Table, Tag, Typography, Row, Col, Statistic, Spin, Tabs } from 'antd';
import { WindowsOutlined, HddOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getOsDetails, getDevicesByOs, getHardwareRanking } from '../api/endpoints';
import { useThemeStore } from '../store/themeStore';

const { Title, Text } = Typography;

export default function HardwareDashPage() {
  const [osData, setOsData] = useState<{ os_name: string; count: number }[]>([]);
  const [selectedOs, setSelectedOs] = useState<string | null>(null);
  const [osDevices, setOsDevices] = useState<any[]>([]);
  const [osLoading, setOsLoading] = useState(false);
  const [hwData, setHwData] = useState<{ ram: any[]; storage: any[] }>({ ram: [], storage: [] });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isDark = useThemeStore((s) => s.mode === 'dark');

  const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 };

  useEffect(() => {
    (async () => {
      try {
        const [osRes, hwRes] = await Promise.all([getOsDetails(), getHardwareRanking()]);
        setOsData(osRes.data);
        setHwData(hwRes.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleOsClick = async (osName: string) => {
    setSelectedOs(osName);
    setOsLoading(true);
    try {
      const { data } = await getDevicesByOs(osName);
      setOsDevices(data);
    } catch { setOsDevices([]); }
    finally { setOsLoading(false); }
  };

  const osDeviceColumns = [
    { title: 'Hostname', dataIndex: 'hostname', key: 'hostname',
      render: (t: string, r: any) => <a onClick={() => navigate(`/devices/${r.id}`)} style={{ color: '#1565FF' }}>{t}</a> },
    { title: 'Usuário', dataIndex: 'current_user', key: 'user', render: (v: string) => v || '-' },
    { title: 'Versão', dataIndex: 'os_version', key: 'ver', render: (v: string) => v || '-' },
    { title: 'Build', dataIndex: 'os_build', key: 'build', render: (v: string) => v || '-' },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 90,
      render: (s: string) => <Tag color={s === 'online' ? 'green' : 'red'}>{s.toUpperCase()}</Tag> },
    { title: 'Última Comunicação', dataIndex: 'last_seen', key: 'ls',
      render: (v: string) => v ? new Date(v).toLocaleString('pt-BR') : '-' },
  ];

  const ramColumns = [
    { title: '#', key: 'rank', width: 50, render: (_: any, __: any, i: number) => i + 1 },
    { title: 'Hostname', dataIndex: 'hostname', key: 'hostname',
      render: (t: string, r: any) => <a onClick={() => navigate(`/devices/${r.id}`)} style={{ color: '#1565FF' }}>{t}</a> },
    { title: 'RAM (GB)', dataIndex: 'ram_gb', key: 'ram', width: 120,
      render: (v: number) => <Text strong style={{ color: v >= 16 ? '#00BFA5' : v >= 8 ? 'var(--text)' : '#FF4D4F' }}>{v} GB</Text> },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 90,
      render: (s: string) => <Tag color={s === 'online' ? 'green' : 'red'}>{s.toUpperCase()}</Tag> },
  ];

  const storageColumns = [
    { title: '#', key: 'rank', width: 50, render: (_: any, __: any, i: number) => i + 1 },
    { title: 'Hostname', dataIndex: 'hostname', key: 'hostname',
      render: (t: string, r: any) => <a onClick={() => navigate(`/devices/${r.id}`)} style={{ color: '#1565FF' }}>{t}</a> },
    { title: 'Tipo', dataIndex: 'media_type', key: 'type', width: 80,
      render: (v: string) => <Tag color={v === 'NVMe' ? 'purple' : v === 'SSD' ? 'blue' : 'default'}>{v}</Tag> },
    { title: 'Modelo', dataIndex: 'model', key: 'model', ellipsis: true },
    { title: 'Capacidade', dataIndex: 'capacity_gb', key: 'cap', width: 120,
      render: (v: number) => `${v} GB` },
  ];

  if (loading) return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />;

  const osColors: Record<string, string> = {};
  const palette = ['#1565FF', '#00BFA5', '#FFB020', '#FF4D4F', '#7C3AED', '#0EA5E9'];
  osData.forEach((o, i) => { osColors[o.os_name] = palette[i % palette.length]; });

  const totalDevices = osData.reduce((s, o) => s + o.count, 0);

  const tabItems = [
    {
      key: 'os',
      label: 'Sistemas Operacionais',
      children: (
        <div>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            {osData.map((os) => (
              <Col xs={12} sm={8} md={6} key={os.os_name}>
                <Card
                  hoverable
                  onClick={() => handleOsClick(os.os_name)}
                  style={{
                    ...cardStyle,
                    borderTop: `3px solid ${osColors[os.os_name]}`,
                    cursor: 'pointer',
                    background: selectedOs === os.os_name ? (isDark ? '#1a2332' : '#e8f0fe') : 'var(--bg-card)',
                  }}
                >
                  <Statistic
                    title={<span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{os.os_name}</span>}
                    value={os.count}
                    suffix={<span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      ({totalDevices > 0 ? Math.round((os.count / totalDevices) * 100) : 0}%)
                    </span>}
                    prefix={<WindowsOutlined style={{ color: osColors[os.os_name], fontSize: 16 }} />}
                    valueStyle={{ color: 'var(--text)', fontWeight: 700, fontSize: 22 }}
                  />
                </Card>
              </Col>
            ))}
          </Row>

          {selectedOs && (
            <Card title={`Dispositivos com ${selectedOs}`} style={cardStyle}
              styles={{ header: { borderBottom: '1px solid var(--border)', color: 'var(--text)' } }}>
              <Table dataSource={osDevices} columns={osDeviceColumns} rowKey="id"
                loading={osLoading} size="small" pagination={{ pageSize: 20 }}
                onRow={(r) => ({ onClick: () => navigate(`/devices/${r.id}`), style: { cursor: 'pointer' } })} />
            </Card>
          )}
        </div>
      ),
    },
    {
      key: 'ram',
      label: 'Ranking de RAM',
      children: (
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col xs={8}>
                <Card style={{ ...cardStyle, borderTop: '3px solid #00BFA5' }}>
                  <Statistic title={<span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Maior RAM</span>}
                    value={hwData.ram[0]?.ram_gb || 0} suffix="GB"
                    valueStyle={{ color: '#00BFA5', fontWeight: 700 }} />
                  <Text style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{hwData.ram[0]?.hostname || '-'}</Text>
                </Card>
              </Col>
              <Col xs={8}>
                <Card style={{ ...cardStyle, borderTop: '3px solid #FF4D4F' }}>
                  <Statistic title={<span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Menor RAM</span>}
                    value={hwData.ram[hwData.ram.length - 1]?.ram_gb || 0} suffix="GB"
                    valueStyle={{ color: '#FF4D4F', fontWeight: 700 }} />
                  <Text style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{hwData.ram[hwData.ram.length - 1]?.hostname || '-'}</Text>
                </Card>
              </Col>
              <Col xs={8}>
                <Card style={{ ...cardStyle, borderTop: '3px solid #1565FF' }}>
                  <Statistic title={<span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Media</span>}
                    value={hwData.ram.length > 0 ? (hwData.ram.reduce((s: number, r: any) => s + r.ram_gb, 0) / hwData.ram.length).toFixed(1) : 0}
                    suffix="GB" valueStyle={{ color: '#1565FF', fontWeight: 700 }} />
                </Card>
              </Col>
            </Row>
          </Col>
          <Col span={24}>
            <Card title="Ranking Completo de RAM" style={cardStyle}
              styles={{ header: { borderBottom: '1px solid var(--border)', color: 'var(--text)' } }}>
              <Table dataSource={hwData.ram} columns={ramColumns} rowKey="id" size="small"
                pagination={{ pageSize: 20 }}
                onRow={(r) => ({ onClick: () => navigate(`/devices/${r.id}`), style: { cursor: 'pointer' } })} />
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'storage',
      label: 'Armazenamento (HDD/SSD)',
      children: (
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              {['SSD', 'HDD', 'NVMe'].map((type) => {
                const items = hwData.storage.filter((s: any) => s.media_type === type);
                const color = type === 'NVMe' ? '#7C3AED' : type === 'SSD' ? '#1565FF' : '#FFB020';
                return (
                  <Col xs={8} key={type}>
                    <Card style={{ ...cardStyle, borderTop: `3px solid ${color}` }}>
                      <Statistic
                        title={<span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Discos {type}</span>}
                        value={items.length}
                        prefix={<HddOutlined style={{ color, fontSize: 16 }} />}
                        valueStyle={{ color: 'var(--text)', fontWeight: 700 }}
                      />
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </Col>
          <Col span={24}>
            <Card title="Todos os Discos (maior para menor)" style={cardStyle}
              styles={{ header: { borderBottom: '1px solid var(--border)', color: 'var(--text)' } }}>
              <Table dataSource={hwData.storage} columns={storageColumns}
                rowKey={(r) => `${r.hostname}-${r.model}`} size="small" pagination={{ pageSize: 20 }} />
            </Card>
          </Col>
        </Row>
      ),
    },
  ];

  return (
    <div>
      <Title level={3} style={{ color: 'var(--text)', marginBottom: 24 }}>
        <DatabaseOutlined style={{ marginRight: 8 }} />Hardware e Sistemas Operacionais
      </Title>
      <Card style={cardStyle}>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
}
