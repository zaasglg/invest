import { Link, usePage } from '@inertiajs/react';
import { Building2, Plus, Search, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { getRoleKey } from '@/config/navigation';
import * as companiesRoutes from '@/routes/companies';
import type { SharedData } from '@/types';

export interface CompanyOption {
    id: number;
    name: string;
    display_name: string;
    bin: string | null;
    legal_form_label: string;
    status: string;
    status_label: string;
    is_profile_complete: boolean;
    is_project_selectable?: boolean;
}

interface Props {
    companies: CompanyOption[];
    value: string;
    onValueChange: (value: string) => void;
    error?: string;
    required?: boolean;
}

export default function CompanySelect({
    companies,
    value,
    onValueChange,
    error,
    required = true,
}: Props) {
    const { auth } = usePage<SharedData>().props;
    const roleKey = getRoleKey(auth.user);
    const canCreateCompany =
        auth.user?.role_model?.name === 'superadmin' ||
        auth.user?.role === 'superadmin' ||
        roleKey === 'moderator' ||
        (roleKey === 'invest' &&
            auth.user?.invest_sub_role === 'turkistan_invest');
    const [search, setSearch] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);
    const selectedCompany = companies.find(
        (company) => company.id.toString() === value,
    );
    const filteredCompanies = useMemo(() => {
        const query = search.trim().toLocaleLowerCase('kk-KZ');

        if (!query) {
            return companies;
        }

        const binQuery = /^[\d\s-]+$/.test(query)
            ? query.replace(/[\s-]/g, '')
            : null;

        return companies.filter(
            (company) =>
                [company.display_name, company.name, company.bin || ''].some(
                    (field) => field.toLocaleLowerCase('kk-KZ').includes(query),
                ) ||
                (binQuery !== null &&
                    binQuery.length > 0 &&
                    (company.bin || '')
                        .replace(/[\s-]/g, '')
                        .includes(binQuery)),
        );
    }, [companies, search]);

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
                <Label
                    htmlFor="company_id"
                    className="text-xs font-medium tracking-wide text-gray-500 uppercase"
                >
                    Компания{' '}
                    {required ? (
                        <span className="text-red-500">*</span>
                    ) : (
                        <span className="font-normal text-gray-400 normal-case">
                            (міндетті емес)
                        </span>
                    )}
                </Label>
                {canCreateCompany && (
                    <Link
                        href={companiesRoutes.create.url()}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#a9842f] hover:underline"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Жаңа компания
                    </Link>
                )}
            </div>

            <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                    ref={searchRef}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    aria-label="Компанияны атауы немесе БСН бойынша іздеу"
                    placeholder="Атауы немесе БСН/БИН бойынша іздеу"
                    autoComplete="off"
                    className="h-10 pr-10 pl-9"
                />
                {search && (
                    <button
                        type="button"
                        aria-label="Компания іздеуін тазалау"
                        onClick={() => {
                            setSearch('');
                            searchRef.current?.focus();
                        }}
                        className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-[#c8a44e] focus-visible:outline-none"
                    >
                        <X className="size-4" />
                    </button>
                )}
            </div>

            <Select
                value={value}
                onValueChange={(selected) => {
                    onValueChange(selected === '__unknown__' ? '' : selected);
                    setSearch('');
                }}
            >
                <SelectTrigger
                    id="company_id"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'company-error' : undefined}
                    className={error ? 'border-red-500' : ''}
                >
                    <SelectValue
                        placeholder={
                            required
                                ? 'Компанияны таңдаңыз'
                                : 'Компания белгілі болса, таңдаңыз'
                        }
                    >
                        {selectedCompany
                            ? `${selectedCompany.display_name}${selectedCompany.bin ? ` · ${selectedCompany.bin}` : ''}`
                            : undefined}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {!required && (
                        <SelectItem value="__unknown__">
                            Әзірге белгісіз
                        </SelectItem>
                    )}
                    {filteredCompanies.map((company) => (
                        <SelectItem
                            key={company.id}
                            value={company.id.toString()}
                        >
                            {company.display_name}
                            {company.bin ? ` · ${company.bin}` : ''}
                            {company.is_project_selectable === false
                                ? ' · Ақпараты жеткіліксіз'
                                : ''}
                        </SelectItem>
                    ))}
                    {filteredCompanies.length === 0 && (
                        <p className="px-3 py-2 text-sm text-gray-500">
                            Сәйкес компания табылмады
                        </p>
                    )}
                </SelectContent>
            </Select>

            {selectedCompany && (
                <div className="flex items-start gap-3 rounded-lg border border-[#e7d8ad] bg-[#fffaf0] p-3">
                    <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[#a9842f]" />
                    <div className="min-w-0 text-xs">
                        <p className="font-semibold text-[#0f1b3d]">
                            {selectedCompany.display_name}
                        </p>
                        <p className="mt-0.5 text-gray-500">
                            БСН/БИН: {selectedCompany.bin || 'толтырылмаған'} ·{' '}
                            {selectedCompany.legal_form_label}
                        </p>
                        {selectedCompany.is_project_selectable === false && (
                            <p className="mt-1 font-medium text-amber-700">
                                Компания ақпараты жеткіліксіз. Әкімшіге
                                хабарласыңыз. Компанияны ауыстырмай жобаның
                                басқа деректерін өзгерте аласыз.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {search.trim() && (
                <p role="status" className="text-xs text-gray-500">
                    {filteredCompanies.length > 0
                        ? `Табылған компаниялар: ${filteredCompanies.length}. Тізімнен таңдаңыз.`
                        : 'Сәйкес компания табылмады. Атауын немесе БСН нөмірін тексеріңіз.'}
                </p>
            )}
            {!search.trim() && companies.length === 0 && (
                <p className="text-xs text-amber-700">
                    Таңдауға қолжетімді компания жоқ.
                    {canCreateCompany && ' Алдымен жаңа компания қосыңыз.'}
                </p>
            )}
            {error && (
                <span id="company-error" className="text-sm text-red-500">
                    {error}
                </span>
            )}
        </div>
    );
}
