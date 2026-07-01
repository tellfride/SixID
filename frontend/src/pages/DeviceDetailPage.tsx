import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tabs, Table, Tag, Typography, Button, Space,
  Spin, Timeline, Modal, Input, Select, message, Row, Col, Progress, Popconfirm, Grid,
} from 'antd';
import {
  ArrowLeftOutlined, DesktopOutlined, LockOutlined, UnlockOutlined,
  PlayCircleOutlined, DeleteOutlined, EnvironmentOutlined,
} from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';
import { getDevice, getDeviceChanges, getDeviceSoftware, getDeviceServices,
  initiateVnc, lockScreen, unlockScreen, deleteDevice, getRoomsFlat, updateDevice, sendCommand } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import { useWebSocket } from '../hooks/useWebSocket';
import type { WSMessage } from '../hooks/useWebSocket';
import { UserOutlined, TeamOutlined } from '@ant-design/icons';
import type { DeviceDetail, HardwareChange, SoftwareInfo, ServiceInfo, LocalUserInfo } from '../types';

const { Title, Text } = Typography;

export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.sm;
  const [device, setDevice] = useState<DeviceDetail | null>(null);
  const [changes, setChanges] = useState<HardwareChange[]>([]);
  const [software, setSoftware] = useState<SoftwareInfo[]>([]);
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [lockMessage, setLockMessage] = useState('Seu computador foi bloqueado pela equipe de TI.');
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [rooms, setRooms] = useState<{id: number; full_path: string}[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | undefined>();
  const [savingLocation, setSavingLocation] = useState(false);

  const deviceId = Number(id);

  useEffect(() => { loadDevice(); }, [id]);

  // WebSocket: only reload when THIS device changes
  const handleWsMessage = useCallback((msg: WSMessage) => {
    if (!device) return;
    if (msg.agent_id === device.agent_id) {
      if (msg.type === 'status_change') {
        setDevice(prev => prev ? {
          ...prev,
          status: (msg.status as DeviceDetail['status']) || prev.status,
          last_seen: msg.last_seen || prev.last_seen,
          current_user: msg.current_user ?? prev.current_user,
        } : prev);
      } else if (msg.type === 'heartbeat') {
        setDevice(prev => prev ? {
          ...prev, status: 'online', last_seen: msg.last_seen || prev.last_seen,
          current_user: msg.current_user ?? prev.current_user,
        } : prev);
      } else if (msg.type === 'inventory_updated') {
        loadDevice();
      }
    }
  }, [device?.agent_id]);

  useWebSocket(handleWsMessage);

  const loadDevice = async () => {
    setLoading(true);
    try {
      const [devRes, changesRes, swRes, svcRes] = await Promise.all([
        getDevice(deviceId),
        getDeviceChanges(deviceId),
        getDeviceSoftware(deviceId),
        getDeviceServices(deviceId),
      ]);
      setDevice(devRes.data);
      setChanges(changesRes.data);
      setSoftware(swRes.data);
      setServices(svcRes.data);
    } catch (err) {
      message.error('Erro ao carregar dispositivo');
    } finally {
      setLoading(false);
    }
  };

  const handleVnc = async () => {
    try {
      // Download .vnc file — opens TightVNC Viewer automatically
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/remote/${deviceId}/vnc-file`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const err = await response.json();
        message.error(err.detail || 'Erro ao iniciar VNC');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${device?.hostname || 'remote'}.vnc`;
      a.click();
      window.URL.revokeObjectURL(url);

      message.success('Arquivo VNC baixado — abra para conectar ao dispositivo.');
    } catch (err: any) {
      message.error('Erro ao iniciar acesso remoto');
    }
  };

  const handleLock = async () => {
    try {
      const { data } = await lockScreen(deviceId, lockMessage);
      if (data?.command_sent === false) {
        message.warning('Comando de bloqueio enviado, mas o agente pode estar offline.');
      } else {
        message.success('Tela bloqueada com sucesso');
      }
      setLockModalOpen(false);
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Erro ao bloquear tela');
    }
  };

  const handleUnlock = async () => {
    try {
      const { data } = await unlockScreen(deviceId);
      if (data?.command_sent === false) {
        message.warning('Comando de desbloqueio enviado, mas o agente pode estar offline.');
      } else {
        message.success('Tela desbloqueada');
      }
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Erro ao desbloquear');
    }
  };

  const handleOpenLocationModal = async () => {
    if (device?.room_id) {
      setSelectedRoomId(device.room_id);
    }
    setLocationModalOpen(true);
    try {
      const { data } = await getRoomsFlat();
      setRooms(data);
    } catch {
      message.error('Erro ao carregar setores');
    }
  };

  const handleSaveLocation = async () => {
    if (!selectedRoomId) {
      message.warning('Selecione um setor');
      return;
    }
    setSavingLocation(true);
    try {
      await updateDevice(deviceId, { room_id: selectedRoomId });
      message.success('Localização atualizada');
      setLocationModalOpen(false);
      setSelectedRoomId(undefined);
      loadDevice();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Erro ao atualizar localização');
    } finally {
      setSavingLocation(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDevice(deviceId);
      message.success('Dispositivo removido');
      navigate('/devices');
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Erro ao remover');
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />;
  if (!device) return <Text>Dispositivo não encontrado</Text>;

  const canRemote = user?.role === 'admin' || user?.role === 'technician';

  const ramUsagePercent = device.ram
    ? Math.round(((device.ram.used_gb || 0) / (device.ram.total_gb || 1)) * 100)
    : 0;

  const tabItems = [
    {
      key: 'system',
      label: 'Sistema',
      children: (
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card size="small" title="Sistema Operacional" style={{ background: 'var(--bg-card-inner)', border: '1px solid var(--border)', borderRadius: 10 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Nome">{device.os_info?.name || '-'}</Descriptions.Item>
                <Descriptions.Item label="Versão">{device.os_info?.version || '-'}</Descriptions.Item>
                <Descriptions.Item label="Build">{device.os_info?.build || '-'}</Descriptions.Item>
                <Descriptions.Item label="Arquitetura">{device.os_info?.architecture || '-'}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" title="Processador" style={{ background: 'var(--bg-card-inner)', border: '1px solid var(--border)', borderRadius: 10 }}>
              {device.cpus.map((cpu, i) => (
                <Descriptions column={1} size="small" key={i}>
                  <Descriptions.Item label="Modelo">{cpu.model || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Fabricante">{cpu.manufacturer || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Núcleos/Threads">{cpu.cores || '-'} / {cpu.threads || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Frequência">{cpu.frequency_mhz ? `${cpu.frequency_mhz} MHz` : '-'}</Descriptions.Item>
                </Descriptions>
              ))}
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" title="Placa-mãe" style={{ background: 'var(--bg-card-inner)', border: '1px solid var(--border)', borderRadius: 10 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Fabricante">{device.motherboard?.manufacturer || '-'}</Descriptions.Item>
                <Descriptions.Item label="Modelo">{device.motherboard?.model || '-'}</Descriptions.Item>
                <Descriptions.Item label="Serial">{device.motherboard?.serial || '-'}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" title="BIOS" style={{ background: 'var(--bg-card-inner)', border: '1px solid var(--border)', borderRadius: 10 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Fabricante">{device.bios?.manufacturer || '-'}</Descriptions.Item>
                <Descriptions.Item label="Versão">{device.bios?.version || '-'}</Descriptions.Item>
                <Descriptions.Item label="Data">{device.bios?.date || '-'}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'memory',
      label: 'Memória',
      children: (
        <div>
          <Card size="small" title="Uso de Memória" style={{ background: 'var(--bg-card-inner)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 16 }}>
            <Row align="middle" gutter={24}>
              <Col>
                <Progress type="circle" percent={ramUsagePercent} size={80}
                  strokeColor={ramUsagePercent > 90 ? '#ff4d4f' : ramUsagePercent > 70 ? '#faad14' : '#52c41a'} />
              </Col>
              <Col>
                <Text>Total: {device.ram?.total_gb || 0} GB</Text><br />
                <Text>Em uso: {device.ram?.used_gb || 0} GB</Text><br />
                <Text>Livre: {device.ram?.free_gb || 0} GB</Text>
              </Col>
            </Row>
          </Card>
          <Card size="small" title="Slots de Memória" style={{ background: 'var(--bg-card-inner)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <Table dataSource={device.ram_slots} rowKey="slot" pagination={false} size="small" scroll={{ x: 500 }}
              columns={[
                { title: 'Slot', dataIndex: 'slot' },
                { title: 'Tamanho', dataIndex: 'size_gb', render: (v: number) => v ? `${v} GB` : '-' },
                { title: 'Tipo', dataIndex: 'type' },
                { title: 'Velocidade', dataIndex: 'speed_mhz', render: (v: number) => v ? `${v} MHz` : '-' },
                { title: 'Fabricante', dataIndex: 'manufacturer' },
              ]} />
          </Card>
        </div>
      ),
    },
    {
      key: 'storage',
      label: 'Armazenamento',
      children: (
        <Table dataSource={device.storage} rowKey="serial" pagination={false} size="small" scroll={{ x: 700 }}
          columns={[
            { title: 'Tipo', dataIndex: 'media_type', render: (v: string) => <Tag color={v === 'NVMe' ? 'purple' : v === 'SSD' ? 'blue' : 'default'}>{v}</Tag> },
            { title: 'Modelo', dataIndex: 'model' },
            { title: 'Serial', dataIndex: 'serial' },
            { title: 'Capacidade', dataIndex: 'capacity_gb', render: (v: number) => v ? `${v} GB` : '-' },
            { title: 'Usado', dataIndex: 'used_gb', render: (v: number) => v ? `${v} GB` : '-' },
            { title: 'Livre', dataIndex: 'free_gb', render: (v: number) => v ? `${v} GB` : '-' },
            { title: 'Saúde', dataIndex: 'health', render: (v: string) => <Tag color={v === 'OK' ? 'green' : 'red'}>{v || '-'}</Tag> },
          ]} />
      ),
    },
    {
      key: 'network',
      label: 'Rede',
      children: (
        <Table dataSource={device.networks} rowKey="mac_address" pagination={false} size="small" scroll={{ x: 600 }}
          columns={[
            { title: 'Adaptador', dataIndex: 'adapter_name' },
            { title: 'IP', dataIndex: 'ip_address' },
            { title: 'MAC', dataIndex: 'mac_address' },
            { title: 'Gateway', dataIndex: 'gateway' },
            { title: 'DNS', dataIndex: 'dns', ellipsis: true },
            { title: 'Tipo', dataIndex: 'adapter_type' },
          ]} />
      ),
    },
    {
      key: 'peripherals',
      label: 'Periféricos',
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Card size="small" title="Monitores" style={{ background: 'var(--bg-card-inner)', border: '1px solid var(--border)', borderRadius: 10 }}>
              <Table dataSource={device.monitors} rowKey="serial" pagination={false} size="small" scroll={{ x: 360 }}
                columns={[
                  { title: 'Fabricante', dataIndex: 'manufacturer' },
                  { title: 'Modelo', dataIndex: 'model' },
                  { title: 'Serial', dataIndex: 'serial' },
                ]} />
            </Card>
          </Col>
          <Col xs={24} sm={12}>
            <Card size="small" title="Impressoras" style={{ background: 'var(--bg-card-inner)', border: '1px solid var(--border)', borderRadius: 10 }}>
              <Table dataSource={device.printers} rowKey="name" pagination={false} size="small" scroll={{ x: 360 }}
                columns={[
                  { title: 'Nome', dataIndex: 'name' },
                  { title: 'Driver', dataIndex: 'driver' },
                  { title: 'Porta', dataIndex: 'port' },
                  { title: 'Padrão', dataIndex: 'is_default', render: (v: boolean) => v ? <Tag color="green">Sim</Tag> : 'Não' },
                ]} />
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'software',
      label: `Software (${software.length})`,
      children: (
        <Table dataSource={software} rowKey="name" size="small" scroll={{ x: 600 }}
          pagination={{ pageSize: 20 }}
          columns={[
            { title: 'Nome', dataIndex: 'name', sorter: (a: SoftwareInfo, b: SoftwareInfo) => (a.name || '').localeCompare(b.name || '') },
            { title: 'Versão', dataIndex: 'version' },
            { title: 'Editor', dataIndex: 'publisher' },
            { title: 'Data de Instalação', dataIndex: 'install_date' },
          ]} />
      ),
    },
    {
      key: 'services',
      label: `Serviços (${services.length})`,
      children: (
        <Table dataSource={services} rowKey="name" size="small" scroll={{ x: 500 }}
          pagination={{ pageSize: 20 }}
          columns={[
            { title: 'Nome', dataIndex: 'name' },
            { title: 'Nome de Exibição', dataIndex: 'display_name' },
            { title: 'Status', dataIndex: 'status',
              render: (v: string) => <Tag color={v === 'Running' ? 'green' : v === 'Stopped' ? 'red' : 'default'}>{v}</Tag> },
            { title: 'Tipo de Início', dataIndex: 'start_type' },
          ]} />
      ),
    },
    {
      key: 'users',
      label: <span><TeamOutlined /> Usuários ({device.local_users?.length || 0})</span>,
      children: (
        <Table dataSource={device.local_users || []} rowKey="username" size="small"
          pagination={{ pageSize: 20 }}
          columns={[
            { title: 'Usuário', dataIndex: 'username', key: 'username',
              render: (v: string) => <span><UserOutlined style={{ marginRight: 6 }} />{v}</span> },
            { title: 'Nome Completo', dataIndex: 'full_name', key: 'full_name',
              render: (v: string) => v || '-' },
            { title: 'Admin', dataIndex: 'is_admin', key: 'is_admin', width: 80,
              render: (v: boolean) => v ? <Tag color="red">Admin</Tag> : <Tag>Não</Tag> },
            { title: 'Ativo', dataIndex: 'is_active', key: 'is_active', width: 80,
              render: (v: boolean) => v ? <Tag color="green">Sim</Tag> : <Tag color="default">Não</Tag> },
            { title: 'Origem', dataIndex: 'source', key: 'source', width: 100,
              render: (v: string) => v === 'domain' ? <Tag color="blue">Domínio</Tag> : <Tag color="default">Local</Tag> },
            { title: 'Domínio', dataIndex: 'domain', key: 'domain', width: 150,
              render: (v: string) => v || '-' },
            { title: 'Último Logon', dataIndex: 'last_logon', key: 'last_logon', width: 180,
              render: (v: string) => v || '-' },
            ...(canRemote ? [{
              title: 'Ação', key: 'action', width: 130,
              render: (_: any, record: any) => (
                <Popconfirm
                  title={record.is_active
                    ? `Desabilitar o usuário "${record.username}"?`
                    : `Habilitar o usuário "${record.username}"?`}
                  onConfirm={async () => {
                    try {
                      const cmd = record.is_active ? 'disable_user' : 'enable_user';
                      await sendCommand(deviceId, cmd, { username: record.username });
                      message.success(
                        record.is_active
                          ? `Usuário "${record.username}" será desabilitado`
                          : `Usuário "${record.username}" será habilitado`
                      );
                      setTimeout(loadDevice, 3000);
                    } catch (err: any) {
                      message.error(err.response?.data?.detail || 'Erro ao executar');
                    }
                  }}
                >
                  <Button size="small" danger={record.is_active} type={record.is_active ? 'default' : 'primary'}
                    style={{ fontSize: 12 }}>
                    {record.is_active ? 'Desabilitar' : 'Habilitar'}
                  </Button>
                </Popconfirm>
              ),
            }] : []),
          ]} />
      ),
    },
    {
      key: 'changes',
      label: `Alterações (${changes.length})`,
      children: (
        <Timeline mode="left" items={changes.map((c) => ({
          label: new Date(c.detected_at).toLocaleString('pt-BR'),
          children: (
            <div>
              <Text strong>{c.component}</Text> - {c.field_name}<br />
              <Text type="danger" delete>{c.old_value || '(vazio)'}</Text>
              {' → '}
              <Text type="success">{c.new_value || '(vazio)'}</Text>
            </div>
          ),
        }))} />
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/devices')}>Voltar</Button>
      </Space>

      <Card style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="top" wrap={isMobile}>
          {/* ── Coluna esquerda: identidade + info ── */}
          <Col flex="auto">
            {/* Cabeçalho: ícone + hostname + status */}
            <Space align="center" style={{ marginBottom: 12 }}>
              <DesktopOutlined style={{ fontSize: 32, color: '#1565FF' }} />
              <div>
                <Space align="center" style={{ gap: 8 }}>
                  <Title level={4} style={{ margin: 0, color: 'var(--text)' }}>{device.hostname}</Title>
                  <Tag color={device.status === 'online' ? 'green' : 'red'}>
                    {device.status.toUpperCase()}
                  </Tag>
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {device.location_path || 'Sem localização definida'}
                </Text>
              </div>
            </Space>

            {/* Info resumo em grid */}
            {(() => {
              // Deduplica partições: agrupa por capacidade arredondada e tipo, mantém apenas disco físico único
              const uniqueDisks = Object.values(
                (device.storage || []).reduce((acc: Record<string, { type: string; gb: number; count: number }>, d) => {
                  if (!d.capacity_gb) return acc;
                  const gb = Math.round(d.capacity_gb);
                  const type = d.media_type && d.media_type !== 'Unknown' ? d.media_type : 'HDD';
                  const key = `${gb}-${type}`;
                  if (!acc[key]) acc[key] = { type, gb, count: 0 };
                  acc[key].count += 1;
                  return acc;
                }, {})
              );
              const storageText = uniqueDisks.length
                ? uniqueDisks.map(d => `${d.type} ${d.gb} GB${d.count > 1 ? ` ×${d.count}` : ''}`).join(' · ')
                : '-';

              return (
                <Row gutter={[0, 4]} style={{ marginBottom: 14 }}>
                  {[
                    { label: 'Agent ID',    value: device.agent_id },
                    { label: 'Sistema',     value: device.os_info ? `${device.os_info.name || ''} ${device.os_info.version || ''}`.trim() : (device.os_name || '-') },
                    { label: 'Usuário',     value: device.current_user || '-' },
                    { label: 'Domínio',     value: device.domain || '-' },
                    { label: 'CPU',         value: device.cpus?.[0]?.model || device.cpu_model || '-' },
                    { label: 'RAM',         value: device.ram ? `${device.ram.total_gb} GB` : (device.ram_total_gb ? `${device.ram_total_gb} GB` : '-') },
                    { label: 'Armazenamento', value: storageText },
                    { label: 'Última Comunicação', value: device.last_seen ? new Date(device.last_seen).toLocaleString('pt-BR') : '-' },
                  ].map(({ label, value }) => (
                    <Col xs={24} sm={12} key={label}>
                      <Text style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{label}: </Text>
                      <Text style={{ color: 'var(--text)', fontSize: 11 }}>{value}</Text>
                    </Col>
                  ))}
                </Row>
              );
            })()}

            {/* Botões de ação */}
            {canRemote && (
              <Space wrap size={[6, 6]}>
                <Button size="small" icon={<EnvironmentOutlined />} onClick={handleOpenLocationModal}>
                  Localização
                </Button>
                <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={handleVnc}>
                  Acesso Remoto
                </Button>
                <Button size="small" icon={<LockOutlined />} onClick={() => setLockModalOpen(true)} danger>
                  Bloquear Tela
                </Button>
                <Button size="small" icon={<UnlockOutlined />} onClick={handleUnlock}>
                  Desbloquear
                </Button>
                <Popconfirm title="Bloquear teclado e mouse?" onConfirm={async () => {
                  try { await sendCommand(deviceId, 'block_input', {}); message.success('Bloqueados'); } catch { message.error('Erro'); }
                }}>
                  <Button size="small" danger style={{ borderColor: '#7C3AED', color: '#7C3AED' }}>Block KB+Mouse</Button>
                </Popconfirm>
                <Popconfirm title="Desbloquear teclado e mouse?" onConfirm={async () => {
                  try { await sendCommand(deviceId, 'unblock_input', {}); message.success('Desbloqueados'); } catch { message.error('Erro'); }
                }}>
                  <Button size="small" style={{ borderColor: '#00BFA5', color: '#00BFA5' }}>Unblock KB+Mouse</Button>
                </Popconfirm>
                <Popconfirm title="Bloquear portas USB?" onConfirm={async () => {
                  try { await sendCommand(deviceId, 'block_usb', {}); message.success('USB bloqueadas'); } catch { message.error('Erro'); }
                }}>
                  <Button size="small" danger style={{ borderColor: '#FF4D4F', color: '#FF4D4F' }}>Block USB</Button>
                </Popconfirm>
                <Popconfirm title="Desbloquear portas USB?" onConfirm={async () => {
                  try { await sendCommand(deviceId, 'unblock_usb', {}); message.success('USB desbloqueadas'); } catch { message.error('Erro'); }
                }}>
                  <Button size="small" style={{ borderColor: '#0EA5E9', color: '#0EA5E9' }}>Unblock USB</Button>
                </Popconfirm>
                {user?.role === 'admin' && (
                  <Popconfirm title="Remover dispositivo?" onConfirm={handleDelete}>
                    <Button size="small" icon={<DeleteOutlined />} danger>Remover</Button>
                  </Popconfirm>
                )}
              </Space>
            )}
          </Col>

          {/* ── Coluna direita: QR Code (URL do dispositivo) ── */}
          <Col flex={isMobile ? '100%' : '140px'} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, borderLeft: isMobile ? 'none' : '1px solid var(--border)', borderTop: isMobile ? '1px solid var(--border)' : 'none', paddingLeft: isMobile ? 0 : 20, paddingTop: isMobile ? 12 : 0 }}>
            <QRCodeSVG
              value={`${window.location.origin}/devices/${deviceId}`}
              size={128}
              level="M"
              marginSize={1}
            />
            <Text style={{ color: 'var(--text-secondary)', fontSize: 10, textAlign: 'center' }}>
              {device.hostname}
            </Text>
            <Text style={{ color: 'var(--text-muted)', fontSize: 9, textAlign: 'center', wordBreak: 'break-all' }}>
              {window.location.origin}/devices/{deviceId}
            </Text>
          </Col>
        </Row>
      </Card>

      <Card style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}>
        <Tabs items={tabItems} />
      </Card>

      <Modal
        title="Bloquear Tela"
        open={lockModalOpen}
        onOk={handleLock}
        onCancel={() => setLockModalOpen(false)}
        okText="Bloquear"
        okButtonProps={{ danger: true }}
      >
        <Input.TextArea
          rows={3}
          value={lockMessage}
          onChange={(e) => setLockMessage(e.target.value)}
          placeholder="Mensagem exibida na tela bloqueada"
        />
      </Modal>

      <Modal
        title="Definir Localização"
        open={locationModalOpen}
        onOk={handleSaveLocation}
        onCancel={() => { setLocationModalOpen(false); setSelectedRoomId(undefined); }}
        okText="Salvar"
        confirmLoading={savingLocation}
      >
        <Select
          showSearch
          style={{ width: '100%' }}
          placeholder="Selecione o setor"
          value={selectedRoomId}
          onChange={setSelectedRoomId}
          filterOption={(input, option) =>
            (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={rooms.map((r) => ({ value: r.id, label: r.full_path }))}
        />
      </Modal>

    </div>
  );
}
