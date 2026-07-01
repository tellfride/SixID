import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Typography, Space, Input, Button, Tooltip, Drawer } from 'antd';
import {
  DashboardOutlined, DesktopOutlined, EnvironmentOutlined,
  UserOutlined, AuditOutlined, LogoutOutlined, MenuFoldOutlined,
  MenuUnfoldOutlined, SearchOutlined, DatabaseOutlined, KeyOutlined,
  SunOutlined, MoonOutlined, LaptopOutlined, PrinterOutlined, CloseOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useBreakpoint } from '../../hooks/useBreakpoint';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const NavMenu = ({ isDark, selectedKey, onNavigate }: {
  isDark: boolean; selectedKey: string; onNavigate: (key: string) => void;
}) => {
  const { user } = useAuthStore();
  const items = [
    { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/devices', icon: <DesktopOutlined />, label: 'Ativos' },
    { key: '/inventory', icon: <DatabaseOutlined />, label: 'Inventário' },
    { key: '/hardware', icon: <LaptopOutlined />, label: 'Hardware e SO' },
    { key: '/locations', icon: <EnvironmentOutlined />, label: 'Localizações' },
    { key: '/printers', icon: <PrinterOutlined />, label: 'Impressoras' },
    ...(user?.role === 'admin' ? [
      { key: '/user-mgmt', icon: <KeyOutlined />, label: 'Senhas Remotas' },
      { key: '/users', icon: <UserOutlined />, label: 'Usuários' },
      { key: '/audit', icon: <AuditOutlined />, label: 'Auditoria' },
    ] : []),
  ];
  return (
    <Menu
      theme={isDark ? 'dark' : 'light'}
      mode="inline"
      selectedKeys={[selectedKey]}
      items={items}
      onClick={({ key }) => onNavigate(key)}
      style={{ background: 'transparent', borderRight: 0, marginTop: 8 }}
    />
  );
};

const SixiDLogo = ({ collapsed, isDark }: { collapsed: boolean; isDark: boolean }) => (
  <div style={{
    height: 64,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottom: '1px solid var(--border)',
    padding: '0 12px',
  }}>
    {collapsed ? (
      <img src="/favicon.png" alt="SixID" style={{ width: 28, height: 28 }} />
    ) : (
      <img src={isDark ? '/temaescuro.png' : '/logo.png'} alt="SixID" style={{ height: 36, objectFit: 'contain' }} />
    )}
  </div>
);

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [version, setVersion] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { mode, toggle } = useThemeStore();
  const isDark = mode === 'dark';
  const { isMobile, isTablet } = useBreakpoint();

  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(d => setVersion(d.version || '')).catch(() => {});
  }, []);

  // Fechar drawer ao navegar
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sair',
      onClick: () => { logout(); navigate('/login'); },
    },
  ];

  const handleNav = (key: string) => {
    navigate(key);
    setDrawerOpen(false);
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const val = (e.target as HTMLInputElement).value.trim();
    if (!val) return;
    if (location.pathname.startsWith('/printers')) {
      navigate(`/printers?search=${encodeURIComponent(val)}`);
    } else {
      navigate(`/devices?search=${encodeURIComponent(val)}`);
    }
    setSearchVisible(false);
  };

  const headerPadding = isMobile ? '0 12px' : '0 24px';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* ── Sider (desktop/tablet) ── */}
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          trigger={null}
          width={240}
          collapsedWidth={isTablet ? 0 : 80}
          style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)' }}
        >
          <SixiDLogo collapsed={collapsed} isDark={isDark} />
          <NavMenu isDark={isDark} selectedKey={location.pathname} onNavigate={handleNav} />
        </Sider>
      )}

      {/* ── Drawer (mobile) ── */}
      {isMobile && (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          placement="left"
          width={240}
          styles={{
            body: { padding: 0, background: 'var(--sidebar-bg)' },
            header: { display: 'none' },
          }}
          closeIcon={null}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0 12px', height: 64, borderBottom: '1px solid var(--border)' }}>
            <img src={isDark ? '/temaescuro.png' : '/logo.png'} alt="SixID" style={{ height: 32, objectFit: 'contain' }} />
            <Button type="text" icon={<CloseOutlined />} onClick={() => setDrawerOpen(false)}
              style={{ color: 'var(--text-muted)' }} />
          </div>
          <NavMenu isDark={isDark} selectedKey={location.pathname} onNavigate={handleNav} />
          <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border)', position: 'absolute', bottom: 0, width: '100%' }}>
            <Text style={{ color: 'var(--text-secondary)', fontSize: 10 }}>
              SixID {version ? `v${version}` : ''}
            </Text>
          </div>
        </Drawer>
      )}

      <Layout>
        <Header style={{
          background: 'var(--header-bg)',
          padding: headerPadding,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
          height: 64,
          gap: 8,
        }}>
          {/* Esquerda: toggle + busca */}
          <Space style={{ flex: 1, minWidth: 0 }}>
            <div
              onClick={() => isMobile ? setDrawerOpen(true) : setCollapsed(!collapsed)}
              style={{ cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)', flexShrink: 0 }}
            >
              {(isMobile || collapsed) ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </div>

            {/* Busca desktop */}
            {!isMobile && (
              <Input
                placeholder={location.pathname.startsWith('/printers') ? 'Buscar impressora...' : 'Buscar ativo...'}
                prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
                style={{ width: isTablet ? 200 : 280, borderRadius: 8 }}
                onPressEnter={handleSearch}
              />
            )}

            {/* Busca mobile expandida */}
            {isMobile && searchVisible && (
              <Input
                autoFocus
                placeholder={location.pathname.startsWith('/printers') ? 'Buscar impressora...' : 'Buscar ativo...'}
                prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
                style={{ borderRadius: 8, flex: 1 }}
                onPressEnter={handleSearch}
                onBlur={() => setSearchVisible(false)}
              />
            )}
          </Space>

          {/* Direita: ações */}
          <Space size={isMobile ? 4 : 'middle'} style={{ flexShrink: 0 }}>
            {isMobile && !searchVisible && (
              <Button type="text" icon={<SearchOutlined />}
                onClick={() => setSearchVisible(true)}
                style={{ color: 'var(--text-muted)', fontSize: 16 }} />
            )}
            <Tooltip title={isDark ? 'Tema Claro' : 'Tema Escuro'}>
              <Button
                type="text"
                icon={isDark ? <SunOutlined /> : <MoonOutlined />}
                onClick={toggle}
                style={{ color: 'var(--text-muted)', fontSize: isMobile ? 16 : 18 }}
              />
            </Tooltip>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer', gap: isMobile ? 4 : 8 }}>
                <Avatar icon={<UserOutlined />} size={isMobile ? 28 : 32} style={{ backgroundColor: '#1565FF' }} />
                {!isMobile && (
                  <div style={{ lineHeight: 1.3 }}>
                    <Text style={{ color: 'var(--text)', fontSize: 13, display: 'block' }}>
                      {user?.full_name || user?.username}
                    </Text>
                    <Text style={{ color: 'var(--text-secondary)', fontSize: 11, display: 'block' }}>
                      {user?.role === 'admin' ? 'Administrador' : user?.role === 'technician' ? 'Técnico' : 'Visualizador'}
                    </Text>
                  </div>
                )}
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ margin: isMobile ? 12 : 24, overflow: 'auto' }}>
          {children}
        </Content>

        {!isMobile && (
          <div style={{ textAlign: 'center', padding: '12px 0', borderTop: '1px solid var(--border)' }}>
            <Text style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
              SixID {version ? `v${version}` : ''} — Sistema de Gestão de Ativos e Inventário de TI
            </Text>
          </div>
        )}
      </Layout>
    </Layout>
  );
}
