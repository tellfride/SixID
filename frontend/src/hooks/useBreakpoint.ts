import { Grid } from 'antd';

export function useBreakpoint() {
  const screens = Grid.useBreakpoint();
  return {
    isMobile: !screens.sm,           // < 576px
    isTablet: !screens.lg && !!screens.sm, // 576–992px
    isDesktop: !!screens.lg,         // ≥ 992px
    screens,
  };
}
