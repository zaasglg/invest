import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Archive, ChevronDown, Eye, GripVertical, Pencil, Plus, Trash2, MoveRight } from 'lucide-react';
import { useMemo, useState, useEffect, type FormEvent } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Pagination from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useCanModify } from '@/hooks/use-can-modify';
import AppLayout from '@/layouts/app-layout';
import { formatMoneyCompact } from '@/lib/utils';
import * as investmentProjectsRoutes from '@/routes/investment-projects';

import type { PaginatedData, SharedData } from '@/types';

interface Region {
    id: number;
    name: string;
}

interface ProjectType {
    id: number;
    name: string;
}

interface User {
    id: number;
    full_name: string;
    region_id?: number | null;
    baskarma_type?: string | null;
    position?: string | null;
}

interface Sez {
    id: number;
    name: string;
    region_id: number;
}

interface IndustrialZone {
    id: number;
    name: string;
    region_id: number;
}

interface SubsoilUser {
    id: number;
    name: string;
    region_id: number;
}

interface InvestmentProject {
    id: number;
    name: string;
    company_name: string | null;
    region: Region | null;
    project_type: ProjectType | null;
    sector: string;
    total_investment: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
    creator: User;
    executors: User[];
    sezs?: Sez[];
    industrial_zones?: IndustrialZone[];
    subsoil_users?: SubsoilUser[];
}

interface Filters {
    search: string;
    region_id: string;
    project_type_id: string;
    status: string;
    executor_id: string;
    sector_type: string;
    sector_id: string;
    min_investment: string;
    max_investment: string;
    start_date_from: string;
    start_date_to: string;
    end_date_from: string;
    end_date_to: string;
}

interface Stats {
    total_projects: number;
    total_investment: number;
    status_counts: {
        launched: number;
        implementation: number;
        suspended: number;
        plan: number;
    };
}

interface Props {
    projects: PaginatedData<InvestmentProject>;
    stats: Stats;
    regions: Region[];
    projectTypes: ProjectType[];
    users: User[];
    sezs: Sez[];
    industrialZones: IndustrialZone[];
    subsoilUsers: SubsoilUser[];
    filters: Partial<Filters>;
}

function SortableProjectRow({
    id,
    children,
    isEnabled,
}: {
    id: number;
    children: React.ReactNode;
    isEnabled: boolean;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    if (!isEnabled) {
        return <TableRow>{children}</TableRow>;
    }
    
    return (
        <TableRow
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.4 : 1,
                position: isDragging ? 'relative' : undefined,
                zIndex: isDragging ? 10 : undefined,
            }}
            className="hover:bg-gray-50 transition-colors"
        >
            <TableCell className="w-6 py-3 pl-3 pr-0">
                <div {...attributes} {...listeners} className="cursor-grab hover:bg-gray-100 p-1 rounded">
                    <GripVertical className="h-4 w-4 text-gray-400" />
                </div>
            </TableCell>
            {children}
        </TableRow>
    );
}

