import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Typography, Space, Input } from 'antd';
import {
  DashboardOutlined, DesktopOutlined, EnvironmentOutlined,
  UserOutlined, AuditOutlined, LogoutOutlined, MenuFoldOutlined,
  MenuUnfoldOutlined, SearchOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const SixiDLogo = ({ collapsed }: { collapsed: boolean }) => (
  <div style={{
    height: 64,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderBottom: '1px solid #1E293B',
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
        color: '#ffffff',
        letterSpacing: '-0.5px',
      }}>
        Sixi<span style={{ color: '#1565FF' }}>D</span>
      </span>
    )}
  </div>
);

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/devices', icon: <DesktopOutlined />, label: 'Ativos' },
    { key: '/locations', icon: <EnvironmentOutlined />, label: 'Localizações' },
    ...(user?.role === 'admin' ? [
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
          background: '#0B1220',
          borderRight: '1px solid #1E293B',
        }}
      >
        <SixiDLogo collapsed={collapsed} />
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ background: 'transparent', borderRight: 0, marginTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: '#0B1220',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #1E293B',
          height: 64,
        }}>
          <Space>
            <div
              onClick={() => setCollapsed(!collapsed)}
              style={{ cursor: 'pointer', fontSize: 18, color: '#8896A6' }}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </div>
            <Input
              placeholder="Buscar ativo..."
              prefix={<SearchOutlined style={{ color: '#5B6470' }} />}
              style={{
                width: 280,
                background: '#111927',
                borderColor: '#1E293B',
                borderRadius: 8,
              }}
            />
          </Space>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar
                icon={<UserOutlined />}
                style={{ backgroundColor: '#1565FF' }}
              />
              <div style={{ lineHeight: 1.3 }}>
                <Text style={{ color: '#E6EBF1', fontSize: 13, display: 'block' }}>
                  {user?.full_name || user?.username}
                </Text>
                <Text style={{ color: '#5B6470', fontSize: 11, display: 'block' }}>
                  {user?.role === 'admin' ? 'Administrador' : user?.role === 'technician' ? 'Técnico' : 'Visualizador'}
                </Text>
              </div>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{
          margin: 24,
          overflow: 'auto',
          background: '#0B1220',
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
