import { useEffect, useState, useMemo, useCallback, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Card, Table, Tag, Typography, Button, Space, Modal, Form, Input,
  InputNumber, Select, Tabs, message, Row, Col, Statistic, Popconfirm, Badge, Spin, Switch,
  Segmented, Tooltip,
} from 'antd';
import GridLayout, { WidthProvider } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import {
  PrinterOutlined, ReloadOutlined, PlusOutlined, ThunderboltOutlined,
  BarChartOutlined, InboxOutlined, HistoryOutlined, DownloadOutlined,
  DashboardOutlined, FileTextOutlined, ExperimentOutlined, SwapOutlined,
  ClockCircleOutlined, SettingOutlined, CustomerServiceOutlined, CheckCircleOutlined,
  DragOutlined, UndoOutlined, FullscreenOutlined, FullscreenExitOutlined,
} from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  RadialBarChart, RadialBar, Treemap } from 'recharts';
import {
  getPrinters, createPrinter, updatePrinter, deletePrinter,
  pingPrinter, collectPrinterCounter, collectAllCounters, getPrinterRanking,
  getPrinterSchedule, updatePrinterSchedule,
  registerTonerChange, getTonerHistory, getTonerStock, createTonerStock,
  restockToner, getStockLogs, getPrinterHistory, getPrinterDashboard,
  getTickets, createTicket, updateTicket, deleteTicket,
} from '../api/endpoints';
import { useThemeStore } from '../store/themeStore';
import { useBreakpoint } from '../hooks/useBreakpoint';

const { Title, Text } = Typography;

const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 };

const RGL_PRINTER = WidthProvider(GridLayout);
const PRINTER_GRID_COLS = 12;
const PRINTER_ROW_HEIGHT = 50;
const PRINTER_GRID_MARGIN = 16;
const PRINTER_LAYOUT_KEY = 'sixid_printer_dash_layout_v2';

const PRINTER_STAT_PANELS = ['total_impressoes','toners_trocados','toners_estoque','estoque_baixo','open_tickets','chamados_total',
  'imp_hoje','imp_semana','imp_mes','toner_hoje','toner_semana','toner_mes'];
const PRINTER_CHART_PANELS = ['pages_7d','pages_30d','pages_90d','toners_7d','toners_30d','toners_90d','pages_printer','toner_model','toner_printer','monthly_pages'];
const PRINTER_FULL_PANELS  = ['stock_chart'];

const DEFAULT_PRINTER_LAYOUT: Layout[] = [
  { i: 'total_impressoes', x: 0,  y: 0, w: 2, h: 3, minH: 3, minW: 2 },
  { i: 'toners_trocados',  x: 2,  y: 0, w: 2, h: 3, minH: 3, minW: 2 },
  { i: 'toners_estoque',   x: 4,  y: 0, w: 2, h: 3, minH: 3, minW: 2 },
  { i: 'estoque_baixo',    x: 6,  y: 0, w: 2, h: 3, minH: 3, minW: 2 },
  { i: 'open_tickets',     x: 8,  y: 0, w: 2, h: 3, minH: 3, minW: 2 },
  { i: 'chamados_total',   x: 10, y: 0, w: 2, h: 3, minH: 3, minW: 2 },
  { i: 'imp_hoje',         x: 0,  y: 4, w: 2, h: 3, minH: 3, minW: 2 },
  { i: 'imp_semana',       x: 2,  y: 4, w: 2, h: 3, minH: 3, minW: 2 },
  { i: 'imp_mes',          x: 4,  y: 4, w: 2, h: 3, minH: 3, minW: 2 },
  { i: 'toner_hoje',       x: 6,  y: 4, w: 2, h: 3, minH: 3, minW: 2 },
  { i: 'toner_semana',     x: 8,  y: 4, w: 2, h: 3, minH: 3, minW: 2 },
  { i: 'toner_mes',        x: 10, y: 4, w: 2, h: 3, minH: 3, minW: 2 },
  { i: 'pages_7d',         x: 0,  y: 8,  w: 4, h: 7, minH: 4, minW: 2 },
  { i: 'pages_30d',        x: 4,  y: 8,  w: 4, h: 7, minH: 4, minW: 2 },
  { i: 'pages_90d',        x: 8,  y: 8,  w: 4, h: 7, minH: 4, minW: 2 },
  { i: 'toners_7d',        x: 0,  y: 15, w: 4, h: 7, minH: 4, minW: 2 },
  { i: 'toners_30d',       x: 4,  y: 15, w: 4, h: 7, minH: 4, minW: 2 },
  { i: 'toners_90d',       x: 8,  y: 15, w: 4, h: 7, minH: 4, minW: 2 },
  { i: 'stock_chart',      x: 0,  y: 22, w: 12, h: 9, minH: 5, minW: 4 },
  { i: 'pages_printer',    x: 0,  y: 31, w: 6,  h: 9, minH: 5, minW: 3 },
  { i: 'toner_model',      x: 6,  y: 31, w: 6,  h: 9, minH: 5, minW: 3 },
  { i: 'toner_printer',    x: 0,  y: 40, w: 6,  h: 9, minH: 5, minW: 3 },
  { i: 'monthly_pages',    x: 6,  y: 40, w: 6,  h: 9, minH: 5, minW: 3 },
];

function loadPrinterLayout(): Layout[] {
  try {
    const s = localStorage.getItem(PRINTER_LAYOUT_KEY);
    if (s) {
      const saved: Layout[] = JSON.parse(s);
      const m = new Map(saved.map(l => [l.i, l]));
      return DEFAULT_PRINTER_LAYOUT.map(d => m.has(d.i) ? { ...d, ...m.get(d.i)! } : d);
    }
  } catch {}
  return DEFAULT_PRINTER_LAYOUT;
}

