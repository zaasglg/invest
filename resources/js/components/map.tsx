import React from 'react';
import { MapContainer, TileLayer, Polygon, Popup, useMap, Rectangle } from 'react-leaflet';
import { Link } from '@inertiajs/react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

import { ChevronRight, TrendingUp, Factory, Globe, Pickaxe, X } from 'lucide-react';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Region {
    id: number;
    name: string;
    geometry: { lat: number, lng: number }[] | null;
}

interface RegionStats {
    investments: number;
    izProjects: number;
    sezProjects: number;
    subsoilUsers: number;
}

interface InvestmentProject {
    id: number;
    name: string;
    status?: string;
    geometry?: { lat: number, lng: number }[];
    total_investment?: number | string | null;
}

interface SectorRow {
    investment: number;
    projectCount: number | null;
    problemCount: number;
    orgCount: number | null;
}

interface SectorData {
    sez: SectorRow;
    iz: SectorRow;
    nedro: SectorRow;
    invest: SectorRow;
}

interface SectorSummary {
    total: SectorData;
    byRegion: Record<number, SectorData>;
}

type Props = {
    className?: string;
    center?: [number, number];
    zoom?: number;
    regions?: Region[];
    projects?: InvestmentProject[];
    regionStats?: {
        investments: Record<number, number>;
        izProjects: Record<number, number>;
        sezProjects: Record<number, number>;
        subsoilUsers: Record<number, number>;
    };
    fitBounds?: boolean;
    showPolygons?: boolean;
    activeTab?: string;
    sectorSummary?: SectorSummary | null;
};

interface Plot {
    id: number;
    name?: string;
    geometry: [number, number][]; // Changed from bounds to geometry
    status: 'free' | 'occupied';
    area?: string;
    purpose?: string;
    totalInvestment?: number | string | null;
}

// ... existing helpers ...

function rotatePoints(points: [number, number][], center: [number, number], angleDeg: number): [number, number][] {
    const angleRad = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    return points.map(([lat, lng]) => {
        const dLat = lat - center[0];
        const dLng = lng - center[1];
        // Simple 2D rotation matrix logic, treating lat as y, lng as x for convenience
        // NewX = x*cos - y*sin, NewY = x*sin + y*cos
        // Here Lat is Y, Lng is X.
        // NewLng = dLng * cos - dLat * sin
        // NewLat = dLng * sin + dLat * cos 
        // Note: Map projection distorts this but for small shapes it's visually fine.
        return [
            center[0] + (dLng * sin * 0.7 + dLat * cos), // 0.7 aspect correction for lat
            center[1] + (dLng * cos - dLat * sin)
        ];
    });
}



function stringToColor(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
}

// Компонент для управления картой (центровка)
// Компонент для управления картой (центровка)
function MapController({ activeRegion, activePlot, regions, defaultCenter, defaultZoom, fitBounds }: { activeRegion: Region | null, activePlot: Plot | null, regions: Region[], defaultCenter: [number, number], defaultZoom: number, fitBounds: boolean }) {
    const map = useMap();

    useEffect(() => {
        let bounds: L.LatLngBounds | null = null;
        let options: L.FitBoundsOptions = { padding: [50, 50], duration: 1 };

        if (activePlot) {
            // Priority 1: Active Plot
            bounds = L.latLngBounds(activePlot.geometry);
            options.maxZoom = 16;
        } else if (activeRegion && activeRegion.geometry && activeRegion.geometry.length > 0) {
            // Priority 2: Active Region
            const points = activeRegion.geometry.map(p => getLatLng(p)).filter((p): p is { lat: number, lng: number } => p !== null).map(p => [p.lat, p.lng] as [number, number]);
            if (points.length > 0) {
                bounds = L.latLngBounds(points);
            }
        } else if (fitBounds && regions.length > 0) {
            // Priority 3: Fit All Regions
            const allPoints: [number, number][] = [];
            regions.forEach(r => {
                if (r.geometry) {
                    r.geometry.forEach(p => {
                        const pt = getLatLng(p);
                        if (pt) {
                            allPoints.push([pt.lat, pt.lng]);
                        }
                    });
                }
            });

            if (allPoints.length > 0) {
                bounds = L.latLngBounds(allPoints);
            }
        }

        if (bounds) {
            map.fitBounds(bounds, options);
        } else {
            // Fallback
            map.setView(defaultCenter, defaultZoom, { animate: true, duration: 1 });
        }
    }, [activeRegion, activePlot, regions, map, defaultCenter, defaultZoom, fitBounds]);

    return null;
}

// Helper to safely get lat/lng from various geometry formats
// Helper to safely get lat/lng from various geometry formats
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

