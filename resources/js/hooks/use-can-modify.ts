import { usePage } from '@inertiajs/react';
import type { SharedData } from '@/types';

export function useCanModify(): boolean {
    const { canModify } = usePage<SharedData>().props;
    return canModify;
}
