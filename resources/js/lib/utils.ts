import type { InertiaLinkProps } from '@inertiajs/react';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function toUrl(url: NonNullable<InertiaLinkProps['href']>): string {
    return typeof url === 'string' ? url : url.url;
}

type FormatMoneyCompactOptions = {
    locale?: string;
    includeCurrency?: boolean;
    compactFractionDigits?: number;
};

export function formatMoneyCompact(
    amount: number,
    options: FormatMoneyCompactOptions = {},
): string {
    const {
        locale = 'kk-KZ',
        includeCurrency = true,
        compactFractionDigits = 1,
    } = options;
    const absoluteAmount = Math.abs(amount);
    const currencySuffix = includeCurrency ? ' ₸' : '';

    if (absoluteAmount >= 1_000_000_000_000) {
        return (
            new Intl.NumberFormat(locale, {
                maximumFractionDigits: compactFractionDigits,
            }).format(amount / 1_000_000_000_000) +
            ` трлн${currencySuffix}`
        );
    }

    if (absoluteAmount >= 1_000_000_000) {
        return (
            new Intl.NumberFormat(locale, {
                maximumFractionDigits: compactFractionDigits,
            }).format(amount / 1_000_000_000) +
            ` млрд${currencySuffix}`
        );
    }

    if (absoluteAmount >= 1_000_000) {
        return (
            new Intl.NumberFormat(locale, {
                maximumFractionDigits: compactFractionDigits,
            }).format(amount / 1_000_000) +
            ` млн${currencySuffix}`
        );
    }

    return (
        new Intl.NumberFormat(locale, {
            maximumFractionDigits: 0,
        }).format(amount) + currencySuffix
    );
}