export default function Map({ className, center = [51.505, -0.09], zoom = 13, regions = [], projects = [], regionStats, fitBounds = false, showPolygons = true, activeTab = 'all', sectorSummary = null }: Props) {
    const [isMounted, setIsMounted] = useState(false);
    const [hoveredRegionId, setHoveredRegionId] = useState<number | null>(null);
    const [activeRegion, setActiveRegion] = useState<Region | null>(null);
    const [popupPosition, setPopupPosition] = useState<[number, number] | null>(null);
    const [plots, setPlots] = useState<Plot[]>([]);
    const [activePlot, setActivePlot] = useState<Plot | null>(null);
    useEffect(() => {
        const projectPlots: Plot[] = projects
            .filter(project => project.geometry && project.geometry.length > 0)
            .map((project) => {
                const positions = project.geometry
                    ?.map(point => {
                        const pt = getLatLng(point);
                        return pt ? [pt.lat, pt.lng] : null;
                    })
                    .filter((p): p is [number, number] => p !== null) ?? [];

                return {
                    id: project.id,
                    name: project.name,
                    geometry: positions,
                    status: project.status && ['launched', 'implementation'].includes(project.status)
                        ? 'occupied'
                        : 'free',
                    totalInvestment: project.total_investment ?? null,
                };
            })
            .filter(plot => plot.geometry.length >= 3);

        setPlots(projectPlots);
    }, [regions, activeTab, projects]);

    const getRegionStats = (regionId: number): RegionStats => {
        const investments = regionStats?.investments?.[regionId] ?? 0;
        const izProjects = regionStats?.izProjects?.[regionId] ?? 0;
        const sezProjects = regionStats?.sezProjects?.[regionId] ?? 0;
        const subsoilUsers = regionStats?.subsoilUsers?.[regionId] ?? 0;

        return {
            investments: Number(investments) || 0,
            izProjects: Number(izProjects) || 0,
            sezProjects: Number(sezProjects) || 0,
            subsoilUsers: Number(subsoilUsers) || 0,
        };
    };

    const formatInvestment = (value: number) => {
        if (!value) return '0';
        if (value >= 1_000_000_000) {
            return `${(value / 1_000_000_000).toFixed(1)} млрд тг`;
        }
        if (value >= 1_000_000) {
            return `${(value / 1_000_000).toFixed(1)} млн тг`;
        }
        return `${value.toLocaleString('ru-RU')} тг`;
    };

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return <div className={className} />;
    }

    return (
        <div className={className + " relative"}>
            <MapContainer
                center={center}
                zoom={zoom}
                scrollWheelZoom={false}
                dragging={false}
                zoomControl={false}
                doubleClickZoom={false}
                touchZoom={false}
                className="h-full w-full rounded-xl z-0"
                style={{ height: '100%', width: '100%' }}
            >
                <MapController activeRegion={activeRegion} activePlot={activePlot} regions={regions} defaultCenter={center} defaultZoom={zoom} fitBounds={fitBounds} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {showPolygons && regions.map((region) => {
                    const isActive = activeRegion?.id === region.id;
                    const isHovered = hoveredRegionId === region.id;
                    const positions = region.geometry?.map(p => {
                        const pt = getLatLng(p);
                        return pt ? [pt.lat, pt.lng] : null;
                    }).filter((p): p is [number, number] => p !== null) || [];

                    // Create shadow offset for 3D effect (south-east direction)
                    const shadowOffset = 0.002;
                    const shadowPositions = positions.map(([lat, lng]) => [lat + shadowOffset, lng + shadowOffset] as [number, number]);

                    return region.geometry && (
                        <React.Fragment key={region.id}>
                            {/* Shadow layer for 3D effect */}
                            {isActive && (
                                <Polygon
                                    positions={shadowPositions}
                                    pathOptions={{
                                        color: 'transparent',
                                        fillColor: '#1e293b',
                                        fillOpacity: 0.3,
                                        weight: 0,
                                    }}
                                    eventHandlers={{ click: () => {} }}
                                />
                            )}
                            {/* Main polygon */}
                            <Polygon
                                positions={positions}
                                pathOptions={{
                                    fillColor: stringToColor(region.name),
                                    weight: isActive ? 4 : (isHovered ? 3 : 2),
                                    opacity: 1,
                                    color: isActive ? '#2563eb' : (isHovered ? '#64748b' : 'white'),
                                    dashArray: isActive || isHovered ? '' : '3',
                                    fillOpacity: isActive ? 0.85 : (isHovered ? 0.7 : 0.5),
                                    className: isActive ? 'cursor-pointer' : 'cursor-pointer',
                                }}
                                eventHandlers={{
                                    click: (e) => {
                                        setActiveRegion(region);
                                        setActivePlot(null);
                                    },
                                    mouseover: () => setHoveredRegionId(region.id),
                                    mouseout: () => setHoveredRegionId(null),
                                }}
                            />
                        </React.Fragment>
                    );
                })}

                {/* Mock Plots Layer */}
                {plots.map((plot) => (
                    <Polygon
                        key={plot.id}
                        positions={plot.geometry}
                        pathOptions={{
                            color: activePlot?.id === plot.id ? '#ea580c' : '#f97316', // bright orange vs orange-500
                            weight: activePlot?.id === plot.id ? 3 : 1,
                            fillOpacity: 0.8,
                            fillColor: activePlot?.id === plot.id ? '#ea580c' : '#f97316',
                        }}
                        eventHandlers={{
                            click: (e) => {
                                L.DomEvent.stopPropagation(e); // Prevent map/polygon click
                                setActivePlot(plot);
                                setActiveRegion(null); // Close region popup
                            }
                        }}
                    />
                ))}
            </MapContainer>

            {/* Active Region Popup */}
            {activeRegion && (
                <>
                    {/* Arrow pointing to region */}
                    <div className="absolute top-[60px] right-[340px] z-[399]">
                        <div className="relative">
                            <div className="w-0 h-0 border-t-[15px] border-t-transparent border-b-[15px] border-b-transparent border-r-[20px] border-r-[#1d3b6f]"></div>
                        </div>
                    </div>
                    
                    <div className="absolute top-4 right-4 w-[320px] z-[400] shadow-2xl rounded-xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300 bg-white">
                        <Card className="border-none shadow-none rounded-none font-sans py-0 gap-0">
                            <CardHeader className="bg-[#1d3b6f] px-4 py-3 text-white relative flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-lg font-bold tracking-tight text-white">
                                    {activeRegion.name}
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-white hover:bg-white/20 rounded-full"
                                    onClick={() => {
                                        setActiveRegion(null);
                                        setPopupPosition(null);
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                {(() => {
                                    const stats = getRegionStats(activeRegion.id);
                                    return (
                                        <div className="space-y-0 bg-white">
                                            {/* Объем инвестиций */}
                                            <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100">
                                                <p className="text-sm text-gray-600 mb-1">Объем инвестиций:</p>
                                                <p className="text-xl font-bold text-blue-600">{formatInvestment(stats.investments)}</p>
                                            </div>

                                            {/* Проектов в ИЗ */}
                                            <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100">
                                                <span className="text-gray-700 text-base">Проектов в ИЗ:</span>
                                                <span className="text-blue-600 text-xl font-bold">{stats.izProjects}</span>
                                            </div>

                                            {/* Проектов в СЭЗ */}
                                            <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100">
                                                <span className="text-gray-700 text-base">Проектов в СЭЗ:</span>
                                                <span className="text-blue-600 text-xl font-bold">{stats.sezProjects}</span>
                                            </div>

                                            {/* Недропользователи */}
                                            <div className="bg-white px-4 py-3 flex items-center justify-between">
                                                <span className="text-gray-700 text-base">Недропользователи:</span>
                                                <span className="text-blue-600 text-xl font-bold">{stats.subsoilUsers}</span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </CardContent>
                            <CardFooter className="p-0 bg-blue-800">
                                <Link href={`/regions/${activeRegion.id}`} className="w-full">
                                    <Button
                                        className="w-full bg-[#1d3b6f] hover:bg-blue-900 text-white font-semibold shadow-none h-14 text-base rounded-none border-none flex items-center justify-center gap-2"
                                        size="sm"
                                    >
                                        Подробнее о районе <ChevronRight className="h-5 w-5" />
                                    </Button>
                                </Link>
                            </CardFooter>
                        </Card>
                    </div>
                </>
            )}

            {/* Active Plot Popup */}
            {activePlot && (
                <div className="absolute top-4 right-4 w-[320px] z-[400] shadow-2xl rounded-xl bg-white overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                    <Card className="border-none shadow-none rounded-none font-sans py-0 gap-0">
                        <CardHeader className="bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-3 text-white relative flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-base font-bold tracking-tight">
                                {activePlot.name || 'Инвестиционный участок'}
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-white hover:bg-white/20 rounded-full"
                                onClick={() => setActivePlot(null)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-gray-100 gap-0">
                                {activePlot.totalInvestment !== undefined && activePlot.totalInvestment !== null && (
                                    <div className="flex items-center px-4 py-3 hover:bg-gray-50 transition-colors">
                                        <div className="flex-1">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Инвестиции</p>
                                            <p className="text-base font-bold text-gray-900 leading-none">
                                                {formatInvestment(Number(activePlot.totalInvestment))}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {activePlot.area && (
                                    <div className="flex items-center px-4 py-3 hover:bg-gray-50 transition-colors">
                                        <div className="flex-1">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Площадь участка</p>
                                            <p className="text-base font-bold text-gray-900 leading-none">{activePlot.area} <span className="text-xs font-medium text-gray-500">га</span></p>
                                        </div>
                                    </div>
                                )}

                                {activePlot.purpose && (
                                    <div className="flex items-center px-4 py-3 hover:bg-gray-50 transition-colors">
                                        <div className="flex-1">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Целевое назначение</p>
                                            <p className="text-sm font-semibold text-gray-900 leading-tight">{activePlot.purpose}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center px-4 py-3 hover:bg-gray-50 transition-colors">
                                    <div className="flex-1">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Инфраструктура</p>
                                        <div className="flex gap-2 mt-1">
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">Свет</span>
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800">Вода</span>
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-800">Дорога</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="p-3 bg-gray-50/50 border-t border-gray-100">
                            <Link href={`/investment-projects/${activePlot.id}`} className="w-full">
                                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium shadow-none h-9 text-sm">
                                    Подробнее о проекте
                                </Button>
                            </Link>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {/* Sector Summary Table */}
            {sectorSummary && (() => {
                const data =
                    activeRegion?.id && sectorSummary.byRegion[activeRegion.id]
                        ? sectorSummary.byRegion[activeRegion.id]
                        : sectorSummary.total;

                return (
                    <div className="absolute bottom-4 left-4 right-4 z-[400]">
                        <div className="overflow-hidden rounded-lg shadow-2xl">
                            <table className="w-full border-collapse text-sm">
                                <thead>
                                    <tr className="bg-[#6b7a8d]">
                                        <th className="border-r border-white/20 px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-white"></th>
                                        <th className="border-r border-white/20 px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-white">
                                            Инвестиция
                                        </th>
                                        <th className="border-r border-white/20 px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-white">
                                            Количество проектов
                                        </th>
                                        <th className="border-r border-white/20 px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-white">
                                            Количество проблемных вопросов
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-white">
                                            Количество организаций
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    <tr className="bg-white/90 backdrop-blur-sm">
                                        <td className="px-6 py-4 text-center text-base font-semibold text-gray-500">
                                            СЭЗ
                                        </td>
                                        <td className="px-6 py-4 text-center text-base text-gray-600">
                                            {formatInvestment(data.sez.investment)}
                                        </td>
                                        <td className="px-6 py-4 text-center text-base text-gray-600">
                                            {data.sez.projectCount}
                                        </td>
                                        <td className="px-6 py-4 text-center text-base text-gray-600">
                                            {data.sez.problemCount}
                                        </td>
                                        <td className="px-6 py-4 text-center text-base text-gray-600">
                                            {data.sez.orgCount ?? '-'}
                                        </td>
                                    </tr>
                                    <tr className="bg-white/90 backdrop-blur-sm">
                                        <td className="px-6 py-4 text-center text-base font-semibold text-gray-500">
                                            ИЗ
                                        </td>
                                        <td className="px-6 py-4 text-center text-base text-gray-600">
                                            {formatInvestment(data.iz.investment)}
                                        </td>
                                        <td className="px-6 py-4 text-center text-base text-gray-600">
                                            {data.iz.projectCount}
                                        </td>
                                        <td className="px-6 py-4 text-center text-base text-gray-600">
                                            {data.iz.problemCount}
                                        </td>
                                        <td className="px-6 py-4 text-center text-base text-gray-600">
                                            {data.iz.orgCount ?? '-'}
                                        </td>
                                    </tr>
                                    <tr className="bg-white/90 backdrop-blur-sm">
                                        <td className="px-6 py-4 text-center text-base font-semibold text-gray-500">
                                            Недропользование
                                        </td>
                                        <td className="px-6 py-4 text-center text-base text-gray-600">
                                            {formatInvestment(data.nedro.investment)}
                                        </td>
                                        <td className="px-6 py-4 text-center text-base text-gray-600">
                                            {data.nedro.projectCount}
                                        </td>
                                        <td className="px-6 py-4 text-center text-base text-gray-600">
                                            {data.nedro.problemCount}
                                        </td>
                                        <td className="px-6 py-4 text-center text-base text-gray-600">
                                            {data.nedro.orgCount ?? '-'}
                                        </td>
                                    </tr>
                                    <tr className="bg-white/90 backdrop-blur-sm">
                                        <td className="px-6 py-4 text-center text-base font-semibold text-gray-500">
                                            Turkistan Invest
                                        </td>
                                        <td className="px-6 py-4 text-center text-base text-gray-600">
                                            {formatInvestment(data.invest.investment)}
                                        </td>
                                        <td className="px-6 py-4 text-center text-base text-gray-600">
                                            {data.invest.projectCount ?? '-'}
                                        </td>
                                        <td className="px-6 py-4 text-center text-base text-gray-600">
                                            {data.invest.problemCount}
                                        </td>
                                        <td className="px-6 py-4 text-center text-base text-gray-600">
                                            {data.invest.orgCount ?? '-'}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
