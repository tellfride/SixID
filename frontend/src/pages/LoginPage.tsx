import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, message, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';

const { Title, Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      navigate('/');
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0B1220 0%, #0F1B2E 50%, #0B1220 100%)',
    }}>
      <Card
        style={{
          width: 440,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
        styles={{ body: { padding: 48 } }}
      >
        <Space direction="vertical" align="center" style={{ width: '100%', marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <svg width={44} height={44} viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="8" fill="#1565FF" />
              <path d="M12 14L20 10L28 14L28 22L20 26L12 22Z" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="1.5" />
              <path d="M20 10V26" stroke="white" strokeWidth="1.5" />
              <path d="M12 14L20 18L28 14" stroke="white" strokeWidth="1.5" />
              <path d="M20 18V26" stroke="white" strokeWidth="1.5" />
              <text x="20" y="22" textAnchor="middle" fill="white" fontSize="10" fontWeight="700" fontFamily="Poppins">6</text>
            </svg>
            <Title level={2} style={{ color: '#ffffff', margin: 0, fontFamily: "'Poppins', sans-serif", fontWeight: 700 }}>
              Sixi<span style={{ color: '#1565FF' }}>D</span>
            </Title>
          </div>
          <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            Sistema de Gestão de Ativos e Inventário de TI
          </Text>
        </Space>

        <Form onFinish={onFinish} layout="vertical" size="large">
          <Form.Item name="username" rules={[{ required: true, message: 'Informe o usuário' }]}>
            <Input
              prefix={<UserOutlined style={{ color: 'var(--text-secondary)' }} />}
              placeholder="Usuário"
              style={{ borderRadius: 8, height: 48 }}
            />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: 'Informe a senha' }]}>
            <Input.Password
              prefix={<LockOutlined style={{ color: 'var(--text-secondary)' }} />}
              placeholder="Senha"
              style={{ borderRadius: 8, height: 48 }}
            />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{
                height: 48,
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              Entrar
            </Button>
          </Form.Item>
        </Form>

        <Text style={{ display: 'block', textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
          Usuário padrão: admin / admin123
        </Text>
      </Card>
    </div>
  );
}
