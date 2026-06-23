import { useEffect, useState } from 'react';
import { Card, Tree, Typography, Button, Modal, Form, Input, Select, Space, message, Row, Col, Tag, Popconfirm } from 'antd';
import {
  PlusOutlined, ReloadOutlined, EnvironmentOutlined,
  BankOutlined, HomeOutlined, ApartmentOutlined, AppstoreOutlined, DeleteOutlined,
} from '@ant-design/icons';
import {
  getLocationTree, getUnits, getCompanies, getBranches, getSectors,
  createUnit, createCompany, createBranch, createSector, createRoom,
  deleteUnit,
} from '../api/endpoints';
import type { LocationTreeNode } from '../types';

const { Title, Text } = Typography;

const typeConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  unit: { label: 'Unidade', color: '#1565FF', icon: <BankOutlined /> },
  company: { label: 'Empresa', color: '#7C3AED', icon: <HomeOutlined /> },
  branch: { label: 'Filial', color: '#0EA5E9', icon: <ApartmentOutlined /> },
  sector: { label: 'Setor', color: '#00BFA5', icon: <AppstoreOutlined /> },
  room: { label: 'Sala', color: '#FFB020', icon: <EnvironmentOutlined /> },
};

function convertToTreeData(nodes: LocationTreeNode[]): any[] {
  return nodes.map((node) => {
    const cfg = typeConfig[node.type] || typeConfig.room;
    return {
      title: (
        <span>
          <Tag color={cfg.color} style={{ borderRadius: 4, marginRight: 8, fontSize: 10 }}>{cfg.label}</Tag>
          {node.name}
        </span>
      ),
      key: `${node.type}-${node.id}`,
      icon: cfg.icon,
      children: node.children?.length ? convertToTreeData(node.children) : undefined,
    };
  });
}

