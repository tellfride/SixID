import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import ptBR from 'antd/locale/pt_BR';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={ptBR}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#1565FF',
          borderRadius: 8,
          colorBgContainer: '#111927',
          colorBgElevated: '#162032',
          colorBgLayout: '#0B1220',
          fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          colorLink: '#1565FF',
          colorSuccess: '#00BFA5',
          colorText: '#E6EBF1',
          colorTextSecondary: '#5B6470',
          colorBorder: '#1E293B',
          colorBorderSecondary: '#1E293B',
        },
        components: {
          Menu: {
            darkItemBg: '#0B1220',
            darkItemSelectedBg: '#1565FF',
            darkItemHoverBg: 'rgba(21, 101, 255, 0.15)',
            darkItemColor: '#8896A6',
            darkItemSelectedColor: '#ffffff',
          },
          Card: {
            colorBgContainer: '#111927',
            colorBorderSecondary: '#1E293B',
          },
          Table: {
            colorBgContainer: '#111927',
            headerBg: '#0F1729',
            rowHoverBg: 'rgba(21, 101, 255, 0.08)',
          },
          Button: {
            primaryShadow: '0 2px 8px rgba(21, 101, 255, 0.35)',
          },
          Input: {
            colorBgContainer: '#0F1729',
            colorBorder: '#1E293B',
          },
          Select: {
            colorBgContainer: '#0F1729',
            colorBorder: '#1E293B',
          },
          Modal: {
            contentBg: '#111927',
            headerBg: '#111927',
          },
        },
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>
);
