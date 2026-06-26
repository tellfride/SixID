import { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Typography, Button, Space, Modal, Form, Input,
  InputNumber, Select, Tabs, message, Row, Col, Statistic, Popconfirm, Badge, Spin,
} from 'antd';
import {
  PrinterOutlined, ReloadOutlined, PlusOutlined, ThunderboltOutlined,
  BarChartOutlined, InboxOutlined, HistoryOutlined, DownloadOutlined,
  DashboardOutlined, FileTextOutlined, ExperimentOutlined, SwapOutlined,
} from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  getPrinters, createPrinter, updatePrinter, deletePrinter,
  pingPrinter, collectPrinterCounter, collectAllCounters, getPrinterRanking,
  registerTonerChange, getTonerHistory, getTonerStock, createTonerStock,
  restockToner, getStockLogs, getPrinterHistory, getPrinterDashboard,
} from '../api/endpoints';
import { useThemeStore } from '../store/themeStore';

const { Title, Text } = Typography;

const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 };

const PRINTER_DASH_KEY = 'sixid_printer_dash_order';
const DEFAULT_DASH_ORDER = ['total_impressoes', 'toners_trocados', 'toners_estoque', 'estoque_baixo',
  'imp_hoje', 'imp_semana', 'imp_mes', 'toner_hoje', 'toner_semana', 'toner_mes'];

function SortableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{
      transform: CSS.Transform.toString(transform), transition,
      opacity: isDragging ? 0.6 : 1, height: '100%',
    }} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

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
  const [dashData, setDashData] = useState<any>(null);
  const [dashDetail, setDashDetail] = useState<{ open: boolean; title: string; data: any[]; columns: any[] }>({ open: false, title: '', data: [], columns: [] });
  const isDark = useThemeStore((s) => s.mode === 'dark');
  const [cardOrder, setCardOrder] = useState<string[]>(() => {
    try { const s = localStorage.getItem(PRINTER_DASH_KEY); return s ? JSON.parse(s) : DEFAULT_DASH_ORDER; }
    catch { return DEFAULT_DASH_ORDER; }
  });
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const handleCardDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setCardOrder(prev => {
        const newOrder = arrayMove(prev, prev.indexOf(active.id as string), prev.indexOf(over.id as string));
        localStorage.setItem(PRINTER_DASH_KEY, JSON.stringify(newOrder));
        return newOrder;
      });
    }
  };
  const [dispenseModalOpen, setDispenseModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [tonerForm] = Form.useForm();
  const [stockForm] = Form.useForm();
  const [restockForm] = Form.useForm();
  const [dispenseForm] = Form.useForm();

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pRes, rRes, sRes, lRes, dRes] = await Promise.all([
        getPrinters(), getPrinterRanking(rankingTop), getTonerStock(), getStockLogs(), getPrinterDashboard(),
      ]);
      setPrinters(pRes.data);
      setRanking(rRes.data);
      setStock(sRes.data);
      setStockLogs(lRes.data);
      setDashData(dRes.data);
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

  const handleDispense = async (values: any) => {
    try {
      const { data } = await registerTonerChange(values.printer_id, {
        toner_model: values.toner_model,
        notes: values.notes,
      });
      message.success(`Toner dispensado. Estoque restante: ${data.stock_remaining ?? 'N/A'}`);
      setDispenseModalOpen(false);
      dispenseForm.resetFields();
      loadAll();
    } catch (e: any) { message.error(e.response?.data?.detail || 'Erro ao dispensar'); }
  };

  const handleExportToner = async () => {
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch('/api/printers/stock/export', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) { message.error('Erro ao exportar'); return; }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dispensacao_toner_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success('Relatório exportado');
    } catch { message.error('Erro ao exportar'); }
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

  const CHART_COLORS = ['#1565FF', '#00BFA5', '#FFB020', '#FF4D4F', '#7C3AED', '#0EA5E9', '#F472B6'];
  const ttStyle = { background: isDark ? '#162032' : '#fff', border: '1px solid var(--border)', borderRadius: 8, color: isDark ? '#E6EAF0' : '#1a1a2e' };
  const axClr = isDark ? '#5B6470' : '#9ca3af';
  const gridClr = isDark ? '#1E293B' : '#e5e7eb';

  const showPagesDetail = () => {
    setDashDetail({
      open: true, title: 'Páginas por Impressora',
      data: dashData?.pages_per_printer || [],
      columns: [
        { title: '#', key: 'r', width: 40, render: (_: any, __: any, i: number) => i + 1 },
        { title: 'Impressora', dataIndex: 'name', key: 'name' },
        { title: 'Páginas', dataIndex: 'pages', key: 'pages', render: (v: number) => <Text strong style={{ color: '#1565FF' }}>{v.toLocaleString('pt-BR')}</Text> },
      ],
    });
  };

  const showTonerDetail = () => {
    setDashDetail({
      open: true, title: 'Trocas de Toner por Impressora',
      data: dashData?.toner_per_printer?.filter((t: any) => t.toner_changes > 0) || [],
      columns: [
        { title: '#', key: 'r', width: 40, render: (_: any, __: any, i: number) => i + 1 },
        { title: 'Impressora', dataIndex: 'name', key: 'name' },
        { title: 'Trocas', dataIndex: 'toner_changes', key: 'tc', render: (v: number) => <Badge count={v} style={{ backgroundColor: '#7C3AED' }} /> },
      ],
    });
  };

  const showModelDetail = () => {
    setDashDetail({
      open: true, title: 'Consumo por Modelo de Toner',
      data: dashData?.toner_by_model || [],
      columns: [
        { title: '#', key: 'r', width: 40, render: (_: any, __: any, i: number) => i + 1 },
        { title: 'Modelo', dataIndex: 'model', key: 'model' },
        { title: 'Unidades Consumidas', dataIndex: 'count', key: 'count', render: (v: number) => <Text strong>{v}</Text> },
      ],
    });
  };

  const tabItems = [
    {
      key: 'dashboard',
      label: <span><DashboardOutlined /> Dashboard</span>,
      children: dashData ? (
        <div>
          <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleCardDragEnd}>
          <SortableContext items={cardOrder} strategy={rectSortingStrategy}>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            {cardOrder.map(id => {
              const cards: Record<string, React.ReactNode> = {
                total_impressoes: (
                  <Card hoverable onClick={showPagesDetail} style={{ ...cardStyle, borderTop: '3px solid #1565FF', cursor: 'pointer', height: '100%' }}>
                    <Statistic title={<span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Total de Impressões</span>}
                      value={dashData.total_pages} prefix={<FileTextOutlined style={{ color: '#1565FF' }} />}
                      valueStyle={{ color: 'var(--text)', fontWeight: 700 }}
                      formatter={(v) => Number(v).toLocaleString('pt-BR')} />
                  </Card>
                ),
                toners_trocados: (
                  <Card hoverable onClick={showTonerDetail} style={{ ...cardStyle, borderTop: '3px solid #7C3AED', cursor: 'pointer', height: '100%' }}>
                    <Statistic title={<span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Toners Trocados</span>}
                      value={dashData.total_toner_changes} prefix={<ExperimentOutlined style={{ color: '#7C3AED' }} />}
                      valueStyle={{ color: 'var(--text)', fontWeight: 700 }} />
                  </Card>
                ),
                toners_estoque: (
                  <Card hoverable onClick={() => setDashDetail({ open: true, title: 'Estoque de Toner', data: stock, columns: [
                    { title: 'Modelo', dataIndex: 'toner_model', key: 'm' },
                    { title: 'Quantidade', dataIndex: 'quantity', key: 'q', render: (v: number, r: any) => <Text strong style={{ color: r.low_stock ? '#FF4D4F' : 'var(--text)' }}>{v}</Text> },
                    { title: 'Status', key: 's', render: (_: any, r: any) => r.low_stock ? <Tag color="red">Baixo</Tag> : <Tag color="green">OK</Tag> },
                  ]})} style={{ ...cardStyle, borderTop: '3px solid #00BFA5', cursor: 'pointer', height: '100%' }}>
                    <Statistic title={<span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Toners em Estoque</span>}
                      value={dashData.total_stock} prefix={<InboxOutlined style={{ color: '#00BFA5' }} />}
                      valueStyle={{ color: 'var(--text)', fontWeight: 700 }} />
                  </Card>
                ),
                estoque_baixo: (
                  <Card hoverable style={{ ...cardStyle, borderTop: `3px solid ${dashData.low_stock_count > 0 ? '#FF4D4F' : '#00BFA5'}`, height: '100%' }}>
                    <Statistic title={<span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Estoque Baixo</span>}
                      value={dashData.low_stock_count} prefix={<InboxOutlined style={{ color: dashData.low_stock_count > 0 ? '#FF4D4F' : '#00BFA5' }} />}
                      valueStyle={{ color: dashData.low_stock_count > 0 ? '#FF4D4F' : 'var(--text)', fontWeight: 700 }} />
                    {dashData.low_stock_count > 0 && <Tag color="red" style={{ marginTop: 4 }}>Atenção</Tag>}
                  </Card>
                ),
                imp_hoje: (
                  <Card hoverable size="small" style={{ ...cardStyle, borderTop: '3px solid #0EA5E9', height: '100%' }}>
                    <Statistic title={<span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Impressões Hoje</span>}
                      value={dashData.pages_today || 0} valueStyle={{ color: '#0EA5E9', fontWeight: 700, fontSize: 18 }} />
                  </Card>
                ),
                imp_semana: (
                  <Card hoverable size="small" style={{ ...cardStyle, borderTop: '3px solid #1565FF', height: '100%' }}>
                    <Statistic title={<span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Impressões Semana</span>}
                      value={dashData.pages_week || 0} valueStyle={{ color: '#1565FF', fontWeight: 700, fontSize: 18 }} />
                  </Card>
                ),
                imp_mes: (
                  <Card hoverable size="small" style={{ ...cardStyle, borderTop: '3px solid #7C3AED', height: '100%' }}>
                    <Statistic title={<span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Impressões Mês</span>}
                      value={dashData.pages_month || 0} valueStyle={{ color: '#7C3AED', fontWeight: 700, fontSize: 18 }} />
                  </Card>
                ),
                toner_hoje: (
                  <Card hoverable size="small" style={{ ...cardStyle, borderTop: '3px solid #FFB020', height: '100%' }}>
                    <Statistic title={<span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Toners Hoje</span>}
                      value={dashData.toners_today || 0} valueStyle={{ color: '#FFB020', fontWeight: 700, fontSize: 18 }} />
                  </Card>
                ),
                toner_semana: (
                  <Card hoverable size="small" style={{ ...cardStyle, borderTop: '3px solid #FF4D4F', height: '100%' }}>
                    <Statistic title={<span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Toners Semana</span>}
                      value={dashData.toners_week || 0} valueStyle={{ color: '#FF4D4F', fontWeight: 700, fontSize: 18 }} />
                  </Card>
                ),
                toner_mes: (
                  <Card hoverable size="small" style={{ ...cardStyle, borderTop: '3px solid #00BFA5', height: '100%' }}>
                    <Statistic title={<span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Toners Mês</span>}
                      value={dashData.toners_month || 0} valueStyle={{ color: '#00BFA5', fontWeight: 700, fontSize: 18 }} />
                  </Card>
                ),
              };
              return cards[id] ? (
                <Col xs={12} sm={6} md={id.startsWith('imp_') || id.startsWith('toner_') ? 4 : 6} key={id}>
                  <SortableCard id={id}>{cards[id]}</SortableCard>
                </Col>
              ) : null;
            })}
          </Row>
          </SortableContext>
          </DndContext>

          {/* Period charts */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={8}>
              <Card title="Impressões — Últimos 7 Dias" size="small" style={cardStyle}
                styles={{ header: { borderBottom: '1px solid var(--border)', color: 'var(--text)' } }}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dashData.daily_pages_chart || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridClr} />
                    <XAxis dataKey="date" stroke={axClr} tick={{ fontSize: 9 }} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis stroke={axClr} />
                    <RTooltip contentStyle={ttStyle} />
                    <Bar dataKey="pages" fill="#0EA5E9" radius={[4, 4, 0, 0]} name="Páginas" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title="Impressões — Últimos 30 Dias" size="small" style={cardStyle}
                styles={{ header: { borderBottom: '1px solid var(--border)', color: 'var(--text)' } }}>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={dashData.weekly_pages_chart || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridClr} />
                    <XAxis dataKey="date" stroke={axClr} tick={{ fontSize: 9 }} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis stroke={axClr} />
                    <RTooltip contentStyle={ttStyle} />
                    <Line type="monotone" dataKey="pages" stroke="#1565FF" strokeWidth={2} dot={false} name="Páginas" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title="Impressões — Últimos 90 Dias" size="small" style={cardStyle}
                styles={{ header: { borderBottom: '1px solid var(--border)', color: 'var(--text)' } }}>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={dashData.monthly_pages_chart || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridClr} />
                    <XAxis dataKey="date" stroke={axClr} tick={{ fontSize: 9 }} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis stroke={axClr} />
                    <RTooltip contentStyle={ttStyle} />
                    <Line type="monotone" dataKey="pages" stroke="#7C3AED" strokeWidth={2} dot={false} name="Páginas" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={8}>
              <Card title="Toners — Últimos 7 Dias" size="small" style={cardStyle}
                styles={{ header: { borderBottom: '1px solid var(--border)', color: 'var(--text)' } }}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dashData.daily_toners_chart || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridClr} />
                    <XAxis dataKey="date" stroke={axClr} tick={{ fontSize: 9 }} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis stroke={axClr} allowDecimals={false} />
                    <RTooltip contentStyle={ttStyle} />
                    <Bar dataKey="count" fill="#FFB020" radius={[4, 4, 0, 0]} name="Trocas" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title="Toners — Últimos 30 Dias" size="small" style={cardStyle}
                styles={{ header: { borderBottom: '1px solid var(--border)', color: 'var(--text)' } }}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dashData.weekly_toners_chart || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridClr} />
                    <XAxis dataKey="date" stroke={axClr} tick={{ fontSize: 9 }} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis stroke={axClr} allowDecimals={false} />
                    <RTooltip contentStyle={ttStyle} />
                    <Bar dataKey="count" fill="#FF4D4F" radius={[4, 4, 0, 0]} name="Trocas" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title="Toners — Últimos 90 Dias" size="small" style={cardStyle}
                styles={{ header: { borderBottom: '1px solid var(--border)', color: 'var(--text)' } }}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dashData.monthly_toners_chart || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridClr} />
                    <XAxis dataKey="date" stroke={axClr} tick={{ fontSize: 9 }} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis stroke={axClr} allowDecimals={false} />
                    <RTooltip contentStyle={ttStyle} />
                    <Bar dataKey="count" fill="#00BFA5" radius={[4, 4, 0, 0]} name="Trocas" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          {/* Toner Stock Chart */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24}>
              <Card title="Estoque de Toner Disponível" style={cardStyle}
                extra={<Text style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Clique para detalhes</Text>}
                styles={{ header: { borderBottom: '1px solid var(--border)', color: 'var(--text)' } }}>
                <div onClick={() => setDashDetail({ open: true, title: 'Estoque de Toner', data: stock, columns: [
                  { title: 'Modelo', dataIndex: 'toner_model', key: 'm' },
                  { title: 'Em Estoque', dataIndex: 'quantity', key: 'q', render: (v: number, r: any) => <Text strong style={{ color: r.low_stock ? '#FF4D4F' : '#00BFA5' }}>{v}</Text> },
                  { title: 'Mínimo', dataIndex: 'min_quantity', key: 'min' },
                  { title: 'Status', key: 's', render: (_: any, r: any) => r.low_stock ? <Tag color="red">Estoque Baixo</Tag> : <Tag color="green">OK</Tag> },
                ]})} style={{ cursor: 'pointer' }}>
                  <ResponsiveContainer width="100%" height={Math.max(200, stock.length * 45)}>
                    <BarChart data={stock.map(s => ({ ...s, name: s.toner_model }))} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridClr} />
                      <XAxis type="number" stroke={axClr} />
                      <YAxis type="category" dataKey="name" stroke={axClr} width={140} tick={{ fontSize: 11 }} />
                      <RTooltip contentStyle={ttStyle} />
                      <Bar dataKey="quantity" name="Em Estoque" radius={[0, 6, 6, 0]}>
                        {stock.map((s: any, i: number) => (
                          <Cell key={i} fill={s.low_stock ? '#FF4D4F' : '#00BFA5'} />
                        ))}
                      </Bar>
                      <Bar dataKey="min_quantity" fill="transparent" stroke="#FFB020" strokeWidth={2} strokeDasharray="4 4" name="Mínimo" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="Páginas por Impressora" style={cardStyle} extra={<Text style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Clique para detalhes</Text>}
                styles={{ header: { borderBottom: '1px solid var(--border)', color: 'var(--text)' } }}>
                <div onClick={showPagesDetail} style={{ cursor: 'pointer' }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={(dashData.pages_per_printer || []).slice(0, 10)} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridClr} />
                      <XAxis type="number" stroke={axClr} />
                      <YAxis type="category" dataKey="name" stroke={axClr} width={120} tick={{ fontSize: 11 }} />
                      <RTooltip contentStyle={ttStyle} />
                      <Bar dataKey="pages" fill="#1565FF" radius={[0, 6, 6, 0]} name="Páginas" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Consumo de Toner por Modelo" style={cardStyle} extra={<Text style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Clique para detalhes</Text>}
                styles={{ header: { borderBottom: '1px solid var(--border)', color: 'var(--text)' } }}>
                <div onClick={showModelDetail} style={{ cursor: 'pointer' }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={dashData.toner_by_model || []} dataKey="count" nameKey="model" cx="50%" cy="50%"
                        outerRadius={95} innerRadius={55} label strokeWidth={0}>
                        {(dashData.toner_by_model || []).map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <RTooltip contentStyle={ttStyle} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} lg={12}>
              <Card title="Trocas de Toner por Impressora" style={cardStyle} extra={<Text style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Clique para detalhes</Text>}
                styles={{ header: { borderBottom: '1px solid var(--border)', color: 'var(--text)' } }}>
                <div onClick={showTonerDetail} style={{ cursor: 'pointer' }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={(dashData.toner_per_printer || []).filter((t: any) => t.toner_changes > 0).slice(0, 10)} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridClr} />
                      <XAxis type="number" stroke={axClr} />
                      <YAxis type="category" dataKey="name" stroke={axClr} width={120} tick={{ fontSize: 11 }} />
                      <RTooltip contentStyle={ttStyle} />
                      <Bar dataKey="toner_changes" fill="#7C3AED" radius={[0, 6, 6, 0]} name="Trocas" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Impressões por Mês" style={cardStyle}
                styles={{ header: { borderBottom: '1px solid var(--border)', color: 'var(--text)' } }}>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={dashData.monthly_pages || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridClr} />
                    <XAxis dataKey="month" stroke={axClr} />
                    <YAxis stroke={axClr} />
                    <RTooltip contentStyle={ttStyle} />
                    <Line type="monotone" dataKey="pages" stroke="#00BFA5" strokeWidth={2} dot name="Páginas" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
        </div>
      ) : <Spin />,
    },
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
          <Space style={{ marginBottom: 16 }} wrap>
            <Button type="primary" icon={<SwapOutlined />} onClick={() => { dispenseForm.resetFields(); setDispenseModalOpen(true); }}>
              Dispensar Toner
            </Button>
            <Button icon={<PlusOutlined />} onClick={() => { stockForm.resetFields(); setStockModalOpen(true); }}>
              Cadastrar Toner
            </Button>
            <Button icon={<PlusOutlined />} onClick={() => { restockForm.resetFields(); setRestockModalOpen(true); }}>
              Reabastecer
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExportToner}>
              Exportar Excel
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
          <Card title="Histórico de Dispensação e Movimentações" style={cardStyle} size="small"
            styles={{ header: { borderBottom: '1px solid var(--border)', color: 'var(--text)' } }}
            extra={<Button size="small" icon={<DownloadOutlined />} onClick={handleExportToner}>Excel</Button>}>
            <Table dataSource={stockLogs} rowKey="id" size="small" pagination={{ pageSize: 15 }}
              columns={[
                { title: 'Data/Hora', dataIndex: 'created_at', key: 'date', width: 160,
                  render: (v: string) => new Date(v).toLocaleString('pt-BR') },
                { title: 'Ação', dataIndex: 'action', key: 'action', width: 120,
                  render: (v: string) => <Tag color={v === 'reabastecimento' ? 'green' : v === 'substituição' || v === 'substituicao' ? 'orange' : 'blue'}>{v}</Tag> },
                { title: 'Toner', dataIndex: 'toner_model', key: 'model', width: 120 },
                { title: 'Qtd', dataIndex: 'quantity', key: 'qty', width: 50 },
                { title: 'Impressora', dataIndex: 'printer', key: 'printer', width: 130, render: (v: string) => v || '-' },
                { title: 'Nº', dataIndex: 'printer_number', key: 'pnum', width: 70, render: (v: string) => v || '-' },
                { title: 'Local', dataIndex: 'printer_location', key: 'ploc', width: 100, render: (v: string) => v || '-' },
                { title: 'Setor', dataIndex: 'printer_sector', key: 'psec', width: 100, render: (v: string) => v || '-' },
                { title: 'Operador', dataIndex: 'user', key: 'user', width: 110 },
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

      {/* Modal dispensação de toner */}
      <Modal title="Dispensar Toner para Impressora" open={dispenseModalOpen}
        onCancel={() => setDispenseModalOpen(false)} onOk={() => dispenseForm.submit()} okText="Dispensar" okButtonProps={{ danger: true }}>
        <Form form={dispenseForm} layout="vertical" onFinish={handleDispense}>
          <Form.Item name="printer_id" label="Impressora" rules={[{ required: true, message: 'Selecione a impressora' }]}>
            <Select showSearch placeholder="Selecione a impressora"
              filterOption={(input, option) => (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
              options={printers.map(p => ({
                value: p.id,
                label: `${p.name}${p.printer_number ? ` (Nº ${p.printer_number})` : ''}${p.location ? ` — ${p.location}` : ''}`,
              }))} />
          </Form.Item>
          <Form.Item name="toner_model" label="Modelo do Toner" rules={[{ required: true, message: 'Selecione o toner' }]}>
            <Select showSearch placeholder="Selecione o toner"
              options={stock.map(s => ({
                value: s.toner_model,
                label: `${s.toner_model} (estoque: ${s.quantity})`,
              }))} />
          </Form.Item>
          <Form.Item name="notes" label="Observações">
            <Input.TextArea rows={2} placeholder="Ex: Toner com defeito, substituição preventiva..." />
          </Form.Item>
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

      {/* Dashboard drill-down modal */}
      <Modal title={dashDetail.title} open={dashDetail.open} footer={null} width={700}
        onCancel={() => setDashDetail(p => ({ ...p, open: false }))}>
        <Table dataSource={dashDetail.data} columns={dashDetail.columns} rowKey={(r) => r.id || r.name || r.model}
          size="small" pagination={{ pageSize: 15 }} />
      </Modal>
    </div>
  );
}