const PRINTER_CHART_TYPES_KEY = 'sixid_printer_chart_types_v1';
const DEFAULT_PRINTER_CHART_TYPES: Record<string, string> = {
  pages_7d: 'bar_v', pages_30d: 'line', pages_90d: 'area',
  toners_7d: 'bar_v', toners_30d: 'bar_v', toners_90d: 'line',
  stock_chart: 'bar_h', pages_printer: 'bar_h',
  toner_model: 'donut', toner_printer: 'bar_h', monthly_pages: 'line',
};
const PRINTER_CHART_OPTIONS: Record<string, Array<{ label: string; value: string }>> = {
  pages_7d:     [{ label: 'Barras (V)', value: 'bar_v' }, { label: 'Barras (H)', value: 'bar_h' }, { label: 'Linha', value: 'line' }, { label: 'Área', value: 'area' }],
  pages_30d:    [{ label: 'Linha', value: 'line' }, { label: 'Área', value: 'area' }, { label: 'Barras (V)', value: 'bar_v' }, { label: 'Barras (H)', value: 'bar_h' }],
  pages_90d:    [{ label: 'Área', value: 'area' }, { label: 'Linha', value: 'line' }, { label: 'Barras (V)', value: 'bar_v' }, { label: 'Barras (H)', value: 'bar_h' }],
  toners_7d:    [{ label: 'Barras (V)', value: 'bar_v' }, { label: 'Barras (H)', value: 'bar_h' }, { label: 'Linha', value: 'line' }, { label: 'Área', value: 'area' }],
  toners_30d:   [{ label: 'Barras (V)', value: 'bar_v' }, { label: 'Barras (H)', value: 'bar_h' }, { label: 'Linha', value: 'line' }, { label: 'Área', value: 'area' }],
  toners_90d:   [{ label: 'Linha', value: 'line' }, { label: 'Área', value: 'area' }, { label: 'Barras (V)', value: 'bar_v' }, { label: 'Barras (H)', value: 'bar_h' }],
  stock_chart:  [{ label: 'Barras (H)', value: 'bar_h' }, { label: 'Barras (V)', value: 'bar_v' }, { label: 'Pizza', value: 'pie' }, { label: 'Rosca', value: 'donut' }, { label: 'Treemap', value: 'treemap' }],
  pages_printer:[{ label: 'Barras (H)', value: 'bar_h' }, { label: 'Barras (V)', value: 'bar_v' }, { label: 'Pizza', value: 'pie' }, { label: 'Rosca', value: 'donut' }, { label: 'Radar', value: 'radar' }, { label: 'Treemap', value: 'treemap' }],
  toner_model:  [{ label: 'Rosca', value: 'donut' }, { label: 'Pizza', value: 'pie' }, { label: 'Barras (H)', value: 'bar_h' }, { label: 'Barras (V)', value: 'bar_v' }, { label: 'Radar', value: 'radar' }, { label: 'Treemap', value: 'treemap' }],
  toner_printer:[{ label: 'Barras (H)', value: 'bar_h' }, { label: 'Barras (V)', value: 'bar_v' }, { label: 'Pizza', value: 'pie' }, { label: 'Rosca', value: 'donut' }, { label: 'Radar', value: 'radar' }],
  monthly_pages:[{ label: 'Linha', value: 'line' }, { label: 'Área', value: 'area' }, { label: 'Barras (V)', value: 'bar_v' }, { label: 'Barras (H)', value: 'bar_h' }],
};

function PTreemapCell(props: any) {
  const { x, y, width, height, name, value, fill } = props;
  if (width < 2 || height < 2) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} style={{ fill, stroke: '#fff', strokeWidth: 2 }} />
      {width > 50 && height > 22 && (
        <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={11}>
          {name} ({value})
        </text>
      )}
    </g>
  );
}

