import { useEffect, useState } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

const compute = (w: number): Breakpoint => {
  if (w < 768) return 'mobile';
  if (w < 1100) return 'tablet';
  return 'desktop';
};

/** Tracks the viewport breakpoint (mobile < 768 ≤ tablet < 1100 ≤ desktop). */
export const useBreakpoint = () => {
  const [bp, setBp] = useState<Breakpoint>(() =>
    typeof window === 'undefined' ? 'mobile' : compute(window.innerWidth),
  );

  useEffect(() => {
    const on = () => setBp(compute(window.innerWidth));
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  return {
    breakpoint: bp,
    compact: bp === 'mobile',
    isMobile: bp === 'mobile',
    isTablet: bp === 'tablet',
    isDesktop: bp === 'desktop',
  };
};
