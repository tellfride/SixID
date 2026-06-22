import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Tag, Input, Select, Space, Typography, Row, Col, Button } from 'antd';
import { SearchOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons';
import { getDevices } from '../api/endpoints';
import type { Device } from '../types';

const { Title } = Typography;

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const loadDevices = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, page_size: 50 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await getDevices(params);
      setDevices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDevices(); }, [page, statusFilter]);

  const handleExport = async () => {
    const token = localStorage.getItem('access_token');
    const response = await fetch('/api/devices/export', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventario_sysid9.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const columns = [
    {
      title: 'Hostname', dataIndex: 'hostname', key: 'hostname', sorter: true,
      render: (text: string, record: Device) => (
        <a onClick={() => navigate(`/devices/${record.id}`)} style={{ color: '#1677ff' }}>{text}</a>
      ),
    },
    { title: 'Usuário', dataIndex: 'current_user', key: 'current_user' },
    { title: 'Domínio', dataIndex: 'domain', key: 'domain' },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 100,
      render: (status: string) => (
        <Tag color={status === 'online' ? 'green' : status === 'offline' ? 'red' : 'default'}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    { title: 'Localização', dataIndex: 'location_path', key: 'location', ellipsis: true },
    {
      title: 'Última Comunicação', dataIndex: 'last_seen', key: 'last_seen', width: 180,
      render: (v: string) => v ? new Date(v).toLocaleString('pt-BR') : '-',
    },
    { title: 'Versão', dataIndex: 'agent_version', key: 'version', width: 80 },
  ];

  return (
    <div>
      <Title level={3} style={{ color: '#fff', marginBottom: 24 }}>Dispositivos</Title>

      <Card style={{ background: '#141414', border: '1px solid #303030', marginBottom: 16 }}>
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
                { value: 'online', label: 'Online' },
                { value: 'offline', label: 'Offline' },
                { value: 'unknown', label: 'Desconhecido' },
              ]}
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

      <Card style={{ background: '#141414', border: '1px solid #303030' }}>
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
