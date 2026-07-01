import { useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { Row, Col, Card, Statistic, Typography, Table, Tag, Spin, Modal, Progress, Button, Tooltip, Select, Segmented, Space } from 'antd';
import {
  DesktopOutlined, CheckCircleOutlined, CloseCircleOutlined,
  WarningOutlined, ClockCircleOutlined, PercentageOutlined,
  DragOutlined, UndoOutlined, FullscreenOutlined, FullscreenExitOutlined,
} from '@ant-design/icons';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, LineChart, Line, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  RadialBarChart, RadialBar, Treemap, AreaChart, Area,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import GridLayout, { WidthProvider } from 'react-grid-layout';
import { useBreakpoint } from '../hooks/useBreakpoint';
import type { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import {
  getDashboardStats, getOsDistribution, getStorageUsage,
  getDevicesPerUnit, getAlertHistory, getDevices, getRamDistribution,
  getDiskHealth, getTopSoftware, getDevicesByOs, getDevicesByRam,
  getDevicesByStorageType, getStorageCapacity,
  getDevicesPerFloor, getDevicesByFloor,
} from '../api/endpoints';
import { useWebSocket } from '../hooks/useWebSocket';
import type { WSMessage } from '../hooks/useWebSocket';
import { useThemeStore } from '../store/themeStore';
import AlertsModal from '../components/common/AlertsModal';
import type { DashboardStats, ChartDataPoint, AlertHistoryPoint, Device } from '../types';

const RGL = WidthProvider(GridLayout);
const { Title, Text } = Typography;
const COLORS = ['#1565FF', '#00BFA5', '#FFB020', '#FF4D4F', '#7C3AED', '#0EA5E9', '#F472B6'];

const GRID_COLS = 12;
const ROW_HEIGHT = 50;
const GRID_MARGIN = 16;
const STORAGE_KEY = 'sixid_dashboard_layout_v4';
const CHART_TYPES_KEY = 'sixid_dashboard_chart_types_v1';
const STAT_PANELS = ['stat_0','stat_1','stat_2','stat_3','stat_4','stat_5'];

const DEFAULT_CHART_TYPES: Record<string, string> = {
  os: 'pie',
  ram: 'bar_v',
  storage_cnt: 'bar_v',
  storage_cap: 'bar_v',
  floor_chart: 'bar_v',
  disk_units: 'bar_v',
  sw_top: 'bar_h',
  sw_history: 'line',
};

const CHART_OPTIONS: Record<string, Array<{ label: string; value: string }>> = {
  os: [
    { label: 'Pizza', value: 'pie' },
    { label: 'Rosca', value: 'donut' },
    { label: 'Barras (V)', value: 'bar_v' },
    { label: 'Barras (H)', value: 'bar_h' },
    { label: 'Radial', value: 'radial' },
    { label: 'Radar', value: 'radar' },
    { label: 'Treemap', value: 'treemap' },
  ],
  ram: [
    { label: 'Barras (V)', value: 'bar_v' },
    { label: 'Barras (H)', value: 'bar_h' },
    { label: 'Pizza', value: 'pie' },
    { label: 'Rosca', value: 'donut' },
    { label: 'Radar', value: 'radar' },
  ],
  storage_cnt: [
    { label: 'Barras (V)', value: 'bar_v' },
    { label: 'Barras (H)', value: 'bar_h' },
    { label: 'Pizza', value: 'pie' },
    { label: 'Radar', value: 'radar' },
    { label: 'Treemap', value: 'treemap' },
  ],
  storage_cap: [
    { label: 'Barras (V)', value: 'bar_v' },
    { label: 'Barras (H)', value: 'bar_h' },
    { label: 'Área', value: 'area' },
  ],
  floor_chart: [
    { label: 'Barras (V)', value: 'bar_v' },
    { label: 'Barras (H)', value: 'bar_h' },
    { label: 'Pizza', value: 'pie' },
    { label: 'Radar', value: 'radar' },
  ],
  disk_units: [
    { label: 'Barras (V)', value: 'bar_v' },
    { label: 'Barras (H)', value: 'bar_h' },
    { label: 'Pizza', value: 'pie' },
    { label: 'Radar', value: 'radar' },
  ],
  sw_top: [
    { label: 'Barras (H)', value: 'bar_h' },
    { label: 'Barras (V)', value: 'bar_v' },
  ],
  sw_history: [
    { label: 'Linha', value: 'line' },
    { label: 'Área', value: 'area' },
    { label: 'Barras', value: 'bar_v' },
  ],
};

const DEFAULT_LAYOUT: Layout[] = [
  { i: 'stat_0',      x: 0,  y: 0,  w: 2,  h: 3, minH: 3, minW: 2 },
  { i: 'stat_1',      x: 2,  y: 0,  w: 2,  h: 3, minH: 3, minW: 2 },
  { i: 'stat_2',      x: 4,  y: 0,  w: 2,  h: 3, minH: 3, minW: 2 },
  { i: 'stat_3',      x: 6,  y: 0,  w: 2,  h: 3, minH: 3, minW: 2 },
  { i: 'stat_4',      x: 8,  y: 0,  w: 2,  h: 3, minH: 3, minW: 2 },
  { i: 'stat_5',      x: 10, y: 0,  w: 2,  h: 3, minH: 3, minW: 2 },
  { i: 'os',          x: 0,  y: 3,  w: 6,  h: 8, minH: 4, minW: 2 },
  { i: 'ram',         x: 6,  y: 3,  w: 6,  h: 8, minH: 4, minW: 2 },
  { i: 'storage_cnt', x: 0,  y: 11, w: 6,  h: 8, minH: 4, minW: 2 },
  { i: 'storage_cap', x: 6,  y: 11, w: 6,  h: 8, minH: 4, minW: 2 },
  { i: 'floor_chart', x: 0,  y: 19, w: 6,  h: 8, minH: 4, minW: 2 },
  { i: 'floor_table', x: 6,  y: 19, w: 6,  h: 8, minH: 4, minW: 2 },
  { i: 'disk_alerts', x: 0,  y: 27, w: 6,  h: 9, minH: 4, minW: 2 },
  { i: 'disk_units',  x: 6,  y: 27, w: 6,  h: 9, minH: 4, minW: 2 },
  { i: 'sw_top',      x: 0,  y: 36, w: 6,  h: 8, minH: 4, minW: 2 },
  { i: 'sw_history',  x: 6,  y: 36, w: 6,  h: 8, minH: 4, minW: 2 },
  { i: 'health',      x: 0,  y: 44, w: 12, h: 9, minH: 4, minW: 2 },
  { i: 'recent',      x: 0,  y: 53, w: 12, h: 9, minH: 4, minW: 2 },
];

function loadLayout(): Layout[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const saved: Layout[] = JSON.parse(s);
      const savedMap = new Map(saved.map((l: Layout) => [l.i, l]));
      return DEFAULT_LAYOUT.map(d => savedMap.has(d.i) ? { ...d, ...savedMap.get(d.i)! } : d);
    }
  } catch {}
  return DEFAULT_LAYOUT;
}

