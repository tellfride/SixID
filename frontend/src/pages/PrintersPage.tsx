import { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Typography, Button, Space, Modal, Form, Input,
  InputNumber, Select, Tabs, message, Row, Col, Statistic, Popconfirm, Badge,
} from 'antd';
import {
  PrinterOutlined, ReloadOutlined, PlusOutlined, ThunderboltOutlined,
  BarChartOutlined, InboxOutlined, HistoryOutlined,
} from '@ant-design/icons';
import {
  getPrinters, createPrinter, updatePrinter, deletePrinter,
  pingPrinter, collectPrinterCounter, collectAllCounters, getPrinterRanking,
  registerTonerChange, getTonerHistory, getTonerStock, createTonerStock,
  restockToner, getStockLogs, getPrinterHistory,
} from '../api/endpoints';

const { Title, Text } = Typography;

const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 };

export default function PrintersPage() {
  const [printers, setPrinters] = useState<any[]>([]);
  const [ranking, setRanking] = useState<{ most: any[]; least: any[] }>({ most: [], least: [] });
  const [stock, setStock] = useState<any[]>([]);
  const [stockLogs, setStockLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<any>(null);
  const [tonerModalOpen, setTonerModalOpen] = useState(false);
  const [tonerPrinterId, setTonerPrinterId] = useState<number>(0);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [historyModal, setHistoryModal] = useState<{ open: boolean; printerId: number; name: string }>({ open: false, printerId: 0, name: '' });
  const [tonerHistoryModal, setTonerHistoryModal] = useState<{ open: boolean; printerId: number; name: string }>({ open: false, printerId: 0, name: '' });
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [tonerHistoryData, setTonerHistoryData] = useState<any[]>([]);
  const [rankingTop, setRankingTop] = useState(10);
  const [pingStatus, setPingStatus] = useState<Record<number, 'online' | 'offline' | 'loading'>>({});
  const [form] = Form.useForm();
  const [tonerForm] = Form.useForm();
  const [stockForm] = Form.useForm();
  const [restockForm] = Form.useForm();

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pRes, rRes, sRes, lRes] = await Promise.all([
        getPrinters(), getPrinterRanking(rankingTop), getTonerStock(), getStockLogs(),
      ]);
      setPrinters(pRes.data);
      setRanking(rRes.data);
      setStock(sRes.data);
      setStockLogs(lRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, [rankingTop]);

  const handleCreate = async (values: any) => {
    try {
      await createPrinter(values);
      message.success('Impressora cadastrada');
      setModalOpen(false);
      form.resetFields();
      loadAll();
    } catch (e: any) { message.error(e.response?.data?.detail || 'Erro'); }
  };

  const handleEdit = (printer: any) => {
    setEditingPrinter(printer);
    form.setFieldsValue(printer);
    setModalOpen(true);
  };

  const handleUpdate = async (values: any) => {
    try {
      await updatePrinter(editingPrinter.id, values);
      message.success('Atualizada');
      setModalOpen(false);
      setEditingPrinter(null);
      form.resetFields();
      loadAll();
    } catch (e: any) { message.error(e.response?.data?.detail || 'Erro'); }
  };

  const handlePing = async (id: number, ip: string) => {
    setPingStatus(prev => ({ ...prev, [id]: 'loading' }));
    try {
      const { data } = await pingPrinter(id);
      setPingStatus(prev => ({ ...prev, [id]: data.online ? 'online' : 'offline' }));
      if (data.online) {
        message.success(`${ip} — Online`);
      } else {
        message.error(`${ip} — Offline`);
      }
    } catch {
      setPingStatus(prev => ({ ...prev, [id]: 'offline' }));
      message.error('Erro ao pingar');
    }
  };

  const handleCollect = async (id: number) => {
    setPingStatus(prev => ({ ...prev, [id]: 'loading' }));
    try {
      const { data } = await collectPrinterCounter(id);
      setPingStatus(prev => ({ ...prev, [id]: 'online' }));
      message.success(`Coletado: ${data.effective_pages} paginas (total: ${data.total_pages})`);
      loadAll();
    } catch (e: any) {
      setPingStatus(prev => ({ ...prev, [id]: 'offline' }));
      message.error(e.response?.data?.detail || 'Falha SNMP');
    }
  };

  const handleCollectAll = async () => {
    try {
      const { data } = await collectAllCounters();
      message.success(`Coletadas ${data.collected} de ${data.results.length} impressoras`);
      loadAll();
    } catch { message.error('Erro na coleta'); }
  };

  const handleTonerChange = async (values: any) => {
    try {
      const { data } = await registerTonerChange(tonerPrinterId, values);
      message.success(`Toner substituido. Estoque: ${data.stock_remaining ?? 'N/A'}`);
      setTonerModalOpen(false);
      tonerForm.resetFields();
      loadAll();
    } catch (e: any) { message.error(e.response?.data?.detail || 'Erro'); }
  };

  const handleAddStock = async (values: any) => {
    try {
      await createTonerStock(values);
      message.success('Estoque atualizado');
      setStockModalOpen(false);
      stockForm.resetFields();
      loadAll();
    } catch (e: any) { message.error(e.response?.data?.detail || 'Erro'); }
  };

  const handleRestock = async (values: any) => {
    try {
      const { data } = await restockToner(values);
      message.success(`${data.message}. Novo total: ${data.new_quantity}`);
      setRestockModalOpen(false);
      restockForm.resetFields();
      loadAll();
    } catch (e: any) { message.error(e.response?.data?.detail || 'Erro'); }
  };

  const openHistory = async (printerId: number, name: string) => {
    setHistoryModal({ open: true, printerId, name });
    const { data } = await getPrinterHistory(printerId);
    setHistoryData(data);
  };

  const openTonerHistory = async (printerId: number, name: string) => {
    setTonerHistoryModal({ open: true, printerId, name });
    const { data } = await getTonerHistory(printerId);
    setTonerHistoryData(data);
  };

  const printerColumns = [
    { title: 'Nome', dataIndex: 'name', key: 'name', width: 160 },
    { title: 'Modelo', dataIndex: 'model', key: 'model', width: 140, render: (v: string) => v || '-' },
    { title: 'IP', dataIndex: 'ip_address', key: 'ip', width: 130 },
    { title: 'Local', dataIndex: 'location', key: 'loc', width: 120, render: (v: string) => v || '-' },
    { title: 'Setor', dataIndex: 'sector', key: 'sector', width: 100, render: (v: string) => v || '-' },
    { title: 'N.', dataIndex: 'printer_number', key: 'num', width: 60, render: (v: string) => v || '-' },
    { title: 'Páginas', dataIndex: 'effective_pages', key: 'pages', width: 100,
      render: (v: number) => <Text strong style={{ color: '#1565FF' }}>{v.toLocaleString('pt-BR')}</Text> },
    { title: 'Toners', dataIndex: 'toner_changes', key: 'toner', width: 80,
      render: (v: number) => <Badge count={v} style={{ backgroundColor: v > 0 ? '#7C3AED' : '#5B6470' }} /> },
    { title: 'Última Coleta', dataIndex: 'last_collected', key: 'lc', width: 150,
      render: (v: string) => v ? new Date(v).toLocaleString('pt-BR') : 'Nunca' },
    { title: 'Ações', key: 'actions', width: 280,
      render: (_: any, r: any) => (
        <Space size="small">
          <Button size="small" icon={<ThunderboltOutlined />} onClick={() => handleCollect(r.id)}
            loading={pingStatus[r.id] === 'loading'}
            style={{
              borderColor: pingStatus[r.id] === 'online' ? '#00BFA5' : pingStatus[r.id] === 'offline' ? '#FF4D4F' : undefined,
              color: pingStatus[r.id] === 'online' ? '#00BFA5' : pingStatus[r.id] === 'offline' ? '#FF4D4F' : undefined,
              background: pingStatus[r.id] === 'online' ? 'rgba(0,191,165,0.1)' : pingStatus[r.id] === 'offline' ? 'rgba(255,77,79,0.1)' : undefined,
            }}>SNMP</Button>
          <Button size="small" onClick={() => handlePing(r.id, r.ip_address)}
            disabled={!r.ip_address} style={{ borderColor: '#00BFA5', color: '#00BFA5' }}>Ping</Button>
          <Button size="small" onClick={() => { setTonerPrinterId(r.id); setTonerModalOpen(true); }}>Toner</Button>
          <Button size="small" icon={<HistoryOutlined />} onClick={() => openHistory(r.id, r.name)}>Contador</Button>
          <Button size="small" onClick={() => openTonerHistory(r.id, r.name)}>Hist. Toner</Button>
          <Button size="small" onClick={() => handleEdit(r)}>Editar</Button>
          <Popconfirm title="Remover?" onConfirm={async () => { await deletePrinter(r.id); loadAll(); }}>
            <Button size="small" danger>X</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const rankingColumns = [
    { title: '#', key: 'rank', width: 50, render: (_: any, __: any, i: number) => i + 1 },
    { title: 'Impressora', dataIndex: 'name', key: 'name' },
    { title: 'Modelo', dataIndex: 'model', key: 'model', render: (v: string) => v || '-' },
    { title: 'Local', dataIndex: 'location', key: 'loc', render: (v: string) => v || '-' },
    { title: 'Páginas', dataIndex: 'effective_pages', key: 'pages',
      render: (v: number) => <Text strong>{v.toLocaleString('pt-BR')}</Text> },
  ];

  const tabItems = [
    {
      key: 'list',
      label: <span><PrinterOutlined /> Impressoras ({printers.length})</span>,
      children: (
        <div>
          <Space style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingPrinter(null); form.resetFields(); setModalOpen(true); }}>
              Cadastrar Impressora
            </Button>
            <Button icon={<ThunderboltOutlined />} onClick={handleCollectAll}>Coletar Todas (SNMP)</Button>
          </Space>
          <Table dataSource={printers} columns={printerColumns} rowKey="id" size="small"
            loading={loading} scroll={{ x: 1400 }} pagination={{ pageSize: 15 }} />
        </div>
      ),
    },
    {
      key: 'ranking',
      label: <span><BarChartOutlined /> Rankings</span>,
      children: (
        <div>
          <Space style={{ marginBottom: 16 }}>
            <Text style={{ color: 'var(--text-secondary)' }}>Top:</Text>
            {[10, 20, 30, 40, 50].map(n => (
              <Button key={n} type={rankingTop === n ? 'primary' : 'default'} size="small"
                onClick={() => setRankingTop(n)}>{n}</Button>
            ))}
          </Space>
          <Row gutter={16}>
            <Col span={12}>
              <Card title={`Top ${rankingTop} — Mais Imprimem`} style={cardStyle} size="small"
                styles={{ header: { borderBottom: '1px solid var(--border)', color: 'var(--text)' } }}>
                <Table dataSource={ranking.most} columns={rankingColumns} rowKey="id" size="small" pagination={false} />
              </Card>
            </Col>
            <Col span={12}>
              <Card title={`Top ${rankingTop} — Menos Imprimem`} style={cardStyle} size="small"
                styles={{ header: { borderBottom: '1px solid var(--border)', color: 'var(--text)' } }}>
                <Table dataSource={ranking.least} columns={rankingColumns} rowKey="id" size="small" pagination={false} />
              </Card>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'stock',
      label: <span><InboxOutlined /> Estoque de Toner</span>,
      children: (
        <div>
          <Space style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { stockForm.resetFields(); setStockModalOpen(true); }}>
              Cadastrar Toner
            </Button>
            <Button icon={<PlusOutlined />} onClick={() => { restockForm.resetFields(); setRestockModalOpen(true); }}>
              Reabastecer
            </Button>
          </Space>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            {stock.map(s => (
              <Col xs={8} sm={6} md={4} key={s.id}>
                <Card size="small" style={{ ...cardStyle, borderTop: `3px solid ${s.low_stock ? '#FF4D4F' : '#00BFA5'}` }}>
                  <Statistic title={<span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>{s.toner_model}</span>}
                    value={s.quantity} valueStyle={{ color: s.low_stock ? '#FF4D4F' : 'var(--text)', fontWeight: 700 }} />
                  {s.low_stock && <Tag color="red" style={{ marginTop: 4 }}>Estoque Baixo</Tag>}
                </Card>
              </Col>
            ))}
          </Row>
          <Card title="Histórico de Movimentações" style={cardStyle} size="small"
            styles={{ header: { borderBottom: '1px solid var(--border)', color: 'var(--text)' } }}>
            <Table dataSource={stockLogs} rowKey="id" size="small" pagination={{ pageSize: 15 }}
              columns={[
                { title: 'Data', dataIndex: 'created_at', key: 'date', width: 160,
                  render: (v: string) => new Date(v).toLocaleString('pt-BR') },
                { title: 'Toner', dataIndex: 'toner_model', key: 'model' },
                { title: 'Acao', dataIndex: 'action', key: 'action', width: 130,
                  render: (v: string) => <Tag color={v === 'reabastecimento' ? 'green' : v === 'substituicao' ? 'orange' : 'blue'}>{v}</Tag> },
                { title: 'Qtd', dataIndex: 'quantity', key: 'qty', width: 60 },
                { title: 'Usuario', dataIndex: 'user', key: 'user', width: 120 },
                { title: 'Impressora', dataIndex: 'printer', key: 'printer', width: 140, render: (v: string) => v || '-' },
                { title: 'Obs', dataIndex: 'notes', key: 'notes', ellipsis: true },
              ]} />
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Title level={3} style={{ color: 'var(--text)', marginBottom: 24 }}>
        <PrinterOutlined style={{ marginRight: 8 }} />Impressoras
      </Title>
      <Card style={cardStyle}>
        <Tabs items={tabItems} />
      </Card>

      {/* Modal cadastro/edição */}
      <Modal title={editingPrinter ? 'Editar Impressora' : 'Cadastrar Impressora'}
        open={modalOpen} onCancel={() => { setModalOpen(false); setEditingPrinter(null); }}
        onOk={() => form.submit()} okText="Salvar">
        <Form form={form} layout="vertical" onFinish={editingPrinter ? handleUpdate : handleCreate}>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="name" label="Nome" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="model" label="Modelo"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="ip_address" label="IP"><Input placeholder="192.168.1.100" /></Form.Item></Col>
            <Col span={12}><Form.Item name="printer_number" label="Numero"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="location" label="Local"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="sector" label="Setor"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="serial_number" label="Serial"><Input /></Form.Item></Col>
            <Col span={8}>
              <Form.Item name="snmp_version" label="SNMP" initialValue="v2c">
                <Select options={[{ value: 'v1', label: 'v1' }, { value: 'v2c', label: 'v2c' }, { value: 'v3', label: 'v3' }]} />
              </Form.Item>
            </Col>
            <Col span={8}><Form.Item name="snmp_community" label="Comunidade" initialValue="public"><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="initial_counter" label="Contador Inicial (paginas ja impressas)" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal substituição toner */}
      <Modal title="Substituir Toner" open={tonerModalOpen}
        onCancel={() => setTonerModalOpen(false)} onOk={() => tonerForm.submit()} okText="Registrar">
        <Form form={tonerForm} layout="vertical" onFinish={handleTonerChange}>
          <Form.Item name="toner_model" label="Modelo do Toner" rules={[{ required: true }]}>
            <Select showSearch allowClear placeholder="Selecione ou digite"
              options={stock.map(s => ({ value: s.toner_model, label: `${s.toner_model} (estoque: ${s.quantity})` }))}
            />
          </Form.Item>
          <Form.Item name="pages_at_change" label="Páginas no momento da troca">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="Observações"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* Modal cadastro estoque */}
      <Modal title="Cadastrar Toner no Estoque" open={stockModalOpen}
        onCancel={() => setStockModalOpen(false)} onOk={() => stockForm.submit()} okText="Salvar">
        <Form form={stockForm} layout="vertical" onFinish={handleAddStock}>
          <Form.Item name="toner_model" label="Modelo do Toner" rules={[{ required: true }]}><Input placeholder="Ex: TN-2370" /></Form.Item>
          <Form.Item name="quantity" label="Quantidade" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="min_quantity" label="Quantidade Minima (alerta)" initialValue={2}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>

      {/* Modal reabastecimento */}
      <Modal title="Reabastecer Toner" open={restockModalOpen}
        onCancel={() => setRestockModalOpen(false)} onOk={() => restockForm.submit()} okText="Reabastecer">
        <Form form={restockForm} layout="vertical" onFinish={handleRestock}>
          <Form.Item name="toner_model" label="Modelo do Toner" rules={[{ required: true }]}>
            <Select options={stock.map(s => ({ value: s.toner_model, label: `${s.toner_model} (atual: ${s.quantity})` }))} />
          </Form.Item>
          <Form.Item name="quantity" label="Quantidade a adicionar" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="notes" label="Observações"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* Modal histórico contador */}
      <Modal title={`Histórico de Contagem — ${historyModal.name}`} open={historyModal.open}
        onCancel={() => setHistoryModal({ open: false, printerId: 0, name: '' })} footer={null} width={600}>
        <Table dataSource={historyData} rowKey="id" size="small" pagination={{ pageSize: 10 }}
          columns={[
            { title: 'Data', dataIndex: 'collected_at', key: 'date', render: (v: string) => new Date(v).toLocaleString('pt-BR') },
            { title: 'Total', dataIndex: 'total_pages', key: 'total' },
            { title: 'Efetivo', dataIndex: 'effective_pages', key: 'eff', render: (v: number) => <Text strong>{v.toLocaleString('pt-BR')}</Text> },
            { title: 'Fonte', dataIndex: 'source', key: 'src', render: (v: string) => <Tag>{v}</Tag> },
          ]} />
      </Modal>

      {/* Modal histórico toner */}
      <Modal title={`Histórico de Toner — ${tonerHistoryModal.name}`} open={tonerHistoryModal.open}
        onCancel={() => setTonerHistoryModal({ open: false, printerId: 0, name: '' })} footer={null} width={700}>
        <Table dataSource={tonerHistoryData} rowKey="id" size="small" pagination={{ pageSize: 10 }}
          columns={[
            { title: 'Data', dataIndex: 'changed_at', key: 'date', render: (v: string) => new Date(v).toLocaleString('pt-BR') },
            { title: 'Toner', dataIndex: 'toner_model', key: 'model' },
            { title: 'Páginas', dataIndex: 'pages_at_change', key: 'pages', render: (v: number) => v?.toLocaleString('pt-BR') || '-' },
            { title: 'Responsável', dataIndex: 'changed_by', key: 'by' },
            { title: 'Obs', dataIndex: 'notes', key: 'notes', ellipsis: true },
          ]} />
      </Modal>
    </div>
  );
}
