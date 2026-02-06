import { useCallback } from 'react';

export type ResolvedAppearance = 'light';
export type Appearance = ResolvedAppearance;

export type UseAppearanceReturn = {
    readonly appearance: Appearance;
    readonly resolvedAppearance: ResolvedAppearance;
    readonly updateAppearance: (mode: Appearance) => void;
};

export function initializeTheme(): void {
    if (typeof window === 'undefined') return;
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
}

export function useAppearance(): UseAppearanceReturn {
    const updateAppearance = useCallback(() => {
        // No-op or just ensure light mode
        if (typeof document !== 'undefined') {
            document.documentElement.classList.remove('dark');
            document.documentElement.style.colorScheme = 'light';
        }
    }, []);

    return {
        appearance: 'light',
        resolvedAppearance: 'light',
        updateAppearance
    } as const;
}
