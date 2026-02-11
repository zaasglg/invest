import React from 'react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import { Link } from '@inertiajs/react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

import { ChevronRight, X, CheckCircle2 } from 'lucide-react';

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
    company_name?: string;
    description?: string;
    status?: string;
    geometry?: { lat: number, lng: number }[];
    total_investment?: number | string | null;
    start_date?: string;
    end_date?: string;
    project_type?: { id: number; name: string };
    executors?: { id: number; name: string; full_name?: string }[];
    sezs?: { id: number; name: string }[];
    industrial_zones?: { id: number; name: string }[];
    subsoil_users?: { id: number; name: string }[];
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

interface MapSez {
    id: number;
    name: string;
    status?: string;
    total_area?: number;
    investment_total?: number;
    location?: { lat: number; lng: number }[] | null;
}

interface MapIndustrialZone {
    id: number;
    name: string;
    status?: string;
    total_area?: number;
    investment_total?: number;
    location?: { lat: number; lng: number }[] | null;
}

interface MapSubsoilUser {
    id: number;
    name: string;
    mineral_type?: string;
    location?: { lat: number; lng: number }[] | null;
}

interface ActiveEntity {
    id: number;
    name: string;
    type: 'sez' | 'iz' | 'subsoil';
    status?: string;
    total_area?: number;
    investment_total?: number;
    mineral_type?: string;
    positions: [number, number][];
}

type Props = {
    className?: string;
    center?: [number, number];
    zoom?: number;
    regions?: Region[];
    projects?: InvestmentProject[];
    sezs?: MapSez[];
    industrialZones?: MapIndustrialZone[];
    subsoilUsers?: MapSubsoilUser[];
    selectedEntityId?: number | null;
    selectedEntityType?: 'sez' | 'iz' | 'subsoil' | null;
    selectedProjectId?: number | null;
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
    onEntitySelect?: (id: number | null, type: 'sez' | 'iz' | 'subsoil' | null) => void;
    onProjectSelect?: (id: number | null) => void;
};

