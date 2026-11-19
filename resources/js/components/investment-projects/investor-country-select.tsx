import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    findInvestorCountry,
    INVESTOR_COUNTRIES,
} from '@/lib/investor-countries';
import { cn } from '@/lib/utils';

interface Props {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    required?: boolean;
    disabled?: boolean;
}

const normalizeSearch = (value: string) =>
    value.toLocaleLowerCase('kk').replace(/\s+/g, ' ').trim();

export default function InvestorCountrySelect({
    value,
    onChange,
    error,
    required = false,
    disabled = false,
}: Props) {
    const selectedCountry = findInvestorCountry(value);
    const [query, setQuery] = useState(selectedCountry?.label ?? '');
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setQuery(selectedCountry?.label ?? '');
    }, [selectedCountry?.label]);

    useEffect(() => {
        const closeOnOutsideClick = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
                setQuery(selectedCountry?.label ?? '');
            }
        };

        document.addEventListener('mousedown', closeOnOutsideClick);
        return () =>
            document.removeEventListener('mousedown', closeOnOutsideClick);
    }, [selectedCountry?.label]);

    const filteredCountries = useMemo(() => {
        const normalizedQuery = normalizeSearch(query);
        if (!normalizedQuery) return INVESTOR_COUNTRIES;

        return INVESTOR_COUNTRIES.filter((country) => {
            const searchable = normalizeSearch(
                `${country.label} ${country.code}`,
            );
            return searchable.includes(normalizedQuery);
        });
    }, [query]);

    return (
        <div
            ref={rootRef}
            data-form-field="investor_country_code"
            className="relative flex flex-col gap-2"
        >
            <Label
                htmlFor="investor_country_code"
                className="text-xs font-medium tracking-wide text-gray-500 uppercase"
            >
                Инвестор елі{' '}
                {required && <span className="text-red-500">*</span>}
            </Label>
            <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                    id="investor_country_code"
                    role="combobox"
                    aria-expanded={open}
                    aria-controls="investor-country-options"
                    aria-autocomplete="list"
                    aria-invalid={Boolean(error)}
                    aria-describedby={
                        error ? 'investor-country-error' : undefined
                    }
                    autoComplete="off"
                    disabled={disabled}
                    value={query}
                    onFocus={(event) => {
                        setOpen(true);
                        if (selectedCountry?.label === query) {
                            event.currentTarget.select();
                        }
                    }}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setOpen(true);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Escape') {
                            setOpen(false);
                            setQuery(selectedCountry?.label ?? '');
                        }
                    }}
                    placeholder="Ел атауын немесе кодын жазыңыз"
                    className={cn(
                        'h-10 pr-16 pl-9 shadow-none',
                        error && 'border-red-500',
                    )}
                />
                {value ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={disabled}
                        aria-label="Таңдалған елді тазалау"
                        className="absolute top-1/2 right-1 size-8 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        onClick={() => {
                            onChange('');
                            setQuery('');
                            setOpen(true);
                        }}
                    >
                        <X className="size-4" />
                    </Button>
                ) : (
                    <ChevronsUpDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
                )}
            </div>

            {open && !disabled && (
                <div
                    id="investor-country-options"
                    role="listbox"
                    aria-label="Инвестор елдері"
                    className="absolute top-full right-0 left-0 z-40 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl"
                >
                    {filteredCountries.length > 0 ? (
                        filteredCountries.map((country) => (
                            <button
                                key={country.code}
                                type="button"
                                role="option"
                                aria-selected={country.code === value}
                                className={cn(
                                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100 focus:bg-slate-100 focus:outline-none',
                                    country.code === value &&
                                        'bg-[#c8a44e]/10 text-[#0f1b3d]',
                                )}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                    onChange(country.code);
                                    setQuery(country.label);
                                    setOpen(false);
                                }}
                            >
                                <span className="w-7 shrink-0 text-xs font-semibold text-slate-400">
                                    {country.code}
                                </span>
                                <span className="min-w-0 flex-1 truncate">
                                    {country.label}
                                </span>
                                {country.code === value && (
                                    <Check className="size-4 shrink-0 text-[#a9842f]" />
                                )}
                            </button>
                        ))
                    ) : (
                        <p className="px-3 py-6 text-center text-sm text-slate-500">
                            Сәйкес ел табылмады
                        </p>
                    )}
                </div>
            )}

            <p className="text-xs leading-relaxed text-slate-500">
                Жобаға инвестиция тартылатын негізгі елді таңдаңыз.
            </p>
            <InputError id="investor-country-error" message={error} />
        </div>
    );
}
