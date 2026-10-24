import React from 'react';

/**
 * Wraps React.lazy with automatic chunk-retry logic.
 * If a new release was deployed and an old chunk returns 404,
 * this automatically reloads the page once to fetch the new release seamlessly.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T } | any>
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    const sessionKey = 'tbia_lazy_retry_done';
    const hasRetried = sessionStorage.getItem(sessionKey);

    try {
      const component = await componentImport();
      sessionStorage.removeItem(sessionKey);
      return component;
    } catch (error: any) {
      console.warn('[LazyWithRetry] Dynamic chunk import failed:', error);
      const msg = String(error?.message || '').toLowerCase();
      const isChunkError =
        msg.includes('dynamically imported module') ||
        msg.includes('failed to fetch') ||
        msg.includes('loading chunk') ||
        msg.includes('css chunk load failed');

      if (isChunkError && !hasRetried) {
        sessionStorage.setItem(sessionKey, '1');
        window.location.reload();
        return new Promise(() => {}); // Keep React waiting while browser refreshes
      }

      throw error;
    }
  });
}
