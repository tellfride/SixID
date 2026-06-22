import { useEffect, useState } from 'react';
import { Card, Table, Typography, Select, Row, Col, Tag } from 'antd';
import { getAuditLogs } from '../api/endpoints';
import type { AuditLog } from '../types';

const { Title } = Typography;

const actionLabels: Record<string, { label: string; color: string }> = {
  login: { label: 'Login', color: 'blue' },
  user_created: { label: 'Usuário Criado', color: 'green' },
  user_updated: { label: 'Usuário Atualizado', color: 'orange' },
  user_deleted: { label: 'Usuário Removido', color: 'red' },
  device_updated: { label: 'Dispositivo Atualizado', color: 'orange' },
  device_deleted: { label: 'Dispositivo Removido', color: 'red' },
  vnc_session_started: { label: 'Sessão VNC', color: 'purple' },
  screen_locked: { label: 'Tela Bloqueada', color: 'red' },
  screen_unlocked: { label: 'Tela Desbloqueada', color: 'green' },
  command_sent: { label: 'Comando Enviado', color: 'cyan' },
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, page_size: 50 };
      if (actionFilter) params.action = actionFilter;
      const { data } = await getAuditLogs(params);
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLogs(); }, [page, actionFilter]);

  const columns = [
    {
      title: 'Data/Hora', dataIndex: 'created_at', key: 'created_at', width: 180,
      render: (v: string) => new Date(v).toLocaleString('pt-BR'),
    },
    { title: 'Usuário', dataIndex: 'username', key: 'username', width: 120 },
    {
      title: 'Ação', dataIndex: 'action', key: 'action', width: 180,
      render: (action: string) => {
        const info = actionLabels[action] || { label: action, color: 'default' };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    { title: 'Tipo Alvo', dataIndex: 'target_type', key: 'target_type', width: 120 },
    { title: 'ID Alvo', dataIndex: 'target_id', key: 'target_id', width: 80 },
    {
      title: 'Detalhes', dataIndex: 'details', key: 'details',
      render: (v: Record<string, unknown> | null) => v ? JSON.stringify(v) : '-',
      ellipsis: true,
    },
    { title: 'IP', dataIndex: 'ip_address', key: 'ip_address', width: 130 },
  ];

  return (
    <div>
      <Title level={3} style={{ color: '#E6EBF1', marginBottom: 24 }}>Auditoria</Title>

      <Card style={{ background: '#111927', border: '1px solid #1E293B', borderRadius: 12, marginBottom: 16 }}>
        <Row gutter={16}>
          <Col>
            <Select
              placeholder="Filtrar por ação"
              allowClear
              style={{ width: 220 }}
              value={actionFilter}
              onChange={setActionFilter}
              options={Object.entries(actionLabels).map(([k, v]) => ({ value: k, label: v.label }))}
            />
          </Col>
        </Row>
      </Card>

      <Card style={{ background: '#111927', border: '1px solid #1E293B', borderRadius: 12 }}>
        <Table
          dataSource={logs}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{
            current: page,
            pageSize: 50,
            onChange: setPage,
          }}
        />
      </Card>
    </div>
  );
}
