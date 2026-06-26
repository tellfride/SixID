import { useEffect, useState } from 'react';
import { Card, Tree, Typography, Button, Modal, Form, Input, Select, Space, message, Row, Popconfirm, Tooltip } from 'antd';
import {
  PlusOutlined, ReloadOutlined, EnvironmentOutlined,
  BankOutlined, HomeOutlined, ApartmentOutlined, AppstoreOutlined,
  EditOutlined, DeleteOutlined,
} from '@ant-design/icons';
import {
  getLocationTree, getUnits, getCompanies, getBranches, getSectors,
  createUnit, createCompany, createBranch, createSector, createRoom,
  updateUnit, updateCompany, updateBranch, updateSector, updateRoom,
  deleteUnit,
} from '../api/endpoints';
import api from '../api/client';
import type { LocationTreeNode } from '../types';

const { Title, Text } = Typography;

const typeConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  unit: { label: 'Empresa', color: '#1565FF', icon: <BankOutlined /> },
  company: { label: 'Empresa', color: '#7C3AED', icon: <HomeOutlined /> },
  branch: { label: 'Andar', color: '#0EA5E9', icon: <ApartmentOutlined /> },
  sector: { label: 'Setor', color: '#00BFA5', icon: <AppstoreOutlined /> },
};

const VISIBLE_TYPES = ['company', 'branch', 'sector'];

