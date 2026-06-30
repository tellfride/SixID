import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Table, Tag, Typography, Row, Col, Statistic, Input, Select,
  Button, Space, Tabs, message,
} from 'antd';
import {
  DownloadOutlined, ReloadOutlined, SearchOutlined,
  DesktopOutlined, HddOutlined, WifiOutlined, PrinterOutlined,
  AppstoreOutlined, ToolOutlined, HistoryOutlined, ClockCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { getDevices, getHardwareChangesStats, getDashboardStats } from '../api/endpoints';
import api from '../api/client';
import AlertsModal from '../components/common/AlertsModal';
import type { Device } from '../types';

const { Title, Text } = Typography;

const cardStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 12,
};

interface InventoryDevice extends Omit<Device, 'os_name' | 'cpu_model'> {
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

interface HwChangesStats {
  total: number;
  last_24h: number;
  last_7d: number;
  last_30d: number;
  devices_affected: number;
  last_change: string | null;
}

export default function InventoryPage() {
  const [devices, setDevices] = useState<InventoryDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [hwStats, setHwStats] = useState<HwChangesStats | null>(null);
  const [exportingHw, setExportingHw] = useState<string | null>(null);
  const [alertsCount, setAlertsCount] = useState(0);
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);
  const navigate = useNavigate();

  const loadHwStats = async () => {
    try {
      const { data } = await getHardwareChangesStats();
      setHwStats(data);
    } catch (err) { console.error(err); }
  };

  const loadAlertsCount = async () => {
    try {
      const { data } = await getDashboardStats();
      setAlertsCount(data.alerts);
    } catch (err) { console.error(err); }
  };

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
  useEffect(() => { loadHwStats(); }, []);
  useEffect(() => { loadAlertsCount(); }, []);

  const handleExportHardwareChanges = async (days?: number) => {
    const key = days ? `${days}d` : 'full';
    setExportingHw(key);
    const token = localStorage.getItem('access_token');
    try {
      const url = days ? `/api/devices/hardware-changes/export?days=${days}` : '/api/devices/hardware-changes/export';
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) { message.error('Erro ao exportar histórico'); return; }
      const blob = await response.blob();
      const objUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      const suffix = days ? `_${days}dias` : '_completo';
      a.download = `historico_alteracoes_hardware${suffix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(objUrl);
      message.success('Histórico de alterações exportado com sucesso');
    } catch {
      message.error('Erro ao exportar histórico de alterações');
    } finally {
      setExportingHw(null);
    }
  };

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
        <Title level={3} style={{ color: 'var(--text)', margin: 0 }}>Inventário</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadInventory}>Atualizar</Button>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
            Exportar Excel
          </Button>
        </Space>
      </Row>

      {/* Summary cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card style={{ ...cardStyle, borderTop: '3px solid #1565FF', height: '100%' }}>
            <Statistic title={<span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Total de Ativos</span>}
              value={devices.length} prefix={<DesktopOutlined style={{ color: '#1565FF' }} />}
              valueStyle={{ color: 'var(--text)', fontWeight: 700 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ ...cardStyle, borderTop: '3px solid #00BFA5', height: '100%' }}>
            <Statistic title={<span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Online</span>}
              value={online} prefix={<WifiOutlined style={{ color: '#00BFA5' }} />}
              valueStyle={{ color: 'var(--text)', fontWeight: 700 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ ...cardStyle, borderTop: '3px solid #FF4D4F', height: '100%' }}>
            <Statistic title={<span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Offline</span>}
              value={offline} prefix={<DesktopOutlined style={{ color: '#FF4D4F' }} />}
              valueStyle={{ color: 'var(--text)', fontWeight: 700 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable onClick={() => setAlertsModalOpen(true)}
            style={{ ...cardStyle, borderTop: '3px solid #FFB020', height: '100%', cursor: 'pointer' }}>
            <Statistic title={<span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Alertas</span>}
              value={alertsCount} prefix={<WarningOutlined style={{ color: '#FFB020' }} />}
              valueStyle={{ color: 'var(--text)', fontWeight: 700 }} />
          </Card>
        </Col>
      </Row>

      {/* Histórico de Alterações de Hardware */}
      <Card style={{ ...cardStyle, marginBottom: 16 }}
        title={<span style={{ color: 'var(--text)' }}><HistoryOutlined style={{ marginRight: 8 }} />Histórico de Alterações de Hardware</span>}
        styles={{ header: { borderBottom: '1px solid var(--border)' } }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={12} sm={6} md={4}>
            <Statistic title={<span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Total de Registros</span>}
              value={hwStats?.total ?? 0} valueStyle={{ color: 'var(--text)', fontWeight: 700, fontSize: 20 }} />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Statistic title={<span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Últimas 24h</span>}
              value={hwStats?.last_24h ?? 0} valueStyle={{ color: '#0EA5E9', fontWeight: 700, fontSize: 20 }} />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Statistic title={<span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Últimos 7 dias</span>}
              value={hwStats?.last_7d ?? 0} valueStyle={{ color: '#1565FF', fontWeight: 700, fontSize: 20 }} />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Statistic title={<span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Últimos 30 dias</span>}
              value={hwStats?.last_30d ?? 0} valueStyle={{ color: '#7C3AED', fontWeight: 700, fontSize: 20 }} />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: 4 }}>
              <Text style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                Última alteração: {hwStats?.last_change ? new Date(hwStats.last_change).toLocaleString('pt-BR') : '-'}
                {' · '}{hwStats?.devices_affected ?? 0} dispositivo(s) com histórico
              </Text>
            </div>
            <Space wrap>
              <Button size="small" icon={<DownloadOutlined />} loading={exportingHw === '7d'}
                onClick={() => handleExportHardwareChanges(7)}>7 dias</Button>
              <Button size="small" icon={<DownloadOutlined />} loading={exportingHw === '30d'}
                onClick={() => handleExportHardwareChanges(30)}>30 dias</Button>
              <Button size="small" type="primary" icon={<DownloadOutlined />} loading={exportingHw === 'full'}
                onClick={() => handleExportHardwareChanges()}>Histórico Completo</Button>
            </Space>
          </Col>
        </Row>
      </Card>

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

      <AlertsModal open={alertsModalOpen} onClose={() => setAlertsModalOpen(false)} onChanged={loadAlertsCount} />
    </div>
  );
}
