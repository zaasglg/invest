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
    maxFractionDigits?: number;
};

/**
 * Артық нөлдерді алып тастайды: "1,250" -> "1,25", "1,300" -> "1,3"
 */
function trimTrailingZeros(formatted: string, locale: string): string {
    const decimalSeparator = locale.startsWith('kk') ? ',' : '.';
    if (!formatted.includes(decimalSeparator)) return formatted;

    const [intPart, decPart] = formatted.split(decimalSeparator);
    const trimmed = decPart.replace(/0+$/, '');
    return trimmed ? `${intPart}${decimalSeparator}${trimmed}` : intPart;
}

export function formatMoneyCompact(
    amount: number,
    options: FormatMoneyCompactOptions = {},
): string {
    const {
        locale = 'kk-KZ',
        includeCurrency = true,
        maxFractionDigits = 3,
    } = options;
    const absoluteAmount = Math.abs(amount);
    const currencySuffix = includeCurrency ? ' ₸' : '';

    const formatWithTrim = (value: number): string => {
        const formatted = new Intl.NumberFormat(locale, {
            minimumFractionDigits: 0,
            maximumFractionDigits: maxFractionDigits,
        }).format(value);
        return trimTrailingZeros(formatted, locale);
    };

    if (absoluteAmount >= 1_000_000_000_000) {
        return formatWithTrim(amount / 1_000_000_000_000) + ` трлн${currencySuffix}`;
    }

    if (absoluteAmount >= 1_000_000_000) {
        return formatWithTrim(amount / 1_000_000_000) + ` млрд${currencySuffix}`;
    }

    if (absoluteAmount >= 1_000_000) {
        return formatWithTrim(amount / 1_000_000) + ` млн${currencySuffix}`;
    }

    return (
        new Intl.NumberFormat(locale, {
            maximumFractionDigits: 0,
        }).format(amount) + currencySuffix
    );
}