export default function Index({ projects, stats, regions, projectTypes, users, sezs, industrialZones, subsoilUsers, filters }: Props) {
    const canModify = useCanModify();
    const { auth } = usePage<SharedData>().props;
    const isSuperAdmin = auth.user?.role_model?.name === 'superadmin';
    const isInvest = auth.user?.role_model?.name === 'invest';
    const { data, setData, get } = useForm<Filters>({
        search: filters.search ?? '',
        region_id: filters.region_id ?? '',
        project_type_id: filters.project_type_id ?? '',
        status: filters.status ?? '',
        executor_id: filters.executor_id ?? '',
        sector_type: filters.sector_type ?? '',
        sector_id: filters.sector_id ?? '',
        min_investment: filters.min_investment ?? '',
        max_investment: filters.max_investment ?? '',
        start_date_from: filters.start_date_from ?? '',
        start_date_to: filters.start_date_to ?? '',
        end_date_from: filters.end_date_from ?? '',
        end_date_to: filters.end_date_to ?? '',
    });
    const [filtersOpen, setFiltersOpen] = useState(
        !!(filters.search || filters.region_id || filters.project_type_id || filters.status || filters.executor_id || filters.sector_type || filters.sector_id || filters.min_investment || filters.max_investment || filters.start_date_from || filters.start_date_to || filters.end_date_from || filters.end_date_to),
    );

    const [orderedProjects, setOrderedProjects] = useState<InvestmentProject[]>(projects.data);

    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [projectToMove, setProjectToMove] = useState<InvestmentProject | null>(null);
    const [targetPage, setTargetPage] = useState<number>(1);

    const openMoveModal = (project: InvestmentProject) => {
        setProjectToMove(project);
        setTargetPage(1);
        setIsMoveModalOpen(true);
    };

    const handleMoveSubmit = () => {
        if (!projectToMove) return;

        router.post(`/investment-projects/${projectToMove.id}/move-to-page`, {
            target_page: targetPage
        }, {
            onSuccess: () => setIsMoveModalOpen(false)
        });
    };

    useEffect(() => {
        setOrderedProjects(projects.data);
    }, [projects.data]);

    const { url } = usePage();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const saveProjectOrder = (newOrder: InvestmentProject[]) => {
        const csrfTokenValue = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            
        fetch('/investment-projects/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfTokenValue },
            body: JSON.stringify({ 
                project_ids: newOrder.map((p) => p.id),
                page: projects.current_page || 1
            }),
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        if (!isSuperAdmin && !isInvest) return;
        
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        
        const oldIndex = orderedProjects.findIndex((p) => p.id === active.id);
        const newIndex = orderedProjects.findIndex((p) => p.id === over.id);
        
        const newOrder = arrayMove(orderedProjects, oldIndex, newIndex);
        setOrderedProjects(newOrder);
        saveProjectOrder(newOrder);
    };

    const handleDelete = (id: number) => {
        if (confirm('Бұл жобаны жойғыңыз келетініне сенімдісіз бе?')) {
            router.delete(investmentProjectsRoutes.destroy.url(id));
        }
    };

    const sectorOptions = useMemo(() => {
        const regionId = data.region_id ? Number(data.region_id) : null;
        if (data.sector_type === 'sez') {
            const filtered = regionId ? sezs.filter(s => s.region_id === regionId) : sezs;
            return filtered.map(sez => ({ value: String(sez.id), label: sez.name }));
        }
        if (data.sector_type === 'industrial_zone') {
            const filtered = regionId ? industrialZones.filter(iz => iz.region_id === regionId) : industrialZones;
            return filtered.map(iz => ({ value: String(iz.id), label: iz.name }));
        }
        if (data.sector_type === 'subsoil') {
            const filtered = regionId ? subsoilUsers.filter(su => su.region_id === regionId) : subsoilUsers;
            return filtered.map(su => ({ value: String(su.id), label: su.name }));
        }
        return [];
    }, [data.sector_type, data.region_id, sezs, industrialZones, subsoilUsers]);

    // Егер аймақ не сектор түрі өзгерсе, сектор мәнін тазалау
    const filteredUsers = useMemo(() => {
        if (!data.region_id) {
            return users.filter(user => user.baskarma_type === 'oblast');
        }
        return users.filter(user => user.baskarma_type === 'oblast' || String(user.region_id) === data.region_id);
    }, [users, data.region_id]);

    const submitFilters = (event: FormEvent) => {
        event.preventDefault();
        get(investmentProjectsRoutes.index.url(), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        router.get(investmentProjectsRoutes.index.url());
    };

    const getSectorDisplay = (project: InvestmentProject) => {
        const sectors = [];
        
        if (project.sezs && project.sezs.length > 0) {
            sectors.push(...project.sezs.map(s => `АЭА: ${s.name}`));
        }
        
        if (project.industrial_zones && project.industrial_zones.length > 0) {
            sectors.push(...project.industrial_zones.map(iz => `ИА: ${iz.name}`));
        }
        
        if (project.subsoil_users && project.subsoil_users.length > 0) {
            sectors.push(...project.subsoil_users.map(su => `Жер қойнауын пайдалану: ${su.name}`));
        }
        
        return sectors.length > 0 ? sectors.join(', ') : '—';
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            plan: 'Жоспарлау',
            implementation: 'Іске асыру',
            launched: 'Іске қосылған',
            suspended: 'Тоқтатылған',
        };
        return labels[status] || status;
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            plan: 'bg-blue-100 text-blue-800',
            implementation: 'bg-amber-100 text-amber-800',
            launched: 'bg-green-100 text-green-800',
            suspended: 'bg-red-100 text-red-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const formatInvestment = (value: string | number | null) => {
        if (!value) return '—';
        const num = Number(value);
        if (isNaN(num)) return String(value);

        return formatMoneyCompact(num);
    };

    const formatTotalInvestment = (value: number) => {
        if (!value) return '0 ₸';
        return formatMoneyCompact(value, { compactFractionDigits: 2 });
    };

    const toNormalCase = (str: string) => {
        if (!str) return '';
        if (str === str.toUpperCase()) {
            return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
        }
        return str;
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Инвестициялық жобалар', href: investmentProjectsRoutes.index.url() }
        ]}>
            <Head title="Инвестициялық жобалар" />

            <div className="flex h-full flex-col space-y-5 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-[#0f1b3d]">
                        Инвестициялық жобалар
                    </h1>
                    <div className="flex items-center gap-3">
                        {(isSuperAdmin || isInvest) && (
                            <Link href="/investment-projects-archived">
                                <Button variant="outline" className="border-gray-200 text-gray-600 hover:text-[#0f1b3d]">
                                    <Archive className="mr-2 h-4 w-4" />
                                    Архив
                                </Button>
                            </Link>
                        )}
                        {canModify && (
                            <Link href={investmentProjectsRoutes.create.url()}>
                                <Button className="bg-[#c8a44e] text-white shadow-none hover:bg-[#b8943e]">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Жоба құру
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <button
                        type="button"
                        className="flex w-full items-center justify-between text-left text-sm font-semibold text-[#0f1b3d]"
                        onClick={() => setFiltersOpen((prev) => !prev)}
                        aria-expanded={filtersOpen}
                    >
                        Сүзгілер
                        <ChevronDown
                            className={`h-4 w-4 text-gray-400 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {filtersOpen && (
                        <form onSubmit={submitFilters} className="mt-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="search">Іздеу</Label>
                                    <Input
                                        id="search"
                                        value={data.search}
                                        onChange={(event) => setData('search', event.target.value)}
                                        placeholder="Атауы немесе компания"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Аймақ</Label>
                                    <Select
                                        value={data.region_id}
                                        onValueChange={(value) => {
                                            setData('region_id', value);
                                            setData('sector_id', '');
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Барлық аймақтар" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {regions.map((region) => (
                                                <SelectItem key={region.id} value={String(region.id)}>
                                                    {region.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Жоба түрі</Label>
                                    <Select
                                        value={data.project_type_id}
                                        onValueChange={(value) => setData('project_type_id', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Барлық түрлер" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {projectTypes.map((type) => (
                                                <SelectItem key={type.id} value={String(type.id)}>
                                                    {type.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Мәртебесі</Label>
                                    <Select
                                        value={data.status}
                                        onValueChange={(value) => setData('status', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Барлық мәртебелер" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="plan">Жоспарлау</SelectItem>
                                            <SelectItem value="implementation">Іске асыру</SelectItem>
                                            <SelectItem value="launched">Іске қосылған</SelectItem>
                                            <SelectItem value="suspended">Тоқтатылған</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Орындаушы</Label>
                                    <Select
                                        value={data.executor_id}
                                        onValueChange={(value) => setData('executor_id', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Барлық орындаушылар" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {filteredUsers.map((user) => (
                                                <SelectItem key={user.id} value={String(user.id)}>
                                                    {user.full_name} {user.position ? `- ${user.position}` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Сектор түрі</Label>
                                    <Select
                                        value={data.sector_type}
                                        onValueChange={(value) => {
                                            setData('sector_type', value);
                                            setData('sector_id', '');
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Кез келген" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="sez">АЭА</SelectItem>
                                            <SelectItem value="industrial_zone">ИА</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Сектор</Label>
                                    <Select
                                        value={data.sector_id}
                                        onValueChange={(value) => setData('sector_id', value)}
                                        disabled={!data.sector_type}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={data.sector_type ? 'Барлығы' : 'Түрін таңдаңыз'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sectorOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="min_investment">Инвестиция бастап</Label>
                                    <Input
                                        id="min_investment"
                                        type="number"
                                        value={data.min_investment}
                                        onChange={(event) => setData('min_investment', event.target.value)}
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="max_investment">Инвестиция дейін</Label>
                                    <Input
                                        id="max_investment"
                                        type="number"
                                        value={data.max_investment}
                                        onChange={(event) => setData('max_investment', event.target.value)}
                                        placeholder="∞"
                                        min="0"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="start_date_from">Басталуы бастап (жыл)</Label>
                                    <Input
                                        id="start_date_from"
                                        type="number"
                                        min="1990"
                                        max="2100"
                                        placeholder="Мысалы: 2023"
                                        value={data.start_date_from ? data.start_date_from.split('-')[0] : ''}
                                        onChange={(event) => setData('start_date_from', event.target.value ? `${event.target.value}-01-01` : '')}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="start_date_to">Басталуы дейін (жыл)</Label>
                                    <Input
                                        id="start_date_to"
                                        type="number"
                                        min="1990"
                                        max="2100"
                                        placeholder="Мысалы: 2025"
                                        value={data.start_date_to ? data.start_date_to.split('-')[0] : ''}
                                        onChange={(event) => setData('start_date_to', event.target.value ? `${event.target.value}-12-31` : '')}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="end_date_from">Аяқталуы бастап (жыл)</Label>
                                    <Input
                                        id="end_date_from"
                                        type="number"
                                        min="1990"
                                        max="2100"
                                        placeholder="Мысалы: 2024"
                                        value={data.end_date_from ? data.end_date_from.split('-')[0] : ''}
                                        onChange={(event) => setData('end_date_from', event.target.value ? `${event.target.value}-01-01` : '')}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="end_date_to">Аяқталуы дейін (жыл)</Label>
                                    <Input
                                        id="end_date_to"
                                        type="number"
                                        min="1990"
                                        max="2100"
                                        placeholder="Мысалы: 2026"
                                        value={data.end_date_to ? data.end_date_to.split('-')[0] : ''}
                                        onChange={(event) => setData('end_date_to', event.target.value ? `${event.target.value}-12-31` : '')}
                                    />
                                </div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <Button type="submit" className="bg-[#0f1b3d] text-white shadow-none hover:bg-[#1a2d5a]">
                                    Қолдану
                                </Button>
                                <Button type="button" variant="outline" className="border-gray-200 shadow-none hover:bg-gray-50" onClick={clearFilters}>
                                    Тазалау
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
                
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Жобалар саны</h3>
                        <p className="mt-2 text-2xl font-bold text-[#0f1b3d]">
                            {stats.total_projects}
                        </p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Инвестиция көлемі</h3>
                        <p className="mt-2 text-2xl font-bold text-[#c8a44e]">
                            {formatTotalInvestment(stats.total_investment)}
                        </p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Мәртебесі бойынша</h3>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium text-[#0f1b3d]">
                            <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-blue-500" /> Жоспарлау: {stats.status_counts.plan}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Іске қосылған: {stats.status_counts.launched}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-amber-500" /> Іске асырылуда: {stats.status_counts.implementation}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-red-500" /> Тоқтатылған: {stats.status_counts.suspended}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {(isSuperAdmin || isInvest) && <TableHead className="w-12"></TableHead>}
                                    <TableHead>Атауы / Компания</TableHead>
                                    <TableHead>Аймақ</TableHead>
                                    <TableHead>Жоба түрі</TableHead>
                                    <TableHead>Сектор</TableHead>
                                    <TableHead>Инвестиция</TableHead>
                                    <TableHead>Орындаушылар</TableHead>
                                    <TableHead>Мәртебесі</TableHead>
                                    <TableHead className="text-right">Әрекеттер</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orderedProjects.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={(isSuperAdmin || isInvest) ? 9 : 8} className="py-12 text-center text-gray-400">
                                            Деректер жоқ
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <SortableContext
                                        items={orderedProjects.map((p) => p.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {orderedProjects.map((project) => (
                                            <SortableProjectRow key={project.id} id={project.id} isEnabled={isSuperAdmin || isInvest}>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <Link
                                                            href={investmentProjectsRoutes.show.url(project.id)}
                                                            className="font-semibold text-[#0f1b3d] hover:text-[#c8a44e] hover:underline"
                                                        >
                                                            {toNormalCase(project.name)}
                                                        </Link>
                                                        {project.company_name && (
                                                            <span className="mt-0.5 text-xs text-gray-400">
                                                                {toNormalCase(project.company_name)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{project.region?.name ?? '—'}</TableCell>
                                                <TableCell>{project.project_type?.name ?? '—'}</TableCell>
                                                <TableCell>{getSectorDisplay(project)}</TableCell>
                                                <TableCell className="whitespace-nowrap">{formatInvestment(project.total_investment)}</TableCell>
                                                <TableCell>
                                                    {project.executors?.length > 0
                                                        ? project.executors.map(e => e.full_name).join(', ')
                                                        : '—'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={`${getStatusColor(project.status)} px-3 py-1 text-sm font-medium border-0`}>
                                                        {getStatusLabel(project.status)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        {(isSuperAdmin || isInvest) && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                title="Басқа бетке ауыстыру"
                                                                className="h-8 w-8 hover:bg-blue-50 hover:text-blue-700"
                                                                onClick={() => openMoveModal(project)}
                                                            >
                                                                <MoveRight className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <Button variant="ghost" size="icon" asChild className="h-8 w-8 hover:bg-[#0f1b3d]/5 hover:text-[#0f1b3d]" title="Қарау">
                                                            <Link href={investmentProjectsRoutes.show.url(project.id)}>
                                                                <Eye className="h-4 w-4" />
                                                            </Link>
                                                        </Button>
                                                        {canModify && (
                                                            <>
                                                                <Button variant="ghost" size="icon" asChild className="h-8 w-8 hover:bg-[#0f1b3d]/5 hover:text-[#0f1b3d]" title="Өңдеу">
                                                                    <Link href={`${investmentProjectsRoutes.edit.url(project.id)}?return_to=${encodeURIComponent(url)}`}>
                                                                        <Pencil className="h-4 w-4" />
                                                                    </Link>
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700"
                                                                    onClick={() => handleDelete(project.id)}
                                                                    title="Жою"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </SortableProjectRow>
                                        ))}
                                    </SortableContext>
                                )}
                            </TableBody>
                        </Table>
                    </DndContext>
                </div>

                <Pagination paginator={projects} />

                <Dialog open={isMoveModalOpen} onOpenChange={setIsMoveModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Жобаның орнын ауыстыру</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <Label htmlFor="targetPage">Қай бетке апарамыз?</Label>
                            <Input
                                id="targetPage"
                                type="number"
                                min={1}
                                max={projects.last_page}
                                value={targetPage}
                                onChange={(e) => setTargetPage(parseInt(e.target.value) || 1)}
                                className="mt-2"
                            />
                            <p className="text-sm text-gray-500 mt-2">
                                Жалпы беттер саны: {projects.last_page}
                            </p>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsMoveModalOpen(false)}>Болдырмау</Button>
                            <Button onClick={handleMoveSubmit} className="bg-[#c8a44e] text-white hover:bg-[#b8943e]">Сақтау</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