export default function LocationsPage() {
  const [tree, setTree] = useState<LocationTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editId, setEditId] = useState<number>(0);
  const [addType, setAddType] = useState<string>('unit');
  const [form] = Form.useForm();

  const [units, setUnits] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);

  const loadTree = async () => {
    setLoading(true);
    try {
      const [treeRes, unitsRes] = await Promise.all([getLocationTree(), getUnits()]);
      setTree(treeRes.data);
      setUnits(unitsRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadTree(); }, []);

  const onUnitChange = async (unitId: number) => {
    form.setFieldsValue({ company_id: undefined, branch_id: undefined, sector_id: undefined });
    setCompanies([]); setBranches([]); setSectors([]);
    if (unitId) { const { data } = await getCompanies(unitId); setCompanies(data); }
  };
  const onCompanyChange = async (companyId: number) => {
    form.setFieldsValue({ branch_id: undefined, sector_id: undefined });
    setBranches([]); setSectors([]);
    if (companyId) { const { data } = await getBranches(companyId); setBranches(data); }
  };
  const onBranchChange = async (branchId: number) => {
    form.setFieldsValue({ sector_id: undefined });
    setSectors([]);
    if (branchId) { const { data } = await getSectors(branchId); setSectors(data); }
  };

  const openAddModal = async (type: string) => {
    setModalMode('add'); setAddType(type); setEditId(0);
    form.resetFields(); setCompanies([]); setBranches([]); setSectors([]);
    if (type === 'branch' || type === 'sector') {
      const unitId = units[0]?.id;
      if (unitId) {
        const { data } = await getCompanies(unitId);
        setCompanies(data);
      }
    }
    setModalOpen(true);
  };

  const openEditModal = (type: string, id: number, name: string) => {
    setModalMode('edit'); setAddType(type); setEditId(id);
    form.resetFields(); form.setFieldsValue({ name });
    setCompanies([]); setBranches([]); setSectors([]);
    setModalOpen(true);
  };

  const handleDelete = async (type: string, id: number) => {
    try {
      await api.delete(`/locations/${type}s/${id}`);
      message.success(`${typeConfig[type]?.label || type} removido(a)`);
      loadTree();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Erro ao remover');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (modalMode === 'edit') {
        const updateData: Record<string, any> = { name: values.name };
        if (addType === 'unit' && values.description !== undefined) updateData.description = values.description;
        if (addType === 'branch' && values.address !== undefined) updateData.address = values.address;
        if (addType === 'sector' && values.floor !== undefined) updateData.floor = values.floor;

        switch (addType) {
          case 'unit': await updateUnit(editId, updateData); break;
          case 'company': await updateCompany(editId, updateData); break;
          case 'branch': await updateBranch(editId, updateData); break;
          case 'sector': await updateSector(editId, updateData); break;
        }
        message.success(`${typeConfig[addType].label} atualizado(a)`);
      } else {
        let unitId = units[0]?.id;
        if (!unitId && addType === 'company') {
          const { data } = await createUnit({ name: 'Default' });
          unitId = data.id;
          const { data: u } = await getUnits();
          setUnits(u);
        }
        switch (addType) {
          case 'company': await createCompany({ name: values.name, unit_id: unitId }); break;
          case 'branch': await createBranch({ name: values.name, address: values.address, company_id: values.company_id }); break;
          case 'sector': await createSector({ name: values.name, floor: values.floor, branch_id: values.branch_id }); break;
        }
        message.success(`${typeConfig[addType].label} adicionado(a)`);
      }
      setModalOpen(false); form.resetFields(); loadTree();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Erro');
    }
  };

  const convertToTreeData = (nodes: LocationTreeNode[]): any[] => {
    return nodes.map((node) => {
      const cfg = typeConfig[node.type] || typeConfig.sector;
      const cleanName = node.name.replace(/ \(Andar:.*\)$/, '');
      return {
        title: (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span>
              <span style={{ display: 'inline-block', background: cfg.color, color: '#fff', borderRadius: 4, padding: '1px 6px', fontSize: 10, marginRight: 8, fontWeight: 600 }}>{cfg.label}</span>
              {node.name}
            </span>
            <Tooltip title="Editar">
              <EditOutlined style={{ color: '#1565FF', cursor: 'pointer', fontSize: 13 }}
                onClick={(e) => { e.stopPropagation(); openEditModal(node.type, node.id, cleanName); }} />
            </Tooltip>
            <Popconfirm title={`Remover ${cfg.label.toLowerCase()} "${cleanName}"?`}
              onConfirm={(e) => { e?.stopPropagation(); handleDelete(node.type, node.id); }}
              onCancel={(e) => e?.stopPropagation()}>
              <DeleteOutlined style={{ color: '#FF4D4F', cursor: 'pointer', fontSize: 13 }}
                onClick={(e) => e.stopPropagation()} />
            </Popconfirm>
          </span>
        ),
        key: `${node.type}-${node.id}`,
        icon: cfg.icon,
        children: node.children?.length ? convertToTreeData(node.children) : undefined,
      };
    });
  };

  const parentLabel: Record<string, string> = {
    branch: 'Pertence à Empresa',
    sector: 'Pertence ao Andar',
  };

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Title level={3} style={{ color: 'var(--text)', margin: 0 }}>Localizações</Title>
        <Button icon={<ReloadOutlined />} onClick={loadTree}>Atualizar</Button>
      </Row>

      <Card style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 16 }}>
        <Space wrap>
          {VISIBLE_TYPES.map(key => {
            const cfg = typeConfig[key];
            return (
              <Button key={key} icon={cfg.icon} onClick={() => openAddModal(key)}
                style={{ borderColor: cfg.color, color: cfg.color }}>
                Novo(a) {cfg.label}
              </Button>
            );
          })}
        </Space>
      </Card>

      <Card style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}>
        {tree.length > 0 ? (
          <Tree showIcon defaultExpandAll
            treeData={convertToTreeData(tree.flatMap(u => u.children || []))}
            style={{ background: 'transparent', color: 'var(--text)' }} />
        ) : (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <EnvironmentOutlined style={{ fontSize: 48, color: 'var(--text-secondary)', marginBottom: 16 }} /><br />
            <Text style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Nenhuma localização cadastrada.</Text><br />
            <Button type="primary" icon={<PlusOutlined />} style={{ marginTop: 16 }}
              onClick={() => openAddModal('company')}>Criar primeira Empresa</Button>
          </div>
        )}
      </Card>

      <Modal
        title={<Space>{typeConfig[addType]?.icon}<span>{modalMode === 'edit' ? 'Editar' : 'Adicionar'} {typeConfig[addType]?.label}</span></Space>}
        open={modalOpen} onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()} okText="Salvar" cancelText="Cancelar">
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label={`Nome da ${typeConfig[addType]?.label}`}
            rules={[{ required: true, message: 'Informe o nome' }]}>
            <Input />
          </Form.Item>

          {modalMode === 'add' && addType === 'branch' && (
            <>
              <Form.Item name="company_id" label={parentLabel[addType]} rules={[{ required: true }]}>
                <Select placeholder="Selecione a empresa" options={companies.map((c: any) => ({ value: c.id, label: c.name }))} />
              </Form.Item>
              <Form.Item name="address" label="Identificação do Andar"><Input placeholder="Ex: 2º Andar, Térreo, Bloco A" /></Form.Item>
            </>
          )}

          {addType === 'branch' && modalMode === 'edit' && (
            <Form.Item name="address" label="Identificação do Andar"><Input /></Form.Item>
          )}

          {modalMode === 'add' && addType === 'sector' && (
            <>
              <Form.Item label="Empresa" required>
                <Select placeholder="Selecione" onChange={async (companyId: number) => {
                  form.setFieldsValue({ branch_id: undefined });
                  setBranches([]);
                  if (companyId) { const { data } = await getBranches(companyId); setBranches(data); }
                }} options={companies.map((c: any) => ({ value: c.id, label: c.name }))} />
              </Form.Item>
              <Form.Item name="branch_id" label={parentLabel[addType]} rules={[{ required: true }]}>
                <Select placeholder="Selecione o andar" options={branches.map((b: any) => ({ value: b.id, label: b.name }))} disabled={!branches.length} />
              </Form.Item>
            </>
          )}

        </Form>
      </Modal>
    </div>
  );
}
