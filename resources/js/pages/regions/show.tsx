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
    ChevronRight,
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
    Pickaxe
} from 'lucide-react';

interface Region {
    id: number;
    name: string;
    geometry: { lat: number, lng: number }[] | null;
}

interface Sez {
    id: number;
    name: string;
    status: string;
    total_area: number;
    investment_total: number;
    description: string;
}

interface IndustrialZone {
    id: number;
    name: string;
    status: string;
    total_area: number;
    investment_total: number;
    description: string;
}

interface SubsoilUser {
    id: number;
    name: string;
    mineral_type: string;
    license_status: string;
    license_start: string | null;
    license_end: string | null;
}

interface InvestmentProject {
    id: number;
    name: string;
    status: string;
    total_investment: number | string | null;
    sezs?: Sez[];
    industrial_zones?: IndustrialZone[];
    subsoil_users?: SubsoilUser[];
}

interface Props {
    region: Region;
    projects: InvestmentProject[];
    sezs: Sez[];
    industrialZones: IndustrialZone[];
    subsoilUsers: SubsoilUser[];
}

export default function Show({ region, projects, sezs, industrialZones, subsoilUsers }: Props) {
    const [activeTab, setActiveTab] = useState('all');

    const infrastructure = [
        { name: "Электроснабжение", value: "Доступно", detail: "", active: true, icon: Zap },
        { name: "Газ", value: "Планируется", detail: "7500 м³/ч", active: false, icon: Flame },
        { name: "Водоснабжение", value: "Доступно", detail: "400 м³/ч", active: true, icon: Droplets },
        { name: "Канализация", value: "Доступно", detail: "", active: true, icon: Waves },
        { name: "Дороги", value: "Доступно", detail: "", active: true, icon: Car },
        { name: "Связь / Интернет", value: "Доступно", detail: "", active: true, icon: Wifi },
    ];

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('kk-KZ', {
            style: 'currency',
            currency: 'KZT',
            maximumFractionDigits: 0,
        }).format(amount);
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
            lat = Number(point.lat);
            lng = Number(point.lng);
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

            <div className="flex flex-col gap-6 p-4 md:p-8 max-w-[1600px] mx-auto">
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
                                <span className="text-gray-900">120 га</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400">Статус:</span>
                                <span className="text-gray-900">Действует</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400">Район:</span>
                                <span className="text-blue-600 flex items-center cursor-pointer hover:underline">
                                    Туркестанский район <ChevronRight className="h-4 w-4" />
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

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left Column (Map & Projects) */}
                        <div className="lg:col-span-8 space-y-8">
                            {/* Map Container */}
                            <div className="relative rounded-xl overflow-hidden border border-gray-100 bg-white group">
                                <div className="h-[500px] w-full relative z-0">
                                    <Map regions={[region]} projects={projects} zoom={13} center={mapCenter} className="h-full w-full" fitBounds={false} showPolygons={false} activeTab={activeTab} />
                                </div>

                                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm border border-gray-100 p-3 rounded-lg z-[400] text-sm space-y-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-4 h-4 bg-orange-500 rounded-[2px]"></div>
                                        <span className="font-medium text-gray-600 text-xs">Инвестиционные участки</span>
                                    </div>
                                </div>
                            </div>

                            {/* Projects / Tabs Section */}
                            <div className="w-full">
                                <TabsContent value="all" className="mt-0 space-y-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-xl font-semibold tracking-tight text-gray-900">Инвестиционные проекты</h2>
                                        <Button variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-sm h-auto py-1 px-2">
                                            Все проекты <ChevronRight className="ml-1 h-3 w-3" />
                                        </Button>
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
                                                {projects.length > 0 ? projects.map((project) => (
                                                    <TableRow key={project.id}>
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
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </TabsContent>

                                <TabsContent value="sez" className="mt-0">
                                    <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
                                        <Table>
                                            <TableHeader className="bg-[#F0F4FA]">
                                                <TableRow>
                                                    <TableHead>Название</TableHead>
                                                    <TableHead>Площадь (га)</TableHead>
                                                    <TableHead>Инвестиции</TableHead>
                                                    <TableHead>Статус</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {sezs.length > 0 ? sezs.map((sez) => (
                                                    <TableRow key={sez.id}>
                                                        <TableCell className="font-medium text-gray-900">{sez.name}</TableCell>
                                                        <TableCell>{sez.total_area}</TableCell>
                                                        <TableCell>{formatCurrency(sez.investment_total)}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="secondary">{sez.status}</Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                )) : (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                                                            Нет данных о СЭЗ в этом регионе
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </TabsContent>

                                <TabsContent value="iz" className="mt-0">
                                    <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
                                        <Table>
                                            <TableHeader className="bg-[#F0F4FA]">
                                                <TableRow>
                                                    <TableHead>Название</TableHead>
                                                    <TableHead>Площадь (га)</TableHead>
                                                    <TableHead>Инвестиции</TableHead>
                                                    <TableHead>Статус</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {industrialZones.length > 0 ? industrialZones.map((iz) => (
                                                    <TableRow key={iz.id}>
                                                        <TableCell className="font-medium text-gray-900">{iz.name}</TableCell>
                                                        <TableCell>{iz.total_area}</TableCell>
                                                        <TableCell>{formatCurrency(iz.investment_total)}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="secondary">{iz.status}</Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                )) : (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                                                            Нет данных об ИЗ в этом регионе
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </TabsContent>

                                <TabsContent value="subsoil" className="mt-0">
                                    <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
                                        <Table>
                                            <TableHeader className="bg-[#F0F4FA]">
                                                <TableRow>
                                                    <TableHead>Название / Компания</TableHead>
                                                    <TableHead>Полезное ископаемое</TableHead>
                                                    <TableHead>Лицензия</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {subsoilUsers.length > 0 ? subsoilUsers.map((user) => (
                                                    <TableRow key={user.id}>
                                                        <TableCell className="font-medium text-gray-900">{user.name}</TableCell>
                                                        <TableCell>{user.mineral_type}</TableCell>
                                                        <TableCell><Badge variant="outline">{user.license_status}</Badge></TableCell>
                                                    </TableRow>
                                                )) : (
                                                    <TableRow>
                                                        <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                                                            Нет данных о недропользователях
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
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
                                            <div>
                                                <div className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">120 га</div>
                                                <div className="text-xs font-medium text-gray-500">Общая площадь</div>
                                            </div>
                                            <div className="pl-4 border-l border-gray-100">
                                                <div className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">15</div>
                                                <div className="text-xs font-medium text-gray-500">Статус действует</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">250 <span className="text-sm text-gray-500 font-medium">млн ₸</span></div>
                                                <div className="text-xs font-medium text-gray-500">Вложено</div>
                                            </div>
                                            <div className="pl-4 border-l border-gray-100">
                                                <div className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">6</div>
                                                <div className="text-xs font-medium text-gray-500">Свободных участков</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-gray-100 shadow-none">
                                    <CardHeader className="pb-4 border-b border-gray-100">
                                        <CardTitle className="text-base font-semibold text-gray-900">Инфраструктура</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="divide-y divide-gray-100">
                                            {infrastructure.map((item, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-gray-50 rounded-md text-gray-500">
                                                            <item.icon className="h-4 w-4" />
                                                        </div>
                                                        <span className="font-medium text-sm text-gray-700">{item.name}</span>
                                                    </div>
                                                    <div className="text-right flex flex-col items-end">
                                                        <Badge variant="outline" className={`
                                                    ${item.active ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-amber-700 bg-amber-50 border-amber-100'}
                                                    font-medium mb-0.5 border text-[10px] px-1.5 py-0 h-5
                                                `}>
                                                            {item.value}
                                                        </Badge>
                                                        {item.detail && (
                                                            <div className="text-[10px] text-gray-400 font-medium mt-0.5">{item.detail}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-amber-100 bg-gradient-to-br from-amber-50/50 to-white shadow-none">
                                    <CardContent className="p-6 space-y-4">
                                        <div>
                                            <h3 className="font-semibold text-base text-gray-900 mb-2">Приоритетные отрасли переработки</h3>
                                            <p className="text-sm text-gray-600 leading-relaxed">
                                                За исключением экологически вредных и опасных производств.
                                                Полный список доступен в документации.
                                            </p>
                                        </div>
                                        <Button className="w-full bg-[#fbbf24] hover:bg-[#f59e0b] text-white font-bold text-lg h-12 transition-all shadow-none">
                                            Оставить заявку
                                        </Button>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* SEZ Stats */}
                            <TabsContent value="sez" className="space-y-6 mt-0">
                                <Card className="border-gray-100 shadow-none">
                                    <CardHeader className="pb-4 border-b border-gray-100">
                                        <CardTitle className="text-base font-semibold text-gray-900">Показатели СЭЗ</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                                            <div>
                                                <div className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">{sezs.length}</div>
                                                <div className="text-xs font-medium text-gray-500">Количество зон</div>
                                            </div>
                                            <div className="pl-4 border-l border-gray-100">
                                                <div className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">{totalSezArea} <span className="text-sm font-medium text-gray-500">га</span></div>
                                                <div className="text-xs font-medium text-gray-500">Общая площадь</div>
                                            </div>
                                            <div className="col-span-2">
                                                <div className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">{formatCurrency(totalSezInvestment)}</div>
                                                <div className="text-xs font-medium text-gray-500">Запланировано инвестиций</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* IZ Stats */}
                            <TabsContent value="iz" className="space-y-6 mt-0">
                                <Card className="border-gray-100 shadow-none">
                                    <CardHeader className="pb-4 border-b border-gray-100">
                                        <CardTitle className="text-base font-semibold text-gray-900">Показатели ИЗ</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                                            <div>
                                                <div className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">{industrialZones.length}</div>
                                                <div className="text-xs font-medium text-gray-500">Количество зон</div>
                                            </div>
                                            <div className="pl-4 border-l border-gray-100">
                                                <div className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">{totalIzArea} <span className="text-sm font-medium text-gray-500">га</span></div>
                                                <div className="text-xs font-medium text-gray-500">Общая площадь</div>
                                            </div>
                                            <div className="col-span-2">
                                                <div className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">{formatCurrency(totalIzInvestment)}</div>
                                                <div className="text-xs font-medium text-gray-500">Запланировано инвестиций</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                            </TabsContent>

                            {/* Subsoil Stats */}
                            <TabsContent value="subsoil" className="space-y-6 mt-0">
                                <Card className="border-gray-100 shadow-none">
                                    <CardHeader className="pb-4 border-b border-gray-100">
                                        <CardTitle className="text-base font-semibold text-gray-900">Недропользование</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                                            <div>
                                                <div className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">{subsoilUsers.length}</div>
                                                <div className="text-xs font-medium text-gray-500">Количество лицензий</div>
                                            </div>
                                            <div className="pl-4 border-l border-gray-100">
                                                <div className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">4</div>
                                                <div className="text-xs font-medium text-gray-500">Типов ископаемых</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="border-orange-100 bg-gradient-to-br from-orange-50/50 to-white shadow-none">
                                    <CardContent className="p-6 space-y-4">
                                        <div>
                                            <h3 className="font-semibold text-base text-gray-900 mb-2">Право недропользования</h3>
                                            <p className="text-sm text-gray-600 leading-relaxed">
                                                Получение лицензий на разведку и добычу общераспространенных полезных ископаемых.
                                            </p>
                                        </div>
                                        <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-lg h-12 transition-all shadow-none">
                                            Узнать условия
                                        </Button>
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
