import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import ptBR from 'antd/locale/pt_BR';
import { useThemeStore, darkTokens, lightTokens, darkComponents, lightComponents } from './store/themeStore';
import App from './App';
import './index.css';

function ThemedApp() {
  const mode = useThemeStore((s) => s.mode);
  const isDark = mode === 'dark';

  return (
    <ConfigProvider
      locale={ptBR}
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: isDark ? darkTokens : lightTokens,
        components: isDark ? darkComponents : lightComponents,
      }}
    >
      <div className={isDark ? 'theme-dark' : 'theme-light'}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </div>
    </ConfigProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemedApp />
  </React.StrictMode>
);
