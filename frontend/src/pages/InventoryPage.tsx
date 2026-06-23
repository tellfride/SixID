import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Table, Tag, Typography, Row, Col, Statistic, Input, Select,
  Button, Space, Tabs, message,
} from 'antd';
import {
  DownloadOutlined, ReloadOutlined, SearchOutlined,
  DesktopOutlined, HddOutlined, WifiOutlined, PrinterOutlined,
  AppstoreOutlined, ToolOutlined,
} from '@ant-design/icons';
import { getDevices } from '../api/endpoints';
import api from '../api/client';
import type { Device } from '../types';

const { Title, Text } = Typography;

const cardStyle = {
  background: '#111927',
  border: '1px solid #1E293B',
  borderRadius: 12,
};

interface InventoryDevice extends Device {
  os_name?: string;
  cpu_model?: string;
  ram_total?: number;
  storage_info?: string;
  ip_address?: string;
  mac_address?: string;
  motherboard?: string;
  bios_info?: string;
  monitor_info?: string;
  software_count?: number;
  services_count?: number;
}

export default function InventoryPage() {
  const [devices, setDevices] = useState<InventoryDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const navigate = useNavigate();

  const loadInventory = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page_size: 200 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data: devList } = await getDevices(params);

      const enriched: InventoryDevice[] = [];
      for (const dev of devList) {
        try {
          const { data: detail } = await api.get(`/devices/${dev.id}`);
          enriched.push({
            ...dev,
            os_name: detail.os_info?.name || '-',
            cpu_model: detail.cpus?.[0]?.model || '-',
            ram_total: detail.ram?.total_gb || 0,
            storage_info: detail.storage?.map((s: any) =>
              `${s.media_type || ''} ${s.model || ''} ${s.capacity_gb ? s.capacity_gb + 'GB' : ''}`
            ).join('; ') || '-',
            ip_address: detail.networks?.find((n: any) => n.ip_address && !n.ip_address.startsWith('127.'))?.ip_address || '-',
            mac_address: detail.networks?.find((n: any) => n.mac_address)?.mac_address || '-',
            motherboard: detail.motherboard ? `${detail.motherboard.manufacturer || ''} ${detail.motherboard.model || ''}`.trim() : '-',
            bios_info: detail.bios ? `${detail.bios.manufacturer || ''} ${detail.bios.version || ''}`.trim() : '-',
            monitor_info: detail.monitors?.map((m: any) =>
              `${m.manufacturer || ''} ${m.model || ''} ${m.serial ? '(S/N: ' + m.serial + ')' : ''}`
            ).join('; ') || '-',
            software_count: detail.software_count ?? 0,
            services_count: detail.services_count ?? 0,
          });
        } catch {
          enriched.push({ ...dev, os_name: '-', cpu_model: '-', ram_total: 0, storage_info: '-', ip_address: '-', mac_address: '-', motherboard: '-', bios_info: '-', monitor_info: '-' });
        }
      }
      setDevices(enriched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadInventory(); }, [statusFilter]);

  const handleExport = async () => {
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch('/api/devices/export', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) { message.error('Erro ao exportar'); return; }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventario_sixid_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success('Planilha exportada com sucesso');
    } catch {
      message.error('Erro ao exportar planilha');
    }
  };

  const online = devices.filter(d => d.status === 'online').length;
  const offline = devices.filter(d => d.status === 'offline').length;

  const hardwareColumns = [
    {
      title: 'Hostname', dataIndex: 'hostname', key: 'hostname', fixed: 'left' as const, width: 160,
      render: (text: string, record: InventoryDevice) => (
        <a onClick={() => navigate(`/devices/${record.id}`)} style={{ color: '#1565FF', fontWeight: 500 }}>{text}</a>
      ),
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 90,
      render: (s: string) => <Tag color={s === 'online' ? '#00BFA5' : '#FF4D4F'} style={{ borderRadius: 6 }}>{s.toUpperCase()}</Tag>,
    },
    { title: 'Usuário', dataIndex: 'current_user', key: 'user', width: 120 },
    { title: 'Sistema Operacional', dataIndex: 'os_name', key: 'os', width: 220, ellipsis: true },
    { title: 'Processador', dataIndex: 'cpu_model', key: 'cpu', width: 280, ellipsis: true },
    { title: 'RAM (GB)', dataIndex: 'ram_total', key: 'ram', width: 100, render: (v: number) => v ? `${v} GB` : '-' },
    { title: 'Placa-mãe', dataIndex: 'motherboard', key: 'mb', width: 180, ellipsis: true },
    { title: 'BIOS', dataIndex: 'bios_info', key: 'bios', width: 180, ellipsis: true },
    { title: 'Monitor', dataIndex: 'monitor_info', key: 'monitor', width: 280, ellipsis: true, render: (v: string) => v || '-' },
    { title: 'Localização', dataIndex: 'location_path', key: 'loc', width: 200, ellipsis: true, render: (v: string) => v || '-' },
  ];

  const monitorColumns = [
    {
      title: 'Hostname', dataIndex: 'hostname', key: 'hostname', fixed: 'left' as const, width: 160,
      render: (text: string, record: InventoryDevice) => (
        <a onClick={() => navigate(`/devices/${record.id}`)} style={{ color: '#1565FF', fontWeight: 500 }}>{text}</a>
      ),
    },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 90,
      render: (s: string) => <Tag color={s === 'online' ? '#00BFA5' : '#FF4D4F'} style={{ borderRadius: 6 }}>{s.toUpperCase()}</Tag>,
    },
    { title: 'Monitor', dataIndex: 'monitor_info', key: 'monitor', ellipsis: true, render: (v: string) => v || '-' },
    { title: 'Localização', dataIndex: 'location_path', key: 'loc', width: 200, ellipsis: true, render: (v: string) => v || '-' },
  ];

  const storageColumns = [
    {
      title: 'Hostname', dataIndex: 'hostname', key: 'hostname', fixed: 'left' as const, width: 160,
      render: (text: string, record: InventoryDevice) => (
        <a onClick={() => navigate(`/devices/${record.id}`)} style={{ color: '#1565FF', fontWeight: 500 }}>{text}</a>
      ),
    },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 90,
      render: (s: string) => <Tag color={s === 'online' ? '#00BFA5' : '#FF4D4F'} style={{ borderRadius: 6 }}>{s.toUpperCase()}</Tag>,
    },
    { title: 'Armazenamento', dataIndex: 'storage_info', key: 'storage', ellipsis: true },
  ];

  const networkColumns = [
    {
      title: 'Hostname', dataIndex: 'hostname', key: 'hostname', fixed: 'left' as const, width: 160,
      render: (text: string, record: InventoryDevice) => (
        <a onClick={() => navigate(`/devices/${record.id}`)} style={{ color: '#1565FF', fontWeight: 500 }}>{text}</a>
      ),
    },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 90,
      render: (s: string) => <Tag color={s === 'online' ? '#00BFA5' : '#FF4D4F'} style={{ borderRadius: 6 }}>{s.toUpperCase()}</Tag>,
    },
    { title: 'IP', dataIndex: 'ip_address', key: 'ip', width: 150 },
    { title: 'MAC', dataIndex: 'mac_address', key: 'mac', width: 170 },
    { title: 'Domínio', dataIndex: 'domain', key: 'domain', width: 160 },
    { title: 'Localização', dataIndex: 'location_path', key: 'loc', ellipsis: true, render: (v: string) => v || '-' },
  ];

  const tabItems = [
    {
      key: 'hardware',
      label: <span><DesktopOutlined /> Hardware</span>,
      children: (
        <Table dataSource={devices} columns={hardwareColumns} rowKey="id" loading={loading}
          size="small" scroll={{ x: 1600 }} pagination={{ pageSize: 25, showSizeChanger: true, pageSizeOptions: ['25', '50', '100'] }}
          onRow={(record) => ({ onClick: () => navigate(`/devices/${record.id}`), style: { cursor: 'pointer' } })}
        />
      ),
    },
    {
      key: 'storage',
      label: <span><HddOutlined /> Armazenamento</span>,
      children: (
        <Table dataSource={devices} columns={storageColumns} rowKey="id" loading={loading}
          size="small" pagination={{ pageSize: 25 }}
          onRow={(record) => ({ onClick: () => navigate(`/devices/${record.id}`), style: { cursor: 'pointer' } })}
        />
      ),
    },
    {
      key: 'network',
      label: <span><WifiOutlined /> Rede</span>,
      children: (
        <Table dataSource={devices} columns={networkColumns} rowKey="id" loading={loading}
          size="small" scroll={{ x: 1000 }} pagination={{ pageSize: 25 }}
          onRow={(record) => ({ onClick: () => navigate(`/devices/${record.id}`), style: { cursor: 'pointer' } })}
        />
      ),
    },
    {
      key: 'monitors',
      label: <span><DesktopOutlined /> Monitores</span>,
      children: (
        <Table dataSource={devices} columns={monitorColumns} rowKey="id" loading={loading}
          size="small" pagination={{ pageSize: 25 }}
          onRow={(record) => ({ onClick: () => navigate(`/devices/${record.id}`), style: { cursor: 'pointer' } })}
        />
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Title level={3} style={{ color: '#E6EBF1', margin: 0 }}>Inventário</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadInventory}>Atualizar</Button>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
            Exportar Excel
          </Button>
        </Space>
      </Row>

      {/* Summary cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8}>
          <Card style={{ ...cardStyle, borderTop: '3px solid #1565FF', height: '100%' }}>
            <Statistic title={<span style={{ color: '#5B6470', fontSize: 12 }}>Total de Ativos</span>}
              value={devices.length} prefix={<DesktopOutlined style={{ color: '#1565FF' }} />}
              valueStyle={{ color: '#E6EBF1', fontWeight: 700 }} />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card style={{ ...cardStyle, borderTop: '3px solid #00BFA5', height: '100%' }}>
            <Statistic title={<span style={{ color: '#5B6470', fontSize: 12 }}>Online</span>}
              value={online} prefix={<WifiOutlined style={{ color: '#00BFA5' }} />}
              valueStyle={{ color: '#E6EBF1', fontWeight: 700 }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ ...cardStyle, borderTop: '3px solid #FF4D4F', height: '100%' }}>
            <Statistic title={<span style={{ color: '#5B6470', fontSize: 12 }}>Offline</span>}
              value={offline} prefix={<DesktopOutlined style={{ color: '#FF4D4F' }} />}
              valueStyle={{ color: '#E6EBF1', fontWeight: 700 }} />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ ...cardStyle, marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Input placeholder="Buscar por hostname, usuário, IP..."
              prefix={<SearchOutlined />} value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={loadInventory} allowClear
            />
          </Col>
          <Col>
            <Select placeholder="Status" allowClear style={{ width: 140 }}
              value={statusFilter} onChange={setStatusFilter}
              options={[
                { value: 'online', label: 'Online' },
                { value: 'offline', label: 'Offline' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      {/* Inventory tabs */}
      <Card style={cardStyle}>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
}
