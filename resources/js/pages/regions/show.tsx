import Map from '@/components/map';
import AppLayout from '@/layouts/app-layout';
import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Globe,
    Zap,
    Flame,
    Droplets,
    Waves,
    Car,
    Wifi,
    CheckCircle2,
    Factory,
    Building2,
    Pickaxe,
    TrainFront,
    Maximize2,
} from 'lucide-react';

interface InfrastructureDetails {
    available: boolean;
    capacity?: string;
    type?: string;
    distance?: string;
}

interface InfrastructureData {
    electricity?: InfrastructureDetails;
    water?: InfrastructureDetails;
    gas?: InfrastructureDetails;
    roads?: InfrastructureDetails;
    railway?: InfrastructureDetails;
    internet?: InfrastructureDetails;
    sewerage?: InfrastructureDetails; // Optional based on previous code
}

interface Region {
    id: number;
    name: string;
    geometry: { lat: number, lng: number }[] | null;
    location?: { lat: number, lng: number }[] | null;
}

interface Sez {
    id: number;
    name: string;
    status: string;
    total_area: number;
    investment_total: number;
    description: string;
    infrastructure?: InfrastructureData | null;
    location?: { lat: number, lng: number }[] | null;
    issues_count?: number;
}

interface IndustrialZone {
    id: number;
    name: string;
    status: string;
    total_area: number;
    investment_total: number;
    description: string;
    infrastructure?: InfrastructureData | null;
    location?: { lat: number, lng: number }[] | null;
    issues_count?: number;
}
interface SubsoilUser {
    id: number;
    name: string;
    mineral_type: string;
    total_area: number | null;
    license_status: string;
    license_start: string | null;
    license_end: string | null;
    location?: { lat: number, lng: number }[] | null;
    issues_count?: number;
}

interface InvestmentProject {
    id: number;
    name: string;
    company_name?: string;
    description?: string;
    status: string;
    total_investment: number | string | null;
    start_date?: string;
    end_date?: string;
    geometry?: { lat: number; lng: number }[];
    project_type?: { id: number; name: string };
    executors?: { id: number; name: string; full_name?: string }[];
    sezs?: Sez[];
    industrial_zones?: IndustrialZone[];
    subsoil_users?: SubsoilUser[];
}

interface Stats {
    totalArea: number;
    projectsCount: number;
    totalInvestment: number;
    projectIssuesCount: number;
    sezIssuesCount: number;
    izIssuesCount: number;
    subsoilIssuesCount: number;
}

interface Props {
    region: Region;
    projects: InvestmentProject[];
    sezs: Sez[];
    industrialZones: IndustrialZone[];
    subsoilUsers: SubsoilUser[];
    stats: Stats;
}

