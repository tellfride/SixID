import { useEffect, useState } from 'react';
import { Card, Table, Typography, Button, Modal, Form, Input, Select, Tag, Space, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getUsers, createUser, updateUser, deleteUser } from '../api/endpoints';
import type { User } from '../types';

const { Title } = Typography;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form] = Form.useForm();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data } = await getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleSubmit = async (values: any) => {
    try {
      if (editing) {
        const updateData: any = { ...values };
        if (!updateData.password) delete updateData.password;
        await updateUser(editing.id, updateData);
        message.success('Usuário atualizado');
      } else {
        await createUser(values);
        message.success('Usuário criado');
      }
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      loadUsers();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Erro');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteUser(id);
      message.success('Usuário removido');
      loadUsers();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Erro ao remover');
    }
  };

  const openEdit = (user: User) => {
    setEditing(user);
    form.setFieldsValue({
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    });
    setModalOpen(true);
  };

  const roleColors: Record<string, string> = {
    admin: 'red',
    technician: 'blue',
    viewer: 'default',
  };

  const columns = [
    { title: 'Usuário', dataIndex: 'username', key: 'username' },
    { title: 'Nome', dataIndex: 'full_name', key: 'full_name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Perfil', dataIndex: 'role', key: 'role',
      render: (role: string) => <Tag color={roleColors[role]}>{role.toUpperCase()}</Tag>,
    },
    {
      title: 'Status', dataIndex: 'is_active', key: 'is_active',
      render: (active: boolean) => <Tag color={active ? 'green' : 'red'}>{active ? 'Ativo' : 'Inativo'}</Tag>,
    },
    {
      title: 'Ações', key: 'actions',
      render: (_: any, record: User) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Remover usuário?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={3} style={{ color: 'var(--text)', margin: 0 }}>Usuários</Title>
        <Button type="primary" icon={<PlusOutlined />}
          onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>
          Novo Usuário
        </Button>
      </div>

      <Card style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}>
        <Table dataSource={users} columns={columns} rowKey="id" loading={loading} size="middle" />
      </Card>

      <Modal
        title={editing ? 'Editar Usuário' : 'Novo Usuário'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Salvar"
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {!editing && (
            <Form.Item name="username" label="Usuário" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          )}
          <Form.Item name="email" label="Email" rules={[{ required: !editing, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="full_name" label="Nome Completo">
            <Input />
          </Form.Item>
          <Form.Item name="password" label={editing ? 'Nova Senha (deixe vazio para manter)' : 'Senha'}
            rules={editing ? [] : [{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="Perfil" rules={[{ required: true }]}>
            <Select options={[
              { value: 'admin', label: 'Administrador' },
              { value: 'technician', label: 'Técnico' },
              { value: 'viewer', label: 'Visualizador' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
