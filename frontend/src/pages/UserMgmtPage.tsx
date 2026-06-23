import { useEffect, useState } from 'react';
import {
  Card, Table, Typography, Button, Modal, Form, Input, Switch, Tag,
  Space, message, Row, Col, Checkbox, Tabs, Alert, Result,
} from 'antd';
import {
  UserAddOutlined, KeyOutlined, DesktopOutlined, CheckCircleOutlined,
  ClockCircleOutlined, CloseCircleOutlined,
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

interface BatchResult {
  device_id: number;
  hostname: string;
  status: string;
}

export default function UserMgmtPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [createForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const loadDevices = async () => {
    setLoading(true);
    try {
      const { data } = await getDevices({ page_size: 200 });
      setDevices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDevices(); }, []);

  const handleSelectAll = () => {
    if (selectedIds.length === devices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(devices.map(d => d.id));
    }
  };

  const handleSelectOnline = () => {
    setSelectedIds(devices.filter(d => d.status === 'online').map(d => d.id));
  };

  const handleCreateUser = async (values: any) => {
    if (selectedIds.length === 0) {
      message.warning('Selecione pelo menos um dispositivo');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/remote/batch/create-user', {
        username: values.username,
        password: values.password,
        is_admin: values.is_admin ?? true,
        device_ids: selectedIds,
      });
      setResults(data.results);
      setCreateModalOpen(false);
      setResultModalOpen(true);
      createForm.resetFields();
      message.success(`Comando enviado para ${selectedIds.length} dispositivo(s)`);
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Erro ao criar usuário');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async (values: any) => {
    if (selectedIds.length === 0) {
      message.warning('Selecione pelo menos um dispositivo');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/remote/batch/change-password', {
        username: values.username,
        password: values.password,
        device_ids: selectedIds,
      });
      setResults(data.results);
      setPasswordModalOpen(false);
      setResultModalOpen(true);
      passwordForm.resetFields();
      message.success(`Comando enviado para ${selectedIds.length} dispositivo(s)`);
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Erro ao alterar senha');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: (
        <Checkbox
          checked={selectedIds.length === devices.length && devices.length > 0}
          indeterminate={selectedIds.length > 0 && selectedIds.length < devices.length}
          onChange={handleSelectAll}
        />
      ),
      key: 'select',
      width: 50,
      render: (_: any, record: Device) => (
        <Checkbox
          checked={selectedIds.includes(record.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedIds([...selectedIds, record.id]);
            } else {
              setSelectedIds(selectedIds.filter(id => id !== record.id));
            }
          }}
        />
      ),
    },
    { title: 'Hostname', dataIndex: 'hostname', key: 'hostname', width: 180 },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 100,
      render: (s: string) => (
        <Tag color={s === 'online' ? '#00BFA5' : '#FF4D4F'} style={{ borderRadius: 6 }}>
          {s.toUpperCase()}
        </Tag>
      ),
    },
    { title: 'Usuário Logado', dataIndex: 'current_user', key: 'user', width: 150 },
    { title: 'Domínio', dataIndex: 'domain', key: 'domain', width: 150 },
    { title: 'Localização', dataIndex: 'location_path', key: 'loc', ellipsis: true, render: (v: string) => v || '-' },
  ];

  const resultColumns = [
    { title: 'Hostname', dataIndex: 'hostname', key: 'hostname' },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (s: string) => {
        if (s === 'sent') return <Tag icon={<CheckCircleOutlined />} color="success">Enviado</Tag>;
        if (s === 'queued') return <Tag icon={<ClockCircleOutlined />} color="warning">Na fila</Tag>;
        return <Tag icon={<CloseCircleOutlined />} color="error">{s}</Tag>;
      },
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Title level={3} style={{ color: '#E6EBF1', margin: 0 }}>
          Gerenciamento de Usuários Remotos
        </Title>
      </Row>

      {/* Action bar */}
      <Card style={{ ...cardStyle, marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Space>
            <Text style={{ color: '#5B6470' }}>
              {selectedIds.length} de {devices.length} selecionado(s)
            </Text>
            <Button size="small" onClick={handleSelectAll}>
              {selectedIds.length === devices.length ? 'Desmarcar todos' : 'Selecionar todos'}
            </Button>
            <Button size="small" onClick={handleSelectOnline}>
              Selecionar online
            </Button>
          </Space>
          <Space>
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              disabled={selectedIds.length === 0}
              onClick={() => setCreateModalOpen(true)}
            >
              Criar Usuário
            </Button>
            <Button
              icon={<KeyOutlined />}
              disabled={selectedIds.length === 0}
              onClick={() => setPasswordModalOpen(true)}
              style={{ borderColor: '#FFB020', color: '#FFB020' }}
            >
              Alterar Senha
            </Button>
          </Space>
        </Row>
      </Card>

      {/* Device selection table */}
      <Card style={cardStyle}>
        <Table
          dataSource={devices}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 25, showSizeChanger: true }}
          rowClassName={(record) =>
            selectedIds.includes(record.id) ? 'ant-table-row-selected' : ''
          }
        />
      </Card>

      {/* Create User Modal */}
      <Modal
        title={<Space><UserAddOutlined /> Criar Usuário Administrador</Space>}
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={() => createForm.submit()}
        okText="Criar em todos"
        confirmLoading={submitting}
        cancelText="Cancelar"
      >
        <Alert
          message={`O usuário será criado em ${selectedIds.length} dispositivo(s)`}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={createForm} layout="vertical" onFinish={handleCreateUser}>
          <Form.Item name="username" label="Nome do Usuário"
            rules={[{ required: true, message: 'Informe o nome do usuário' }]}>
            <Input placeholder="Ex: admin.ti" />
          </Form.Item>
          <Form.Item name="password" label="Senha"
            rules={[{ required: true, message: 'Informe a senha' }, { min: 6, message: 'Mínimo 6 caracteres' }]}>
            <Input.Password placeholder="Senha do novo usuário" />
          </Form.Item>
          <Form.Item name="is_admin" label="Administrador local" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="Sim" unCheckedChildren="Não" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        title={<Space><KeyOutlined /> Alterar Senha</Space>}
        open={passwordModalOpen}
        onCancel={() => setPasswordModalOpen(false)}
        onOk={() => passwordForm.submit()}
        okText="Alterar em todos"
        confirmLoading={submitting}
        cancelText="Cancelar"
      >
        <Alert
          message={`A senha será alterada em ${selectedIds.length} dispositivo(s)`}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
          <Form.Item name="username" label="Nome do Usuário"
            rules={[{ required: true, message: 'Informe o nome do usuário' }]}>
            <Input placeholder="Ex: Administrador, admin.ti" />
          </Form.Item>
          <Form.Item name="password" label="Nova Senha"
            rules={[{ required: true, message: 'Informe a nova senha' }, { min: 6, message: 'Mínimo 6 caracteres' }]}>
            <Input.Password placeholder="Nova senha" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Results Modal */}
      <Modal
        title="Resultado da Operação"
        open={resultModalOpen}
        onCancel={() => setResultModalOpen(false)}
        footer={<Button type="primary" onClick={() => setResultModalOpen(false)}>Fechar</Button>}
        width={500}
      >
        <Table
          dataSource={results}
          columns={resultColumns}
          rowKey="device_id"
          size="small"
          pagination={false}
        />
      </Modal>
    </div>
  );
}
