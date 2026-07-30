import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Building2,
    CheckCircle2,
    Eye,
    Pencil,
    Plus,
    Search,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import Pagination from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import type { PaginatedData } from '@/types';

interface Company {
    id: number;
    name: string;
    display_name: string;
    legal_form_label: string;
    bin: string | null;
    director_full_name: string | null;
    status: string;
    status_label: string;
    is_profile_complete: boolean;
    projects_count: number;
    region?: { id: number; name: string } | null;
}

interface Props {
    companies: PaginatedData<Company>;
    filters: {
        search: string;
        status: string;
        legal_form: string;
        profile: string;
    };
    legalForms: Record<string, string>;
    statuses: Record<string, string>;
    canManage: boolean;
}

const ALL = 'all';

export default function Index({
    companies,
    filters,
    legalForms,
    statuses,
    canManage,
}: Props) {
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status || ALL);
    const [legalForm, setLegalForm] = useState(filters.legal_form || ALL);
    const [profile, setProfile] = useState(filters.profile || ALL);

    const applyFilters = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.get(
            '/companies',
            {
                search: search || undefined,
                status: status === ALL ? undefined : status,
                legal_form: legalForm === ALL ? undefined : legalForm,
                profile: profile === ALL ? undefined : profile,
            },
            { preserveState: true, replace: true },
        );
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Компаниялар', href: '/companies' }]}>
            <Head title="Компаниялар" />
            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold text-[#0f1b3d]">
                            <Building2 className="h-6 w-6 text-[#b18b35]" />
                            Компаниялар
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Инвестор компаниялардың бірыңғай анықтамалығы мен
                            заңды реквизиттері.
                        </p>
                    </div>
                    {canManage && (
                        <Button
                            asChild
                            className="bg-[#c8a44e] text-white hover:bg-[#b8943e]"
                        >
                            <Link href="/companies/create">
                                <Plus className="mr-2 h-4 w-4" />
                                Компания қосу
                            </Link>
                        </Button>
                    )}
                </div>

                <form
                    onSubmit={applyFilters}
                    className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 lg:grid-cols-[minmax(220px,1fr)_180px_190px_180px_auto]"
                >
                    <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Атауы, БСН/БИН немесе басшысы"
                            className="pl-9"
                        />
                    </div>
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger>
                            <SelectValue placeholder="Статус" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>Барлық статус</SelectItem>
                            {Object.entries(statuses).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={legalForm} onValueChange={setLegalForm}>
                        <SelectTrigger>
                            <SelectValue placeholder="Заңды нысаны" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>Барлық нысан</SelectItem>
                            {Object.entries(legalForms).map(
                                ([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ),
                            )}
                        </SelectContent>
                    </Select>
                    <Select value={profile} onValueChange={setProfile}>
                        <SelectTrigger>
                            <SelectValue placeholder="Карточка" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>Барлық карточка</SelectItem>
                            <SelectItem value="complete">Толық</SelectItem>
                            <SelectItem value="incomplete">
                                Толық емес
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    <Button type="submit" variant="outline">
                        Сүзгіні қолдану
                    </Button>
                </form>

                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                <tr>
                                    <th className="px-5 py-3">Компания</th>
                                    <th className="px-5 py-3">БСН/БИН</th>
                                    <th className="px-5 py-3">Өңір / Басшы</th>
                                    <th className="px-5 py-3">Карточка</th>
                                    <th className="px-5 py-3">Жобалар</th>
                                    <th className="px-5 py-3">Әрекет</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {companies.data.map((company) => (
                                    <tr
                                        key={company.id}
                                        className="hover:bg-gray-50/70"
                                    >
                                        <td className="px-5 py-4">
                                            <Link
                                                href={`/companies/${company.id}`}
                                                className="font-semibold text-[#0f1b3d] hover:text-[#a9842f]"
                                            >
                                                {company.display_name}
                                            </Link>
                                            <p className="mt-1 text-xs text-gray-500">
                                                {company.legal_form_label} ·{' '}
                                                {company.status_label}
                                            </p>
                                        </td>
                                        <td className="px-5 py-4 font-mono text-xs">
                                            {company.bin || '—'}
                                        </td>
                                        <td className="px-5 py-4">
                                            <p>
                                                {company.region?.name ||
                                                    'Өңір толтырылмаған'}
                                            </p>
                                            <p className="mt-1 text-xs text-gray-500">
                                                {company.director_full_name ||
                                                    'Басшы толтырылмаған'}
                                            </p>
                                        </td>
                                        <td className="px-5 py-4">
                                            {company.is_profile_complete ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    Толық
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                                                    <AlertTriangle className="h-3.5 w-3.5" />
                                                    Толық емес
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 font-semibold">
                                            {company.projects_count}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    asChild
                                                    size="icon"
                                                    variant="ghost"
                                                    aria-label="Компанияны көру"
                                                >
                                                    <Link
                                                        href={`/companies/${company.id}`}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                {canManage && (
                                                    <Button
                                                        asChild
                                                        size="icon"
                                                        variant="ghost"
                                                        aria-label="Компанияны өңдеу"
                                                    >
                                                        <Link
                                                            href={`/companies/${company.id}/edit`}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {companies.data.length === 0 && (
                        <div className="px-6 py-16 text-center">
                            <Building2 className="mx-auto h-10 w-10 text-gray-300" />
                            <p className="mt-3 font-medium text-gray-700">
                                Компаниялар табылмады
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                                Сүзгіні өзгертіңіз немесе жаңа компания қосыңыз.
                            </p>
                        </div>
                    )}
                </div>
                <Pagination paginator={companies} preserveScroll />
            </div>
        </AppLayout>
    );
}
