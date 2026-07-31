import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Building2,
    CheckCircle2,
    Eye,
    Pencil,
    Plus,
    Search,
    SlidersHorizontal,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import FilterPanel from '@/components/filter-panel';
import Pagination from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableEmpty,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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
    const [filtersOpen, setFiltersOpen] = useState(false);

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

    const clearFilters = () => router.get('/companies');
    const activeFilterCount = [
        search,
        status !== ALL,
        legalForm !== ALL,
        profile !== ALL,
    ].filter(Boolean).length;

    return (
        <AppLayout breadcrumbs={[{ title: 'Компаниялар', href: '/companies' }]}>
            <Head title="Компаниялар" />
            <div className="page-surface flex flex-col gap-5 sm:gap-6">
                <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="mb-2 text-xs font-bold text-gold-dark uppercase">
                            Инвесторлар базасы
                        </p>
                        <h1 className="text-2xl font-extrabold text-navy sm:text-3xl">
                            Компаниялар
                        </h1>
                        <p className="mt-1.5 text-sm text-slate-500">
                            Инвестор компаниялардың бірыңғай анықтамалығы мен
                            заңды реквизиттері.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setFiltersOpen(true)}
                        >
                            <SlidersHorizontal data-icon="inline-start" />
                            Сүзгі
                            {activeFilterCount > 0 && (
                                <span className="flex size-5 items-center justify-center rounded-md bg-navy text-[11px] font-bold text-white">
                                    {activeFilterCount}
                                </span>
                            )}
                        </Button>
                        {canManage && (
                            <Button
                                asChild
                                className="bg-gold text-white hover:bg-gold-dark"
                            >
                                <Link href="/companies/create">
                                    <Plus data-icon="inline-start" />
                                    Компания қосу
                                </Link>
                            </Button>
                        )}
                    </div>
                </header>

                <FilterPanel
                    open={filtersOpen}
                    onToggle={() => setFiltersOpen((open) => !open)}
                    onSubmit={applyFilters}
                    onClear={clearFilters}
                    activeCount={activeFilterCount}
                    showTrigger={false}
                >
                    <div className="flex flex-col gap-2 sm:col-span-2">
                        <Label>Іздеу</Label>
                        <div className="relative">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Атауы, БСН/БИН немесе басшысы"
                                className="pl-9"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label>Статус</Label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger>
                                <SelectValue placeholder="Статус" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>
                                    Барлық статус
                                </SelectItem>
                                {Object.entries(statuses).map(
                                    ([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    ),
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label>Заңды нысаны</Label>
                        <Select value={legalForm} onValueChange={setLegalForm}>
                            <SelectTrigger>
                                <SelectValue placeholder="Заңды нысаны" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>
                                    Барлық нысан
                                </SelectItem>
                                {Object.entries(legalForms).map(
                                    ([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    ),
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label>Карточка</Label>
                        <Select value={profile} onValueChange={setProfile}>
                            <SelectTrigger>
                                <SelectValue placeholder="Карточка" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>
                                    Барлық карточка
                                </SelectItem>
                                <SelectItem value="complete">Толық</SelectItem>
                                <SelectItem value="incomplete">
                                    Толық емес
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </FilterPanel>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Компания</TableHead>
                            <TableHead>БСН/БИН</TableHead>
                            <TableHead>Өңір / Басшы</TableHead>
                            <TableHead>Карточка</TableHead>
                            <TableHead>Жобалар</TableHead>
                            <TableHead>Әрекет</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {companies.data.length === 0 ? (
                            <TableEmpty
                                colSpan={6}
                                icon={Building2}
                                title="Компаниялар табылмады"
                                description="Сүзгіні өзгертіңіз немесе жаңа компания қосыңыз."
                            />
                        ) : (
                            companies.data.map((company) => (
                                <TableRow key={company.id}>
                                    <TableCell>
                                        <Link
                                            href={`/companies/${company.id}`}
                                            className="font-semibold text-navy hover:text-gold-dark"
                                        >
                                            {company.display_name}
                                        </Link>
                                        <p className="mt-1 text-xs text-gray-500">
                                            {company.legal_form_label} ·{' '}
                                            {company.status_label}
                                        </p>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        {company.bin || '—'}
                                    </TableCell>
                                    <TableCell>
                                        <p>
                                            {company.region?.name ||
                                                'Өңір толтырылмаған'}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-500">
                                            {company.director_full_name ||
                                                'Басшы толтырылмаған'}
                                        </p>
                                    </TableCell>
                                    <TableCell>
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
                                    </TableCell>
                                    <TableCell className="font-semibold">
                                        {company.projects_count}
                                    </TableCell>
                                    <TableCell>
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
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                <Pagination paginator={companies} preserveScroll />
            </div>
        </AppLayout>
    );
}
