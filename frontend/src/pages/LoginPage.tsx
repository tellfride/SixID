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
      background: 'linear-gradient(135deg, #0D0D0D 0%, #1A1A1A 50%, #0D0D0D 100%)',
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
          <img src="/logo.png" alt="SixID" style={{ height: 56, objectFit: 'contain', marginBottom: 8 }} />
          <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            Sistema de Gestao de Ativos e Inventario de TI
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
