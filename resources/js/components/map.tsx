import React from 'react';
import {
    MapContainer,
    Marker,
    Polygon,
    TileLayer,
    Tooltip,
    useMap,
} from 'react-leaflet';
import { Link } from '@inertiajs/react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

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
    color?: string | null;
    icon?: string | null;
    geometry: { lat: number; lng: number }[] | null;
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
    geometry?: { lat: number; lng: number }[];
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

interface RegionIconPoint {
    id: number;
    name: string;
    position: [number, number];
    region: Region;
    index: number;
    iconSize: number;
}

const REGION_ICON_SVGS: Record<string, string> = {
    factory:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 21h18v-7l-4 2v-3l-4 2V9h-2v3L7 14V7H3v14Zm2-2v-2h2v2H5Zm4 0v-2h2v2H9Zm4 0v-2h2v2h-2Zm4 0v-2h2v2h-2Z"/></svg>',
    plant: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 21h14v-2h-1V8h-3v11h-2v-7H9v7H7v-4H5v6Zm10-15h3l-1.5-3L15 6Zm-6 4h4V5H9v5Z"/></svg>',
    energy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13 2 6 13h5l-1 9 8-12h-5V2Z"/></svg>',
    house: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 10 12 4l9 6v11h-6v-6H9v6H3V10Zm4 1h2v2H7v-2Zm8 0h2v2h-2v-2Z"/></svg>',
    office: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 21h18v-2H3v2Zm10-3h3l2-8-3-.8-.8 3-2.2-2.2 2.1-2.1-1.4-1.4-2.1 2.1-2.1-2.1-1.4 1.4 2.1 2.1L7 12.2l-.8-3-3 .8 2 8h3l1-3h2l1 3Z"/></svg>',
    lab: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 3h8v2h-1v4.6l4.8 7.7A2 2 0 0 1 18.1 21H5.9a2 2 0 0 1-1.7-3.1L9 9.6V5H8V3Zm3 6-4.2 6.8c-.2.3 0 .7.4.7h9.6c.4 0 .6-.4.4-.7L13 9V5h-2v4Z"/></svg>',
};

const REGION_ICON_KEYS = Object.keys(REGION_ICON_SVGS);

const REGION_VIBRANT_COLORS = [
    '#ef4444',
    '#f97316',
    '#f59e0b',
    '#84cc16',
    '#22c55e',
    '#14b8a6',
    '#06b6d4',
    '#3b82f6',
    '#6366f1',
    '#8b5cf6',
    '#d946ef',
    '#ec4899',
];

const MIN_REGION_ICON_SIZE = 11;
const MAX_REGION_ICON_SIZE = 22;
const DEFAULT_REGION_ICON_SIZE = 16;

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
    showRegionIconsDemo?: boolean;
    activeTab?: string;
    sectorSummary?: SectorSummary | null;
    onEntitySelect?: (
        id: number | null,
        type: 'sez' | 'iz' | 'subsoil' | null,
    ) => void;
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

function rotatePoints(
    points: [number, number][],
    center: [number, number],
    angleDeg: number,
): [number, number][] {
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
            center[1] + (dLng * cos - dLat * sin),
        ];
    });
}

function stringToColor(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % REGION_VIBRANT_COLORS.length;
    return REGION_VIBRANT_COLORS[colorIndex];
}

