import { useCallback } from 'react';

export type GetInitialsFn = (fullName: string | undefined | null) => string;

export function useInitials(): GetInitialsFn {
    return useCallback((fullName: string | undefined | null): string => {
        if (!fullName) return '';
        const names = fullName.trim().split(' ');

        if (names.length === 0) return '';
        if (names.length === 1) return names[0].charAt(0).toUpperCase();

        const firstInitial = names[0].charAt(0);
        const lastInitial = names[names.length - 1].charAt(0);

        return `${firstInitial}${lastInitial}`.toUpperCase();
    }, []);
}
