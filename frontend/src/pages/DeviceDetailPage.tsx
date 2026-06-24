import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tabs, Table, Tag, Typography, Button, Space,
  Spin, Timeline, Modal, Input, Select, message, Row, Col, Progress, Popconfirm,
} from 'antd';
import {
  ArrowLeftOutlined, DesktopOutlined, LockOutlined, UnlockOutlined,
  PlayCircleOutlined, DeleteOutlined, EnvironmentOutlined,
} from '@ant-design/icons';
import { getDevice, getDeviceChanges, getDeviceSoftware, getDeviceServices,
  initiateVnc, lockScreen, unlockScreen, deleteDevice, getRoomsFlat, updateDevice, sendCommand } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import { UserOutlined, TeamOutlined } from '@ant-design/icons';
import type { DeviceDetail, HardwareChange, SoftwareInfo, ServiceInfo, LocalUserInfo } from '../types';

const { Title, Text } = Typography;

export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
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

  useEffect(() => {
    loadDevice();
    const interval = setInterval(loadDevice, 20000);
    return () => clearInterval(interval);
  }, [id]);

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
    setLocationModalOpen(true);
    try {
      const { data } = await getRoomsFlat();
      setRooms(data);
    } catch {
      message.error('Erro ao carregar salas');
    }
  };

  const handleSaveLocation = async () => {
    if (!selectedRoomId) {
      message.warning('Selecione uma sala');
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
            <Table dataSource={device.ram_slots} rowKey="slot" pagination={false} size="small"
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
        <Table dataSource={device.storage} rowKey="serial" pagination={false} size="small"
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
        <Table dataSource={device.networks} rowKey="mac_address" pagination={false} size="small"
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
          <Col span={12}>
            <Card size="small" title="Monitores" style={{ background: 'var(--bg-card-inner)', border: '1px solid var(--border)', borderRadius: 10 }}>
              <Table dataSource={device.monitors} rowKey="serial" pagination={false} size="small"
                columns={[
                  { title: 'Fabricante', dataIndex: 'manufacturer' },
                  { title: 'Modelo', dataIndex: 'model' },
                  { title: 'Serial', dataIndex: 'serial' },
                ]} />
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" title="Impressoras" style={{ background: 'var(--bg-card-inner)', border: '1px solid var(--border)', borderRadius: 10 }}>
              <Table dataSource={device.printers} rowKey="name" pagination={false} size="small"
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
        <Table dataSource={software} rowKey="name" size="small"
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
        <Table dataSource={services} rowKey="name" size="small"
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
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <DesktopOutlined style={{ fontSize: 28, color: '#1565FF' }} />
              <div>
                <Title level={4} style={{ margin: 0, color: 'var(--text)' }}>{device.hostname}</Title>
                <Text type="secondary">{device.location_path || 'Sem localização definida'}</Text>
              </div>
              <Tag color={device.status === 'online' ? 'green' : 'red'} style={{ marginLeft: 16 }}>
                {device.status.toUpperCase()}
              </Tag>
            </Space>
          </Col>
          <Col>
            {canRemote && (
              <Space>
                <Button icon={<EnvironmentOutlined />} onClick={handleOpenLocationModal}>
                  Definir Localização
                </Button>
                <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleVnc}>
                  Acesso Remoto (VNC)
                </Button>
                <Button icon={<LockOutlined />} onClick={() => setLockModalOpen(true)} danger>
                  Bloquear Tela
                </Button>
                <Button icon={<UnlockOutlined />} onClick={handleUnlock}>
                  Desbloquear
                </Button>
                <Popconfirm title="Bloquear teclado e mouse deste dispositivo?" onConfirm={async () => {
                  try { await sendCommand(deviceId, 'block_input', {}); message.success('Teclado e mouse bloqueados'); } catch { message.error('Erro ao bloquear'); }
                }}>
                  <Button danger style={{ borderColor: '#7C3AED', color: '#7C3AED' }}>Bloquear Teclado e Mouse</Button>
                </Popconfirm>
                <Popconfirm title="Desbloquear teclado e mouse?" onConfirm={async () => {
                  try { await sendCommand(deviceId, 'unblock_input', {}); message.success('Teclado e mouse desbloqueados'); } catch { message.error('Erro ao desbloquear'); }
                }}>
                  <Button style={{ borderColor: '#00BFA5', color: '#00BFA5' }}>Desbloquear Teclado e Mouse</Button>
                </Popconfirm>
                <Popconfirm title="Bloquear portas USB (pendrives/armazenamento)?" onConfirm={async () => {
                  try { await sendCommand(deviceId, 'block_usb', {}); message.success('Portas USB bloqueadas'); } catch { message.error('Erro ao bloquear USB'); }
                }}>
                  <Button danger style={{ borderColor: '#FF4D4F', color: '#FF4D4F' }}>Bloquear USB</Button>
                </Popconfirm>
                <Popconfirm title="Desbloquear portas USB?" onConfirm={async () => {
                  try { await sendCommand(deviceId, 'unblock_usb', {}); message.success('Portas USB desbloqueadas'); } catch { message.error('Erro ao desbloquear USB'); }
                }}>
                  <Button style={{ borderColor: '#0EA5E9', color: '#0EA5E9' }}>Desbloquear USB</Button>
                </Popconfirm>
                {user?.role === 'admin' && (
                  <Popconfirm title="Remover dispositivo?" onConfirm={handleDelete}>
                    <Button icon={<DeleteOutlined />} danger>Remover</Button>
                  </Popconfirm>
                )}
              </Space>
            )}
          </Col>
        </Row>

        <Descriptions column={4} size="small" style={{ marginTop: 16 }}>
          <Descriptions.Item label="Agent ID">{device.agent_id}</Descriptions.Item>
          <Descriptions.Item label="Usuário">{device.current_user || '-'}</Descriptions.Item>
          <Descriptions.Item label="Domínio">{device.domain || '-'}</Descriptions.Item>
          <Descriptions.Item label="Última Comunicação">
            {device.last_seen ? new Date(device.last_seen).toLocaleString('pt-BR') : '-'}
          </Descriptions.Item>
        </Descriptions>
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
          placeholder="Selecione a sala"
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
