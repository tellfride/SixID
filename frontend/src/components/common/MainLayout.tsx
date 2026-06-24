import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Typography, Space, Input, Button, Tooltip } from 'antd';
import {
  DashboardOutlined, DesktopOutlined, EnvironmentOutlined,
  UserOutlined, AuditOutlined, LogoutOutlined, MenuFoldOutlined,
  MenuUnfoldOutlined, SearchOutlined, DatabaseOutlined, KeyOutlined,
  SunOutlined, MoonOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const SixiDLogo = ({ collapsed }: { collapsed: boolean }) => (
  <div style={{
    height: 64,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderBottom: '1px solid var(--border)',
    padding: '0 16px',
  }}>
    <svg width={collapsed ? 28 : 32} height={collapsed ? 28 : 32} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="8" fill="#1565FF" />
      <path d="M12 14L20 10L28 14L28 22L20 26L12 22Z" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="1.5" />
      <path d="M20 10V26" stroke="white" strokeWidth="1.5" />
      <path d="M12 14L20 18L28 14" stroke="white" strokeWidth="1.5" />
      <path d="M20 18V26" stroke="white" strokeWidth="1.5" />
      <text x="20" y="22" textAnchor="middle" fill="white" fontSize="10" fontWeight="700" fontFamily="Poppins">6</text>
    </svg>
    {!collapsed && (
      <span style={{
        fontSize: 20,
        fontWeight: 700,
        fontFamily: "'Poppins', sans-serif",
        color: 'var(--text)',
        letterSpacing: '-0.5px',
      }}>
        Sixi<span style={{ color: '#1565FF' }}>D</span>
      </span>
    )}
  </div>
);

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [version, setVersion] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { mode, toggle } = useThemeStore();
  const isDark = mode === 'dark';

  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(d => setVersion(d.version || '')).catch(() => {});
  }, []);

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/devices', icon: <DesktopOutlined />, label: 'Ativos' },
    { key: '/inventory', icon: <DatabaseOutlined />, label: 'Inventário' },
    { key: '/locations', icon: <EnvironmentOutlined />, label: 'Localizações' },
    ...(user?.role === 'admin' ? [
      { key: '/user-mgmt', icon: <KeyOutlined />, label: 'Senhas Remotas' },
      { key: '/users', icon: <UserOutlined />, label: 'Usuários' },
      { key: '/audit', icon: <AuditOutlined />, label: 'Auditoria' },
    ] : []),
  ];

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sair',
      onClick: () => { logout(); navigate('/login'); },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={240}
        style={{
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--border)',
        }}
      >
        <SixiDLogo collapsed={collapsed} />
        <Menu
          theme={isDark ? 'dark' : 'light'}
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ background: 'transparent', borderRight: 0, marginTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: 'var(--header-bg)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
          height: 64,
        }}>
          <Space>
            <div
              onClick={() => setCollapsed(!collapsed)}
              style={{ cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)' }}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </div>
            <Input
              placeholder="Buscar ativo..."
              prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
              style={{ width: 280, borderRadius: 8 }}
              onPressEnter={(e) => {
                const val = (e.target as HTMLInputElement).value.trim();
                if (val) navigate(`/devices?search=${encodeURIComponent(val)}`);
              }}
            />
          </Space>
          <Space size="middle">
            <Tooltip title={isDark ? 'Tema Claro' : 'Tema Escuro'}>
              <Button
                type="text"
                icon={isDark ? <SunOutlined /> : <MoonOutlined />}
                onClick={toggle}
                style={{ color: 'var(--text-muted)', fontSize: 18 }}
              />
            </Tooltip>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1565FF' }} />
                <div style={{ lineHeight: 1.3 }}>
                  <Text style={{ color: 'var(--text)', fontSize: 13, display: 'block' }}>
                    {user?.full_name || user?.username}
                  </Text>
                  <Text style={{ color: 'var(--text-secondary)', fontSize: 11, display: 'block' }}>
                    {user?.role === 'admin' ? 'Administrador' : user?.role === 'technician' ? 'Técnico' : 'Visualizador'}
                  </Text>
                </div>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ margin: 24, overflow: 'auto' }}>
          {children}
        </Content>
        <div style={{
          textAlign: 'center',
          padding: '12px 0',
          borderTop: '1px solid var(--border)',
        }}>
          <Text style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
            SixiD {version ? `v${version}` : ''} — Sistema de Gestao de Ativos e Inventario de TI
          </Text>
        </div>
      </Layout>
    </Layout>
  );
}
