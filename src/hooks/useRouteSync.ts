import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { MenuItem } from '../navigation';
import { pathToState, stateToPath } from '../routes';
import { useAppDispatch } from '../store/hooks';
import { openRun } from '../store/slices/runsSlice';
import { setActiveSection } from '../store/slices/uiSlice';

type Params = {
  enabled: boolean;
  /** The section that is actually on screen. */
  sectionId: MenuItem['id'];
  openRunId: string | null;
  allowedSections: MenuItem['id'][];
  runIds: string[];
};

/**
 * Keeps the address bar and the store (active section + open run) in step.
 * The address wins when it changes (link, reload, Back/Forward); the store wins when
 * the app itself changes screen, which then pushes a new address.
 */
export function useRouteSync({ enabled, sectionId, openRunId, allowedSections, runIds }: Params) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const previous = useRef<{ pathname: string; stateKey: string } | null>(null);
  const runId = sectionId === 'board' ? openRunId : null;
  const stateKey = `${sectionId}|${runId ?? ''}`;

  useEffect(() => {
    if (!enabled) {
      // Signing out drops the page from the address; a link opened before signing in stays.
      if (previous.current !== null) navigate('/', { replace: true });
      previous.current = null;
      return;
    }
    const last = previous.current;
    previous.current = { pathname, stateKey };
    const stateChangedOnly = last !== null && last.pathname === pathname && last.stateKey !== stateKey;
    const statePath = stateToPath({ sectionId, runId });

    if (stateChangedOnly) {
      if (statePath !== pathname) navigate(statePath);
      return;
    }

    // The address changed (or this is the first look at it): it decides the screen.
    const target = pathToState(pathname);
    const isValid =
      target !== null &&
      allowedSections.includes(target.sectionId) &&
      (target.runId === null || runIds.includes(target.runId));
    if (!isValid) {
      // A known section with an unknown run stays on that section's list.
      const fallback =
        target !== null && allowedSections.includes(target.sectionId)
          ? stateToPath({ sectionId: target.sectionId, runId: null })
          : statePath;
      if (fallback !== pathname) navigate(fallback, { replace: true });
      return;
    }
    if (target.sectionId !== sectionId) dispatch(setActiveSection(target.sectionId));
    if (target.sectionId === 'board' && target.runId !== openRunId) dispatch(openRun(target.runId));
  }, [pathname, stateKey, enabled, sectionId, runId, openRunId, allowedSections, runIds, dispatch, navigate]);
}
