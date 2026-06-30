import { useState } from 'react';
import { Modal, Table, Tag, Button, Space, Popconfirm, message } from 'antd';
import { DeleteOutlined, UndoOutlined, HistoryOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getAlertsDetail, dismissAlert, getDismissedAlerts, restoreAlert } from '../../api/endpoints';

interface AlertItem {
  alert_key: string;
  id: number;
  hostname: string;
  reason: string;
  detail: string;
}

interface DismissedItem {
  id: number;
  alert_key: string;
  dismissed_by: string | null;
  dismissed_at: string;
}

export default function AlertsModal({
  open, onClose, onChanged,
}: {
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [view, setView] = useState<'active' | 'dismissed'>('active');
  const [active, setActive] = useState<AlertItem[]>([]);
  const [dismissed, setDismissed] = useState<DismissedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const loadActive = async () => {
    setLoading(true);
    try { const { data } = await getAlertsDetail(); setActive(data); }
    finally { setLoading(false); }
  };

  const loadDismissed = async () => {
    setLoading(true);
    try { const { data } = await getDismissedAlerts(); setDismissed(data); }
    finally { setLoading(false); }
  };

  const handleOpen = () => {
    setView('active');
    loadActive();
  };

  const handleDismiss = async (alertKey: string) => {
    try {
      await dismissAlert(alertKey);
      message.success('Alerta dispensado');
      setActive(prev => prev.filter(a => a.alert_key !== alertKey));
      onChanged?.();
    } catch { message.error('Erro ao dispensar alerta'); }
  };

  const handleRestore = async (dismissedId: number) => {
    try {
      await restoreAlert(dismissedId);
      message.success('Alerta restaurado');
      setDismissed(prev => prev.filter(d => d.id !== dismissedId));
      onChanged?.();
    } catch { message.error('Erro ao restaurar alerta'); }
  };

  const goToView = (v: 'active' | 'dismissed') => {
    setView(v);
    if (v === 'active') loadActive(); else loadDismissed();
  };

  const activeColumns = [
    { title: 'Hostname', dataIndex: 'hostname', key: 'hostname',
      render: (t: string, r: AlertItem) => <a onClick={() => { onClose(); navigate(`/devices/${r.id}`); }} style={{ color: '#1565FF' }}>{t}</a> },
    { title: 'Tipo', dataIndex: 'reason', key: 'reason', width: 110,
      render: (v: string) => <Tag color={v === 'offline' ? 'red' : 'orange'}>{v === 'offline' ? 'OFFLINE' : 'HARDWARE'}</Tag> },
    { title: 'Detalhe', dataIndex: 'detail', key: 'detail' },
    { title: 'Ação', key: 'action', width: 110,
      render: (_: any, r: AlertItem) => (
        <Popconfirm title="Dispensar este alerta?" okText="Dispensar" cancelText="Cancelar"
          onConfirm={() => handleDismiss(r.alert_key)}>
          <Button size="small" danger icon={<DeleteOutlined />}>Apagar</Button>
        </Popconfirm>
      ) },
  ];

  const dismissedColumns = [
    { title: 'Chave', dataIndex: 'alert_key', key: 'alert_key', ellipsis: true },
    { title: 'Dispensado por', dataIndex: 'dismissed_by', key: 'by', width: 140, render: (v: string) => v || '-' },
    { title: 'Em', dataIndex: 'dismissed_at', key: 'at', width: 160,
      render: (v: string) => new Date(v).toLocaleString('pt-BR') },
    { title: 'Ação', key: 'action', width: 110,
      render: (_: any, r: DismissedItem) => (
        <Button size="small" icon={<UndoOutlined />} onClick={() => handleRestore(r.id)}>Restaurar</Button>
      ) },
  ];

  return (
    <Modal
      title={
        <Space>
          <span>Alertas</span>
          <Button size="small" type={view === 'active' ? 'primary' : 'default'} onClick={() => goToView('active')}>
            Ativos
          </Button>
          <Button size="small" type={view === 'dismissed' ? 'primary' : 'default'} icon={<HistoryOutlined />}
            onClick={() => goToView('dismissed')}>
            Dispensados
          </Button>
        </Space>
      }
      open={open}
      footer={null}
      width={900}
      onCancel={onClose}
      afterOpenChange={(isOpen) => { if (isOpen) handleOpen(); }}
    >
      {view === 'active' ? (
        <Table dataSource={active} columns={activeColumns} rowKey="alert_key"
          loading={loading} size="small" pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'Nenhum alerta ativo — ambiente limpo' }} />
      ) : (
        <Table dataSource={dismissed} columns={dismissedColumns} rowKey="id"
          loading={loading} size="small" pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'Nenhum alerta dispensado' }} />
      )}
    </Modal>
  );
}
