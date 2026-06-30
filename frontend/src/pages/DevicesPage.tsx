import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Table, Tag, Input, Select, Space, Typography, Row, Col, Button } from 'antd';
import { SearchOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons';
import { getDevices, getBranches, getSectors } from '../api/endpoints';
import { useWebSocket } from '../hooks/useWebSocket';
import type { WSMessage } from '../hooks/useWebSocket';
import type { Device } from '../types';

const { Title } = Typography;

export default function DevicesPage() {
  const [searchParams] = useSearchParams();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(searchParams.get('status') || undefined);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [sectors, setSectors] = useState<{ id: number; name: string }[]>([]);
  const [branchFilter, setBranchFilter] = useState<number | undefined>();
  const [sectorFilter, setSectorFilter] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const loadDevices = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, page_size: 50 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (sectorFilter) params.sector_id = sectorFilter;
      else if (branchFilter) params.branch_id = branchFilter;
      const { data } = await getDevices(params);
      setDevices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDevices(); }, [page, statusFilter, branchFilter, sectorFilter]);

  useEffect(() => {
    getBranches().then(({ data }) => setBranches(data)).catch(() => {});
  }, []);

  const handleBranchChange = async (id: number | undefined) => {
    setBranchFilter(id);
    setSectorFilter(undefined);
    setSectors([]);
    if (id) {
      const { data } = await getSectors(id);
      setSectors(data);
    }
  };

  const locationShort = (path?: string | null) => {
    if (!path) return '-';
    const parts = path.split(' > ');
    return parts.slice(-2).join(' > ');
  };

  // WebSocket: update device rows in-place
  const handleWsMessage = useCallback((msg: WSMessage) => {
    if (msg.type === 'status_change' && msg.agent_id) {
      setDevices(prev => prev.map(d =>
        d.agent_id === msg.agent_id
          ? {
              ...d,
              status: (msg.status as Device['status']) || d.status,
              last_seen: msg.last_seen || d.last_seen,
              current_user: msg.current_user ?? d.current_user,
            }
          : d
      ));
    } else if (msg.type === 'heartbeat' && msg.agent_id) {
      setDevices(prev => prev.map(d =>
        d.agent_id === msg.agent_id
          ? { ...d, status: 'online' as const, last_seen: msg.last_seen || d.last_seen, current_user: msg.current_user ?? d.current_user }
          : d
      ));
    } else if (msg.type === 'inventory_updated') {
      loadDevices();
    }
  }, [page, statusFilter, search]);

  useWebSocket(handleWsMessage);

  const handleExport = async () => {
    const token = localStorage.getItem('access_token');
    const response = await fetch('/api/devices/export', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventario_sixid.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const columns = [
    {
      title: 'Hostname', dataIndex: 'hostname', key: 'hostname', sorter: true, width: 160,
      render: (text: string, record: Device) => (
        <a onClick={() => navigate(`/devices/${record.id}`)} style={{ color: '#1565FF' }}>{text}</a>
      ),
    },
    { title: 'Usuário', dataIndex: 'current_user', key: 'current_user', width: 120 },
    { title: 'SO', dataIndex: 'os_name', key: 'os', ellipsis: true, width: 180,
      render: (v: string) => v || '-' },
    { title: 'Processador', dataIndex: 'cpu_model', key: 'cpu', ellipsis: true,
      render: (v: string) => v || '-' },
    { title: 'RAM', dataIndex: 'ram_total_gb', key: 'ram', width: 80,
      render: (v: number) => v ? `${v} GB` : '-' },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 90,
      render: (status: string) => (
        <Tag color={status === 'online' ? 'green' : status === 'offline' ? 'red' : 'default'}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    { title: 'Localização', dataIndex: 'location_path', key: 'location', ellipsis: true, width: 180,
      render: (v: string) => locationShort(v) },
    {
      title: 'Última Comunicação', dataIndex: 'last_seen', key: 'last_seen', width: 170,
      render: (v: string) => v ? new Date(v).toLocaleString('pt-BR') : '-',
    },
  ];

  return (
    <div>
      <Title level={3} style={{ color: 'var(--text)', marginBottom: 24 }}>Ativos</Title>

      <Card style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Input
              placeholder="Buscar por hostname, usuário ou agent ID..."
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={loadDevices}
              allowClear
            />
          </Col>
          <Col>
            <Select
              placeholder="Status"
              allowClear
              style={{ width: 140 }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: '', label: 'Todos' },
                { value: 'online', label: 'Online' },
                { value: 'offline', label: 'Offline' },
                { value: 'unknown', label: 'Desconhecido' },
              ]}
            />
          </Col>
          <Col>
            <Select
              placeholder="Andar"
              allowClear
              style={{ width: 160 }}
              value={branchFilter}
              onChange={handleBranchChange}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
            />
          </Col>
          <Col>
            <Select
              placeholder="Setor"
              allowClear
              style={{ width: 160 }}
              value={sectorFilter}
              onChange={setSectorFilter}
              disabled={!sectors.length}
              options={sectors.map((s) => ({ value: s.id, label: s.name }))}
            />
          </Col>
          <Col>
            <Button icon={<ReloadOutlined />} onClick={loadDevices}>Atualizar</Button>
          </Col>
          <Col>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>Exportar Excel</Button>
          </Col>
        </Row>
      </Card>

      <Card style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}>
        <Table
          dataSource={devices}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: 50,
            onChange: setPage,
            showSizeChanger: false,
          }}
          size="middle"
          onRow={(record) => ({
            onClick: () => navigate(`/devices/${record.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>
    </div>
  );
}
