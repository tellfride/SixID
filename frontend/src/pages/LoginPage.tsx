import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, message, Space, Tooltip } from 'antd';
import { UserOutlined, LockOutlined, SunOutlined, MoonOutlined } from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';

const { Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState('');
  const { login } = useAuthStore();
  const { mode, toggle } = useThemeStore();
  const navigate = useNavigate();
  const isDark = mode === 'dark';

  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(d => setVersion(d.version || '')).catch(() => {});
  }, []);

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
    <div className={isDark ? 'login-starfield' : undefined} style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      background: isDark
        ? undefined
        : 'linear-gradient(135deg, #f0f2f5 0%, #ffffff 50%, #f0f2f5 100%)',
    }}>
      {isDark && (
        <>
          <div className="login-stars" />
          <div className="login-shooting-star" style={{ top: '20%', left: '-100px', animationDelay: '0s' }} />
          <div className="login-shooting-star" style={{ top: '35%', left: '-100px', animationDelay: '1.3s' }} />
          <div className="login-shooting-star" style={{ top: '50%', left: '-100px', animationDelay: '2.6s' }} />
        </>
      )}

      <Tooltip title={isDark ? 'Tema Claro' : 'Tema Escuro'}>
        <Button
          type="text"
          icon={isDark ? <SunOutlined /> : <MoonOutlined />}
          onClick={toggle}
          style={{ position: 'absolute', top: 24, right: 24, color: isDark ? '#8896A6' : 'var(--text-muted)', fontSize: 20, zIndex: 1 }}
        />
      </Tooltip>

      <Card
        style={{
          width: 440,
          position: 'relative',
          zIndex: 1,
          background: isDark ? 'rgba(20, 22, 45, 0.55)' : 'var(--bg-card)',
          backdropFilter: isDark ? 'blur(8px)' : undefined,
          border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid var(--border)',
          borderRadius: 16,
          boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.6)' : '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
        styles={{ body: { padding: 48 } }}
      >
        <Space direction="vertical" align="center" style={{ width: '100%', marginBottom: 36 }}>
          <img src={isDark ? '/temaescuro.png' : '/logo.png'} alt="SixID" style={{ height: 56, objectFit: 'contain', marginBottom: 8 }} />
          <Text style={{ color: isDark ? '#8896A6' : 'var(--text-secondary)', fontSize: 13 }}>
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
      </Card>

      <Text style={{ marginTop: 24, fontSize: 11, color: isDark ? '#8896A6' : 'var(--text-secondary)', position: 'relative', zIndex: 1 }}>
        SixID {version ? `v${version}` : ''} — Sistema de Gestão de Ativos e Inventário de TI
      </Text>
    </div>
  );
}