function isValidHexColor(value: string | null | undefined): value is string {
    return Boolean(value && /^#[0-9A-Fa-f]{6}$/.test(value));
}

function hexToRgba(hex: string, alpha: number) {
    const normalized = hex.replace('#', '');
    const red = parseInt(normalized.slice(0, 2), 16);
    const green = parseInt(normalized.slice(2, 4), 16);
    const blue = parseInt(normalized.slice(4, 6), 16);

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getRegionCustomIconUrl(
    icon: string | null | undefined,
): string | null {
    if (!icon) {
        return null;
    }

    if (icon.startsWith('http://') || icon.startsWith('https://')) {
        return icon;
    }

    if (icon.startsWith('/')) {
        return icon;
    }

    if (icon.includes('/')) {
        return `/storage/${icon}`;
    }

    return null;
}

function getRegionColor(region: Region, fallbackSeed = 0) {
    if (isValidHexColor(region.color)) {
        return region.color.toUpperCase();
    }

    const fallbackIndex =
        Math.abs(region.id + fallbackSeed) % REGION_VIBRANT_COLORS.length;
    return REGION_VIBRANT_COLORS[fallbackIndex] ?? stringToColor(region.name);
}

// Status-based colors for investment projects
function getProjectStatusColor(status?: string): {
    color: string;
    fillColor: string;
} {
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

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(' ');
}

function getRegionAreaScore(
    points: Array<{ lat: number; lng: number }>,
): number {
    if (points.length < 3) {
        return 0;
    }

    let areaScore = 0;

    for (let i = 0; i < points.length; i++) {
        const next = (i + 1) % points.length;
        const current = points[i];
        const nextPoint = points[next];

        areaScore += current.lng * nextPoint.lat - nextPoint.lng * current.lat;
    }

    return Math.abs(areaScore) / 2;
}

function getRegionIconSizeByArea(
    areaScore: number,
    minAreaScore: number,
    maxAreaScore: number,
): number {
    const spread = maxAreaScore - minAreaScore;

    if (spread <= 1e-12) {
        return DEFAULT_REGION_ICON_SIZE;
    }

    const normalized = Math.min(
        Math.max((areaScore - minAreaScore) / spread, 0),
        1,
    );
    const eased = Math.sqrt(normalized);

    return Math.round(
        MIN_REGION_ICON_SIZE +
            eased * (MAX_REGION_ICON_SIZE - MIN_REGION_ICON_SIZE),
    );
}

function getRegionDemoIcon(region: Region, index: number, iconSize: number) {
    const fallbackIconKey =
        REGION_ICON_KEYS.length > 0
            ? REGION_ICON_KEYS[index % REGION_ICON_KEYS.length]
            : 'factory';
    const customIconUrl = getRegionCustomIconUrl(region.icon);
    const iconKey =
        region.icon && REGION_ICON_SVGS[region.icon]
            ? region.icon
            : fallbackIconKey;
    const iconMarkup = customIconUrl
        ? `<img src="${customIconUrl}" alt="" class="region-demo-marker__icon-image" loading="lazy" />`
        : REGION_ICON_SVGS[iconKey];
    const iconColor = getRegionColor(region, index);
    const iconShadow = hexToRgba(iconColor, 0.34);
    const glyphSize = Math.max(Math.round(iconSize * 0.82), 9);
    const anchor = Math.round(iconSize / 2);

    return L.divIcon({
        className: 'region-demo-marker',
        html: `<span class="region-demo-marker__icon-wrap" style="--region-icon-color:${iconColor};--region-icon-shadow:${iconShadow};--region-icon-size:${iconSize}px;--region-icon-glyph-size:${glyphSize}px;">${iconMarkup}</span>`,
        iconSize: [iconSize, iconSize],
        iconAnchor: [anchor, anchor],
    });
}

// Компонент для управления картой (центровка)
// Компонент для управления картой (центровка)
function MapController({
    activeRegion,
    activePlot,
    activeEntity,
    regions,
    defaultCenter,
    defaultZoom,
    fitBounds,
}: {
    activeRegion: Region | null;
    activePlot: Plot | null;
    activeEntity: ActiveEntity | null;
    regions: Region[];
    defaultCenter: [number, number];
    defaultZoom: number;
    fitBounds: boolean;
}) {
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
        } else if (
            activeRegion &&
            activeRegion.geometry &&
            activeRegion.geometry.length > 0
        ) {
            // Priority 2: Active Region
            const points = activeRegion.geometry
                .map((p) => getLatLng(p))
                .filter((p): p is { lat: number; lng: number } => p !== null)
                .map((p) => [p.lat, p.lng] as [number, number]);
            if (points.length > 0) {
                bounds = L.latLngBounds(points);
            }
        } else if (fitBounds && regions.length > 0) {
            // Priority 3: Fit All Regions
            const allPoints: [number, number][] = [];
            regions.forEach((r) => {
                if (r.geometry) {
                    r.geometry.forEach((p) => {
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
            map.setView(defaultCenter, defaultZoom, {
                animate: true,
                duration: 1,
            });
        }
    }, [
        activeRegion,
        activePlot,
        activeEntity,
        regions,
        map,
        defaultCenter,
        defaultZoom,
        fitBounds,
    ]);

    return null;
}

// Helper to safely get lat/lng from various geometry formats
// Helper to safely get lat/lng from various geometry formats
function getLatLng(point: any): { lat: number; lng: number } | null {
    if (!point) return null;
    let lat = NaN,
        lng = NaN;

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

function getRegionIconCenter(
    points: Array<{ lat: number; lng: number }>,
): [number, number] {
    if (points.length === 1) {
        return [points[0].lat, points[0].lng];
    }

    let twiceArea = 0;
    let centroidLat = 0;
    let centroidLng = 0;

    for (let i = 0; i < points.length; i++) {
        const next = (i + 1) % points.length;
        const x1 = points[i].lng;
        const y1 = points[i].lat;
        const x2 = points[next].lng;
        const y2 = points[next].lat;
        const cross = x1 * y2 - x2 * y1;

        twiceArea += cross;
        centroidLng += (x1 + x2) * cross;
        centroidLat += (y1 + y2) * cross;
    }

    if (Math.abs(twiceArea) < 1e-10) {
        const fallback = L.latLngBounds(
            points.map((point) => [point.lat, point.lng] as [number, number]),
        ).getCenter();

        return [fallback.lat, fallback.lng];
    }

    const centerLat = centroidLat / (3 * twiceArea);
    const centerLng = centroidLng / (3 * twiceArea);

    return [centerLat, centerLng];
}

export default function Map({
    className,
    center = [51.505, -0.09],
    zoom = 13,
    regions = [],
    projects = [],
    sezs = [],
    industrialZones = [],
    subsoilUsers = [],
    selectedEntityId = null,
    selectedEntityType = null,
    selectedProjectId = null,
    regionStats,
    fitBounds = false,
    showPolygons = true,
    showRegionIconsDemo = false,
    activeTab = 'all',
    sectorSummary = null,
    onEntitySelect,
    onProjectSelect,
}: Props) {
    const [isMounted, setIsMounted] = useState(false);
    const [hoveredRegionId, setHoveredRegionId] = useState<number | null>(null);
    const [activeRegion, setActiveRegion] = useState<Region | null>(null);
    const [popupPosition, setPopupPosition] = useState<[number, number] | null>(
        null,
    );
    const [plots, setPlots] = useState<Plot[]>([]);
    const [activePlot, setActivePlot] = useState<Plot | null>(null);
    const [activeEntity, setActiveEntity] = useState<ActiveEntity | null>(null);
    const hasSelection = Boolean(activeRegion || activePlot || activeEntity);
    const regionIconPoints = useMemo<RegionIconPoint[]>(() => {
        if (!showRegionIconsDemo) {
            return [];
        }

        const iconCandidates = regions
            .map((region, index) => {
                const points =
                    region.geometry
                        ?.map((point) => getLatLng(point))
                        .filter(
                            (point): point is { lat: number; lng: number } =>
                                point !== null,
                        ) ?? [];

                if (points.length === 0) {
                    return null;
                }

                const center = getRegionIconCenter(points);
                const areaScore = getRegionAreaScore(points);

                return {
                    id: region.id,
                    name: region.name,
                    position: center,
                    region,
                    index,
                    areaScore,
                };
            })
            .filter(
                (
                    item,
                ): item is Omit<RegionIconPoint, 'iconSize'> & {
                    areaScore: number;
                } => item !== null,
            );

        if (iconCandidates.length === 0) {
            return [];
        }

        const areaScores = iconCandidates.map((item) => item.areaScore);
        const minAreaScore = Math.min(...areaScores);
        const maxAreaScore = Math.max(...areaScores);

        return iconCandidates.map((item) => ({
            id: item.id,
            name: item.name,
            position: item.position,
            region: item.region,
            index: item.index,
            iconSize: getRegionIconSizeByArea(
                item.areaScore,
                minAreaScore,
                maxAreaScore,
            ),
        }));
    }, [regions, showRegionIconsDemo]);

    // Handle external entity selection from table
    useEffect(() => {
        if (selectedEntityId && selectedEntityType) {
            let entity: ActiveEntity | null = null;
            if (selectedEntityType === 'sez') {
                const sez = sezs.find((s) => s.id === selectedEntityId);
                if (sez) {
                    const positions = (
                        Array.isArray(sez.location) ? sez.location : []
                    )
                        .map((p) => {
                            const pt = getLatLng(p);
                            return pt
                                ? ([pt.lat, pt.lng] as [number, number])
                                : null;
                        })
                        .filter((p): p is [number, number] => p !== null);
                    entity = {
                        id: sez.id,
                        name: sez.name,
                        type: 'sez',
                        status: sez.status,
                        total_area: sez.total_area,
                        investment_total: sez.investment_total,
                        positions,
                    };
                }
            } else if (selectedEntityType === 'iz') {
                const iz = industrialZones.find(
                    (z) => z.id === selectedEntityId,
                );
                if (iz) {
                    const positions = (
                        Array.isArray(iz.location) ? iz.location : []
                    )
                        .map((p) => {
                            const pt = getLatLng(p);
                            return pt
                                ? ([pt.lat, pt.lng] as [number, number])
                                : null;
                        })
                        .filter((p): p is [number, number] => p !== null);
                    entity = {
                        id: iz.id,
                        name: iz.name,
                        type: 'iz',
                        status: iz.status,
                        total_area: iz.total_area,
                        investment_total: iz.investment_total,
                        positions,
                    };
                }
            } else if (selectedEntityType === 'subsoil') {
                const su = subsoilUsers.find((s) => s.id === selectedEntityId);
                if (su) {
                    const positions = (
                        Array.isArray(su.location) ? su.location : []
                    )
                        .map((p) => {
                            const pt = getLatLng(p);
                            return pt
                                ? ([pt.lat, pt.lng] as [number, number])
                                : null;
                        })
                        .filter((p): p is [number, number] => p !== null);
                    entity = {
                        id: su.id,
                        name: su.name,
                        type: 'subsoil',
                        mineral_type: su.mineral_type,
                        positions,
                    };
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
    }, [
        selectedEntityId,
        selectedEntityType,
        sezs,
        industrialZones,
        subsoilUsers,
    ]);
    // Sync external selectedProjectId with activePlot
    useEffect(() => {
        if (selectedProjectId !== null) {
            const targetPlot = plots.find((p) => p.id === selectedProjectId);
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
            .filter(
                (project) => project.geometry && project.geometry.length > 0,
            )
            .map((project) => {
                const positions =
                    project.geometry
                        ?.map((point) => {
                            const pt = getLatLng(point);
                            return pt ? [pt.lat, pt.lng] : null;
                        })
                        .filter((p): p is [number, number] => p !== null) ?? [];

                const status: 'free' | 'occupied' =
                    project.status &&
                    ['launched', 'implementation'].includes(project.status)
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
                    executorNames:
                        project.executors?.map((e) => e.full_name || e.name) ??
                        [],
                    sezIds: project.sezs?.map((s) => s.id) ?? [],
                    izIds: project.industrial_zones?.map((z) => z.id) ?? [],
                    subsoilIds: project.subsoil_users?.map((s) => s.id) ?? [],
                    sezNames: project.sezs?.map((s) => s.name) ?? [],
                    izNames: project.industrial_zones?.map((z) => z.name) ?? [],
                    subsoilNames:
                        project.subsoil_users?.map((s) => s.name) ?? [],
                };
            })
            .filter((plot) => plot.geometry.length >= 3);

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

    const formatCount = (value: number | null | undefined) => {
        if (value === null || value === undefined) {
            return '—';
        }

        return value.toLocaleString('ru-RU');
    };

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return <div className={className} />;
    }

    return (
        <div className={cx(className, 'invest-map-shell relative')}>
            <MapContainer
                center={center}
                zoom={zoom}
                scrollWheelZoom={false}
                dragging={false}
                zoomControl={false}
                doubleClickZoom={false}
                touchZoom={false}
                className={cx(
                    'invest-map z-0 h-full w-full rounded-xl',
                    hasSelection && 'invest-map--focused',
                )}
                style={{ height: '100%', width: '100%' }}
            >
                <MapController
                    activeRegion={activeRegion}
                    activePlot={activePlot}
                    activeEntity={activeEntity}
                    regions={regions}
                    defaultCenter={center}
                    defaultZoom={zoom}
                    fitBounds={fitBounds}
                />
                <TileLayer
                    // attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    attribution="Tiles © Esri"
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />

                {/* Region polygons */}
                {showPolygons &&
                    regions.map((region, regionIndex) => {
                        const positions =
                            region.geometry
                                ?.map((p) => {
                                    const pt = getLatLng(p);
                                    return pt ? [pt.lat, pt.lng] : null;
                                })
                                .filter(
                                    (p): p is [number, number] => p !== null,
                                ) || [];

                        if (positions.length === 0) return null;
                        const regionColor = getRegionColor(region, regionIndex);

                        // Single region (region show page) — simple dashed outline
                        if (regions.length === 1) {
                            return (
                                <Polygon
                                    key={region.id}
                                    positions={positions}
                                    pathOptions={{
                                        color: '#1d4ed8',
                                        fillColor: regionColor,
                                        fillOpacity: 0.58,
                                        weight: 2,
                                        dashArray: '6, 4',
                                    }}
                                />
                            );
                        }

                        // Multiple regions (dashboard) — interactive colored polygons
                        const isActive = activeRegion?.id === region.id;
                        const isHovered = hoveredRegionId === region.id;
                        const shouldMute = hasSelection && !isActive;

                        const shadowOffset = 0.002;
                        const shadowPositions = positions.map(
                            ([lat, lng]) =>
                                [lat + shadowOffset, lng + shadowOffset] as [
                                    number,
                                    number,
                                ],
                        );

                        return (
                            <React.Fragment key={region.id}>
                                {isActive && (
                                    <Polygon
                                        positions={shadowPositions}
                                        interactive={false}
                                        pathOptions={{
                                            color: 'transparent',
                                            fillColor: '#1e293b',
                                            fillOpacity: 0.3,
                                            weight: 0,
                                        }}
                                    />
                                )}
                                {isActive && (
                                    <Polygon
                                        positions={positions}
                                        interactive={false}
                                        pathOptions={{
                                            color: '#60a5fa',
                                            weight: 11,
                                            opacity: 0.35,
                                            fillOpacity: 0,
                                            className:
                                                'map-live-halo map-live-halo--region',
                                        }}
                                    />
                                )}
                                <Polygon
                                    positions={positions}
                                    pathOptions={{
                                        fillColor: regionColor,
                                        weight: isActive
                                            ? 4
                                            : isHovered
                                              ? 2.4
                                              : hasSelection
                                                ? 1.2
                                                : 1.1,
                                        opacity: 1,
                                        color: isActive
                                            ? '#1d4ed8'
                                            : isHovered
                                              ? '#64748b'
                                              : hasSelection
                                                ? '#cbd5e1'
                                                : '#1d3b6f',
                                        dashArray:
                                            isActive || isHovered
                                                ? ''
                                                : hasSelection
                                                  ? '2, 5'
                                                  : '3',
                                        fillOpacity: isActive
                                            ? 0.7
                                            : isHovered
                                              ? 0.64
                                              : hasSelection
                                                ? 0.42
                                                : 0.56,
                                        className: cx(
                                            'cursor-pointer map-region-polygon',
                                            isActive &&
                                                'map-live-focus map-live-focus--region',
                                            shouldMute && 'map-live-muted',
                                        ),
                                    }}
                                    eventHandlers={{
                                        click: () => {
                                            setActiveRegion(region);
                                            setActivePlot(null);
                                            setActiveEntity(null);
                                        },
                                        mouseover: () =>
                                            setHoveredRegionId(region.id),
                                        mouseout: () =>
                                            setHoveredRegionId(null),
                                    }}
                                />
                            </React.Fragment>
                        );
                    })}

                {showRegionIconsDemo &&
                    regionIconPoints.map((regionPoint) => (
                        <Marker
                            key={`region-icon-${regionPoint.id}`}
                            position={regionPoint.position}
                            icon={getRegionDemoIcon(
                                regionPoint.region,
                                regionPoint.index,
                                regionPoint.iconSize,
                            )}
                            eventHandlers={{
                                click: () => {
                                    setActiveRegion(regionPoint.region);
                                    setActivePlot(null);
                                    setActiveEntity(null);
                                },
                            }}
                        >
                            <Tooltip direction="top" offset={[0, -12]}>
                                {regionPoint.name}
                            </Tooltip>
                        </Marker>
                    ))}

                {/* SEZ Layer */}
                {(activeTab === 'all' || activeTab === 'sez') &&
                    sezs.map((sez) => {
                        const positions = (
                            Array.isArray(sez.location) ? sez.location : []
                        )
                            .map((point) => {
                                const pt = getLatLng(point);
                                return pt ? [pt.lat, pt.lng] : null;
                            })
                            .filter((p): p is [number, number] => p !== null);

                        if (positions.length === 0) return null;
                        const isSelected =
                            activeEntity?.type === 'sez' &&
                            activeEntity?.id === sez.id;
                        const shouldMute = hasSelection && !isSelected;

                        return (
                            <React.Fragment key={`sez-${sez.id}`}>
                                {isSelected && (
                                    <Polygon
                                        positions={positions}
                                        interactive={false}
                                        pathOptions={{
                                            color: '#a78bfa',
                                            weight: 10,
                                            opacity: 0.35,
                                            fillOpacity: 0,
                                            className:
                                                'map-live-halo map-live-halo--sez',
                                        }}
                                    />
                                )}
                                <Polygon
                                    positions={positions}
                                    pathOptions={{
                                        color: '#7c3aed',
                                        fillColor: '#8b5cf6',
                                        fillOpacity: isSelected
                                            ? 0.45
                                            : shouldMute
                                              ? 0.14
                                              : 0.5,
                                        weight: isSelected ? 3 : 2,
                                        opacity: isSelected
                                            ? 1
                                            : shouldMute
                                              ? 0.45
                                              : 0.95,
                                        dashArray: isSelected
                                            ? ''
                                            : shouldMute
                                              ? '2, 6'
                                              : undefined,
                                        className: cx(
                                            'map-entity-polygon map-entity-polygon--sez',
                                            isSelected &&
                                                'map-live-focus map-live-focus--sez',
                                            shouldMute && 'map-live-muted',
                                        ),
                                    }}
                                    eventHandlers={{
                                        click: (e) => {
                                            L.DomEvent.stopPropagation(e);
                                            const entity = {
                                                id: sez.id,
                                                name: sez.name,
                                                type: 'sez' as const,
                                                status: sez.status,
                                                total_area: sez.total_area,
                                                investment_total:
                                                    sez.investment_total,
                                                positions,
                                            };
                                            setActiveEntity(entity);
                                            setActivePlot(null);
                                            setActiveRegion(null);
                                            onEntitySelect?.(sez.id, 'sez');
                                        },
                                    }}
                                />
                            </React.Fragment>
                        );
                    })}

                {/* IZ Layer */}
                {(activeTab === 'all' || activeTab === 'iz') &&
                    industrialZones.map((iz) => {
                        const positions = (
                            Array.isArray(iz.location) ? iz.location : []
                        )
                            .map((point) => {
                                const pt = getLatLng(point);
                                return pt ? [pt.lat, pt.lng] : null;
                            })
                            .filter((p): p is [number, number] => p !== null);

                        if (positions.length === 0) return null;
                        const isSelected =
                            activeEntity?.type === 'iz' &&
                            activeEntity?.id === iz.id;
                        const shouldMute = hasSelection && !isSelected;

                        return (
                            <React.Fragment key={`iz-${iz.id}`}>
                                {isSelected && (
                                    <Polygon
                                        positions={positions}
                                        interactive={false}
                                        pathOptions={{
                                            color: '#f59e0b',
                                            weight: 10,
                                            opacity: 0.35,
                                            fillOpacity: 0,
                                            className:
                                                'map-live-halo map-live-halo--iz',
                                        }}
                                    />
                                )}
                                <Polygon
                                    positions={positions}
                                    pathOptions={{
                                        color: '#d97706',
                                        fillColor: '#f59e0b',
                                        fillOpacity: isSelected
                                            ? 0.45
                                            : shouldMute
                                              ? 0.14
                                              : 0.5,
                                        weight: isSelected ? 3 : 2,
                                        opacity: isSelected
                                            ? 1
                                            : shouldMute
                                              ? 0.45
                                              : 0.95,
                                        dashArray: isSelected
                                            ? ''
                                            : shouldMute
                                              ? '2, 6'
                                              : undefined,
                                        className: cx(
                                            'map-entity-polygon map-entity-polygon--iz',
                                            isSelected &&
                                                'map-live-focus map-live-focus--iz',
                                            shouldMute && 'map-live-muted',
                                        ),
                                    }}
                                    eventHandlers={{
                                        click: (e) => {
                                            L.DomEvent.stopPropagation(e);
                                            const entity = {
                                                id: iz.id,
                                                name: iz.name,
                                                type: 'iz' as const,
                                                status: iz.status,
                                                total_area: iz.total_area,
                                                investment_total:
                                                    iz.investment_total,
                                                positions,
                                            };
                                            setActiveEntity(entity);
                                            setActivePlot(null);
                                            setActiveRegion(null);
                                            onEntitySelect?.(iz.id, 'iz');
                                        },
                                    }}
                                />
                            </React.Fragment>
                        );
                    })}

                {/* Subsoil Layer */}
                {(activeTab === 'all' || activeTab === 'subsoil') &&
                    subsoilUsers.map((su) => {
                        const positions = (
                            Array.isArray(su.location) ? su.location : []
                        )
                            .map((point) => {
                                const pt = getLatLng(point);
                                return pt ? [pt.lat, pt.lng] : null;
                            })
                            .filter((p): p is [number, number] => p !== null);

                        if (positions.length === 0) return null;
                        const isSelected =
                            activeEntity?.type === 'subsoil' &&
                            activeEntity?.id === su.id;
                        const shouldMute = hasSelection && !isSelected;

                        return (
                            <React.Fragment key={`su-${su.id}`}>
                                {isSelected && (
                                    <Polygon
                                        positions={positions}
                                        interactive={false}
                                        pathOptions={{
                                            color: '#9ca3af',
                                            weight: 10,
                                            opacity: 0.35,
                                            fillOpacity: 0,
                                            className:
                                                'map-live-halo map-live-halo--subsoil',
                                        }}
                                    />
                                )}
                                <Polygon
                                    positions={positions}
                                    pathOptions={{
                                        color: '#1f2937',
                                        fillColor: '#4b5563',
                                        fillOpacity: isSelected
                                            ? 0.4
                                            : shouldMute
                                              ? 0.14
                                              : 0.5,
                                        weight: isSelected ? 3 : 2,
                                        opacity: isSelected
                                            ? 1
                                            : shouldMute
                                              ? 0.45
                                              : 0.95,
                                        dashArray: isSelected
                                            ? ''
                                            : shouldMute
                                              ? '2, 6'
                                              : undefined,
                                        className: cx(
                                            'map-entity-polygon map-entity-polygon--subsoil',
                                            isSelected &&
                                                'map-live-focus map-live-focus--subsoil',
                                            shouldMute && 'map-live-muted',
                                        ),
                                    }}
                                    eventHandlers={{
                                        click: (e) => {
                                            L.DomEvent.stopPropagation(e);
                                            const entity = {
                                                id: su.id,
                                                name: su.name,
                                                type: 'subsoil' as const,
                                                mineral_type: su.mineral_type,
                                                positions,
                                            };
                                            setActiveEntity(entity);
                                            setActivePlot(null);
                                            setActiveRegion(null);
                                            onEntitySelect?.(su.id, 'subsoil');
                                        },
                                    }}
                                />
                            </React.Fragment>
                        );
                    })}

                {/* Mock Plots Layer */}
                {plots
                    .filter((plot) => {
                        if (!activeEntity) return true;
                        if (activeEntity.type === 'sez')
                            return plot.sezIds.includes(activeEntity.id);
                        if (activeEntity.type === 'iz')
                            return plot.izIds.includes(activeEntity.id);
                        if (activeEntity.type === 'subsoil')
                            return plot.subsoilIds.includes(activeEntity.id);
                        return true;
                    })
                    .map((plot) => {
                        const statusColors = getProjectStatusColor(
                            plot.statusRaw,
                        );
                        const isSelected = activePlot?.id === plot.id;
                        const shouldMute = hasSelection && !isSelected;

                        return (
                            <React.Fragment key={plot.id}>
                                {isSelected && (
                                    <Polygon
                                        positions={plot.geometry}
                                        interactive={false}
                                        pathOptions={{
                                            color: statusColors.color,
                                            weight: 11,
                                            opacity: 0.3,
                                            fillOpacity: 0,
                                            className:
                                                'map-live-halo map-live-halo--project',
                                        }}
                                    />
                                )}
                                <Polygon
                                    positions={plot.geometry}
                                    pathOptions={{
                                        color: statusColors.color,
                                        weight: isSelected
                                            ? 4
                                            : shouldMute
                                              ? 2
                                              : 3,
                                        opacity: isSelected
                                            ? 1
                                            : shouldMute
                                              ? 0.45
                                              : 0.95,
                                        dashArray: isSelected
                                            ? ''
                                            : shouldMute
                                              ? '4, 6'
                                              : undefined,
                                        fillOpacity: isSelected
                                            ? 0.36
                                            : shouldMute
                                              ? 0.07
                                              : 0.15,
                                        fillColor: statusColors.fillColor,
                                        className: cx(
                                            'map-project-polygon',
                                            isSelected &&
                                                'map-live-focus map-live-focus--project',
                                            shouldMute && 'map-live-muted',
                                        ),
                                    }}
                                    eventHandlers={{
                                        click: (e) => {
                                            L.DomEvent.stopPropagation(e); // Prevent map/polygon click
                                            setActivePlot(plot);
                                            setActiveRegion(null); // Close region popup
                                            onProjectSelect?.(plot.id);
                                        },
                                    }}
                                />
                            </React.Fragment>
                        );
                    })}
            </MapContainer>

            <div
                className={cx(
                    'invest-map-atmosphere pointer-events-none absolute inset-0 z-[10] rounded-xl',
                    hasSelection && 'invest-map-atmosphere--focused',
                )}
            />

            {/* Active Region Popup */}
            {activeRegion && !activeEntity && (
                <>
                    {/* Arrow pointing to region */}
                    <div className="absolute top-[60px] right-[340px] z-[399]">
                        <div className="relative">
                            <div className="h-0 w-0 border-t-[15px] border-r-[20px] border-b-[15px] border-t-transparent border-r-[#1d3b6f] border-b-transparent"></div>
                        </div>
                    </div>

                    <div className="absolute top-4 right-4 z-[400] w-[320px] animate-in overflow-hidden rounded-xl bg-white shadow-2xl duration-300 fade-in slide-in-from-right-4">
                        <Card className="gap-0 rounded-none border-none py-0 font-sans shadow-none">
                            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 bg-[#1d3b6f] px-4 py-3 text-white">
                                <CardTitle className="text-lg font-bold tracking-tight text-white">
                                    {activeRegion.name}
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 rounded-full text-white hover:bg-white/20"
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
                                    const stats = getRegionStats(
                                        activeRegion.id,
                                    );
                                    return (
                                        <div className="space-y-0 bg-white">
                                            {/* Объем инвестиций */}
                                            <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
                                                <p className="mb-1 text-sm text-gray-600">
                                                    Объем инвестиций:
                                                </p>
                                                <p className="text-xl font-bold text-blue-600">
                                                    {formatInvestment(
                                                        stats.investments,
                                                    )}
                                                </p>
                                            </div>

                                            {/* Проектов в ИЗ */}
                                            <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
                                                <span className="text-base text-gray-700">
                                                    Проектов в ИЗ:
                                                </span>
                                                <span className="text-xl font-bold text-blue-600">
                                                    {stats.izProjects}
                                                </span>
                                            </div>

                                            {/* Проектов в СЭЗ */}
                                            <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
                                                <span className="text-base text-gray-700">
                                                    Проектов в СЭЗ:
                                                </span>
                                                <span className="text-xl font-bold text-blue-600">
                                                    {stats.sezProjects}
                                                </span>
                                            </div>

                                            {/* Недропользователи */}
                                            <div className="flex items-center justify-between bg-white px-4 py-3">
                                                <span className="text-base text-gray-700">
                                                    Недропользователи:
                                                </span>
                                                <span className="text-xl font-bold text-blue-600">
                                                    {stats.subsoilUsers}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </CardContent>
                            <CardFooter className="bg-blue-800 p-0">
                                <Link
                                    href={`/regions/${activeRegion.id}`}
                                    className="w-full"
                                >
                                    <Button
                                        className="flex h-14 w-full items-center justify-center gap-2 rounded-none border-none bg-[#1d3b6f] text-base font-semibold text-white shadow-none hover:bg-blue-900"
                                        size="sm"
                                    >
                                        Подробнее о районе{' '}
                                        <ChevronRight className="h-5 w-5" />
                                    </Button>
                                </Link>
                            </CardFooter>
                        </Card>
                    </div>
                </>
            )}

            {/* Active Plot Popup */}
            {activePlot && (
                <div className="absolute top-4 right-4 z-[400] w-[340px] animate-in overflow-hidden rounded-xl bg-white shadow-2xl duration-300 fade-in slide-in-from-right-4">
                    <Card className="gap-0 rounded-none border-none py-0 font-sans shadow-none">
                        <CardHeader className="relative flex flex-row items-center justify-between space-y-0 bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-3 text-white">
                            <div className="min-w-0 flex-1 pr-2">
                                <CardTitle className="text-base leading-tight font-bold tracking-tight">
                                    {activePlot.name || 'Инвестиционный проект'}
                                </CardTitle>
                                {activePlot.companyName && (
                                    <p className="mt-0.5 truncate text-xs text-white/80">
                                        {activePlot.companyName}
                                    </p>
                                )}
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0 rounded-full text-white hover:bg-white/20"
                                onClick={() => setActivePlot(null)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="max-h-[400px] overflow-y-auto p-0">
                            <div className="gap-0 divide-y divide-gray-100">
                                {/* Статус */}
                                {activePlot.statusRaw && (
                                    <div className="flex items-center justify-between px-4 py-2.5">
                                        <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                                            Статус
                                        </p>
                                        <span
                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                                activePlot.statusRaw === 'plan'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : activePlot.statusRaw ===
                                                        'implementation'
                                                      ? 'bg-amber-100 text-amber-800'
                                                      : activePlot.statusRaw ===
                                                          'launched'
                                                        ? 'bg-green-100 text-green-800'
                                                        : activePlot.statusRaw ===
                                                            'suspended'
                                                          ? 'bg-yellow-100 text-yellow-800'
                                                          : 'bg-gray-100 text-gray-800'
                                            }`}
                                        >
                                            {activePlot.statusRaw === 'plan'
                                                ? 'Планирование'
                                                : activePlot.statusRaw ===
                                                    'implementation'
                                                  ? 'Реализация'
                                                  : activePlot.statusRaw ===
                                                      'launched'
                                                    ? 'Запущен'
                                                    : activePlot.statusRaw ===
                                                        'suspended'
                                                      ? 'Приостановлен'
                                                      : activePlot.statusRaw}
                                        </span>
                                    </div>
                                )}

                                {/* Инвестиции */}
                                {activePlot.totalInvestment !== undefined &&
                                    activePlot.totalInvestment !== null && (
                                        <div className="flex items-center justify-between px-4 py-2.5">
                                            <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                                                Инвестиции
                                            </p>
                                            <p className="text-sm font-bold text-gray-900">
                                                {formatInvestment(
                                                    Number(
                                                        activePlot.totalInvestment,
                                                    ),
                                                )}
                                            </p>
                                        </div>
                                    )}

                                {/* Тип проекта */}
                                {activePlot.projectTypeName && (
                                    <div className="flex items-center justify-between px-4 py-2.5">
                                        <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                                            Тип проекта
                                        </p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {activePlot.projectTypeName}
                                        </p>
                                    </div>
                                )}

                                {/* Сроки */}
                                {(activePlot.startDate ||
                                    activePlot.endDate) && (
                                    <div className="flex items-center justify-between px-4 py-2.5">
                                        <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                                            Сроки
                                        </p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {activePlot.startDate
                                                ? new Date(
                                                      activePlot.startDate,
                                                  ).toLocaleDateString('ru-RU')
                                                : '—'}
                                            {' — '}
                                            {activePlot.endDate
                                                ? new Date(
                                                      activePlot.endDate,
                                                  ).toLocaleDateString('ru-RU')
                                                : '—'}
                                        </p>
                                    </div>
                                )}

                                {/* Исполнители */}
                                {activePlot.executorNames &&
                                    activePlot.executorNames.length > 0 && (
                                        <div className="px-4 py-2.5">
                                            <p className="mb-1 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                                                Исполнители
                                            </p>
                                            <div className="flex flex-wrap gap-1">
                                                {activePlot.executorNames.map(
                                                    (name, i) => (
                                                        <span
                                                            key={i}
                                                            className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700"
                                                        >
                                                            {name}
                                                        </span>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}

                                {/* Секторы: СЭЗ, ИЗ, Недропользователи */}
                                {((activePlot.sezNames &&
                                    activePlot.sezNames.length > 0) ||
                                    (activePlot.izNames &&
                                        activePlot.izNames.length > 0) ||
                                    (activePlot.subsoilNames &&
                                        activePlot.subsoilNames.length >
                                            0)) && (
                                    <div className="px-4 py-2.5">
                                        <p className="mb-1 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                                            Секторы
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {activePlot.sezNames?.map(
                                                (name, i) => (
                                                    <span
                                                        key={`sez-${i}`}
                                                        className="inline-flex items-center rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-800"
                                                    >
                                                        СЭЗ: {name}
                                                    </span>
                                                ),
                                            )}
                                            {activePlot.izNames?.map(
                                                (name, i) => (
                                                    <span
                                                        key={`iz-${i}`}
                                                        className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
                                                    >
                                                        ИЗ: {name}
                                                    </span>
                                                ),
                                            )}
                                            {activePlot.subsoilNames?.map(
                                                (name, i) => (
                                                    <span
                                                        key={`su-${i}`}
                                                        className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-800"
                                                    >
                                                        Недропользование: {name}
                                                    </span>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Описание */}
                                {activePlot.description && (
                                    <div className="px-4 py-2.5">
                                        <p className="mb-0.5 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                                            Описание
                                        </p>
                                        <p className="line-clamp-3 text-sm leading-snug text-gray-700">
                                            {activePlot.description}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter className="border-t border-gray-100 bg-gray-50/50 p-3">
                            <Link
                                href={`/investment-projects/${activePlot.id}`}
                                className="w-full"
                            >
                                <Button className="h-9 w-full bg-orange-500 text-sm font-medium text-white shadow-none hover:bg-orange-600">
                                    Подробнее о проекте
                                </Button>
                            </Link>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {/* Sector Summary Table */}
            {sectorSummary &&
                (() => {
                    const data =
                        activeRegion?.id &&
                        sectorSummary.byRegion[activeRegion.id]
                            ? sectorSummary.byRegion[activeRegion.id]
                            : sectorSummary.total;

                    const rows: { key: string; label: string; d: SectorRow }[] =
                        [
                            { key: 'sez', label: 'СЭЗ', d: data.sez },
                            { key: 'iz', label: 'ИЗ', d: data.iz },
                            {
                                key: 'nedro',
                                label: 'Недропользование',
                                d: data.nedro,
                            },
                            {
                                key: 'invest',
                                label: 'Turkistan Invest',
                                d: data.invest,
                            },
                        ];

                    return (
                        <div className="absolute inset-x-5 bottom-4 z-[400] sm:inset-x-8 lg:inset-x-10">
                            <div className="mx-auto w-full max-w-[1360px] overflow-hidden rounded-[2px] border border-slate-300/70 bg-white/65 shadow-lg backdrop-blur-sm">
                                <div className="custom-scrollbar overflow-x-auto">
                                    <table className="w-full min-w-[780px] border-collapse text-left text-sm">
                                        <thead className="border-b border-slate-300/60 bg-slate-100/70">
                                            <tr className="text-[13px] font-semibold text-[#4e6882]">
                                                <th className="border-r border-slate-300/40 px-4 py-2.5 sm:px-5">
                                                    Сектор
                                                </th>
                                                <th className="border-r border-slate-300/40 px-4 py-2.5 text-center sm:px-5">
                                                    Инвестиции
                                                </th>
                                                <th className="border-r border-slate-300/40 px-4 py-2.5 text-center sm:px-5">
                                                    Кол-во проектов
                                                </th>
                                                <th className="border-r border-slate-300/40 px-4 py-2.5 text-center sm:px-5">
                                                    Проблемные вопросы
                                                </th>
                                                <th className="px-4 py-2.5 text-center sm:px-5">
                                                    Организации
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white/35">
                                            {rows.map((row) => (
                                                <tr
                                                    key={row.key}
                                                    className="border-b border-slate-300/30 last:border-b-0"
                                                >
                                                    <td className="border-r border-slate-300/30 px-4 py-2.5 font-semibold text-slate-700 sm:px-5">
                                                        {row.label}
                                                    </td>
                                                    <td className="border-r border-slate-300/30 px-4 py-2.5 text-center text-xl font-bold text-[#0d5b96] sm:px-5">
                                                        {formatInvestment(
                                                            row.d.investment,
                                                        )}
                                                    </td>
                                                    <td className="border-r border-slate-300/30 px-4 py-2.5 text-center text-xl font-bold text-[#0d5b96] sm:px-5">
                                                        {formatCount(
                                                            row.d.projectCount,
                                                        )}
                                                    </td>
                                                    <td className="border-r border-slate-300/30 px-4 py-2.5 text-center text-xl font-bold text-[#0d5b96] sm:px-5">
                                                        {formatCount(
                                                            row.d.problemCount,
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-center text-xl font-bold text-[#0d5b96] sm:px-5">
                                                        {formatCount(
                                                            row.d.orgCount,
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    );
                })()}
        </div>
    );
}