export default function PrintersPage() {
  const routerLocation = useLocation();
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
  const { isMobile } = useBreakpoint();

  const [printerLayout, setPrinterLayout] = useState<Layout[]>(loadPrinterLayout);
  const printerGridRef = useRef<HTMLDivElement>(null);
  const printerDashRef = useRef<HTMLDivElement>(null);
  const [isPrinterFullscreen, setIsPrinterFullscreen] = useState(false);

  useEffect(() => {
    const onFsChange = () => setIsPrinterFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const togglePrinterFullscreen = () => {
    if (!document.fullscreenElement) printerDashRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };

  const handlePrinterLayoutChange = (newLayout: Layout[]) => {
    setPrinterLayout(newLayout);
    localStorage.setItem(PRINTER_LAYOUT_KEY, JSON.stringify(newLayout));
  };

  const applyPrinterColumns = (numCols: number) => {
    const w = Math.floor(PRINTER_GRID_COLS / numCols);
    const statW = Math.floor(PRINTER_GRID_COLS / 6);
    const rowH = 8;
    const newLayout: Layout[] = [];
    PRINTER_STAT_PANELS.slice(0, 6).forEach((id, idx) => {
      newLayout.push({ i: id, x: idx * statW, y: 0, w: statW, h: 3, minH: 3, minW: 2 });
    });
    PRINTER_STAT_PANELS.slice(6).forEach((id, idx) => {
      newLayout.push({ i: id, x: idx * statW, y: 4, w: statW, h: 3, minH: 3, minW: 2 });
    });
    let y = 8;
    PRINTER_CHART_PANELS.forEach((id, idx) => {
      const col = idx % numCols;
      if (col === 0 && idx > 0) y += rowH;
      newLayout.push({ i: id, x: col * w, y, w, h: rowH, minH: 4, minW: 2 });
    });
    y += rowH;
    PRINTER_FULL_PANELS.forEach((id, i) => {
      newLayout.push({ i: id, x: 0, y: y + i * 9, w: PRINTER_GRID_COLS, h: 9, minH: 5, minW: 4 });
    });
    setPrinterLayout(newLayout);
    localStorage.setItem(PRINTER_LAYOUT_KEY, JSON.stringify(newLayout));
  };

  const resetPrinterLayout = () => {
    setPrinterLayout(DEFAULT_PRINTER_LAYOUT);
    localStorage.removeItem(PRINTER_LAYOUT_KEY);
  };

  const [printerChartTypes, setPrinterChartTypes] = useState<Record<string, string>>(() => {
    try {
      const s = localStorage.getItem(PRINTER_CHART_TYPES_KEY);
      if (s) return { ...DEFAULT_PRINTER_CHART_TYPES, ...JSON.parse(s) };
    } catch {}
    return { ...DEFAULT_PRINTER_CHART_TYPES };
  });

  const updatePrinterChartType = useCallback((panelId: string, type: string) => {
    setPrinterChartTypes(prev => {
      const next = { ...prev, [panelId]: type };
      localStorage.setItem(PRINTER_CHART_TYPES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const searchQuery = useMemo(() => {
    return new URLSearchParams(routerLocation.search).get('search')?.toLowerCase() || '';
  }, [routerLocation.search]);
  const filteredPrinters = useMemo(() => {
    if (!searchQuery) return printers;
    return printers.filter(p =>
      [p.name, p.model, p.ip_address, p.location, p.sector, p.printer_number, p.serial_number]
        .some(v => v && String(v).toLowerCase().includes(searchQuery))
    );
  }, [printers, searchQuery]);
  const [dispenseModalOpen, setDispenseModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [schedule, setSchedule] = useState<{ enabled: boolean; interval_minutes: number; last_run: string | null } | null>(null);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string | undefined>();
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [closeTicketModal, setCloseTicketModal] = useState<{ open: boolean; ticket: any }>({ open: false, ticket: null });
  const [form] = Form.useForm();
  const [tonerForm] = Form.useForm();
  const [stockForm] = Form.useForm();
  const [restockForm] = Form.useForm();
  const [dispenseForm] = Form.useForm();
  const [scheduleForm] = Form.useForm();
  const [ticketForm] = Form.useForm();
  const [closeTicketForm] = Form.useForm();

  const loadTickets = async (status?: string) => {
    setTicketLoading(true);
    try {
      const { data } = await getTickets(status ? { status } : undefined);
      setTickets(data);
    } catch (e) { console.error(e); }
    finally { setTicketLoading(false); }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pRes, rRes, sRes, lRes, dRes, schRes] = await Promise.all([
        getPrinters(), getPrinterRanking(rankingTop), getTonerStock(), getStockLogs(), getPrinterDashboard(),
        getPrinterSchedule(),
      ]);
      setPrinters(pRes.data);
      setRanking(rRes.data);
      setStock(sRes.data);
      setStockLogs(lRes.data);
      setDashData(dRes.data);
      setSchedule(schRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openScheduleModal = () => {
    scheduleForm.setFieldsValue({
      enabled: schedule?.enabled ?? false,
      interval_minutes: schedule?.interval_minutes ?? 60,
    });
    setScheduleModalOpen(true);
  };

  const handleSaveSchedule = async (values: { enabled: boolean; interval_minutes: number }) => {
    setScheduleSaving(true);
    try {
      await updatePrinterSchedule(values);
      message.success(values.enabled
        ? `Coleta automática ativada a cada ${values.interval_minutes} minutos`
        : 'Coleta automática desativada');
      setScheduleModalOpen(false);
      loadAll();
    } catch (e: any) { message.error(e.response?.data?.detail || 'Erro ao salvar agendamento'); }
    finally { setScheduleSaving(false); }
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

  const handleCreateTicket = async (values: any) => {
    try {
      const { data } = await createTicket(values.printer_id, { opened_by: values.opened_by, description: values.description });
      message.success(`Chamado aberto — ${data.os_number}`);
      setTicketModalOpen(false);
      ticketForm.resetFields();
      loadTickets(ticketStatusFilter);
      loadAll();
    } catch (e: any) { message.error(e.response?.data?.detail || 'Erro ao abrir chamado'); }
  };

  const handleCloseTicket = async (values: any) => {
    try {
      await updateTicket(closeTicketModal.ticket.id, { status: 'fechado', closed_by: values.closed_by, resolution: values.resolution });
      message.success('Chamado encerrado com sucesso');
      setCloseTicketModal({ open: false, ticket: null });
      closeTicketForm.resetFields();
      loadTickets(ticketStatusFilter);
      loadAll();
    } catch (e: any) { message.error(e.response?.data?.detail || 'Erro ao fechar chamado'); }
  };

  const handleReopenTicket = async (id: number) => {
    try {
      await updateTicket(id, { status: 'aberto' });
      message.success('Chamado reaberto');
      loadTickets(ticketStatusFilter);
      loadAll();
    } catch (e: any) { message.error(e.response?.data?.detail || 'Erro'); }
  };

  const handleDeleteTicket = async (id: number) => {
    try {
      await deleteTicket(id);
      message.success('Chamado excluído');
      loadTickets(ticketStatusFilter);
      loadAll();
    } catch (e: any) { message.error(e.response?.data?.detail || 'Erro ao excluir'); }
  };

  const handleExportTickets = async () => {
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch('/api/printers/tickets/export', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) { message.error('Erro ao exportar'); return; }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chamados_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
    { title: 'Nome', dataIndex: 'name', key: 'name', width: 160, sorter: (a: any, b: any) => a.name.localeCompare(b.name) },
    { title: 'Modelo', dataIndex: 'model', key: 'model', width: 140, render: (v: string) => v || '-',
      sorter: (a: any, b: any) => (a.model || '').localeCompare(b.model || '') },
    { title: 'IP', dataIndex: 'ip_address', key: 'ip', width: 130,
      sorter: (a: any, b: any) => (a.ip_address || '').localeCompare(b.ip_address || '') },
    { title: 'Local', dataIndex: 'location', key: 'loc', width: 120, render: (v: string) => v || '-',
      sorter: (a: any, b: any) => (a.location || '').localeCompare(b.location || '') },
    { title: 'Setor', dataIndex: 'sector', key: 'sector', width: 100, render: (v: string) => v || '-',
      sorter: (a: any, b: any) => (a.sector || '').localeCompare(b.sector || '') },
    { title: 'N.', dataIndex: 'printer_number', key: 'num', width: 60, render: (v: string) => v || '-' },
    { title: 'Páginas', dataIndex: 'effective_pages', key: 'pages', width: 100,
      sorter: (a: any, b: any) => (a.effective_pages || 0) - (b.effective_pages || 0),
      render: (v: number) => <Text strong style={{ color: '#1565FF' }}>{(v || 0).toLocaleString('pt-BR')}</Text> },
    { title: 'Toners', dataIndex: 'toner_changes', key: 'toner', width: 80,
      sorter: (a: any, b: any) => (a.toner_changes || 0) - (b.toner_changes || 0),
      render: (v: number) => <Badge count={v} style={{ backgroundColor: v > 0 ? '#7C3AED' : '#5B6470' }} /> },
    { title: 'Última Coleta', dataIndex: 'last_collected', key: 'lc', width: 150,
      sorter: (a: any, b: any) => (a.last_collected || '').localeCompare(b.last_collected || ''),
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

  // ── Seletor de tipo de gráfico (mesmo padrão do Dashboard principal) ──
  const pChartSelect = (panelId: string) => (
    <Select size="small"
      value={printerChartTypes[panelId] ?? DEFAULT_PRINTER_CHART_TYPES[panelId]}
      onChange={(v) => updatePrinterChartType(panelId, v)}
      options={PRINTER_CHART_OPTIONS[panelId] ?? []}
      style={{ width: 120 }}
    />
  );

  // Gráfico de séries temporais (date/pages ou date/count)
  const renderTimeChart = (data: any[], xKey: string, vKey: string, vName: string, type: string, color: string): ReactNode => {
    const fmt = (v: string) => v?.slice(5) || v;
    if (type === 'line') return (
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridClr} />
        <XAxis dataKey={xKey} stroke={axClr} tick={{ fontSize: 9 }} tickFormatter={fmt} />
        <YAxis stroke={axClr} allowDecimals={false} />
        <RTooltip contentStyle={ttStyle} />
        <Line type="monotone" dataKey={vKey} stroke={color} strokeWidth={2} dot={false} name={vName} />
      </LineChart>
    );
    if (type === 'area') return (
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridClr} />
        <XAxis dataKey={xKey} stroke={axClr} tick={{ fontSize: 9 }} tickFormatter={fmt} />
        <YAxis stroke={axClr} allowDecimals={false} />
        <RTooltip contentStyle={ttStyle} />
        <Area type="monotone" dataKey={vKey} stroke={color} fill={color} fillOpacity={0.25} name={vName} />
      </AreaChart>
    );
    if (type === 'bar_h') return (
      <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridClr} />
        <XAxis type="number" stroke={axClr} allowDecimals={false} />
        <YAxis type="category" dataKey={xKey} stroke={axClr} width={48} tick={{ fontSize: 9 }} tickFormatter={fmt} />
        <RTooltip contentStyle={ttStyle} />
        <Bar dataKey={vKey} fill={color} radius={[0, 4, 4, 0]} name={vName} />
      </BarChart>
    );
    return (
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridClr} />
        <XAxis dataKey={xKey} stroke={axClr} tick={{ fontSize: 9 }} tickFormatter={fmt} />
        <YAxis stroke={axClr} allowDecimals={false} />
        <RTooltip contentStyle={ttStyle} />
        <Bar dataKey={vKey} fill={color} radius={[4, 4, 0, 0]} name={vName} />
      </BarChart>
    );
  };

  // Gráfico categórico ({label, value}) — idêntico ao renderSimpleChart do Dashboard
  const renderCatChart = (data: Array<{ label: string; value: number }>, type: string, color = '#1565FF', vName = 'Valor'): ReactNode => {
    if (type === 'pie' || type === 'donut') return (
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%"
          outerRadius="70%" innerRadius={type === 'donut' ? '45%' : 0} label strokeWidth={0}>
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Pie>
        <RTooltip contentStyle={ttStyle} />
        <Legend />
      </PieChart>
    );
    if (type === 'bar_h') return (
      <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridClr} />
        <XAxis type="number" stroke={axClr} allowDecimals={false} />
        <YAxis type="category" dataKey="label" stroke={axClr} width={120} tick={{ fontSize: 11 }} />
        <RTooltip contentStyle={ttStyle} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} name={vName}>
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Bar>
      </BarChart>
    );
    if (type === 'radar') return (
      <RadarChart data={data}>
        <PolarGrid stroke={gridClr} />
        <PolarAngleAxis dataKey="label" stroke={axClr} tick={{ fontSize: 11, fill: axClr }} />
        <PolarRadiusAxis stroke={axClr} tick={{ fontSize: 10, fill: axClr }} />
        <Radar dataKey="value" stroke={color} fill={color} fillOpacity={0.45} name={vName} />
        <RTooltip contentStyle={ttStyle} />
      </RadarChart>
    );
    if (type === 'radial') return (
      <RadialBarChart data={data} innerRadius="20%" outerRadius="90%" startAngle={90} endAngle={-270}>
        <RadialBar dataKey="value" background label={{ position: 'insideStart', fill: '#fff', fontSize: 10 }}>
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </RadialBar>
        <RTooltip contentStyle={ttStyle} />
        <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
      </RadialBarChart>
    );
    if (type === 'treemap') return (
      <Treemap data={data.map((d, i) => ({ ...d, name: d.label, fill: CHART_COLORS[i % CHART_COLORS.length] }))}
        dataKey="value" nameKey="name" stroke="#fff" content={<PTreemapCell />} />
    );
    // bar_v (default)
    return (
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridClr} />
        <XAxis dataKey="label" stroke={axClr} tick={{ fontSize: 11 }} />
        <YAxis stroke={axClr} allowDecimals={false} />
        <RTooltip contentStyle={ttStyle} />
        <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} name={vName}>
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Bar>
      </BarChart>
    );
  };

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
        <div ref={printerDashRef} style={{
          background: isPrinterFullscreen ? 'var(--bg)' : undefined,
          overflow: isPrinterFullscreen ? 'auto' : undefined,
          padding: isPrinterFullscreen ? 24 : undefined,
          minHeight: isPrinterFullscreen ? '100vh' : undefined,
        }}>
          {/* ── Toolbar do grid ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            {!isMobile && (
              <Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                Arraste <DragOutlined /> para mover · arraste ↘ para redimensionar
              </Text>
            )}
            {!isMobile && (
              <Space size="middle" wrap>
                <Space size={4}>
                  <Text style={{ color: 'var(--text-muted)', fontSize: 12 }}>Colunas:</Text>
                  <Segmented size="small"
                    options={[{ label: '2', value: 2 }, { label: '3', value: 3 }, { label: '4', value: 4 }]}
                    onChange={(v) => applyPrinterColumns(v as number)}
                  />
                </Space>
                <Tooltip title="Restaurar posição e tamanho originais">
                  <Button type="text" icon={<UndoOutlined />} onClick={resetPrinterLayout} style={{ color: 'var(--text-muted)' }}>
                    Resetar
                  </Button>
                </Tooltip>
                <Tooltip title={isPrinterFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}>
                  <Button
                    type={isPrinterFullscreen ? 'primary' : 'default'}
                    icon={isPrinterFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                    onClick={togglePrinterFullscreen}
                  >
                    {isPrinterFullscreen ? 'Sair' : 'Tela cheia'}
                  </Button>
                </Tooltip>
              </Space>
            )}
          </div>

          {/* ── Grid unificado (stats + gráficos) ── */}
          {(() => {
            const sBody = { body: { padding: '8px 12px' } };
            const sVal  = { fontWeight: 700 as const, fontSize: 16 };
            const sTit  = (c: string) => <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>{c}</span>;
            const sCard = (color: string) => ({ ...cardStyle, borderTop: `3px solid ${color}`, height: '100%' });
            const cardFlex = { height: '100%', display: 'flex', flexDirection: 'column' as const };
            const hdrStyle = { borderBottom: '1px solid var(--border)', color: 'var(--text)' };
            const chartBody = { header: hdrStyle, body: { flex: 1, minHeight: 0, padding: '8px 12px' } };

            const printerPanels: Record<string, ReactNode> = {
              total_impressoes: (
                <Card hoverable size="small" onClick={showPagesDetail} style={{ ...sCard('#1565FF'), cursor: 'pointer' }} styles={sBody}>
                  <Statistic title={sTit('Total de Impressões')}
                    value={dashData.total_pages} prefix={<FileTextOutlined style={{ color: '#1565FF', fontSize: 13 }} />}
                    valueStyle={{ ...sVal, color: 'var(--text)' }}
                    formatter={(v) => Number(v).toLocaleString('pt-BR')} />
                </Card>
              ),
              toners_trocados: (
                <Card hoverable size="small" onClick={showTonerDetail} style={{ ...sCard('#7C3AED'), cursor: 'pointer' }} styles={sBody}>
                  <Statistic title={sTit('Toners Trocados')}
                    value={dashData.total_toner_changes} prefix={<ExperimentOutlined style={{ color: '#7C3AED', fontSize: 13 }} />}
                    valueStyle={{ ...sVal, color: 'var(--text)' }} />
                </Card>
              ),
              toners_estoque: (
                <Card hoverable size="small" onClick={() => setDashDetail({ open: true, title: 'Estoque de Toner', data: stock, columns: [
                  { title: 'Modelo', dataIndex: 'toner_model', key: 'm' },
                  { title: 'Quantidade', dataIndex: 'quantity', key: 'q', render: (v: number, r: any) => <Text strong style={{ color: r.low_stock ? '#FF4D4F' : 'var(--text)' }}>{v}</Text> },
                  { title: 'Status', key: 's', render: (_: any, r: any) => r.low_stock ? <Tag color="red">Baixo</Tag> : <Tag color="green">OK</Tag> },
                ]})} style={{ ...sCard('#00BFA5'), cursor: 'pointer' }} styles={sBody}>
                  <Statistic title={sTit('Toners em Estoque')}
                    value={dashData.total_stock} prefix={<InboxOutlined style={{ color: '#00BFA5', fontSize: 13 }} />}
                    valueStyle={{ ...sVal, color: 'var(--text)' }} />
                </Card>
              ),
              estoque_baixo: (
                <Card hoverable size="small" style={sCard(dashData.low_stock_count > 0 ? '#FF4D4F' : '#00BFA5')} styles={sBody}>
                  <Statistic title={sTit('Estoque Baixo')}
                    value={dashData.low_stock_count} prefix={<InboxOutlined style={{ color: dashData.low_stock_count > 0 ? '#FF4D4F' : '#00BFA5', fontSize: 13 }} />}
                    valueStyle={{ ...sVal, color: dashData.low_stock_count > 0 ? '#FF4D4F' : 'var(--text)' }} />
                  {dashData.low_stock_count > 0 && <Tag color="red" style={{ marginTop: 2, fontSize: 10 }}>Atenção</Tag>}
                </Card>
              ),
              open_tickets: (
                <Card hoverable size="small" style={sCard(dashData.open_tickets > 0 ? '#FFB020' : '#00BFA5')} styles={sBody}>
                  <Statistic title={sTit('Chamados Abertos')}
                    value={dashData.open_tickets || 0}
                    prefix={<CustomerServiceOutlined style={{ color: dashData.open_tickets > 0 ? '#FFB020' : '#00BFA5', fontSize: 13 }} />}
                    valueStyle={{ ...sVal, color: dashData.open_tickets > 0 ? '#FFB020' : 'var(--text)' }} />
                  {dashData.open_tickets > 0
                    ? <Tag color="orange" style={{ marginTop: 2, fontSize: 10 }}>Pendentes</Tag>
                    : <Tag color="green" style={{ marginTop: 2, fontSize: 10 }}>Encerrados</Tag>}
                </Card>
              ),
              chamados_total: (
                <Card hoverable size="small" style={sCard('#7C3AED')} styles={sBody}>
                  <Statistic title={sTit('Total de Chamados')}
                    value={dashData.total_tickets || 0}
                    prefix={<CustomerServiceOutlined style={{ color: '#7C3AED', fontSize: 13 }} />}
                    valueStyle={{ ...sVal, color: 'var(--text)' }} />
                </Card>
              ),
              imp_hoje: (
                <Card hoverable size="small" style={sCard('#0EA5E9')} styles={sBody}>
                  <Statistic title={sTit('Impressões Hoje')} value={dashData.pages_today || 0} valueStyle={{ ...sVal, color: '#0EA5E9' }} />
                </Card>
              ),
              imp_semana: (
                <Card hoverable size="small" style={sCard('#1565FF')} styles={sBody}>
                  <Statistic title={sTit('Impressões Semana')} value={dashData.pages_week || 0} valueStyle={{ ...sVal, color: '#1565FF' }} />
                </Card>
              ),
              imp_mes: (
                <Card hoverable size="small" style={sCard('#7C3AED')} styles={sBody}>
                  <Statistic title={sTit('Impressões Mês')} value={dashData.pages_month || 0} valueStyle={{ ...sVal, color: '#7C3AED' }} />
                </Card>
              ),
              toner_hoje: (
                <Card hoverable size="small" style={sCard('#FFB020')} styles={sBody}>
                  <Statistic title={sTit('Toners Hoje')} value={dashData.toners_today || 0} valueStyle={{ ...sVal, color: '#FFB020' }} />
                </Card>
              ),
              toner_semana: (
                <Card hoverable size="small" style={sCard('#FF4D4F')} styles={sBody}>
                  <Statistic title={sTit('Toners Semana')} value={dashData.toners_week || 0} valueStyle={{ ...sVal, color: '#FF4D4F' }} />
                </Card>
              ),
              toner_mes: (
                <Card hoverable size="small" style={sCard('#00BFA5')} styles={sBody}>
                  <Statistic title={sTit('Toners Mês')} value={dashData.toners_month || 0} valueStyle={{ ...sVal, color: '#00BFA5' }} />
                </Card>
              ),
              pages_7d: (
                <Card title="Impressões — 7 Dias" style={{ ...cardStyle, ...cardFlex }} extra={pChartSelect('pages_7d')} styles={chartBody}>
                  <ResponsiveContainer width="100%" height="100%">
                    {renderTimeChart(dashData.daily_pages_chart || [], 'date', 'pages', 'Páginas', printerChartTypes.pages_7d ?? 'bar_v', '#0EA5E9') as any}
                  </ResponsiveContainer>
                </Card>
              ),
              pages_30d: (
                <Card title="Impressões — 30 Dias" style={{ ...cardStyle, ...cardFlex }} extra={pChartSelect('pages_30d')} styles={chartBody}>
                  <ResponsiveContainer width="100%" height="100%">
                    {renderTimeChart(dashData.weekly_pages_chart || [], 'date', 'pages', 'Páginas', printerChartTypes.pages_30d ?? 'line', '#1565FF') as any}
                  </ResponsiveContainer>
                </Card>
              ),
              pages_90d: (
                <Card title="Impressões — 90 Dias" style={{ ...cardStyle, ...cardFlex }} extra={pChartSelect('pages_90d')} styles={chartBody}>
                  <ResponsiveContainer width="100%" height="100%">
                    {renderTimeChart(dashData.monthly_pages_chart || [], 'date', 'pages', 'Páginas', printerChartTypes.pages_90d ?? 'area', '#7C3AED') as any}
                  </ResponsiveContainer>
                </Card>
              ),
              toners_7d: (
                <Card title="Toners — 7 Dias" style={{ ...cardStyle, ...cardFlex }} extra={pChartSelect('toners_7d')} styles={chartBody}>
                  <ResponsiveContainer width="100%" height="100%">
                    {renderTimeChart(dashData.daily_toners_chart || [], 'date', 'count', 'Trocas', printerChartTypes.toners_7d ?? 'bar_v', '#FFB020') as any}
                  </ResponsiveContainer>
                </Card>
              ),
              toners_30d: (
                <Card title="Toners — 30 Dias" style={{ ...cardStyle, ...cardFlex }} extra={pChartSelect('toners_30d')} styles={chartBody}>
                  <ResponsiveContainer width="100%" height="100%">
                    {renderTimeChart(dashData.weekly_toners_chart || [], 'date', 'count', 'Trocas', printerChartTypes.toners_30d ?? 'bar_v', '#FF4D4F') as any}
                  </ResponsiveContainer>
                </Card>
              ),
              toners_90d: (
                <Card title="Toners — 90 Dias" style={{ ...cardStyle, ...cardFlex }} extra={pChartSelect('toners_90d')} styles={chartBody}>
                  <ResponsiveContainer width="100%" height="100%">
                    {renderTimeChart(dashData.monthly_toners_chart || [], 'date', 'count', 'Trocas', printerChartTypes.toners_90d ?? 'line', '#00BFA5') as any}
                  </ResponsiveContainer>
                </Card>
              ),
              stock_chart: (
                <Card title="Estoque de Toner Disponível" style={{ ...cardStyle, ...cardFlex }}
                  extra={<Space>{pChartSelect('stock_chart')}<Text style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Clique</Text></Space>}
                  styles={chartBody}>
                  <div onClick={() => setDashDetail({ open: true, title: 'Estoque de Toner', data: stock, columns: [
                    { title: 'Modelo', dataIndex: 'toner_model', key: 'm' },
                    { title: 'Em Estoque', dataIndex: 'quantity', key: 'q', render: (v: number, r: any) => <Text strong style={{ color: r.low_stock ? '#FF4D4F' : '#00BFA5' }}>{v}</Text> },
                    { title: 'Mínimo', dataIndex: 'min_quantity', key: 'min' },
                    { title: 'Status', key: 's', render: (_: any, r: any) => r.low_stock ? <Tag color="red">Estoque Baixo</Tag> : <Tag color="green">OK</Tag> },
                  ]})} style={{ cursor: 'pointer', height: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      {renderCatChart(stock.map(s => ({ label: s.toner_model, value: s.quantity })), printerChartTypes.stock_chart ?? 'bar_h', '#00BFA5', 'Em Estoque') as any}
                    </ResponsiveContainer>
                  </div>
                </Card>
              ),
              pages_printer: (
                <Card title="Páginas por Impressora" style={{ ...cardStyle, ...cardFlex }}
                  extra={<Space>{pChartSelect('pages_printer')}<Text style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Clique</Text></Space>}
                  styles={chartBody}>
                  <div onClick={showPagesDetail} style={{ cursor: 'pointer', height: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      {renderCatChart((dashData.pages_per_printer || []).slice(0, 10).map((p: any) => ({ label: p.name, value: p.pages })), printerChartTypes.pages_printer ?? 'bar_h', '#1565FF', 'Páginas') as any}
                    </ResponsiveContainer>
                  </div>
                </Card>
              ),
              toner_model: (
                <Card title="Consumo de Toner por Modelo" style={{ ...cardStyle, ...cardFlex }}
                  extra={<Space>{pChartSelect('toner_model')}<Text style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Clique</Text></Space>}
                  styles={chartBody}>
                  <div onClick={showModelDetail} style={{ cursor: 'pointer', height: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      {renderCatChart((dashData.toner_by_model || []).map((t: any) => ({ label: t.model, value: t.count })), printerChartTypes.toner_model ?? 'donut', '#7C3AED', 'Unidades') as any}
                    </ResponsiveContainer>
                  </div>
                </Card>
              ),
              toner_printer: (
                <Card title="Trocas de Toner por Impressora" style={{ ...cardStyle, ...cardFlex }}
                  extra={<Space>{pChartSelect('toner_printer')}<Text style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Clique</Text></Space>}
                  styles={chartBody}>
                  <div onClick={showTonerDetail} style={{ cursor: 'pointer', height: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      {renderCatChart((dashData.toner_per_printer || []).filter((t: any) => t.toner_changes > 0).slice(0, 10).map((t: any) => ({ label: t.name, value: t.toner_changes })), printerChartTypes.toner_printer ?? 'bar_h', '#7C3AED', 'Trocas') as any}
                    </ResponsiveContainer>
                  </div>
                </Card>
              ),
              monthly_pages: (
                <Card title="Impressões por Mês" style={{ ...cardStyle, ...cardFlex }} extra={pChartSelect('monthly_pages')} styles={chartBody}>
                  <ResponsiveContainer width="100%" height="100%">
                    {renderTimeChart(dashData.monthly_pages || [], 'month', 'pages', 'Páginas', printerChartTypes.monthly_pages ?? 'line', '#00BFA5') as any}
                  </ResponsiveContainer>
                </Card>
              ),
            };

            if (isMobile) {
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Row gutter={[8, 8]}>
                    {PRINTER_STAT_PANELS.map(id => (
                      <Col xs={12} key={id}>
                        <div style={{ height: 80 }}>{printerPanels[id]}</div>
                      </Col>
                    ))}
                  </Row>
                  {[...PRINTER_CHART_PANELS, ...PRINTER_FULL_PANELS].map(id => printerPanels[id] && (
                    <div key={id} style={{ height: 280 }}>{printerPanels[id]}</div>
                  ))}
                </div>
              );
            }

            return (
              <div ref={printerGridRef}>
                <RGL_PRINTER
                  layout={printerLayout}
                  cols={PRINTER_GRID_COLS}
                  rowHeight={PRINTER_ROW_HEIGHT}
                  draggableHandle=".printer-drag-handle"
                  onLayoutChange={handlePrinterLayoutChange}
                  margin={[PRINTER_GRID_MARGIN, PRINTER_GRID_MARGIN]}
                  containerPadding={[0, 0]}
                  isResizable
                  resizeHandles={['se', 's', 'e']}
                  isDraggable
                >
                  {printerLayout.map(item => printerPanels[item.i] ? (
                    <div key={item.i} style={{ position: 'relative' }}>
                      <div className="printer-drag-handle" style={{
                        position: 'absolute', top: 8, right: 8, zIndex: 10, cursor: 'grab',
                        color: 'var(--text-muted)', fontSize: 14, padding: '3px 8px',
                        borderRadius: 6, background: 'var(--bg-card-inner)',
                        display: 'flex', alignItems: 'center', gap: 4, userSelect: 'none',
                      }}>
                        <DragOutlined />
                      </div>
                      <div style={{ height: '100%' }}>{printerPanels[item.i]}</div>
                    </div>
                  ) : null)}
                </RGL_PRINTER>
              </div>
            );
          })()}
        </div>
      ) : <Spin />,

    },
    {
      key: 'list',
      label: <span><PrinterOutlined /> Impressoras ({searchQuery ? `${filteredPrinters.length}/` : ''}{printers.length})</span>,
      children: (
        <div>
          <Space style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingPrinter(null); form.resetFields(); setModalOpen(true); }}>
              Cadastrar Impressora
            </Button>
            <Button icon={<ThunderboltOutlined />} onClick={handleCollectAll}>Coletar Todas (SNMP)</Button>
            <Button icon={<ClockCircleOutlined />} onClick={openScheduleModal}
              style={schedule?.enabled ? { borderColor: '#00BFA5', color: '#00BFA5' } : undefined}>
              Coleta Personalizada {schedule?.enabled ? `(a cada ${schedule.interval_minutes}min)` : ''}
            </Button>
          </Space>
          {searchQuery && (
            <Text style={{ color: 'var(--text-secondary)', marginBottom: 8, display: 'block', fontSize: 12 }}>
              Buscando: "<strong>{searchQuery}</strong>" — {filteredPrinters.length} resultado(s)
            </Text>
          )}
          <Table dataSource={filteredPrinters} columns={printerColumns} rowKey="id" size="small"
            loading={loading} scroll={{ x: 1500 }}
            pagination={{ defaultPageSize: 20, showSizeChanger: true, pageSizeOptions: ['20', '50', '100'], showTotal: (t) => `${t} impressoras` }} />
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
    {
      key: 'tickets',
      label: <span><CustomerServiceOutlined /> Chamado Técnico</span>,
      children: (
        <div>
          <Space style={{ marginBottom: 16 }} wrap>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { ticketForm.resetFields(); setTicketModalOpen(true); }}>
              Novo Chamado
            </Button>
            <Select
              placeholder="Filtrar por status"
              allowClear
              style={{ width: 160 }}
              value={ticketStatusFilter}
              onChange={(v) => { setTicketStatusFilter(v); loadTickets(v); }}
              options={[{ value: 'aberto', label: 'Abertos' }, { value: 'fechado', label: 'Fechados' }]}
            />
            <Button icon={<ReloadOutlined />} onClick={() => loadTickets(ticketStatusFilter)}>Atualizar</Button>
            <Button icon={<DownloadOutlined />} onClick={handleExportTickets}>Exportar Excel</Button>
          </Space>
          <Table
            dataSource={tickets}
            rowKey="id"
            size="small"
            loading={ticketLoading}
            pagination={{ defaultPageSize: 20, showSizeChanger: true, pageSizeOptions: ['20', '50', '100'], showTotal: (t) => `${t} chamados` }}
            columns={[
              { title: 'Nº OS', dataIndex: 'os_number', key: 'os', width: 130, sorter: (a: any, b: any) => a.os_number.localeCompare(b.os_number),
                render: (v: string) => <Text strong style={{ color: '#1565FF' }}>{v}</Text> },
              { title: 'Impressora', dataIndex: 'printer_name', key: 'printer', width: 150,
                sorter: (a: any, b: any) => (a.printer_name || '').localeCompare(b.printer_name || '') },
              { title: 'Local', dataIndex: 'printer_location', key: 'loc', width: 110, render: (v: string) => v || '-',
                sorter: (a: any, b: any) => (a.printer_location || '').localeCompare(b.printer_location || '') },
              { title: 'Setor', dataIndex: 'printer_sector', key: 'sec', width: 100, render: (v: string) => v || '-',
                sorter: (a: any, b: any) => (a.printer_sector || '').localeCompare(b.printer_sector || '') },
              { title: 'Nº', dataIndex: 'printer_number', key: 'pnum', width: 60, render: (v: string) => v || '-' },
              { title: 'Aberto por', dataIndex: 'opened_by', key: 'opened_by', width: 130,
                sorter: (a: any, b: any) => (a.opened_by || '').localeCompare(b.opened_by || '') },
              { title: 'Descrição', dataIndex: 'description', key: 'desc', ellipsis: true },
              { title: 'Status', dataIndex: 'status', key: 'status', width: 100,
                sorter: (a: any, b: any) => a.status.localeCompare(b.status),
                render: (v: string) => <Tag color={v === 'aberto' ? 'orange' : 'green'}>{v === 'aberto' ? 'Aberto' : 'Fechado'}</Tag> },
              { title: 'Abertura', dataIndex: 'created_at', key: 'created', width: 150,
                defaultSortOrder: 'descend' as const,
                sorter: (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
                render: (v: string) => v ? new Date(v).toLocaleString('pt-BR') : '-' },
              { title: 'Ações', key: 'actions', width: 160,
                render: (_: any, r: any) => (
                  <Space size="small">
                    {r.status === 'aberto' ? (
                      <Button size="small" type="primary" icon={<CheckCircleOutlined />}
                        onClick={() => { setCloseTicketModal({ open: true, ticket: r }); closeTicketForm.resetFields(); }}>
                        Fechar
                      </Button>
                    ) : (
                      <Button size="small" onClick={() => handleReopenTicket(r.id)}>Reabrir</Button>
                    )}
                    <Popconfirm title="Excluir chamado?" onConfirm={() => handleDeleteTicket(r.id)}>
                      <Button size="small" danger>X</Button>
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
          />
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
        <Tabs items={tabItems} onChange={(key) => { if (key === 'tickets') loadTickets(ticketStatusFilter); }} />
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

      {/* Modal coleta personalizada (agendamento automático) */}
      <Modal title={<Space><SettingOutlined /><span>Coleta Automática Personalizada</span></Space>}
        open={scheduleModalOpen} onCancel={() => setScheduleModalOpen(false)}
        onOk={() => scheduleForm.submit()} okText="Salvar" confirmLoading={scheduleSaving}>
        <Form form={scheduleForm} layout="vertical" onFinish={handleSaveSchedule}>
          <Form.Item name="enabled" label="Ativar coleta automática" valuePropName="checked">
            <Switch checkedChildren="Ativada" unCheckedChildren="Desativada" />
          </Form.Item>
          <Form.Item name="interval_minutes" label="Intervalo de coleta"
            rules={[{ required: true }, { type: 'number', min: 5, message: 'Mínimo de 5 minutos' }]}>
            <Select options={[
              { value: 5, label: 'A cada 5 minutos' },
              { value: 15, label: 'A cada 15 minutos' },
              { value: 30, label: 'A cada 30 minutos' },
              { value: 60, label: 'A cada 1 hora' },
              { value: 180, label: 'A cada 3 horas' },
              { value: 360, label: 'A cada 6 horas' },
              { value: 720, label: 'A cada 12 horas' },
              { value: 1440, label: 'A cada 24 horas' },
            ]} />
          </Form.Item>
          {schedule?.last_run && (
            <Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
              Última coleta automática: {new Date(schedule.last_run).toLocaleString('pt-BR')}
            </Text>
          )}
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

      {/* Modal novo chamado */}
      <Modal title={<Space><CustomerServiceOutlined /><span>Abrir Chamado Técnico</span></Space>}
        open={ticketModalOpen} onCancel={() => setTicketModalOpen(false)}
        onOk={() => ticketForm.submit()} okText="Abrir Chamado">
        <Form form={ticketForm} layout="vertical" onFinish={handleCreateTicket}>
          <Form.Item name="printer_id" label="Impressora" rules={[{ required: true, message: 'Selecione a impressora' }]}>
            <Select showSearch placeholder="Selecione a impressora"
              filterOption={(input, option) => (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
              options={printers.map(p => ({
                value: p.id,
                label: `${p.name}${p.printer_number ? ` (Nº ${p.printer_number})` : ''}${p.location ? ` — ${p.location}` : ''}`,
              }))} />
          </Form.Item>
          <Form.Item name="opened_by" label="Nome de quem está abrindo" rules={[{ required: true, message: 'Informe o nome' }]}>
            <Input placeholder="Ex: João Silva" />
          </Form.Item>
          <Form.Item name="description" label="Descrição do defeito" rules={[{ required: true, message: 'Descreva o problema' }]}>
            <Input.TextArea rows={4} placeholder="Descreva o problema encontrado..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal fechar chamado */}
      <Modal title={<Space><CheckCircleOutlined /><span>Fechar Chamado — {closeTicketModal.ticket?.os_number}</span></Space>}
        open={closeTicketModal.open} onCancel={() => setCloseTicketModal({ open: false, ticket: null })}
        onOk={() => closeTicketForm.submit()} okText="Confirmar Encerramento" okButtonProps={{ style: { background: '#00BFA5', borderColor: '#00BFA5' } }}>
        {closeTicketModal.ticket && (
          <div style={{ marginBottom: 12, padding: 10, background: 'var(--bg-card-inner)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
              <strong>Impressora:</strong> {closeTicketModal.ticket.printer_name}
              {closeTicketModal.ticket.printer_location && ` — ${closeTicketModal.ticket.printer_location}`}
            </Text><br />
            <Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
              <strong>Defeito:</strong> {closeTicketModal.ticket.description}
            </Text>
          </div>
        )}
        <Form form={closeTicketForm} layout="vertical" onFinish={handleCloseTicket}>
          <Form.Item name="closed_by" label="Encerrado por" rules={[{ required: true, message: 'Informe o nome do responsável' }]}>
            <Input placeholder="Ex: Técnico João" />
          </Form.Item>
          <Form.Item name="resolution" label="Resolução / Providência tomada">
            <Input.TextArea rows={3} placeholder="Descreva como o problema foi resolvido..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