function loadChartTypes(): Record<string, string> {
  try {
    const s = localStorage.getItem(CHART_TYPES_KEY);
    if (s) return { ...DEFAULT_CHART_TYPES, ...JSON.parse(s) };
  } catch {}
  return { ...DEFAULT_CHART_TYPES };
}

const CHART_PANELS = ['os', 'ram', 'storage_cnt', 'storage_cap', 'floor_chart', 'floor_table', 'disk_alerts', 'disk_units', 'sw_top', 'sw_history'];
const FULL_PANELS  = ['health', 'recent'];

function TreemapCell(props: any) {
  const { x, y, width, height, name, value, fill } = props;
  if (width < 2 || height < 2) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} style={{ fill, stroke: '#fff', strokeWidth: 2 }} />
      {width > 50 && height > 24 && (
        <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={11}>
          {name} ({value})
        </text>
      )}
    </g>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [osData, setOsData] = useState<ChartDataPoint[]>([]);
  const [storageData, setStorageData] = useState<ChartDataPoint[]>([]);
  const [unitData, setUnitData] = useState<ChartDataPoint[]>([]);
  const [alertData, setAlertData] = useState<AlertHistoryPoint[]>([]);
  const [ramData, setRamData] = useState<ChartDataPoint[]>([]);
  const [diskHealth, setDiskHealth] = useState<any[]>([]);
  const [topSoftware, setTopSoftware] = useState<{ name: string; count: number }[]>([]);
  const [storageCapacity, setStorageCapacity] = useState<any[]>([]);
  const [floorData, setFloorData] = useState<any[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState<Layout[]>(loadLayout);
  const [chartTypes, setChartTypes] = useState<Record<string, string>>(loadChartTypes);

  const navigate = useNavigate();
  const isDark = useThemeStore((s) => s.mode === 'dark');
  const { isMobile, isTablet } = useBreakpoint();

  const [drillModal, setDrillModal] = useState<{ open: boolean; title: string; data: any[]; columns: any[] }>
    ({ open: false, title: '', data: [], columns: [] });
  const [drillLoading, setDrillLoading] = useState(false);
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);

  const cardStyle: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 };
  const cardFlex: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column' };
  const tooltipStyle = { background: isDark ? '#162032' : '#ffffff', border: '1px solid var(--border)', borderRadius: 8, color: isDark ? '#E6EAF0' : '#1a1a2e' };
  const axisColor = isDark ? '#5B6470' : '#9ca3af';
  const gridColor = isDark ? '#1E293B' : '#e5e7eb';
  const hdrBase = { borderBottom: '1px solid var(--border)', color: 'var(--text)' };
  const chartCardStyles = { header: hdrBase, body: { flex: 1, minHeight: 0, padding: '8px 12px' } };
  const tableCardStyles = { header: hdrBase, body: { flex: 1, minHeight: 0, padding: 0, overflow: 'auto' as const } };
  const clickHint = <Text style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Clique para ver</Text>;

  const updateChartType = useCallback((panelId: string, type: string) => {
    setChartTypes(prev => {
      const next = { ...prev, [panelId]: type };
      localStorage.setItem(CHART_TYPES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const chartSelect = (panelId: string) => (
    <Select
      size="small"
      value={chartTypes[panelId] ?? DEFAULT_CHART_TYPES[panelId]}
      onChange={(v) => updateChartType(panelId, v)}
      options={CHART_OPTIONS[panelId] ?? []}
      style={{ width: 120 }}
    />
  );

  const deviceCols = [
    { title: 'Hostname', dataIndex: 'hostname', key: 'hostname',
      render: (t: string, r: any) => <a onClick={() => { setDrillModal(p => ({ ...p, open: false })); navigate(`/devices/${r.id}`); }} style={{ color: '#1565FF' }}>{t}</a> },
    { title: 'Usuário', dataIndex: 'current_user', key: 'user', render: (v: string) => v || '-' },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 90,
      render: (s: string) => <Tag color={s === 'online' ? 'green' : 'red'}>{(s || '').toUpperCase()}</Tag> },
    { title: 'Última Comunicação', dataIndex: 'last_seen', key: 'ls',
      render: (v: string) => v ? new Date(v).toLocaleString('pt-BR') : '-' },
  ];

  const drillOs = async (label: string) => {
    setDrillLoading(true);
    setDrillModal({ open: true, title: `Dispositivos — ${label}`, data: [], columns: [...deviceCols, { title: 'Versão', dataIndex: 'os_version', key: 'ver', render: (v: string) => v || '-' }] });
    const { data } = await getDevicesByOs(label); setDrillModal(p => ({ ...p, data })); setDrillLoading(false);
  };
  const drillRam = async (label: string) => {
    setDrillLoading(true);
    setDrillModal({ open: true, title: `Dispositivos — RAM ${label}`, data: [], columns: [...deviceCols, { title: 'RAM', dataIndex: 'ram_gb', key: 'ram', render: (v: number) => `${v} GB` }] });
    const { data } = await getDevicesByRam(label); setDrillModal(p => ({ ...p, data })); setDrillLoading(false);
  };
  const drillStorage = async (label: string) => {
    setDrillLoading(true);
    setDrillModal({ open: true, title: `Discos — ${label}`, data: [], columns: [
      deviceCols[0],
      { title: 'Modelo', dataIndex: 'model', key: 'model', ellipsis: true },
      { title: 'Capacidade', dataIndex: 'capacity_gb', key: 'cap', render: (v: number) => `${v} GB` },
      { title: 'Usado', dataIndex: 'used_gb', key: 'used', render: (v: number) => `${v} GB` },
      { title: 'Livre', dataIndex: 'free_gb', key: 'free', render: (v: number) => `${v} GB` },
      { title: 'Saúde', dataIndex: 'health', key: 'health', render: (v: string) => <Tag color={v === 'OK' || v === 'Healthy' ? 'green' : 'default'}>{v}</Tag> },
    ]});
    const { data } = await getDevicesByStorageType(label); setDrillModal(p => ({ ...p, data })); setDrillLoading(false);
  };
  const drillFloor = async (branchId: number, floorName: string) => {
    setDrillLoading(true);
    setDrillModal({ open: true, title: `Dispositivos — ${floorName}`, data: [], columns: [
      ...deviceCols, { title: 'Setor', dataIndex: 'sector', key: 'sector' },
    ]});
    const { data } = await getDevicesByFloor(branchId);
    setDrillModal(p => ({ ...p, data }));
    setDrillLoading(false);
  };

  const refreshStats = useCallback(async () => { try { const { data } = await getDashboardStats(); setStats(data); } catch {} }, []);
  const refreshDeviceTable = useCallback(async () => { try { const { data } = await getDevices({ page_size: 10 }); setDevices(data); } catch {} }, []);
  const refreshCharts = useCallback(async () => {
    try {
      const [a, b, c, d, e, f, g, h, fl] = await Promise.all([
        getOsDistribution(), getStorageUsage(), getDevicesPerUnit(), getRamDistribution(),
        getDiskHealth(), getTopSoftware(10), getAlertHistory(), getStorageCapacity(),
        getDevicesPerFloor(),
      ]);
      setOsData(a.data.data); setStorageData(b.data.data); setUnitData(c.data.data);
      setRamData(d.data.data); setDiskHealth(e.data); setTopSoftware(f.data);
      setAlertData(g.data); setStorageCapacity(h.data); setFloorData(fl.data);
    } catch {}
  }, []);

  useEffect(() => { (async () => { await Promise.all([refreshStats(), refreshDeviceTable(), refreshCharts()]); setLoading(false); })(); }, []);
  useEffect(() => { const i = setInterval(refreshStats, 60000); return () => clearInterval(i); }, [refreshStats]);

  const handleWsMessage = useCallback((msg: WSMessage) => {
    if (msg.type === 'status_change') {
      if (msg.agent_id) setDevices(prev => prev.map(d => d.agent_id === msg.agent_id ? { ...d, status: (msg.status as Device['status']) || d.status, last_seen: msg.last_seen || d.last_seen } : d));
      refreshStats();
    } else if (msg.type === 'heartbeat' && msg.agent_id) {
      setDevices(prev => prev.map(d => d.agent_id === msg.agent_id ? { ...d, status: 'online', last_seen: msg.last_seen || d.last_seen } : d));
    } else if (msg.type === 'inventory_updated') { refreshCharts(); refreshDeviceTable(); refreshStats(); }
  }, [refreshStats, refreshCharts, refreshDeviceTable]);
  useWebSocket(handleWsMessage);

  const handleLayoutChange = (newLayout: Layout[]) => {
    setLayout(newLayout);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newLayout));
  };

  const gridContainerRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) dashboardRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };

  const applyColumns = (numCols: number) => {
    const w = Math.floor(GRID_COLS / numCols);
    const statW = Math.floor(GRID_COLS / STAT_PANELS.length);
    const rowH = 8;
    const newLayout: Layout[] = [];
    STAT_PANELS.forEach((id, idx) => {
      newLayout.push({ i: id, x: idx * statW, y: 0, w: statW, h: 3, minH: 3, minW: 2 });
    });
    let y = 3;
    CHART_PANELS.forEach((id, idx) => {
      const col = idx % numCols;
      if (col === 0 && idx > 0) y += rowH;
      newLayout.push({ i: id, x: col * w, y, w, h: rowH, minH: 4, minW: 2 });
    });
    y += rowH;
    FULL_PANELS.forEach((id, i) => {
      newLayout.push({ i: id, x: 0, y: y + i * 9, w: GRID_COLS, h: 9, minH: 4, minW: 2 });
    });
    setLayout(newLayout);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newLayout));
  };

  const resetLayout = () => {
    setLayout(DEFAULT_LAYOUT);
    localStorage.removeItem(STORAGE_KEY);
  };

  if (loading) return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />;

  const statCards = [
    { title: 'Total de Ativos', value: stats?.total_devices || 0, icon: <DesktopOutlined />, color: '#1565FF', onClick: () => navigate('/devices') },
    { title: 'Online', value: stats?.online || 0, icon: <CheckCircleOutlined />, color: '#00BFA5', onClick: () => navigate('/devices?status=online') },
    { title: 'Offline', value: stats?.offline || 0, icon: <CloseCircleOutlined />, color: '#FF4D4F', onClick: () => navigate('/devices?status=offline') },
    { title: 'Alertas', value: stats?.alerts || 0, icon: <WarningOutlined />, color: '#FFB020', onClick: () => setAlertsModalOpen(true) },
    { title: 'Uptime Médio', value: `${stats?.avg_uptime_percent || 0}%`, icon: <PercentageOutlined />, color: '#7C3AED', onClick: () => navigate('/devices') },
    { title: 'Tempo Offline Médio', value: `${stats?.avg_offline_hours || 0}h`, icon: <ClockCircleOutlined />, color: '#0EA5E9', onClick: () => navigate('/devices?status=offline') },
  ];

  const capByType: Record<string, { total: number; used: number }> = {};
  storageCapacity.forEach(s => {
    const t = s.media_type || 'HDD';
    if (!capByType[t]) capByType[t] = { total: 0, used: 0 };
    capByType[t].total += s.capacity_gb;
    capByType[t].used += s.used_gb;
  });
  const capChart = Object.entries(capByType).map(([label, v]) => ({
    label, total: Math.round(v.total),
    used: Math.round(v.used),
    free: Math.round(v.total - v.used),
  }));
  const highUsage = storageCapacity.filter(s => s.usage_pct >= 80).sort((a, b) => b.usage_pct - a.usage_pct);

  // Generic chart renderer for {label, value} data
  const renderSimpleChart = (
    data: ChartDataPoint[],
    type: string,
    opts: {
      onClickPie?: (e: any) => void;
      onClickBar?: (e: any) => void;
      barColor?: string;
      valueName?: string;
    } = {}
  ): ReactNode => {
    const { onClickPie, onClickBar, barColor = '#1565FF', valueName = 'Dispositivos' } = opts;
    const clickable = !!(onClickBar || onClickPie);

    if (type === 'pie' || type === 'donut') {
      return (
        <PieChart>
          <Pie
            data={data} dataKey="value" nameKey="label"
            cx="50%" cy="50%" outerRadius="70%"
            innerRadius={type === 'donut' ? '45%' : 0}
            label strokeWidth={0}
            style={{ cursor: clickable ? 'pointer' : 'default' }}
            onClick={onClickPie}
          >
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <RTooltip contentStyle={tooltipStyle} />
          <Legend />
        </PieChart>
      );
    }
    if (type === 'bar_h') {
      return (
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis type="number" stroke={axisColor} allowDecimals={false} />
          <YAxis type="category" dataKey="label" stroke={axisColor} width={110} tick={{ fontSize: 11 }} />
          <RTooltip contentStyle={tooltipStyle} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} name={valueName}
            style={{ cursor: clickable ? 'pointer' : 'default' }} onClick={onClickBar}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      );
    }
    if (type === 'radar') {
      return (
        <RadarChart data={data}>
          <PolarGrid stroke={gridColor} />
          <PolarAngleAxis dataKey="label" stroke={axisColor} tick={{ fontSize: 11, fill: axisColor }} />
          <PolarRadiusAxis stroke={axisColor} tick={{ fontSize: 10, fill: axisColor }} />
          <Radar dataKey="value" stroke={barColor} fill={barColor} fillOpacity={0.45} name={valueName} />
          <RTooltip contentStyle={tooltipStyle} />
        </RadarChart>
      );
    }
    if (type === 'radial') {
      return (
        <RadialBarChart data={data} innerRadius="20%" outerRadius="90%" startAngle={90} endAngle={-270}>
          <RadialBar dataKey="value" background label={{ position: 'insideStart', fill: '#fff', fontSize: 10 }}
            style={{ cursor: clickable ? 'pointer' : 'default' }} onClick={onClickBar}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </RadialBar>
          <RTooltip contentStyle={tooltipStyle} />
          <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
        </RadialBarChart>
      );
    }
    if (type === 'treemap') {
      return (
        <Treemap
          data={data.map((d, i) => ({ ...d, fill: COLORS[i % COLORS.length] }))}
          dataKey="value" nameKey="label" stroke="#fff" content={<TreemapCell />}
        />
      );
    }
    // default: bar_v
    return (
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey="label" stroke={axisColor} tick={{ fontSize: 11 }} />
        <YAxis stroke={axisColor} allowDecimals={false} />
        <RTooltip contentStyle={tooltipStyle} />
        <Bar dataKey="value" fill={barColor} radius={[6, 6, 0, 0]} name={valueName}
          style={{ cursor: clickable ? 'pointer' : 'default' }} onClick={onClickBar}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    );
  };

  const storagecapChartNode = (): ReactNode => {
    const type = chartTypes.storage_cap ?? 'bar_v';
    if (type === 'area') {
      return (
        <AreaChart data={capChart}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="label" stroke={axisColor} />
          <YAxis stroke={axisColor} />
          <RTooltip contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey="used" stackId="1" stroke="#FF4D4F" fill="#FF4D4F" fillOpacity={0.6} name="Usado (GB)" />
          <Area type="monotone" dataKey="free" stackId="1" stroke="#00BFA5" fill="#00BFA5" fillOpacity={0.6} name="Livre (GB)" />
          <Legend />
        </AreaChart>
      );
    }
    if (type === 'bar_h') {
      return (
        <BarChart data={capChart} layout="vertical" margin={{ left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis type="number" stroke={axisColor} />
          <YAxis type="category" dataKey="label" stroke={axisColor} width={60} tick={{ fontSize: 11 }} />
          <RTooltip contentStyle={tooltipStyle} />
          <Bar dataKey="used" fill="#FF4D4F" stackId="a" name="Usado (GB)" />
          <Bar dataKey="free" fill="#00BFA5" stackId="a" name="Livre (GB)" radius={[0, 6, 6, 0]} />
          <Legend />
        </BarChart>
      );
    }
    return (
      <BarChart data={capChart}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey="label" stroke={axisColor} />
        <YAxis stroke={axisColor} />
        <RTooltip contentStyle={tooltipStyle} />
        <Bar dataKey="used" fill="#FF4D4F" stackId="a" name="Usado (GB)" />
        <Bar dataKey="free" fill="#00BFA5" stackId="a" name="Livre (GB)" radius={[6, 6, 0, 0]} />
        <Legend />
      </BarChart>
    );
  };

  const swTopChartNode = (): ReactNode => {
    const type = chartTypes.sw_top ?? 'bar_h';
    const swData = topSoftware.map(s => ({ label: s.name, value: s.count }));
    if (type === 'bar_v') {
      return (
        <BarChart data={swData}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="label" stroke={axisColor} tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={55} />
          <YAxis stroke={axisColor} />
          <RTooltip contentStyle={tooltipStyle} />
          <Bar dataKey="value" fill="#0EA5E9" radius={[6, 6, 0, 0]} name="Instalações" />
        </BarChart>
      );
    }
    return (
      <BarChart data={swData} layout="vertical" margin={{ left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis type="number" stroke={axisColor} />
        <YAxis type="category" dataKey="label" stroke={axisColor} width={180} tick={{ fontSize: 11 }} />
        <RTooltip contentStyle={tooltipStyle} />
        <Bar dataKey="value" fill="#0EA5E9" radius={[0, 6, 6, 0]} name="Instalações" />
      </BarChart>
    );
  };

  const swHistoryChartNode = (): ReactNode => {
    const type = chartTypes.sw_history ?? 'line';
    if (type === 'area') {
      return (
        <AreaChart data={alertData}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="date" stroke={axisColor} />
          <YAxis stroke={axisColor} />
          <RTooltip contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey="count" stroke="#FFB020" fill="#FFB020" fillOpacity={0.3} name="Alterações" />
        </AreaChart>
      );
    }
    if (type === 'bar_v') {
      return (
        <BarChart data={alertData}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="date" stroke={axisColor} tick={{ fontSize: 10 }} />
          <YAxis stroke={axisColor} />
          <RTooltip contentStyle={tooltipStyle} />
          <Bar dataKey="count" fill="#FFB020" radius={[6, 6, 0, 0]} name="Alterações" />
        </BarChart>
      );
    }
    return (
      <LineChart data={alertData}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey="date" stroke={axisColor} />
        <YAxis stroke={axisColor} />
        <RTooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="count" stroke="#FFB020" strokeWidth={2} dot={false} name="Alterações" />
      </LineChart>
    );
  };

  const panels: Record<string, ReactNode> = {

    ...Object.fromEntries(statCards.map((s, i) => [`stat_${i}`, (
      <Card hoverable size="small" onClick={s.onClick}
        style={{ ...cardStyle, borderTop: `3px solid ${s.color}`, height: '100%', cursor: 'pointer' }}
        styles={{ body: { padding: '8px 12px' } }}>
        <Statistic
          title={<span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>{s.title}</span>}
          value={s.value}
          prefix={<span style={{ color: s.color, fontSize: 14 }}>{s.icon}</span>}
          valueStyle={{ color: 'var(--text)', fontWeight: 700, fontSize: 18 }}
        />
      </Card>
    )])),

    os: (
      <Card
        title="Sistemas Operacionais"
        style={{ ...cardStyle, ...cardFlex }}
        extra={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{clickHint}{chartSelect('os')}</div>}
        styles={chartCardStyles}
      >
        <ResponsiveContainer width="100%" height="100%">
          {renderSimpleChart(osData, chartTypes.os ?? 'pie', {
            barColor: '#1565FF', valueName: 'Dispositivos',
            onClickPie: (e) => drillOs(e.label),
            onClickBar: (e: any) => drillOs(e.label),
          }) as React.ReactElement}
        </ResponsiveContainer>
      </Card>
    ),

    ram: (
      <Card
        title="Distribuição de RAM"
        style={{ ...cardStyle, ...cardFlex }}
        extra={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{clickHint}{chartSelect('ram')}</div>}
        styles={chartCardStyles}
      >
        <ResponsiveContainer width="100%" height="100%">
          {renderSimpleChart(ramData, chartTypes.ram ?? 'bar_v', {
            barColor: '#7C3AED', valueName: 'Dispositivos',
            onClickPie: (e) => drillRam(e.label),
            onClickBar: (e: any) => drillRam(e.label),
          }) as React.ReactElement}
        </ResponsiveContainer>
      </Card>
    ),

    storage_cnt: (
      <Card
        title="Armazenamento por Tipo"
        style={{ ...cardStyle, ...cardFlex }}
        extra={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{clickHint}{chartSelect('storage_cnt')}</div>}
        styles={chartCardStyles}
      >
        <ResponsiveContainer width="100%" height="100%">
          {renderSimpleChart(storageData, chartTypes.storage_cnt ?? 'bar_v', {
            barColor: '#1565FF', valueName: 'Discos',
            onClickPie: (e) => drillStorage(e.label),
            onClickBar: (e: any) => drillStorage(e.label),
          }) as React.ReactElement}
        </ResponsiveContainer>
      </Card>
    ),

    storage_cap: (
      <Card
        title="Capacidade Total por Tipo (GB)"
        style={{ ...cardStyle, ...cardFlex }}
        extra={chartSelect('storage_cap')}
        styles={chartCardStyles}
      >
        <ResponsiveContainer width="100%" height="100%">
          {storagecapChartNode() as React.ReactElement}
        </ResponsiveContainer>
      </Card>
    ),

    floor_chart: (
      <Card
        title="Dispositivos por Andar"
        style={{ ...cardStyle, ...cardFlex }}
        extra={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{clickHint}{chartSelect('floor_chart')}</div>}
        styles={chartCardStyles}
      >
        <ResponsiveContainer width="100%" height="100%">
          {renderSimpleChart(
            floorData.map(f => ({ label: f.floor, value: f.count, ...f })),
            chartTypes.floor_chart ?? 'bar_v',
            {
              barColor: '#0EA5E9', valueName: 'Dispositivos',
              onClickPie: (e: any) => drillFloor(e.branch_id, e.label),
              onClickBar: (e: any) => drillFloor(e.branch_id, e.label),
            }
          ) as React.ReactElement}
        </ResponsiveContainer>
      </Card>
    ),

    floor_table: (
      <Card title="Detalhes por Andar" style={{ ...cardStyle, ...cardFlex }} styles={tableCardStyles}>
        <Table
          dataSource={floorData} rowKey="branch_id" size="small" pagination={false}
          onRow={(r) => ({ onClick: () => drillFloor(r.branch_id, r.floor), style: { cursor: 'pointer' } })}
          columns={[
            { title: 'Empresa', dataIndex: 'company', key: 'company' },
            { title: 'Andar', dataIndex: 'floor', key: 'floor' },
            { title: 'Dispositivos', dataIndex: 'count', key: 'count', width: 120,
              render: (v: number) => <Text strong style={{ color: '#0EA5E9' }}>{v}</Text> },
          ]}
        />
      </Card>
    ),

    disk_alerts: (
      <Card
        title={`Discos com Alto Uso (≥80%) — ${highUsage.length}`}
        style={{ ...cardStyle, ...cardFlex }}
        styles={tableCardStyles}
      >
        {highUsage.length === 0
          ? <Text style={{ padding: '12px', display: 'block', color: 'var(--text-secondary)' }}>Nenhum disco acima de 80%</Text>
          : <Table
              dataSource={highUsage}
              rowKey={(r) => `${r.hostname}-${r.model}-${r.drive_letter ?? ''}`}
              size="small" pagination={{ pageSize: 6 }}
              columns={[
                { title: 'Máquina', dataIndex: 'hostname', key: 'h', width: 140,
                  render: (t: string, r: any) => <a onClick={() => navigate(`/devices/${r.id}`)} style={{ color: '#1565FF' }}>{t}</a> },
                { title: 'Disco', dataIndex: 'model', key: 'm', ellipsis: true },
                { title: 'Tipo', dataIndex: 'media_type', key: 't', width: 70,
                  render: (v: string) => <Tag color={v === 'NVMe' ? 'purple' : v === 'SSD' ? 'blue' : 'default'}>{v}</Tag> },
                { title: 'Uso', dataIndex: 'usage_pct', key: 'u', width: 150,
                  render: (v: number) => <Progress percent={v} size="small" strokeColor={v >= 95 ? '#FF4D4F' : v >= 90 ? '#FFB020' : '#1565FF'} /> },
                { title: 'Livre', dataIndex: 'free_gb', key: 'f', width: 80, render: (v: number) => `${v} GB` },
              ]}
            />
        }
      </Card>
    ),

    disk_units: (
      <Card
        title="Dispositivos por Unidade"
        style={{ ...cardStyle, ...cardFlex }}
        extra={chartSelect('disk_units')}
        styles={chartCardStyles}
      >
        <ResponsiveContainer width="100%" height="100%">
          {renderSimpleChart(unitData, chartTypes.disk_units ?? 'bar_v', {
            barColor: '#00BFA5', valueName: 'Dispositivos',
          }) as React.ReactElement}
        </ResponsiveContainer>
      </Card>
    ),

    sw_top: (
      <Card
        title="Top 10 Softwares Instalados"
        style={{ ...cardStyle, ...cardFlex }}
        extra={chartSelect('sw_top')}
        styles={chartCardStyles}
      >
        <ResponsiveContainer width="100%" height="100%">
          {swTopChartNode() as React.ReactElement}
        </ResponsiveContainer>
      </Card>
    ),

    sw_history: (
      <Card
        title="Histórico de Alterações"
        style={{ ...cardStyle, ...cardFlex }}
        extra={chartSelect('sw_history')}
        styles={chartCardStyles}
      >
        <ResponsiveContainer width="100%" height="100%">
          {swHistoryChartNode() as React.ReactElement}
        </ResponsiveContainer>
      </Card>
    ),

    health: (
      <Card title="Saúde dos Discos" style={{ ...cardStyle, ...cardFlex }} styles={tableCardStyles}>
        <Table
          dataSource={diskHealth}
          rowKey={(r) => `${r.hostname}-${r.model}-${r.drive_letter ?? ''}`}
          pagination={{ pageSize: 10 }} size="small"
          columns={[
            { title: 'Máquina', dataIndex: 'hostname', key: 'hostname', width: 150,
              render: (t: string, r: any) => <a onClick={() => navigate(`/devices/${r.id}`)} style={{ color: '#1565FF' }}>{t}</a> },
            { title: 'Disco', dataIndex: 'model', key: 'model', ellipsis: true },
            { title: 'Tipo', dataIndex: 'media_type', key: 'type', width: 80,
              render: (v: string) => <Tag color={v === 'NVMe' ? 'purple' : v === 'SSD' ? 'blue' : 'default'}>{v}</Tag> },
            { title: 'Capacidade', dataIndex: 'capacity_gb', key: 'cap', width: 100, render: (v: number) => `${v} GB` },
            { title: 'Saúde', dataIndex: 'health', key: 'health', width: 110,
              render: (v: string) => <Tag color={v === 'OK' || v === 'Healthy' ? 'green' : v === 'Desconhecido' || v === '-' ? 'default' : 'red'}>{v}</Tag> },
          ]}
        />
      </Card>
    ),

    recent: (
      <Card
        title="Últimos Ativos Cadastrados"
        style={{ ...cardStyle, ...cardFlex }}
        styles={tableCardStyles}
        extra={<a onClick={() => navigate('/devices')} style={{ color: '#1565FF' }}>Ver todos</a>}
      >
        <Table
          dataSource={devices} rowKey="id" pagination={false} size="small"
          onRow={(record) => ({ onClick: () => navigate(`/devices/${record.id}`), style: { cursor: 'pointer' } })}
          columns={[
            { title: 'Hostname', dataIndex: 'hostname', key: 'hostname',
              render: (text: string, record: Device) => <a onClick={() => navigate(`/devices/${record.id}`)} style={{ color: '#1565FF', fontWeight: 500 }}>{text}</a> },
            { title: 'Usuário', dataIndex: 'current_user', key: 'user' },
            { title: 'Processador', dataIndex: 'cpu_model', key: 'cpu', ellipsis: true, render: (v: string) => v || '-' },
            { title: 'RAM', dataIndex: 'ram_total_gb', key: 'ram', width: 80, render: (v: number) => v ? `${v} GB` : '-' },
            { title: 'Status', dataIndex: 'status', key: 'status', width: 90,
              render: (status: string) => <Tag color={status === 'online' ? '#00BFA5' : '#FF4D4F'} style={{ borderRadius: 6, fontWeight: 500 }}>{status.toUpperCase()}</Tag> },
            { title: 'Última Comunicação', dataIndex: 'last_seen', key: 'last_seen',
              render: (v: string) => v ? new Date(v).toLocaleString('pt-BR') : '-' },
          ]}
        />
      </Card>
    ),
  };

  // Ordem canônica dos painéis para o modo mobile (stacked)
  const MOBILE_PANEL_ORDER = [...STAT_PANELS, ...CHART_PANELS, ...FULL_PANELS];

  return (
    <div ref={dashboardRef} style={{
      background: isFullscreen ? 'var(--bg)' : undefined,
      overflow: isFullscreen ? 'auto' : undefined,
      padding: isFullscreen ? 24 : undefined,
      minHeight: isFullscreen ? '100vh' : undefined,
    }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <Title level={isMobile ? 4 : 3} style={{ margin: 0, color: 'var(--text)', fontFamily: "'Poppins', sans-serif" }}>Dashboard</Title>
          {!isMobile && (
            <Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
              Arraste <DragOutlined /> para mover · arraste ↘ para redimensionar
            </Text>
          )}
        </div>
        {!isMobile && (
          <Space size="middle" wrap>
            <Space size={4}>
              <Text style={{ color: 'var(--text-muted)', fontSize: 12 }}>Colunas:</Text>
              <Segmented size="small"
                options={[{ label: '2', value: 2 }, { label: '3', value: 3 }, { label: '4', value: 4 }]}
                onChange={(v) => applyColumns(v as number)}
              />
            </Space>
            <Tooltip title="Restaurar posição e tamanho originais">
              <Button type="text" icon={<UndoOutlined />} onClick={resetLayout} style={{ color: 'var(--text-muted)' }}>
                Resetar
              </Button>
            </Tooltip>
            <Tooltip title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}>
              <Button
                type={isFullscreen ? 'primary' : 'default'}
                icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                onClick={toggleFullscreen}
              >
                {isFullscreen ? 'Sair' : 'Tela cheia'}
              </Button>
            </Tooltip>
          </Space>
        )}
      </div>

      {/* Mobile: lista vertical simples */}
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Stat cards em grid 2×3 */}
          <Row gutter={[8, 8]}>
            {STAT_PANELS.map((id, i) => statCards[i] && (
              <Col xs={12} key={id}>
                <div style={{ height: 80 }}>{panels[id]}</div>
              </Col>
            ))}
          </Row>
          {/* Demais painéis empilhados */}
          {[...CHART_PANELS, ...FULL_PANELS].map(id => panels[id] && (
            <div key={id} style={{ height: 280 }}>{panels[id]}</div>
          ))}
        </div>
      ) : (
        /* Desktop/tablet: grade arrastável */
        <div ref={gridContainerRef}>
          <RGL
            layout={layout}
            cols={GRID_COLS}
            rowHeight={ROW_HEIGHT}
            draggableHandle=".dash-drag-handle"
            onLayoutChange={handleLayoutChange}
            margin={[GRID_MARGIN, GRID_MARGIN]}
            containerPadding={[0, 0]}
            isResizable
            resizeHandles={['se', 's', 'e']}
            isDraggable
          >
            {layout.map(item => panels[item.i] ? (
              <div key={item.i} style={{ position: 'relative' }}>
                <div className="dash-drag-handle" style={{
                  position: 'absolute', top: 8, right: 8, zIndex: 10, cursor: 'grab',
                  color: 'var(--text-muted)', fontSize: 14, padding: '3px 8px',
                  borderRadius: 6, background: 'var(--bg-card-inner)',
                  display: 'flex', alignItems: 'center', gap: 4, userSelect: 'none',
                }}>
                  <DragOutlined />
                </div>
                <div style={{ height: '100%' }}>{panels[item.i]}</div>
              </div>
            ) : null)}
          </RGL>
        </div>
      )}

      <Modal title={drillModal.title} open={drillModal.open} footer={null}
        width={isMobile ? '100%' : 900}
        style={isMobile ? { top: 0, margin: 0, maxWidth: '100vw', padding: 0 } : undefined}
        onCancel={() => setDrillModal(p => ({ ...p, open: false }))}>
        <Table
          dataSource={drillModal.data} columns={drillModal.columns}
          rowKey={(r: any) => r._key ?? r.id}
          loading={drillLoading} size="small" pagination={{ pageSize: 15 }}
          scroll={{ x: 600 }}
          onRow={(r) => ({ onClick: () => { setDrillModal(p => ({ ...p, open: false })); navigate(`/devices/${r.id}`); }, style: { cursor: 'pointer' } })}
        />
      </Modal>

      <AlertsModal open={alertsModalOpen} onClose={() => setAlertsModalOpen(false)} onChanged={refreshStats} />
    </div>
  );
}
