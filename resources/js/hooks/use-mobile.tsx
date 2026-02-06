import { useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 768;

const mql =
    typeof window === 'undefined'
        ? undefined
        : window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

export function useIsMobile(): boolean {
    return useSyncExternalStore(
        (callback) => {
            if (!mql) return () => { };
            mql.addEventListener('change', callback);
            return () => mql.removeEventListener('change', callback);
        },
        () => mql?.matches ?? false,
        () => false
    );
}