export default function LocationsPage() {
  const [tree, setTree] = useState<LocationTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [addType, setAddType] = useState<string>('unit');
  const [form] = Form.useForm();

  // Cascading dropdown data
  const [units, setUnits] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);

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

  const onUnitChange = async (unitId: number) => {
    form.setFieldsValue({ company_id: undefined, branch_id: undefined, sector_id: undefined });
    setCompanies([]);
    setBranches([]);
    setSectors([]);
    if (unitId) {
      const { data } = await getCompanies(unitId);
      setCompanies(data);
    }
  };

  const onCompanyChange = async (companyId: number) => {
    form.setFieldsValue({ branch_id: undefined, sector_id: undefined });
    setBranches([]);
    setSectors([]);
    if (companyId) {
      const { data } = await getBranches(companyId);
      setBranches(data);
    }
  };

  const onBranchChange = async (branchId: number) => {
    form.setFieldsValue({ sector_id: undefined });
    setSectors([]);
    if (branchId) {
      const { data } = await getSectors(branchId);
      setSectors(data);
    }
  };

  const openAddModal = (type: string) => {
    setAddType(type);
    form.resetFields();
    setCompanies([]);
    setBranches([]);
    setSectors([]);
    setModalOpen(true);
  };

  const handleAdd = async (values: any) => {
    try {
      switch (addType) {
        case 'unit':
          await createUnit({ name: values.name, description: values.description });
          break;
        case 'company':
          await createCompany({ name: values.name, unit_id: values.unit_id });
          break;
        case 'branch':
          await createBranch({ name: values.name, address: values.address, company_id: values.company_id });
          break;
        case 'sector':
          await createSector({ name: values.name, floor: values.floor, branch_id: values.branch_id });
          break;
        case 'room':
          await createRoom({ name: values.name, sector_id: values.sector_id });
          break;
      }
      message.success(`${typeConfig[addType].label} adicionado(a) com sucesso`);
      setModalOpen(false);
      form.resetFields();
      loadTree();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Erro ao adicionar');
    }
  };

  const parentLabel: Record<string, string> = {
    company: 'Pertence à Unidade',
    branch: 'Pertence à Empresa',
    sector: 'Pertence à Filial',
    room: 'Pertence ao Setor',
  };

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Title level={3} style={{ color: '#E6EBF1', margin: 0 }}>Localizações</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadTree}>Atualizar</Button>
        </Space>
      </Row>

      {/* Quick add buttons */}
      <Card style={{ background: '#111927', border: '1px solid #1E293B', borderRadius: 12, marginBottom: 16 }}>
        <Space wrap>
          {Object.entries(typeConfig).map(([key, cfg]) => (
            <Button
              key={key}
              icon={cfg.icon}
              onClick={() => openAddModal(key)}
              style={{ borderColor: cfg.color, color: cfg.color }}
            >
              Nova {cfg.label}
            </Button>
          ))}
        </Space>
      </Card>

      {/* Tree view */}
      <Card style={{ background: '#111927', border: '1px solid #1E293B', borderRadius: 12 }}>
        {tree.length > 0 ? (
          <Tree
            showIcon
            defaultExpandAll
            treeData={convertToTreeData(tree)}
            style={{ background: 'transparent', color: '#E6EBF1' }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <EnvironmentOutlined style={{ fontSize: 48, color: '#5B6470', marginBottom: 16 }} />
            <br />
            <Text style={{ color: '#5B6470', fontSize: 14 }}>
              Nenhuma localização cadastrada.
            </Text>
            <br />
            <Button type="primary" icon={<PlusOutlined />} style={{ marginTop: 16 }}
              onClick={() => openAddModal('unit')}>
              Criar primeira Unidade
            </Button>
          </div>
        )}
      </Card>

      {/* Add Modal */}
      <Modal
        title={
          <Space>
            {typeConfig[addType]?.icon}
            <span>Adicionar {typeConfig[addType]?.label}</span>
          </Space>
        }
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Salvar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical" onFinish={handleAdd}>
          <Form.Item name="name" label={`Nome da ${typeConfig[addType]?.label}`}
            rules={[{ required: true, message: 'Informe o nome' }]}>
            <Input placeholder={`Ex: ${addType === 'unit' ? 'Matriz São Paulo' : addType === 'company' ? 'Empresa ABC' : addType === 'branch' ? 'Filial Centro' : addType === 'sector' ? 'TI' : 'Sala 101'}`} />
          </Form.Item>

          {addType === 'unit' && (
            <Form.Item name="description" label="Descrição">
              <Input placeholder="Descrição da unidade (opcional)" />
            </Form.Item>
          )}

          {/* Company → select Unit */}
          {addType === 'company' && (
            <Form.Item name="unit_id" label={parentLabel[addType]}
              rules={[{ required: true, message: 'Selecione a unidade' }]}>
              <Select placeholder="Selecione a unidade"
                options={units.map((u: any) => ({ value: u.id, label: u.name }))}
              />
            </Form.Item>
          )}

          {/* Branch → select Unit then Company */}
          {addType === 'branch' && (
            <>
              <Form.Item label="Unidade" required>
                <Select placeholder="Selecione a unidade" onChange={onUnitChange}
                  options={units.map((u: any) => ({ value: u.id, label: u.name }))}
                />
              </Form.Item>
              <Form.Item name="company_id" label={parentLabel[addType]}
                rules={[{ required: true, message: 'Selecione a empresa' }]}>
                <Select placeholder="Selecione a empresa"
                  options={companies.map((c: any) => ({ value: c.id, label: c.name }))}
                  disabled={companies.length === 0}
                />
              </Form.Item>
              <Form.Item name="address" label="Endereço">
                <Input placeholder="Endereço da filial (opcional)" />
              </Form.Item>
            </>
          )}

          {/* Sector → select Unit → Company → Branch */}
          {addType === 'sector' && (
            <>
              <Form.Item label="Unidade" required>
                <Select placeholder="Selecione a unidade" onChange={onUnitChange}
                  options={units.map((u: any) => ({ value: u.id, label: u.name }))}
                />
              </Form.Item>
              <Form.Item label="Empresa" required>
                <Select placeholder="Selecione a empresa" onChange={onCompanyChange}
                  options={companies.map((c: any) => ({ value: c.id, label: c.name }))}
                  disabled={companies.length === 0}
                />
              </Form.Item>
              <Form.Item name="branch_id" label={parentLabel[addType]}
                rules={[{ required: true, message: 'Selecione a filial' }]}>
                <Select placeholder="Selecione a filial"
                  options={branches.map((b: any) => ({ value: b.id, label: b.name }))}
                  disabled={branches.length === 0}
                />
              </Form.Item>
              <Form.Item name="floor" label="Andar">
                <Input placeholder="Ex: 1º Andar, Térreo, Subsolo" />
              </Form.Item>
            </>
          )}

          {/* Room → select Unit → Company → Branch → Sector */}
          {addType === 'room' && (
            <>
              <Form.Item label="Unidade" required>
                <Select placeholder="Selecione a unidade" onChange={onUnitChange}
                  options={units.map((u: any) => ({ value: u.id, label: u.name }))}
                />
              </Form.Item>
              <Form.Item label="Empresa" required>
                <Select placeholder="Selecione a empresa" onChange={onCompanyChange}
                  options={companies.map((c: any) => ({ value: c.id, label: c.name }))}
                  disabled={companies.length === 0}
                />
              </Form.Item>
              <Form.Item label="Filial" required>
                <Select placeholder="Selecione a filial" onChange={onBranchChange}
                  options={branches.map((b: any) => ({ value: b.id, label: b.name }))}
                  disabled={branches.length === 0}
                />
              </Form.Item>
              <Form.Item name="sector_id" label={parentLabel[addType]}
                rules={[{ required: true, message: 'Selecione o setor' }]}>
                <Select placeholder="Selecione o setor"
                  options={sectors.map((s: any) => ({ value: s.id, label: `${s.name}${s.floor ? ` (${s.floor})` : ''}` }))}
                  disabled={sectors.length === 0}
                />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
}
