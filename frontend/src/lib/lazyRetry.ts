import { lazy as reactLazy, type ComponentType } from "react";

/**
 * A wrapper around React.lazy that retries the dynamic import precisely 
 * to handle intermittent network failures or deployment chunk deletions.
 */
export function lazyRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  retriesLeft = 2,
  interval = 1000
): Promise<{ default: T }> {
  return new Promise((resolve, reject) => {
    componentImport()
      .then(resolve)
      .catch((error) => {
        setTimeout(() => {
          if (retriesLeft <= 0) {
            reject(error);
            return;
          }
          lazyRetry(componentImport, retriesLeft - 1, interval).then(resolve, reject);
        }, interval);
      });
  });
}

export const lazy = <T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) => reactLazy(() => lazyRetry(componentImport));
