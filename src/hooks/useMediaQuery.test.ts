import { describe, expect, it } from 'vitest';
import { MOBILE_MAX_WIDTH, MOBILE_QUERY } from './useMediaQuery';

describe('mobile breakpoint', () => {
  it('is read from src/styles/breakpoints.scss: mobile layout up to 768 px inclusive', () => {
    expect(MOBILE_MAX_WIDTH).toBe(768);
    expect(MOBILE_QUERY).toBe('(max-width: 768px)');
  });
});
