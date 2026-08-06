import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Eye, RotateCcw, Search, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import Pagination from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import type { PaginatedData } from '@/types';

interface DeletedEntity {
    id: number;
    name: string;
    region?: { id: number; name: string } | null;
    deleter?: { id: number; full_name: string } | null;
    deleted_at: string | null;
    show_url: string;
    restore_url: string;
}

interface Props {
    items: PaginatedData<DeletedEntity>;
    filters: { search?: string };
    config: {
        title: string;
        entityLabel: string;
        indexUrl: string;
        deletedUrl: string;
    };
}

const dateFormatter = new Intl.DateTimeFormat('kk-KZ', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

function formatDeletedAt(value: string | null): string {
    if (!value) return '—';

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

export default function DeletedEntities({ items, filters, config }: Props) {
    const { data, setData, get } = useForm({
        search: filters.search ?? '',
    });

    const submitFilters = (event: FormEvent) => {
        event.preventDefault();
        get(config.deletedUrl, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const restore = (item: DeletedEntity) => {
        if (
            confirm(
                `«${item.name}» нысанын белсенді тізімге қайтаруға сенімдісіз бе?`,
            )
        ) {
            router.post(item.restore_url);
        }
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: config.entityLabel, href: config.indexUrl },
                { title: config.title, href: config.deletedUrl },
            ]}
        >
            <Head title={config.title} />

            <div className="page-surface flex h-full flex-col gap-5 sm:gap-6">
                <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-rose-600 uppercase">
                            <Trash2 className="h-3.5 w-3.5" />
                            Тек супер әкімшіге қолжетімді
                        </p>
                        <h1 className="text-2xl font-extrabold text-navy sm:text-3xl">
                            {config.title}
                        </h1>
                        <p className="mt-1.5 max-w-3xl text-sm text-slate-500">
                            Нысандар физикалық жойылмаған. Олардың барлық
                            деректері, жобалармен байланыстары, құжаттары және
                            галереясы сақталған.
                        </p>
                    </div>
                    <Link href={config.indexUrl}>
                        <Button variant="outline">
                            <ArrowLeft className="h-4 w-4" />
                            Белсенді тізімге оралу
                        </Button>
                    </Link>
                </header>

                <form
                    onSubmit={submitFilters}
                    className="flex max-w-md items-center gap-3"
                >
                    <div className="relative flex-1">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={data.search}
                            onChange={(event) =>
                                setData('search', event.target.value)
                            }
                            placeholder={`${config.entityLabel} атауын іздеу`}
                            className="pl-9"
                        />
                    </div>
                    <Button type="submit">Іздеу</Button>
                </form>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead className="w-16">№</TableHead>
                                <TableHead>Атауы</TableHead>
                                <TableHead>Аймақ</TableHead>
                                <TableHead>Өшірген</TableHead>
                                <TableHead>Өшірілген уақыт</TableHead>
                                <TableHead>Күйі</TableHead>
                                <TableHead className="text-right">
                                    Әрекет
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="py-14 text-center text-slate-500"
                                    >
                                        Өшірілген нысандар жоқ.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                items.data.map((item, index) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="text-slate-500">
                                            {(items.current_page - 1) *
                                                items.per_page +
                                                index +
                                                1}
                                        </TableCell>
                                        <TableCell>
                                            <Link
                                                href={item.show_url}
                                                className="font-semibold text-navy hover:text-gold-dark hover:underline"
                                            >
                                                {item.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-slate-600">
                                            {item.region?.name || '—'}
                                        </TableCell>
                                        <TableCell className="text-slate-700">
                                            {item.deleter?.full_name || '—'}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-slate-600">
                                            {formatDeletedAt(item.deleted_at)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className="border-0 bg-rose-100 text-rose-700 hover:bg-rose-100">
                                                Өшірілген
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    asChild
                                                    title="Нысанды толық ашу"
                                                >
                                                    <Link href={item.show_url}>
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        restore(item)
                                                    }
                                                    className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800"
                                                    title="Қалпына келтіру"
                                                >
                                                    <RotateCcw className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination paginator={items} />
            </div>
        </AppLayout>
    );
}