export default function Show({ region, projects, sezs, industrialZones, subsoilUsers, stats }: Props) {
    const [activeTab, setActiveTab] = useState('all');
    const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);
    const [selectedEntityType, setSelectedEntityType] = useState<'sez' | 'iz' | 'subsoil' | null>(null);
    const [mapSelectedEntityId, setMapSelectedEntityId] = useState<number | null>(null);
    const [mapSelectedEntityType, setMapSelectedEntityType] = useState<'sez' | 'iz' | 'subsoil' | null>(null);

    // Selected entity IDs per tab for filtering projects
    const [selectedSezId, setSelectedSezId] = useState<number | null>(null);
    const [selectedIzId, setSelectedIzId] = useState<number | null>(null);
    const [selectedSubsoilId, setSelectedSubsoilId] = useState<number | null>(null);
    const [selectedSubsoilStatus, setSelectedSubsoilStatus] = useState<string | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

    // Pagination state
    const ITEMS_PER_PAGE = 10;
    const [allPage, setAllPage] = useState(1);
    const [sezPage, setSezPage] = useState(1);
    const [izPage, setIzPage] = useState(1);
    const [subsoilPage, setSubsoilPage] = useState(1);

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        setSelectedSezId(null);
        setSelectedIzId(null);
        setSelectedSubsoilId(null);
        setSelectedSubsoilStatus(null);
        setSelectedProjectId(null);
        setAllPage(1);
        setSezPage(1);
        setIzPage(1);
        setSubsoilPage(1);
    };

    const handleSelectEntity = (id: number, type: 'sez' | 'iz' | 'subsoil') => {
        setSelectedEntityId(id);
        setSelectedEntityType(type);
    };

    const handleMapEntitySelect = (id: number | null, type: 'sez' | 'iz' | 'subsoil' | null) => {
        setMapSelectedEntityId(id);
        setMapSelectedEntityType(type);
        setAllPage(1);
        // Sync sidebar selection with map click
        if (id && type === 'sez') {
            setSelectedSezId(id);
        } else if (id && type === 'iz') {
            setSelectedIzId(id);
        } else if (id && type === 'subsoil') {
            setSelectedSubsoilId(id);
        }
    };

    const handleResetMap = () => {
        setSelectedEntityId(null);
        setSelectedEntityType(null);
        setMapSelectedEntityId(null);
        setMapSelectedEntityType(null);
        setSelectedSezId(null);
        setSelectedIzId(null);
        setSelectedSubsoilId(null);
        setSelectedSubsoilStatus(null);
        setSelectedProjectId(null);
    };

    const handleProjectSelect = (projectId: number | null) => {
        if (selectedProjectId === projectId) {
            setSelectedProjectId(null);
        } else {
            setSelectedProjectId(projectId);
            // Clear entity selection when selecting a project
            setSelectedEntityId(null);
            setSelectedEntityType(null);
            setMapSelectedEntityId(null);
            setMapSelectedEntityType(null);
        }
    };

    // Filtered projects for each tab
    const sezProjects = React.useMemo(() => {
        if (selectedSezId) {
            return projects.filter(p => p.sezs?.some(s => s.id === selectedSezId));
        }
        return projects.filter(p => p.sezs && p.sezs.length > 0);
    }, [projects, selectedSezId]);

    const izProjects = React.useMemo(() => {
        if (selectedIzId) {
            return projects.filter(p => p.industrial_zones?.some(z => z.id === selectedIzId));
        }
        return projects.filter(p => p.industrial_zones && p.industrial_zones.length > 0);
    }, [projects, selectedIzId]);

    const subsoilProjects = React.useMemo(() => {
        if (selectedSubsoilId) {
            return projects.filter(p => p.subsoil_users?.some(s => s.id === selectedSubsoilId));
        }
        return projects.filter(p => p.subsoil_users && p.subsoil_users.length > 0);
    }, [projects, selectedSubsoilId]);

    // Filtered subsoil users by status
    const filteredSubsoilUsers = React.useMemo(() => {
        if (selectedSubsoilStatus) {
            return subsoilUsers.filter(su => su.license_status === selectedSubsoilStatus);
        }
        return subsoilUsers;
    }, [subsoilUsers, selectedSubsoilStatus]);

    // Reset pagination when filters change
    React.useEffect(() => { setSezPage(1); }, [selectedSezId]);
    React.useEffect(() => { setIzPage(1); }, [selectedIzId]);
    React.useEffect(() => { setSubsoilPage(1); }, [selectedSubsoilStatus]);
    React.useEffect(() => { setAllPage(1); }, [mapSelectedEntityId, mapSelectedEntityType]);

    // Subsoil status counts
    const subsoilStatusCounts = React.useMemo(() => {
        const counts: Record<string, number> = { active: 0, expired: 0, suspended: 0 };
        subsoilUsers.forEach(su => {
            if (counts[su.license_status] !== undefined) {
                counts[su.license_status]++;
            }
        });
        return counts;
    }, [subsoilUsers]);

    // Total subsoil area
    const totalSubsoilArea = React.useMemo(() => {
        const users = selectedSubsoilStatus
            ? subsoilUsers.filter(su => su.license_status === selectedSubsoilStatus)
            : subsoilUsers;
        return users.reduce((acc, su) => acc + Number(su.total_area || 0), 0);
    }, [subsoilUsers, selectedSubsoilStatus]);

    const formatCurrency = (amount: number) => {
        if (Math.abs(amount) >= 1_000_000) {
            const millions = amount / 1_000_000;
            const formatted = new Intl.NumberFormat('ru-RU', {
                maximumFractionDigits: 1,
            }).format(millions);
            return `${formatted} млн ₸`;
        }
        return new Intl.NumberFormat('ru-RU', {
            maximumFractionDigits: 0,
        }).format(amount) + ' ₸';
    };

    const formatArea = (area: number) => {
        return new Intl.NumberFormat('ru-RU', {
            maximumFractionDigits: 2,
        }).format(area);
    };

    const renderPagination = (totalItems: number, currentPage: number, setPage: (page: number) => void) => {
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        if (totalPages <= 1) return null;

        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        const endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }
        const pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

        return (
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                <span className="text-xs text-gray-500">
                    {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} из {totalItems}
                </span>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={currentPage === 1}
                        onClick={() => setPage(currentPage - 1)}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {startPage > 1 && (
                        <>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-xs" onClick={() => setPage(1)}>1</Button>
                            {startPage > 2 && <span className="text-xs text-gray-400 px-1">…</span>}
                        </>
                    )}
                    {pages.map((p) => (
                        <Button
                            key={p}
                            variant={p === currentPage ? 'default' : 'ghost'}
                            size="sm"
                            className={`h-8 w-8 p-0 text-xs ${p === currentPage ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}`}
                            onClick={() => setPage(p)}
                        >
                            {p}
                        </Button>
                    ))}
                    {endPage < totalPages && (
                        <>
                            {endPage < totalPages - 1 && <span className="text-xs text-gray-400 px-1">…</span>}
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-xs" onClick={() => setPage(totalPages)}>{totalPages}</Button>
                        </>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={currentPage === totalPages}
                        onClick={() => setPage(currentPage + 1)}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        );
    };

    const getSectorDisplay = (project: InvestmentProject) => {
        const sectors: string[] = [];

        if (project.sezs && project.sezs.length > 0) {
            sectors.push(...project.sezs.map(sez => `СЭЗ: ${sez.name}`));
        }

        if (project.industrial_zones && project.industrial_zones.length > 0) {
            sectors.push(...project.industrial_zones.map(iz => `ИЗ: ${iz.name}`));
        }

        if (project.subsoil_users && project.subsoil_users.length > 0) {
            sectors.push(...project.subsoil_users.map(su => `Недропользование: ${su.name}`));
        }

        return sectors.length > 0 ? sectors.join(', ') : '—';
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            plan: 'Планирование',
            implementation: 'Реализация',
            launched: 'Запущен',
            suspended: 'Приостановлен',
        };

        return labels[status] || status;
    };

    const getStatusBadgeClass = (status: string) => {
        const classes: Record<string, string> = {
            plan: 'text-blue-700 border-blue-200 bg-blue-50',
            implementation: 'text-amber-700 border-amber-200 bg-amber-50',
            launched: 'text-emerald-700 border-emerald-200 bg-emerald-50',
            suspended: 'text-yellow-700 border-yellow-200 bg-yellow-50',
        };

        return classes[status] || 'text-gray-700 border-gray-200 bg-gray-50';
    };

    const licenseStatusMap: Record<string, { label: string; color?: string }> = {
        active: { label: 'Активная', color: 'bg-green-100 text-green-800' },
        expired: { label: 'Истекла', color: 'bg-gray-100 text-gray-800' },
        suspended: { label: 'Приостановлена', color: 'bg-amber-100 text-amber-800' },
        illegal: { label: 'Нелегально', color: 'bg-red-600 text-white' },
    };

    const renderInfrastructureCard = (title: string, data?: InfrastructureData | null) => {
        if (!data) return null;

        const items = [
            { key: 'electricity', name: "Электроснабжение", icon: Zap, val: data.electricity },
            { key: 'gas', name: "Газ", icon: Flame, val: data.gas },
            { key: 'water', name: "Водоснабжение", icon: Droplets, val: data.water },
            { key: 'roads', name: "Дороги", icon: Car, val: data.roads },
            { key: 'railway', name: "Ж/Д тупик", icon: TrainFront, val: data.railway },
            { key: 'internet', name: "Интернет", icon: Wifi, val: data.internet },
        ].filter(i => i.val && i.val.available !== undefined);

        if (items.length === 0) return null;

        return (
            <Card className="border-gray-100 shadow-none mt-6">
                <CardHeader className="pb-4 border-b border-gray-100">
                    <CardTitle className="text-base font-semibold text-gray-900">{title}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-gray-100">
                        {items.map((item, idx) => {
                             const active = item.val?.available;
                             const detail = item.val?.capacity || item.val?.type || item.val?.distance || '';
                             
                             return (
                                <div key={idx} className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-gray-50 rounded-md text-gray-500">
                                            <item.icon className="h-4 w-4" />
                                        </div>
                                        <span className="font-medium text-sm text-gray-700">{item.name}</span>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <Badge variant="outline" className={`
                                            ${active ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-amber-700 bg-amber-50 border-amber-100'}
                                            font-medium mb-0.5 border text-[10px] px-1.5 py-0 h-5
                                        `}>
                                            {active ? 'Доступно' : 'Нет'}
                                        </Badge>
                                        {detail && (
                                            <div className="text-[10px] text-gray-400 font-medium mt-0.5">{detail}</div>
                                        )}
                                    </div>
                                </div>
                             )
                        })}
                    </div>
                </CardContent>
            </Card>
        );
    };

    // Derived stats
    const totalSezArea = sezs.reduce((acc, curr) => acc + Number(curr.total_area), 0);
    const totalSezInvestment = sezs.reduce((acc, curr) => acc + Number(curr.investment_total), 0);

    const totalIzArea = industrialZones.reduce((acc, curr) => acc + Number(curr.total_area), 0);
    const totalIzInvestment = industrialZones.reduce((acc, curr) => acc + Number(curr.investment_total), 0);

    // Helper to safely get lat/lng
    function getLatLng(point: any): { lat: number, lng: number } | null {
        if (!point) return null;
        let lat = NaN, lng = NaN;

        if (Array.isArray(point) && point.length >= 2) {
            lat = Number(point[0]);
            lng = Number(point[1]);
        } else if (typeof point === 'object' && 'lat' in point && 'lng' in point) {
            // Handle corrupted data where lat/lng are arrays instead of numbers
            let rawLat = point.lat;
            let rawLng = point.lng;
            if (Array.isArray(rawLat)) rawLat = rawLat[0];
            if (Array.isArray(rawLng)) rawLng = rawLng[0];
            lat = Number(rawLat);
            lng = Number(rawLng);
        }

        if (!isNaN(lat) && !isNaN(lng)) {
            return { lat, lng };
        }
        return null;
    }

    // Calculate map center
    let mapCenter: [number, number] | undefined = undefined;
    if (region.geometry && region.geometry.length > 0) {
        const points = region.geometry.map(p => getLatLng(p)).filter(p => p !== null) as { lat: number, lng: number }[];
        if (points.length > 0) {
            mapCenter = [
                points.reduce((sum, p) => sum + p.lat, 0) / points.length,
                points.reduce((sum, p) => sum + p.lng, 0) / points.length
            ];
        }
    }

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Dashboard', href: '/dashboard' },
                { title: region.name, href: '' },
            ]}
        >
            <Head title={region.name} />

            <div className="flex flex-col gap-6 p-4 md:p-8 max-w-[1600px]">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-100 pb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Globe className="h-8 w-8 text-blue-600" />
                            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">{region.name}</h1>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500 font-medium">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400">Площадь:</span>
                                <span className="text-gray-900">{formatArea(stats.totalArea)} га</span>
                            </div>
                            {/* <div className="flex items-center gap-2">
                                <span className="text-gray-400">Статус:</span>
                                <span className="text-gray-900">Действует</span>
                            </div> */}
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400">Район:</span>
                                <span className="text-blue-600 flex items-center cursor-pointer hover:underline">
                                    <Link href="/dashboard">Туркестанский район</Link> <ChevronRight className="h-4 w-4" />
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-md border border-green-200 text-sm font-medium">
                            <CheckCircle2 className="h-4 w-4" /> Статус: Действует
                        </div>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left Column (Map & Projects) */}
                        <div className="lg:col-span-8 space-y-8">
                            {/* Map Container */}
                            <div className="relative rounded-xl overflow-hidden border border-gray-100 bg-white group">
                                <div className="h-[500px] w-full relative z-0">
                                    <Map 
                                        regions={[region]} 
                                        projects={projects}
                                        sezs={sezs}
                                        industrialZones={industrialZones}
                                        subsoilUsers={activeTab === 'subsoil' ? filteredSubsoilUsers : subsoilUsers}
                                        selectedEntityId={selectedEntityId ?? mapSelectedEntityId}
                                        selectedEntityType={selectedEntityType ?? mapSelectedEntityType}
                                        selectedProjectId={selectedProjectId}
                                        zoom={13} 
                                        center={mapCenter} 
                                        className="h-full w-full" 
                                        fitBounds={true} 
                                        showPolygons={true} 
                                        activeTab={activeTab}
                                        interactive={true}
                                        onEntitySelect={handleMapEntitySelect}
                                        onProjectSelect={handleProjectSelect}
                                    />
                                </div>

                                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm border border-gray-100 p-3 rounded-lg z-[400] text-sm space-y-1.5">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#3b82f6' }}></div>
                                        <span className="font-medium text-gray-600 text-xs">Аудан аймағы</span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#8b5cf6' }}></div>
                                        <span className="font-medium text-gray-600 text-xs">СЭЗ</span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#f59e0b' }}></div>
                                        <span className="font-medium text-gray-600 text-xs">Индустриальная зона</span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#4b5563' }}></div>
                                        <span className="font-medium text-gray-600 text-xs">Недропользователь</span>
                                    </div>
                                    <div className="border-t border-gray-200 pt-1.5 mt-1">
                                        <span className="font-semibold text-gray-700 text-[10px] uppercase tracking-wide">Инвестиционные проекттер</span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#3b82f6' }}></div>
                                        <span className="font-medium text-gray-600 text-xs">Планирование</span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#22c55e' }}></div>
                                        <span className="font-medium text-gray-600 text-xs">Запущен</span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#eab308' }}></div>
                                        <span className="font-medium text-gray-600 text-xs">Реализация</span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#ef4444' }}></div>
                                        <span className="font-medium text-gray-600 text-xs">Приостановлен</span>
                                    </div>
                                </div>

                                {/* Reset map zoom button */}
                                {(selectedEntityId || mapSelectedEntityId || selectedProjectId) && (
                                    <button
                                        onClick={handleResetMap}
                                        className="absolute top-4 right-4 z-[400] flex items-center gap-1.5 rounded-lg bg-white/90 backdrop-blur-sm border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-white hover:text-gray-900 transition-colors"
                                    >
                                        <Maximize2 className="h-3.5 w-3.5" />
                                        Показать всю карту
                                    </button>
                                )}
                            </div>

                            {/* Projects / Tabs Section */}
                            <div className="w-full">
                                <TabsContent value="all" className="mt-0 space-y-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-xl font-semibold tracking-tight text-gray-900">
                                            {mapSelectedEntityType === 'sez' ? `Проекты в СЭЗ` :
                                             mapSelectedEntityType === 'iz' ? `Проекты в ИЗ` :
                                             mapSelectedEntityType === 'subsoil' ? `Проекты недропользователя` :
                                             'Инвестиционные проекты'}
                                        </h2>
                                        <div className="flex items-center gap-2">
                                            {mapSelectedEntityType && (
                                                <Button variant="ghost" className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 text-sm h-auto py-1 px-2" onClick={() => { setMapSelectedEntityId(null); setMapSelectedEntityType(null); }}>
                                                    Сбросить фильтр
                                                </Button>
                                            )}
                                            {/* <Link href="/investment-projects" className="text-blue-600 hover:text-blue-700 hover:underline text-sm">
                                                <Button variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-sm h-auto py-1 px-2">
                                                    Все проекты <ChevronRight className="ml-1 h-3 w-3" />
                                                </Button>
                                            </Link> */}
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
                                        <Table>
                                            <TableHeader className="bg-[#F0F4FA]">
                                                <TableRow>
                                                    <TableHead>Проект</TableHead>
                                                    <TableHead>Отрасль</TableHead>
                                                    <TableHead>Статус</TableHead>
                                                    <TableHead>Объем</TableHead>
                                                    <TableHead className="text-right">Инвестиции</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {(() => {
                                                    const filteredProjects = mapSelectedEntityType === 'sez' && mapSelectedEntityId
                                                        ? projects.filter(p => p.sezs?.some(s => s.id === mapSelectedEntityId))
                                                        : mapSelectedEntityType === 'iz' && mapSelectedEntityId
                                                        ? projects.filter(p => p.industrial_zones?.some(z => z.id === mapSelectedEntityId))
                                                        : mapSelectedEntityType === 'subsoil' && mapSelectedEntityId
                                                        ? projects.filter(p => p.subsoil_users?.some(s => s.id === mapSelectedEntityId))
                                                        : projects;
                                                    const paginatedAll = filteredProjects.slice((allPage - 1) * ITEMS_PER_PAGE, allPage * ITEMS_PER_PAGE);
                                                    return paginatedAll.length > 0 ? paginatedAll.map((project) => (
                                                        <TableRow
                                                            key={project.id}
                                                            className={`cursor-pointer transition-colors ${selectedProjectId === project.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50'}`}
                                                            onClick={() => handleProjectSelect(project.id)}
                                                        >
                                                            <TableCell className="font-medium text-gray-900 max-w-[250px] py-3">
                                                                {project.name}
                                                            </TableCell>
                                                            <TableCell className="text-gray-500 text-sm py-3">
                                                                {getSectorDisplay(project)}
                                                            </TableCell>
                                                            <TableCell className="py-3">
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`${getStatusBadgeClass(project.status)} font-medium border px-2 py-0.5 text-xs rounded-md shadow-none`}
                                                                >
                                                                    {getStatusLabel(project.status)}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-gray-700 font-medium text-sm py-3">
                                                                —
                                                            </TableCell>
                                                            <TableCell className="text-gray-900 font-semibold text-right text-sm py-3">
                                                                {project.total_investment
                                                                    ? formatCurrency(Number(project.total_investment))
                                                                    : '—'}
                                                            </TableCell>
                                                        </TableRow>
                                                    )) : (
                                                        <TableRow>
                                                            <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                                                                Нет данных о проектах
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })()}
                                            </TableBody>
                                        </Table>
                                        {(() => {
                                            const filteredProjects = mapSelectedEntityType === 'sez' && mapSelectedEntityId
                                                ? projects.filter(p => p.sezs?.some(s => s.id === mapSelectedEntityId))
                                                : mapSelectedEntityType === 'iz' && mapSelectedEntityId
                                                ? projects.filter(p => p.industrial_zones?.some(z => z.id === mapSelectedEntityId))
                                                : mapSelectedEntityType === 'subsoil' && mapSelectedEntityId
                                                ? projects.filter(p => p.subsoil_users?.some(s => s.id === mapSelectedEntityId))
                                                : projects;
                                            return renderPagination(filteredProjects.length, allPage, setAllPage);
                                        })()}
                                    </div>
                                </TabsContent>

                                <TabsContent value="sez" className="mt-0 space-y-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-xl font-semibold tracking-tight text-gray-900">
                                            {selectedSezId
                                                ? `Проекты: ${sezs.find(s => s.id === selectedSezId)?.name || 'СЭЗ'}`
                                                : 'Проекты СЭЗ'}
                                        </h2>
                                        {selectedSezId && (
                                            <Button variant="ghost" className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 text-sm h-auto py-1 px-2" onClick={() => { setSelectedSezId(null); setSelectedEntityId(null); setSelectedEntityType(null); }}>
                                                Сбросить фильтр
                                            </Button>
                                        )}
                                    </div>
                                    <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
                                        <Table>
                                            <TableHeader className="bg-[#F0F4FA]">
                                                <TableRow>
                                                    <TableHead>Проект</TableHead>
                                                    <TableHead>Отрасль</TableHead>
                                                    <TableHead>Статус</TableHead>
                                                    <TableHead className="text-right">Инвестиции</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {sezProjects.length > 0 ? sezProjects.slice((sezPage - 1) * ITEMS_PER_PAGE, sezPage * ITEMS_PER_PAGE).map((project) => (
                                                    <TableRow
                                                        key={project.id}
                                                        className={`cursor-pointer transition-colors ${selectedProjectId === project.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50'}`}
                                                        onClick={() => handleProjectSelect(project.id)}
                                                    >
                                                        <TableCell className="font-medium text-gray-900 max-w-[250px] py-3">
                                                            {project.name}
                                                        </TableCell>
                                                        <TableCell className="text-gray-500 text-sm py-3">
                                                            {getSectorDisplay(project)}
                                                        </TableCell>
                                                        <TableCell className="py-3">
                                                            <Badge
                                                                variant="outline"
                                                                className={`${getStatusBadgeClass(project.status)} font-medium border px-2 py-0.5 text-xs rounded-md shadow-none`}
                                                            >
                                                                {getStatusLabel(project.status)}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-gray-900 font-semibold text-right text-sm py-3">
                                                            {project.total_investment
                                                                ? formatCurrency(Number(project.total_investment))
                                                                : '—'}
                                                        </TableCell>
                                                    </TableRow>
                                                )) : (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                                                            Нет проектов
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                        {renderPagination(sezProjects.length, sezPage, setSezPage)}
                                    </div>
                                </TabsContent>

                                <TabsContent value="iz" className="mt-0 space-y-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-xl font-semibold tracking-tight text-gray-900">
                                            {selectedIzId
                                                ? `Проекты: ${industrialZones.find(z => z.id === selectedIzId)?.name || 'ИЗ'}`
                                                : 'Проекты ИЗ'}
                                        </h2>
                                        {selectedIzId && (
                                            <Button variant="ghost" className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 text-sm h-auto py-1 px-2" onClick={() => { setSelectedIzId(null); setSelectedEntityId(null); setSelectedEntityType(null); }}>
                                                Сбросить фильтр
                                            </Button>
                                        )}
                                    </div>
                                    <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
                                        <Table>
                                            <TableHeader className="bg-[#F0F4FA]">
                                                <TableRow>
                                                    <TableHead>Проект</TableHead>
                                                    <TableHead>Отрасль</TableHead>
                                                    <TableHead>Статус</TableHead>
                                                    <TableHead className="text-right">Инвестиции</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {izProjects.length > 0 ? izProjects.slice((izPage - 1) * ITEMS_PER_PAGE, izPage * ITEMS_PER_PAGE).map((project) => (
                                                    <TableRow
                                                        key={project.id}
                                                        className={`cursor-pointer transition-colors ${selectedProjectId === project.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50'}`}
                                                        onClick={() => handleProjectSelect(project.id)}
                                                    >
                                                        <TableCell className="font-medium text-gray-900 max-w-[250px] py-3">
                                                            {project.name}
                                                        </TableCell>
                                                        <TableCell className="text-gray-500 text-sm py-3">
                                                            {getSectorDisplay(project)}
                                                        </TableCell>
                                                        <TableCell className="py-3">
                                                            <Badge
                                                                variant="outline"
                                                                className={`${getStatusBadgeClass(project.status)} font-medium border px-2 py-0.5 text-xs rounded-md shadow-none`}
                                                            >
                                                                {getStatusLabel(project.status)}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-gray-900 font-semibold text-right text-sm py-3">
                                                            {project.total_investment
                                                                ? formatCurrency(Number(project.total_investment))
                                                                : '—'}
                                                        </TableCell>
                                                    </TableRow>
                                                )) : (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                                                            Нет проектов
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                        {renderPagination(izProjects.length, izPage, setIzPage)}
                                    </div>
                                </TabsContent>

                                <TabsContent value="subsoil" className="mt-0 space-y-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-xl font-semibold tracking-tight text-gray-900">
                                            {selectedSubsoilStatus
                                                ? `Недропользователи: ${licenseStatusMap[selectedSubsoilStatus]?.label || selectedSubsoilStatus}`
                                                : 'Недропользователи'}
                                        </h2>
                                        {selectedSubsoilStatus && (
                                            <Button variant="ghost" className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 text-sm h-auto py-1 px-2" onClick={() => { setSelectedSubsoilStatus(null); }}>
                                                Сбросить фильтр
                                            </Button>
                                        )}
                                    </div>
                                    <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
                                        <Table>
                                            <TableHeader className="bg-[#F0F4FA]">
                                                <TableRow>
                                                    <TableHead>Наименование</TableHead>
                                                    <TableHead>Тип минерала</TableHead>
                                                    <TableHead>Статус лицензии</TableHead>
                                                    <TableHead className="text-right">Площадь (га)</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredSubsoilUsers.length > 0 ? filteredSubsoilUsers.slice((subsoilPage - 1) * ITEMS_PER_PAGE, subsoilPage * ITEMS_PER_PAGE).map((su) => (
                                                    <TableRow
                                                        key={su.id}
                                                        className={`cursor-pointer transition-colors ${selectedSubsoilId === su.id ? 'bg-gray-100 border-l-2 border-l-gray-500' : 'hover:bg-gray-50'}`}
                                                        onClick={() => {
                                                            const newId = selectedSubsoilId === su.id ? null : su.id;
                                                            setSelectedSubsoilId(newId);
                                                            if (newId) {
                                                                handleSelectEntity(newId, 'subsoil');
                                                            } else {
                                                                setSelectedEntityId(null);
                                                                setSelectedEntityType(null);
                                                            }
                                                        }}
                                                    >
                                                        <TableCell className="font-medium text-gray-900 max-w-[250px] py-3">
                                                            <div className="flex items-center gap-2">
                                                                <Pickaxe className="h-4 w-4 text-gray-400 shrink-0" />
                                                                <Link
                                                                    href={`/subsoil-users/${su.id}`}
                                                                    className="hover:text-blue-600 hover:underline transition-colors"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    {su.name}
                                                                </Link>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-gray-500 text-sm py-3">
                                                            {su.mineral_type}
                                                        </TableCell>
                                                        <TableCell className="py-3">
                                                            <Badge
                                                                variant="outline"
                                                                className={`${licenseStatusMap[su.license_status]?.color || 'bg-gray-100 text-gray-800'} font-medium border-0 px-2 py-0.5 text-xs rounded-md shadow-none`}
                                                            >
                                                                {licenseStatusMap[su.license_status]?.label || su.license_status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-gray-900 font-semibold text-right text-sm py-3">
                                                            {su.total_area ? formatArea(Number(su.total_area)) : '—'}
                                                        </TableCell>
                                                    </TableRow>
                                                )) : (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                                                            Нет недропользователей
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                        {renderPagination(filteredSubsoilUsers.length, subsoilPage, setSubsoilPage)}
                                    </div>
                                </TabsContent>
                            </div>
                        </div>

                        {/* Right Column (Sidebar) */}
                        <div className="lg:col-span-4 space-y-6">
                            <TabsList className="bg-gray-100 p-1 rounded-lg w-full justify-start h-12">
                                <TabsTrigger value="all" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md py-2 text-sm">Все</TabsTrigger>
                                <TabsTrigger value="sez" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md py-2 text-sm flex items-center gap-2">
                                    <Building2 className="w-4 h-4" /> СЭЗ
                                </TabsTrigger>
                                <TabsTrigger value="iz" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md py-2 text-sm flex items-center gap-2">
                                    <Factory className="w-4 h-4" /> ИЗ
                                </TabsTrigger>
                                <TabsTrigger value="subsoil" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md py-2 text-sm flex items-center gap-2">
                                    <Pickaxe className="w-4 h-4" />
                                </TabsTrigger>
                            </TabsList>

                            {/* Common Stats for ALL */}
                            <TabsContent value="all" className="space-y-6 mt-0">
                                <Card className="border-gray-100 shadow-none">
                                    <CardHeader className="pb-4 border-b border-gray-100">
                                        <CardTitle className="text-base font-semibold text-gray-900">Ключевые показатели</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                                            <div >
                                                <div className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">{stats.projectsCount}</div>
                                                <div className="text-xs font-medium text-gray-500">Количество проектов</div>
                                            </div>
                                            <div className="pl-4 border-l border-gray-100">
                                                <div className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">{formatArea(stats.totalArea)} <span className="text-sm font-medium text-gray-500">га</span></div>
                                                <div className="text-xs font-medium text-gray-500">Общая площадь</div>
                                            </div>
                                            
                                            <div>
                                                <div className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">{formatCurrency(stats.totalInvestment)}</div>
                                                <div className="text-xs font-medium text-gray-500">Инвестиции</div>
                                            </div>
                                            <div className="pl-4 border-l border-gray-100">
                                                <div className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">{stats.projectIssuesCount}</div>
                                                <div className="text-xs font-medium text-gray-500">Проблемные вопросы</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* SEZ Stats */}
                            <TabsContent value="sez" className="space-y-6 mt-0">
                                <Card className="border-gray-100 shadow-none">
                                    <CardHeader className="pb-4 border-b border-gray-100">
                                        <CardTitle className="text-base font-semibold text-gray-900">
                                            {selectedSezId
                                                ? `Показатели: ${sezs.find(s => s.id === selectedSezId)?.name || 'СЭЗ'}`
                                                : 'Показатели СЭЗ'}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        {(() => {
                                            const selectedSez = selectedSezId ? sezs.find(s => s.id === selectedSezId) : null;
                                            const displayZones = selectedSez ? 1 : sezs.length;
                                            const displayArea = selectedSez ? Number(selectedSez.total_area) : totalSezArea;
                                            const displayInvestment = selectedSez ? Number(selectedSez.investment_total) : totalSezInvestment;
                                            const displayIssues = selectedSez ? (selectedSez.issues_count ?? 0) : stats.sezIssuesCount;
                                            return (
                                                <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                                                    <div>
                                                        <div className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">{displayZones}</div>
                                                        <div className="text-xs font-medium text-gray-500">Количество зон</div>
                                                    </div>
                                                    <div className="pl-4 border-l border-gray-100">
                                                        <div className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">{formatArea(displayArea)} <span className="text-sm font-medium text-gray-500">га</span></div>
                                                        <div className="text-xs font-medium text-gray-500">Общая площадь</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">{formatCurrency(displayInvestment)}</div>
                                                        <div className="text-xs font-medium text-gray-500">Запланировано инвестиций</div>
                                                    </div>
                                                    <div className="pl-4 border-l border-gray-100">
                                                        <div className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">{displayIssues}</div>
                                                        <div className="text-xs font-medium text-gray-500">Проблемные вопросы</div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </CardContent>
                                </Card>

                                {/* SEZ List */}
                                <Card className="border-gray-100 shadow-none">
                                    <CardHeader className="pb-3 border-b border-gray-100">
                                        <CardTitle className="text-base font-semibold text-gray-900">Список СЭЗ</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        {sezs.length > 0 ? (
                                            <div className="divide-y divide-gray-100">
                                                <div
                                                    className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                                                        selectedSezId === null
                                                            ? 'bg-violet-50 border-l-2 border-l-violet-500'
                                                            : 'hover:bg-gray-50'
                                                    }`}
                                                    onClick={() => {
                                                        setSelectedSezId(null);
                                                        setSelectedEntityId(null);
                                                        setSelectedEntityType(null);
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <Building2 className="h-4 w-4 text-violet-500 shrink-0" />
                                                        <span className="text-sm font-medium text-gray-900">Все</span>
                                                    </div>
                                                    <Badge variant="secondary" className="text-[10px]">{sezs.length} зон</Badge>
                                                </div>
                                                {sezs.map((sez) => (
                                                    <div
                                                        key={sez.id}
                                                        className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                                                            selectedSezId === sez.id
                                                                ? 'bg-violet-50 border-l-2 border-l-violet-500'
                                                                : 'hover:bg-gray-50'
                                                        }`}
                                                        onClick={() => {
                                                            setSelectedSezId(sez.id);
                                                            handleSelectEntity(sez.id, 'sez');
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <Building2 className="h-4 w-4 text-violet-500 shrink-0" />
                                                            <span className="text-sm font-medium text-gray-900 truncate">{sez.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <Link
                                                                href={`/sezs/${sez.id}`}
                                                                className="text-violet-500 hover:text-violet-700 transition-colors"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <ExternalLink className="h-3.5 w-3.5" />
                                                            </Link>
                                                            <Badge variant="secondary" className="text-[10px]">{sez.status === 'active' ? 'Активная' : 'Развивающаяся'}</Badge>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="p-4 text-center text-sm text-gray-500">Нет СЭЗ</p>
                                        )}
                                    </CardContent>
                                </Card>

                                {selectedSezId && (() => {
                                    const sez = sezs.find(s => s.id === selectedSezId);
                                    return sez ? renderInfrastructureCard(`Инфраструктура: ${sez.name}`, sez.infrastructure) : null;
                                })()}
                            </TabsContent>

                            {/* IZ Stats */}
                            <TabsContent value="iz" className="space-y-6 mt-0">
                                <Card className="border-gray-100 shadow-none">
                                    <CardHeader className="pb-4 border-b border-gray-100">
                                        <CardTitle className="text-base font-semibold text-gray-900">
                                            {selectedIzId
                                                ? `Показатели: ${industrialZones.find(z => z.id === selectedIzId)?.name || 'ИЗ'}`
                                                : 'Показатели ИЗ'}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        {(() => {
                                            const selectedIz = selectedIzId ? industrialZones.find(z => z.id === selectedIzId) : null;
                                            const displayZones = selectedIz ? 1 : industrialZones.length;
                                            const displayArea = selectedIz ? Number(selectedIz.total_area) : totalIzArea;
                                            const displayInvestment = selectedIz ? Number(selectedIz.investment_total) : totalIzInvestment;
                                            const displayIssues = selectedIz ? (selectedIz.issues_count ?? 0) : stats.izIssuesCount;
                                            return (
                                                <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                                                    <div>
                                                        <div className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">{displayZones}</div>
                                                        <div className="text-xs font-medium text-gray-500">Количество зон</div>
                                                    </div>
                                                    <div className="pl-4 border-l border-gray-100">
                                                        <div className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">{formatArea(displayArea)} <span className="text-sm font-medium text-gray-500">га</span></div>
                                                        <div className="text-xs font-medium text-gray-500">Общая площадь</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">{formatCurrency(displayInvestment)}</div>
                                                        <div className="text-xs font-medium text-gray-500">Запланировано инвестиций</div>
                                                    </div>
                                                    <div className="pl-4 border-l border-gray-100">
                                                        <div className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">{displayIssues}</div>
                                                        <div className="text-xs font-medium text-gray-500">Проблемные вопросы</div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </CardContent>
                                </Card>

                                {/* IZ List */}
                                <Card className="border-gray-100 shadow-none">
                                    <CardHeader className="pb-3 border-b border-gray-100">
                                        <CardTitle className="text-base font-semibold text-gray-900">Список ИЗ</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        {industrialZones.length > 0 ? (
                                            <div className="divide-y divide-gray-100">
                                                <div
                                                    className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                                                        selectedIzId === null
                                                            ? 'bg-amber-50 border-l-2 border-l-amber-500'
                                                            : 'hover:bg-gray-50'
                                                    }`}
                                                    onClick={() => {
                                                        setSelectedIzId(null);
                                                        setSelectedEntityId(null);
                                                        setSelectedEntityType(null);
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <Factory className="h-4 w-4 text-amber-500 shrink-0" />
                                                        <span className="text-sm font-medium text-gray-900">Все</span>
                                                    </div>
                                                    <Badge variant="secondary" className="text-[10px]">{industrialZones.length} зон</Badge>
                                                </div>
                                                {industrialZones.map((iz) => (
                                                    <div
                                                        key={iz.id}
                                                        className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                                                            selectedIzId === iz.id
                                                                ? 'bg-amber-50 border-l-2 border-l-amber-500'
                                                                : 'hover:bg-gray-50'
                                                        }`}
                                                        onClick={() => {
                                                            setSelectedIzId(iz.id);
                                                            handleSelectEntity(iz.id, 'iz');
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <Factory className="h-4 w-4 text-amber-500 shrink-0" />
                                                            <span className="text-sm font-medium text-gray-900 truncate">{iz.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <Link
                                                                href={`/industrial-zones/${iz.id}`}
                                                                className="text-amber-500 hover:text-amber-700 transition-colors"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <ExternalLink className="h-3.5 w-3.5" />
                                                            </Link>
                                                            <Badge variant="secondary" className="text-[10px]">{iz.status === 'active' ? 'Активная' : 'Развивающаяся'}</Badge>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="p-4 text-center text-sm text-gray-500">Нет ИЗ</p>
                                        )}
                                    </CardContent>
                                </Card>

                                {selectedIzId && (() => {
                                    const iz = industrialZones.find(z => z.id === selectedIzId);
                                    return iz ? renderInfrastructureCard(`Инфраструктура: ${iz.name}`, iz.infrastructure) : null;
                                })()}
                            </TabsContent>

                            {/* Subsoil Stats */}
                            <TabsContent value="subsoil" className="space-y-6 mt-0">
                                <Card className="border-gray-100 shadow-none">
                                    <CardHeader className="pb-4 border-b border-gray-100">
                                        <CardTitle className="text-base font-semibold text-gray-900">Показатели недропользования</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="grid grid-cols-3 gap-x-4">
                                            <div>
                                                <div className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">
                                                    {selectedSubsoilStatus ? filteredSubsoilUsers.length : subsoilUsers.length}
                                                </div>
                                                <div className="text-xs font-medium text-gray-500">Количество проектов</div>
                                            </div>
                                            <div className="pl-4 border-l border-gray-100">
                                                <div className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">{formatArea(totalSubsoilArea)} <span className="text-sm font-medium text-gray-500">га</span></div>
                                                <div className="text-xs font-medium text-gray-500">Площадь</div>
                                            </div>
                                            <div className="pl-4 border-l border-gray-100">
                                                <div className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">{stats.subsoilIssuesCount}</div>
                                                <div className="text-xs font-medium text-gray-500">Проблемные вопросы</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Status Filter */}
                                <Card className="border-gray-100 shadow-none">
                                    <CardHeader className="pb-3 border-b border-gray-100">
                                        <CardTitle className="text-base font-semibold text-gray-900">Статус лицензии</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="divide-y divide-gray-100">
                                            <div
                                                className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                                                    selectedSubsoilStatus === null
                                                        ? 'bg-gray-50 border-l-2 border-l-gray-500'
                                                        : 'hover:bg-gray-50'
                                                }`}
                                                onClick={() => setSelectedSubsoilStatus(null)}
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Pickaxe className="h-4 w-4 text-gray-500 shrink-0" />
                                                    <span className="text-sm font-medium text-gray-900">Все статусы</span>
                                                </div>
                                                <Badge variant="secondary" className="text-[10px]">{subsoilUsers.length}</Badge>
                                            </div>
                                            {[
                                                { key: 'active', label: 'Активная', color: 'text-green-700', bg: 'bg-green-50', border: 'border-l-green-500', icon: 'bg-green-100' },
                                                { key: 'expired', label: 'Истекла', color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-l-gray-500', icon: 'bg-gray-300' },
                                                { key: 'suspended', label: 'Приостановлена', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-l-amber-500', icon: 'bg-amber-100' },
                                                { key: 'illegal', label: 'Нелегально', color: 'text-red-700', bg: 'bg-red-50', border: 'border-l-red-600', icon: 'bg-red-600' },
                                            ].map((status) => (
                                                <div
                                                    key={status.key}
                                                    className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                                                        selectedSubsoilStatus === status.key
                                                            ? `${status.bg} border-l-2 ${status.border}`
                                                            : 'hover:bg-gray-50'
                                                    }`}
                                                    onClick={() => setSelectedSubsoilStatus(selectedSubsoilStatus === status.key ? null : status.key)}
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <div className={`w-2.5 h-2.5 rounded-full ${status.icon}`}></div>
                                                        <span className={`text-sm font-medium ${selectedSubsoilStatus === status.key ? status.color : 'text-gray-700'}`}>{status.label}</span>
                                                    </div>
                                                    <Badge variant="secondary" className="text-[10px]">{subsoilStatusCounts[status.key] || 0}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                        </div>
                    </div>
                </Tabs>
            </div>
        </AppLayout>
    );
}
