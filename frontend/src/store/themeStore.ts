import { create } from 'zustand';

type ThemeMode = 'dark' | 'light';

interface ThemeState {
  mode: ThemeMode;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: (localStorage.getItem('theme') as ThemeMode) || 'dark',
  toggle: () =>
    set((state) => {
      const next = state.mode === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      return { mode: next };
    }),
}));

export const darkTokens = {
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
};

export const lightTokens = {
  colorPrimary: '#1565FF',
  borderRadius: 8,
  colorBgContainer: '#ffffff',
  colorBgElevated: '#f8f9fb',
  colorBgLayout: '#f0f2f5',
  fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  colorLink: '#1565FF',
  colorSuccess: '#00BFA5',
  colorText: '#1a1a2e',
  colorTextSecondary: '#6b7280',
  colorBorder: '#e5e7eb',
  colorBorderSecondary: '#e5e7eb',
};

export const darkComponents = {
  Menu: { darkItemBg: '#0B1220', darkItemSelectedBg: '#1565FF', darkItemHoverBg: 'rgba(21,101,255,0.15)', darkItemColor: '#8896A6', darkItemSelectedColor: '#ffffff' },
  Card: { colorBgContainer: '#111927', colorBorderSecondary: '#1E293B' },
  Table: { colorBgContainer: '#111927', headerBg: '#0F1729', rowHoverBg: 'rgba(21,101,255,0.08)' },
  Button: { primaryShadow: '0 2px 8px rgba(21,101,255,0.35)' },
  Input: { colorBgContainer: '#0F1729', colorBorder: '#1E293B' },
  Select: { colorBgContainer: '#0F1729', colorBorder: '#1E293B' },
  Modal: { contentBg: '#111927', headerBg: '#111927' },
};

export const lightComponents = {
  Menu: { itemBg: '#ffffff', itemSelectedBg: '#e8f0fe', itemHoverBg: '#f0f5ff', itemColor: '#374151', itemSelectedColor: '#1565FF' },
  Card: { colorBgContainer: '#ffffff', colorBorderSecondary: '#e5e7eb' },
  Table: { colorBgContainer: '#ffffff', headerBg: '#f8f9fb', rowHoverBg: 'rgba(21,101,255,0.04)' },
  Button: { primaryShadow: '0 2px 8px rgba(21,101,255,0.2)' },
  Input: { colorBgContainer: '#ffffff', colorBorder: '#d1d5db' },
  Select: { colorBgContainer: '#ffffff', colorBorder: '#d1d5db' },
  Modal: { contentBg: '#ffffff', headerBg: '#ffffff' },
};
