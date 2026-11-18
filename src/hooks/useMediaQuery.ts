import { useSyncExternalStore } from 'react';
import breakpoints from '../styles/breakpoints.scss?raw';

/** Порог мобильной раскладки в px — читается из src/styles/breakpoints.scss, как и в стилях. */
export const MOBILE_MAX_WIDTH = Number(/\$mobile-max:\s*(\d+)px/.exec(breakpoints)?.[1] ?? 768);
export const MOBILE_QUERY = `(max-width: ${MOBILE_MAX_WIDTH}px)`;

/** Tracks a CSS media query; false where matchMedia is unavailable (e.g. tests). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false),
    () => false,
  );
}

/** Мобильная раскладка включена (≤ порога). */
export function useIsMobile() {
  return useMediaQuery(MOBILE_QUERY);
}
