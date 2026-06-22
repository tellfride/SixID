import { useEffect, useState } from 'react';
import { Card, Tree, Typography, Button, Modal, Form, Input, Select, Space, message, Row, Col } from 'antd';
import { PlusOutlined, ReloadOutlined, EnvironmentOutlined } from '@ant-design/icons';
import {
  getLocationTree, getUnits, createUnit, createCompany,
  createBranch, createSector, createRoom,
} from '../api/endpoints';
import type { LocationTreeNode } from '../types';

const { Title, Text } = Typography;

function convertToTreeData(nodes: LocationTreeNode[]): any[] {
  return nodes.map((node) => ({
    title: `${node.name}`,
    key: `${node.type}-${node.id}`,
    icon: <EnvironmentOutlined />,
    children: node.children?.length ? convertToTreeData(node.children) : undefined,
  }));
}

export default function LocationsPage() {
  const [tree, setTree] = useState<LocationTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [addType, setAddType] = useState<string>('unit');
  const [form] = Form.useForm();
  const [units, setUnits] = useState<any[]>([]);

  const loadTree = async () => {
    setLoading(true);
    try {
      const [treeRes, unitsRes] = await Promise.all([
        getLocationTree(),
        getUnits(),
      ]);
      setTree(treeRes.data);
      setUnits(unitsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTree(); }, []);

  const handleAdd = async (values: any) => {
    try {
      switch (addType) {
        case 'unit':
          await createUnit({ name: values.name, description: values.description });
          break;
        case 'company':
          await createCompany({ name: values.name, unit_id: values.parent_id });
          break;
        case 'branch':
          await createBranch({ name: values.name, address: values.address, company_id: values.parent_id });
          break;
        case 'sector':
          await createSector({ name: values.name, floor: values.floor, branch_id: values.parent_id });
          break;
        case 'room':
          await createRoom({ name: values.name, sector_id: values.parent_id });
          break;
      }
      message.success('Localização adicionada com sucesso');
      setModalOpen(false);
      form.resetFields();
      loadTree();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Erro ao adicionar');
    }
  };

  const typeLabels: Record<string, string> = {
    unit: 'Unidade',
    company: 'Empresa',
    branch: 'Filial',
    sector: 'Setor',
    room: 'Sala',
  };

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Title level={3} style={{ color: '#fff', margin: 0 }}>Localizações</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadTree}>Atualizar</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Adicionar
          </Button>
        </Space>
      </Row>

      <Card style={{ background: '#141414', border: '1px solid #303030' }}>
        {tree.length > 0 ? (
          <Tree
            showIcon
            defaultExpandAll
            treeData={convertToTreeData(tree)}
            style={{ background: 'transparent', color: '#fff' }}
          />
        ) : (
          <Text type="secondary">Nenhuma localização cadastrada. Clique em "Adicionar" para começar.</Text>
        )}
      </Card>

      <Modal
        title="Adicionar Localização"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Salvar"
      >
        <Form form={form} layout="vertical" onFinish={handleAdd}>
          <Form.Item label="Tipo" required>
            <Select value={addType} onChange={setAddType}
              options={Object.entries(typeLabels).map(([k, v]) => ({ value: k, label: v }))} />
          </Form.Item>
          <Form.Item name="name" label="Nome" rules={[{ required: true, message: 'Informe o nome' }]}>
            <Input />
          </Form.Item>
          {addType === 'unit' && (
            <Form.Item name="description" label="Descrição">
              <Input />
            </Form.Item>
          )}
          {addType !== 'unit' && (
            <Form.Item name="parent_id" label={`${typeLabels[addType]} pertence a`}
              rules={[{ required: true, message: 'Selecione o item pai' }]}>
              <Input type="number" placeholder="ID do item pai" />
            </Form.Item>
          )}
          {addType === 'branch' && (
            <Form.Item name="address" label="Endereço">
              <Input />
            </Form.Item>
          )}
          {addType === 'sector' && (
            <Form.Item name="floor" label="Andar">
              <Input />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