interface Plot {
    id: number;
    name?: string;
    geometry: [number, number][];
    status: 'free' | 'occupied';
    statusRaw?: string;
    companyName?: string;
    description?: string;
    totalInvestment?: number | string | null;
    startDate?: string;
    endDate?: string;
    projectTypeName?: string;
    executorNames?: string[];
    sezIds: number[];
    izIds: number[];
    subsoilIds: number[];
    sezNames?: string[];
    izNames?: string[];
    subsoilNames?: string[];
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

// Status-based colors for investment projects
function getProjectStatusColor(status?: string): { color: string; fillColor: string } {
    switch (status) {
        case 'plan':
            return { color: '#2563eb', fillColor: '#3b82f6' }; // Blue
        case 'launched':
            return { color: '#16a34a', fillColor: '#22c55e' }; // Green
        case 'implementation':
            return { color: '#ca8a04', fillColor: '#eab308' }; // Yellow
        case 'suspended':
            return { color: '#dc2626', fillColor: '#ef4444' }; // Red
        default:
            return { color: '#6b7280', fillColor: '#9ca3af' }; // Gray fallback
    }
}

// Компонент для управления картой (центровка)
// Компонент для управления картой (центровка)
function MapController({ activeRegion, activePlot, activeEntity, regions, defaultCenter, defaultZoom, fitBounds }: { activeRegion: Region | null, activePlot: Plot | null, activeEntity: ActiveEntity | null, regions: Region[], defaultCenter: [number, number], defaultZoom: number, fitBounds: boolean }) {
    const map = useMap();

    useEffect(() => {
        let bounds: L.LatLngBounds | null = null;
        let options: L.FitBoundsOptions = { padding: [50, 50], duration: 1 };

        if (activeEntity && activeEntity.positions.length > 0) {
            // Priority 0: Active Entity (SEZ/IZ/Subsoil)
            bounds = L.latLngBounds(activeEntity.positions);
        } else if (activePlot) {
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
    }, [activeRegion, activePlot, activeEntity, regions, map, defaultCenter, defaultZoom, fitBounds]);

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

export default function Map({ className, center = [51.505, -0.09], zoom = 13, regions = [], projects = [], sezs = [], industrialZones = [], subsoilUsers = [], selectedEntityId = null, selectedEntityType = null, selectedProjectId = null, regionStats, fitBounds = false, showPolygons = true, activeTab = 'all', sectorSummary = null, onEntitySelect, onProjectSelect }: Props) {
    const [isMounted, setIsMounted] = useState(false);
    const [hoveredRegionId, setHoveredRegionId] = useState<number | null>(null);
    const [activeRegion, setActiveRegion] = useState<Region | null>(null);
    const [popupPosition, setPopupPosition] = useState<[number, number] | null>(null);
    const [plots, setPlots] = useState<Plot[]>([]);
    const [activePlot, setActivePlot] = useState<Plot | null>(null);
    const [activeEntity, setActiveEntity] = useState<ActiveEntity | null>(null);

    // Handle external entity selection from table
    useEffect(() => {
        if (selectedEntityId && selectedEntityType) {
            let entity: ActiveEntity | null = null;
            if (selectedEntityType === 'sez') {
                const sez = sezs.find(s => s.id === selectedEntityId);
                if (sez) {
                    const positions = (Array.isArray(sez.location) ? sez.location : [])
                        .map(p => { const pt = getLatLng(p); return pt ? [pt.lat, pt.lng] as [number, number] : null; })
                        .filter((p): p is [number, number] => p !== null);
                    entity = { id: sez.id, name: sez.name, type: 'sez', status: sez.status, total_area: sez.total_area, investment_total: sez.investment_total, positions };
                }
            } else if (selectedEntityType === 'iz') {
                const iz = industrialZones.find(z => z.id === selectedEntityId);
                if (iz) {
                    const positions = (Array.isArray(iz.location) ? iz.location : [])
                        .map(p => { const pt = getLatLng(p); return pt ? [pt.lat, pt.lng] as [number, number] : null; })
                        .filter((p): p is [number, number] => p !== null);
                    entity = { id: iz.id, name: iz.name, type: 'iz', status: iz.status, total_area: iz.total_area, investment_total: iz.investment_total, positions };
                }
            } else if (selectedEntityType === 'subsoil') {
                const su = subsoilUsers.find(s => s.id === selectedEntityId);
                if (su) {
                    const positions = (Array.isArray(su.location) ? su.location : [])
                        .map(p => { const pt = getLatLng(p); return pt ? [pt.lat, pt.lng] as [number, number] : null; })
                        .filter((p): p is [number, number] => p !== null);
                    entity = { id: su.id, name: su.name, type: 'subsoil', mineral_type: su.mineral_type, positions };
                }
            }
            if (entity) {
                setActiveEntity(entity);
                setActivePlot(null);
                setActiveRegion(null);
            }
        } else {
            // Reset: zoom back to full region view
            setActiveEntity(null);
        }
    }, [selectedEntityId, selectedEntityType, sezs, industrialZones, subsoilUsers]);
    // Sync external selectedProjectId with activePlot
    useEffect(() => {
        if (selectedProjectId !== null) {
            const targetPlot = plots.find(p => p.id === selectedProjectId);
            if (targetPlot) {
                setActivePlot(targetPlot);
                setActiveRegion(null);
                setActiveEntity(null);
            }
        } else {
            // Only clear if the currently active plot was set externally
            if (activePlot && selectedProjectId === null) {
                // Don't clear — let internal clicks manage themselves
            }
        }
    }, [selectedProjectId, plots]);

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

                const status: 'free' | 'occupied' = project.status && ['launched', 'implementation'].includes(project.status)
                    ? 'occupied'
                    : 'free';

                return {
                    id: project.id,
                    name: project.name,
                    geometry: positions,
                    status,
                    statusRaw: project.status,
                    companyName: project.company_name,
                    description: project.description,
                    totalInvestment: project.total_investment ?? null,
                    startDate: project.start_date,
                    endDate: project.end_date,
                    projectTypeName: project.project_type?.name,
                    executorNames: project.executors?.map(e => e.full_name || e.name) ?? [],
                    sezIds: project.sezs?.map(s => s.id) ?? [],
                    izIds: project.industrial_zones?.map(z => z.id) ?? [],
                    subsoilIds: project.subsoil_users?.map(s => s.id) ?? [],
                    sezNames: project.sezs?.map(s => s.name) ?? [],
                    izNames: project.industrial_zones?.map(z => z.name) ?? [],
                    subsoilNames: project.subsoil_users?.map(s => s.name) ?? [],
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
                <MapController activeRegion={activeRegion} activePlot={activePlot} activeEntity={activeEntity} regions={regions} defaultCenter={center} defaultZoom={zoom} fitBounds={fitBounds} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Region polygons */}
                {showPolygons && regions.map((region) => {
                    const positions = region.geometry?.map(p => {
                        const pt = getLatLng(p);
                        return pt ? [pt.lat, pt.lng] : null;
                    }).filter((p): p is [number, number] => p !== null) || [];

                    if (positions.length === 0) return null;

                    // Single region (region show page) — simple dashed outline
                    if (regions.length === 1) {
                        return (
                            <Polygon
                                key={region.id}
                                positions={positions}
                                pathOptions={{
                                    color: '#3b82f6',
                                    fillColor: '#dbeafe',
                                    fillOpacity: 0.15,
                                    weight: 2,
                                    dashArray: '6, 4',
                                }}
                            />
                        );
                    }

                    // Multiple regions (dashboard) — interactive colored polygons
                    const isActive = activeRegion?.id === region.id;
                    const isHovered = hoveredRegionId === region.id;

                    const shadowOffset = 0.002;
                    const shadowPositions = positions.map(([lat, lng]) => [lat + shadowOffset, lng + shadowOffset] as [number, number]);

                    return (
                        <React.Fragment key={region.id}>
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
                            <Polygon
                                positions={positions}
                                pathOptions={{
                                    fillColor: stringToColor(region.name),
                                    weight: isActive ? 4 : (isHovered ? 3 : 2),
                                    opacity: 1,
                                    color: isActive ? '#2563eb' : (isHovered ? '#64748b' : 'white'),
                                    dashArray: isActive || isHovered ? '' : '3',
                                    fillOpacity: isActive ? 0.85 : (isHovered ? 0.7 : 0.5),
                                    className: 'cursor-pointer',
                                }}
                                eventHandlers={{
                                    click: () => {
                                        setActiveRegion(region);
                                        setActivePlot(null);
                                        setActiveEntity(null);
                                    },
                                    mouseover: () => setHoveredRegionId(region.id),
                                    mouseout: () => setHoveredRegionId(null),
                                }}
                            />
                        </React.Fragment>
                    );
                })}


                {/* SEZ Layer */}
                {(activeTab === 'all' || activeTab === 'sez') && sezs.map((sez) => {
                     const positions = (Array.isArray(sez.location) ? sez.location : [])
                        .map(point => {
                            const pt = getLatLng(point);
                            return pt ? [pt.lat, pt.lng] : null;
                        })
                        .filter((p): p is [number, number] => p !== null);
                     
                     if (positions.length === 0) return null;
                     const isSelected = activeEntity?.type === 'sez' && activeEntity?.id === sez.id;

                     return (
                        <Polygon
                           key={`sez-${sez.id}`}
                           positions={positions}
                           pathOptions={{
                               color: isSelected ? '#7c3aed' : '#7c3aed',
                               fillColor: '#8b5cf6',
                               fillOpacity: isSelected ? 0.08 : 0.5,
                               weight: isSelected ? 2 : 2,
                               dashArray: isSelected ? '6, 4' : undefined,
                           }}
                           eventHandlers={{
                               click: (e) => {
                                   L.DomEvent.stopPropagation(e);
                                   const entity = { id: sez.id, name: sez.name, type: 'sez' as const, status: sez.status, total_area: sez.total_area, investment_total: sez.investment_total, positions };
                                   setActiveEntity(entity);
                                   setActivePlot(null);
                                   setActiveRegion(null);
                                   onEntitySelect?.(sez.id, 'sez');
                               }
                           }}
                        />
                     );
                })}

                {/* IZ Layer */}
                {(activeTab === 'all' || activeTab === 'iz') && industrialZones.map((iz) => {
                     const positions = (Array.isArray(iz.location) ? iz.location : [])
                        .map(point => {
                            const pt = getLatLng(point);
                            return pt ? [pt.lat, pt.lng] : null;
                        })
                        .filter((p): p is [number, number] => p !== null);
                     
                     if (positions.length === 0) return null;
                     const isSelected = activeEntity?.type === 'iz' && activeEntity?.id === iz.id;

                     return (
                        <Polygon
                           key={`iz-${iz.id}`}
                           positions={positions}
                           pathOptions={{
                               color: isSelected ? '#d97706' : '#d97706',
                               fillColor: '#f59e0b',
                               fillOpacity: isSelected ? 0.08 : 0.5,
                               weight: isSelected ? 2 : 2,
                               dashArray: isSelected ? '6, 4' : undefined,
                           }}
                           eventHandlers={{
                               click: (e) => {
                                   L.DomEvent.stopPropagation(e);
                                   const entity = { id: iz.id, name: iz.name, type: 'iz' as const, status: iz.status, total_area: iz.total_area, investment_total: iz.investment_total, positions };
                                   setActiveEntity(entity);
                                   setActivePlot(null);
                                   setActiveRegion(null);
                                   onEntitySelect?.(iz.id, 'iz');
                               }
                           }}
                        />
                     );
                })}

                {/* Subsoil Layer */}
                {(activeTab === 'all' || activeTab === 'subsoil') && subsoilUsers.map((su) => {
                     const positions = (Array.isArray(su.location) ? su.location : [])
                        .map(point => {
                            const pt = getLatLng(point);
                            return pt ? [pt.lat, pt.lng] : null;
                        })
                        .filter((p): p is [number, number] => p !== null);
                     
                     if (positions.length === 0) return null;
                     const isSelected = activeEntity?.type === 'subsoil' && activeEntity?.id === su.id;

                     return (
                        <Polygon
                           key={`su-${su.id}`}
                           positions={positions}
                           pathOptions={{
                               color: isSelected ? '#1f2937' : '#1f2937',
                               fillColor: '#4b5563',
                               fillOpacity: isSelected ? 0.08 : 0.5,
                               weight: isSelected ? 2 : 2,
                               dashArray: isSelected ? '6, 4' : undefined,
                           }}
                           eventHandlers={{
                               click: (e) => {
                                   L.DomEvent.stopPropagation(e);
                                   const entity = { id: su.id, name: su.name, type: 'subsoil' as const, mineral_type: su.mineral_type, positions };
                                   setActiveEntity(entity);
                                   setActivePlot(null);
                                   setActiveRegion(null);
                                   onEntitySelect?.(su.id, 'subsoil');
                               }
                           }}
                        />
                     );
                })}

                {/* Mock Plots Layer */}
                {activeTab !== 'subsoil' && plots
                    .filter(plot => {
                        if (!activeEntity) return true;
                        if (activeEntity.type === 'sez') return plot.sezIds.includes(activeEntity.id);
                        if (activeEntity.type === 'iz') return plot.izIds.includes(activeEntity.id);
                        if (activeEntity.type === 'subsoil') return plot.subsoilIds.includes(activeEntity.id);
                        return true;
                    })
                    .map((plot) => {
                    const statusColors = getProjectStatusColor(plot.statusRaw);
                    return (
                    <Polygon
                        key={plot.id}
                        positions={plot.geometry}
                        pathOptions={{
                            color: statusColors.color,
                            weight: activePlot?.id === plot.id ? 4 : 3,
                            fillOpacity: activePlot?.id === plot.id ? 0.25 : 0.15,
                            fillColor: statusColors.fillColor,
                        }}
                        eventHandlers={{
                            click: (e) => {
                                L.DomEvent.stopPropagation(e); // Prevent map/polygon click
                                setActivePlot(plot);
                                setActiveRegion(null); // Close region popup
                                onProjectSelect?.(plot.id);
                            }
                        }}
                    />
                    );
                })}
            </MapContainer>

            {/* Active Region Popup */}
            {activeRegion && !activeEntity && (
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
                <div className="absolute top-4 right-4 w-[340px] z-[400] shadow-2xl rounded-xl bg-white overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                    <Card className="border-none shadow-none rounded-none font-sans py-0 gap-0">
                        <CardHeader className="bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-3 text-white relative flex flex-row items-center justify-between space-y-0">
                            <div className="flex-1 min-w-0 pr-2">
                                <CardTitle className="text-base font-bold tracking-tight leading-tight">
                                    {activePlot.name || 'Инвестиционный проект'}
                                </CardTitle>
                                {activePlot.companyName && (
                                    <p className="mt-0.5 text-xs text-white/80 truncate">{activePlot.companyName}</p>
                                )}
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-white hover:bg-white/20 rounded-full shrink-0"
                                onClick={() => setActivePlot(null)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0 max-h-[400px] overflow-y-auto">
                            <div className="divide-y divide-gray-100 gap-0">
                                {/* Статус */}
                                {activePlot.statusRaw && (
                                    <div className="flex items-center justify-between px-4 py-2.5">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Статус</p>
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                            activePlot.statusRaw === 'plan' ? 'bg-blue-100 text-blue-800' :
                                            activePlot.statusRaw === 'implementation' ? 'bg-amber-100 text-amber-800' :
                                            activePlot.statusRaw === 'launched' ? 'bg-green-100 text-green-800' :
                                            activePlot.statusRaw === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {activePlot.statusRaw === 'plan' ? 'Планирование' :
                                             activePlot.statusRaw === 'implementation' ? 'Реализация' :
                                             activePlot.statusRaw === 'launched' ? 'Запущен' :
                                             activePlot.statusRaw === 'suspended' ? 'Приостановлен' :
                                             activePlot.statusRaw}
                                        </span>
                                    </div>
                                )}

                                {/* Инвестиции */}
                                {activePlot.totalInvestment !== undefined && activePlot.totalInvestment !== null && (
                                    <div className="flex items-center justify-between px-4 py-2.5">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Инвестиции</p>
                                        <p className="text-sm font-bold text-gray-900">
                                            {formatInvestment(Number(activePlot.totalInvestment))}
                                        </p>
                                    </div>
                                )}

                                {/* Тип проекта */}
                                {activePlot.projectTypeName && (
                                    <div className="flex items-center justify-between px-4 py-2.5">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Тип проекта</p>
                                        <p className="text-sm font-medium text-gray-900">{activePlot.projectTypeName}</p>
                                    </div>
                                )}

                                {/* Сроки */}
                                {(activePlot.startDate || activePlot.endDate) && (
                                    <div className="flex items-center justify-between px-4 py-2.5">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Сроки</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {activePlot.startDate ? new Date(activePlot.startDate).toLocaleDateString('ru-RU') : '—'}
                                            {' — '}
                                            {activePlot.endDate ? new Date(activePlot.endDate).toLocaleDateString('ru-RU') : '—'}
                                        </p>
                                    </div>
                                )}

                                {/* Исполнители */}
                                {activePlot.executorNames && activePlot.executorNames.length > 0 && (
                                    <div className="px-4 py-2.5">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Исполнители</p>
                                        <div className="flex flex-wrap gap-1">
                                            {activePlot.executorNames.map((name, i) => (
                                                <span key={i} className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                                                    {name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Секторы: СЭЗ, ИЗ, Недропользователи */}
                                {((activePlot.sezNames && activePlot.sezNames.length > 0) ||
                                  (activePlot.izNames && activePlot.izNames.length > 0) ||
                                  (activePlot.subsoilNames && activePlot.subsoilNames.length > 0)) && (
                                    <div className="px-4 py-2.5">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Секторы</p>
                                        <div className="flex flex-wrap gap-1">
                                            {activePlot.sezNames?.map((name, i) => (
                                                <span key={`sez-${i}`} className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-800">
                                                    СЭЗ: {name}
                                                </span>
                                            ))}
                                            {activePlot.izNames?.map((name, i) => (
                                                <span key={`iz-${i}`} className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800">
                                                    ИЗ: {name}
                                                </span>
                                            ))}
                                            {activePlot.subsoilNames?.map((name, i) => (
                                                <span key={`su-${i}`} className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-800">
                                                    Недропользование: {name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Описание */}
                                {activePlot.description && (
                                    <div className="px-4 py-2.5">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Описание</p>
                                        <p className="text-sm text-gray-700 leading-snug line-clamp-3">{activePlot.description}</p>
                                    </div>
                                )}
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

            {/* Sector Summary Table with New Design */}
            {sectorSummary && (() => {
                 const data =
                    activeRegion?.id && sectorSummary.byRegion[activeRegion.id]
                        ? sectorSummary.byRegion[activeRegion.id]
                        : sectorSummary.total;

                const rows: { key: string; label: string; d: SectorRow }[] = [
                    { key: 'sez', label: 'СЭЗ', d: data.sez },
                    { key: 'iz', label: 'ИЗ', d: data.iz },
                    { key: 'nedro', label: 'Недропользование', d: data.nedro },
                    { key: 'invest', label: 'Turkistan Invest', d: data.invest },
                ];

                return (
                    <div className="absolute bottom-4 left-4 right-4 z-[400] overflow-hidden rounded-xl shadow-xl border border-white/20 ml-[100px] mr-[100px]">
                         <div className="max-h-[300px] overflow-y-auto bg-white/95 backdrop-blur-md custom-scrollbar">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="bg-gray-100/95 sticky top-0 z-10 backdrop-blur-sm border-b border-gray-200 shadow-sm">
                                    <tr>
                                        <th className="px-4 py-3 font-bold text-gray-700 whitespace-nowrap">Сектор</th>
                                        <th className="px-4 py-3 font-bold text-gray-700 text-center whitespace-nowrap">Инвестиции</th>
                                        <th className="px-4 py-3 font-bold text-gray-700 text-center whitespace-nowrap">Кол-во проектов</th>
                                        <th className="px-4 py-3 font-bold text-gray-700 text-center whitespace-nowrap">Проблемные вопросы</th>
                                        <th className="px-4 py-3 font-bold text-gray-700 text-center whitespace-nowrap">Организации</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {rows.map((row, idx) => (
                                        <tr 
                                            key={row.key}
                                            className={`transition-colors text-sm ${
                                                idx % 2 === 0
                                                    ? 'bg-white hover:bg-gray-50'
                                                    : 'bg-gray-50/50 hover:bg-gray-100'
                                            }`}
                                        >
                                            <td className="px-4 py-3 font-medium text-gray-900">
                                                {row.label}
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-base text-gray-900">
                                                {formatInvestment(row.d.investment)}
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-base text-gray-900">
                                                {row.d.projectCount ?? '-'}
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-base text-gray-900">
                                                {row.d.problemCount}
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-base text-gray-900">
                                                {row.d.orgCount ?? '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                         </div>
                    </div>
                );
            })()}
        </div>
    );
}
