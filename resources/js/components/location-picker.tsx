import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { Plus, Trash2, Undo2, X } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
    MapContainer,
    TileLayer,
    Polygon,
    Marker,
    useMapEvents,
    useMap,
} from 'react-leaflet';
import { Button } from '@/components/ui/button';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LatLng {
    lat: number;
    lng: number;
}

// Normalize a point that might have corrupted lat/lng (arrays instead of numbers)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizePoint(point: any): LatLng | null {
    if (!point) return null;
    let lat = point.lat;
    let lng = point.lng;

    // Handle corrupted data where lat/lng are arrays instead of numbers
    if (Array.isArray(lat)) lat = lat[0];
    if (Array.isArray(lng)) lng = lng[0];

    lat = Number(lat);
    lng = Number(lng);

    if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
    }
    return null;
}

interface OverlayEntity {
    id: number;
    name: string;
    type: 'sez' | 'iz' | 'subsoil';
    location?: LatLng[] | null;
}

// Normalize geometry to multi-polygon format (LatLng[][])
// Handles both old format (LatLng[]) and new format (LatLng[][])
export function normalizeToMultiPolygon(val: unknown): LatLng[][] {
    if (!val || !Array.isArray(val) || val.length === 0) return [[]];
    // Check if it's already multi-polygon: first element is an array
    if (Array.isArray(val[0])) {
        return (val as Record<string, unknown>[][]).map((polygon) =>
            polygon.map(normalizePoint).filter((p): p is LatLng => p !== null),
        );
    }
    // Single polygon: array of {lat, lng} objects
    if (
        val[0] &&
        typeof val[0] === 'object' &&
        ('lat' in val[0] || 'lng' in val[0])
    ) {
        return [val.map(normalizePoint).filter((p): p is LatLng => p !== null)];
    }
    return [[]];
}

interface BaseProps {
    value?: LatLng[][] | LatLng[];
    className?: string;
    regionBoundary?: LatLng[][] | LatLng[];
    overlayEntities?: OverlayEntity[];
    mapStyle?: 'satellite' | 'standard';
}

interface SinglePolygonProps extends BaseProps {
    multiPolygon?: false;
    onChange: (value: LatLng[]) => void;
}

interface MultiPolygonProps extends BaseProps {
    multiPolygon: true;
    onChange: (value: LatLng[][]) => void;
}

type Props = SinglePolygonProps | MultiPolygonProps;

function MapEvents({ onClick }: { onClick: (e: L.LeafletMouseEvent) => void }) {
    useMapEvents({
        click: onClick,
    });
    return null;
}

function FitBoundsController({
    regionBoundary,
    overlayEntities,
}: {
    regionBoundary?: LatLng[][] | LatLng[];
    overlayEntities?: OverlayEntity[];
}) {
    const map = useMap();
    const prevBoundsKey = useRef('');

    useEffect(() => {
        const allPoints: [number, number][] = [];

        // Collect selected entity points first (priority)
        if (overlayEntities && overlayEntities.length > 0) {
            overlayEntities.forEach((e) => {
                if (e.location && Array.isArray(e.location)) {
                    e.location.forEach((p) => {
                        if (
                            p &&
                            typeof p.lat === 'number' &&
                            typeof p.lng === 'number'
                        ) {
                            allPoints.push([p.lat, p.lng]);
                        }
                    });
                }
            });
        }

        // If no entity points, use region boundary (multi-polygon)
        if (allPoints.length === 0 && regionBoundary) {
            const normalized = normalizeToMultiPolygon(regionBoundary);
            normalized.forEach((polygon) => {
                polygon.forEach((p) => {
                    if (
                        p &&
                        typeof p.lat === 'number' &&
                        typeof p.lng === 'number'
                    ) {
                        allPoints.push([p.lat, p.lng]);
                    }
                });
            });
        }

        // Only fit bounds if the underlying data actually changed
        const boundsKey = JSON.stringify(allPoints);
        if (boundsKey === prevBoundsKey.current) return;
        prevBoundsKey.current = boundsKey;

        if (allPoints.length > 0) {
            const bounds = L.latLngBounds(allPoints);
            map.fitBounds(bounds, {
                padding: [40, 40],
                maxZoom: 15,
                animate: true,
                duration: 0.5,
            });
        }
    }, [regionBoundary, overlayEntities, map]);

    return null;
}

const entityColors: Record<string, { color: string; fill: string }> = {
    sez: { color: '#7c3aed', fill: '#8b5cf6' },
    iz: { color: '#d97706', fill: '#f59e0b' },
    subsoil: { color: '#1f2937', fill: '#4b5563' },
};

export default function LocationPicker(props: Props) {
    const {
        value = [[]],
        className,
        regionBoundary,
        overlayEntities,
        mapStyle = 'satellite',
    } = props;
    const isMultiPolygon = props.multiPolygon === true;
    const [polygons, setPolygons] = useState<LatLng[][]>(() =>
        normalizeToMultiPolygon(value),
    );
    const [activeIndex, setActiveIndex] = useState(0);
    const isInternalChange = useRef(false);
    const onChangeRef = useRef(props.onChange);
    useEffect(() => {
        onChangeRef.current = props.onChange;
    }, [props.onChange]);

    // Sync external value changes to internal state,
    // but skip when the change originated from within this component
    useEffect(() => {
        if (isInternalChange.current) {
            isInternalChange.current = false;
            return;
        }
        const normalized = normalizeToMultiPolygon(value);
        setPolygons(normalized);
        if (activeIndex >= normalized.length) {
            setActiveIndex(Math.max(0, normalized.length - 1));
        }
    }, [value]);

    const emitChange = useCallback(
        (newPolygons: LatLng[][]) => {
            isInternalChange.current = true;
            if (isMultiPolygon) {
                (onChangeRef.current as (v: LatLng[][]) => void)(newPolygons);
            } else {
                (onChangeRef.current as (v: LatLng[]) => void)(
                    newPolygons[0] || [],
                );
            }
        },
        [isMultiPolygon],
    );

    const handleMapClick = useCallback(
        (e: L.LeafletMouseEvent) => {
            const newPoint = { lat: e.latlng.lat, lng: e.latlng.lng };
            setPolygons((prev) => {
                const updated = prev.map((poly, i) =>
                    i === activeIndex ? [...poly, newPoint] : poly,
                );
                emitChange(updated);
                return updated;
            });
        },
        [activeIndex, emitChange],
    );

    const handleClear = useCallback(() => {
        setPolygons((prev) => {
            const updated = prev.map((poly, i) =>
                i === activeIndex ? [] : poly,
            );
            emitChange(updated);
            return updated;
        });
    }, [activeIndex, emitChange]);

    const handleUndo = useCallback(() => {
        setPolygons((prev) => {
            const updated = prev.map((poly, i) =>
                i === activeIndex ? poly.slice(0, -1) : poly,
            );
            emitChange(updated);
            return updated;
        });
    }, [activeIndex, emitChange]);

    const handleAddPolygon = useCallback(() => {
        setPolygons((prev) => {
            const updated = [...prev, []];
            setActiveIndex(updated.length - 1);
            emitChange(updated);
            return updated;
        });
    }, [emitChange]);

    const handleRemovePolygon = useCallback(
        (index: number) => {
            setPolygons((prev) => {
                if (prev.length <= 1) {
                    const updated = [[]];
                    setActiveIndex(0);
                    emitChange(updated);
                    return updated;
                }
                const updated = prev.filter((_, i) => i !== index);
                const newActive =
                    index >= updated.length ? updated.length - 1 : index;
                setActiveIndex(newActive);
                emitChange(updated);
                return updated;
            });
        },
        [emitChange],
    );

    const activePoints = polygons[activeIndex] || [];

    // Center on Turkestan region by default
    const center: [number, number] = [43.3, 68.25];

    // Normalize regionBoundary to multi-polygon
    const normalizedBoundary = regionBoundary
        ? normalizeToMultiPolygon(regionBoundary)
        : [];

    return (
        <div
            className={`relative w-full overflow-hidden rounded-md border ${className}`}
        >
            <div className="h-[400px]">
                <MapContainer
                    center={center}
                    zoom={9}
                    scrollWheelZoom={true}
                    className="z-0 h-full w-full"
                >
                    {mapStyle === 'standard' ? (
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                    ) : (
                        <TileLayer
                            attribution="Tiles &copy; Esri"
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        />
                    )}

                    <MapEvents onClick={handleMapClick} />
                    <FitBoundsController
                        regionBoundary={regionBoundary}
                        overlayEntities={overlayEntities}
                    />

                    {normalizedBoundary.map((boundary, bIdx) => {
                        const safeBoundary = boundary
                            .map(normalizePoint)
                            .filter((p): p is LatLng => p !== null);
                        return safeBoundary.length > 0 ? (
                            <Polygon
                                key={`boundary-${bIdx}`}
                                positions={safeBoundary}
                                pathOptions={{
                                    color: '#3b82f6',
                                    fillColor: '#dbeafe',
                                    fillOpacity: 0.1,
                                    weight: 2,
                                    dashArray: '6, 4',
                                }}
                            />
                        ) : null;
                    })}

                    {overlayEntities &&
                        overlayEntities.map((entity) => {
                            if (
                                !entity.location ||
                                !Array.isArray(entity.location) ||
                                entity.location.length === 0
                            )
                                return null;
                            const positions = entity.location
                                .filter(
                                    (p) =>
                                        p &&
                                        typeof p.lat === 'number' &&
                                        typeof p.lng === 'number',
                                )
                                .map((p) => [p.lat, p.lng] as [number, number]);
                            if (positions.length === 0) return null;
                            const colors =
                                entityColors[entity.type] || entityColors.sez;
                            return (
                                <Polygon
                                    key={`${entity.type}-${entity.id}`}
                                    positions={positions}
                                    pathOptions={{
                                        color: colors.color,
                                        fillColor: colors.fill,
                                        fillOpacity: 0.15,
                                        weight: 2,
                                        dashArray: '5, 5',
                                    }}
                                />
                            );
                        })}

                    {/* Inactive polygons */}
                    {polygons.map((poly, idx) => {
                        if (idx === activeIndex || poly.length === 0)
                            return null;
                        return (
                            <Polygon
                                key={`poly-${idx}`}
                                positions={poly}
                                pathOptions={{
                                    color: '#6b7280',
                                    fillColor: '#9ca3af',
                                    fillOpacity: 0.15,
                                    weight: 2,
                                    dashArray: '4, 4',
                                }}
                            />
                        );
                    })}

                    {/* Active polygon */}
                    {activePoints.length > 0 && (
                        <>
                            <Polygon
                                positions={activePoints}
                                pathOptions={{ color: 'blue' }}
                            />
                            {activePoints.map((point, idx) => (
                                <Marker
                                    key={`marker-${activeIndex}-${idx}`}
                                    position={point}
                                />
                            ))}
                        </>
                    )}
                </MapContainer>
            </div>

            <div className="absolute top-2 right-2 z-[400] flex flex-col gap-2">
                <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={handleUndo}
                    disabled={activePoints.length === 0}
                    title="Соңғы нүктені болдырмау"
                >
                    <Undo2 className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={handleClear}
                    disabled={activePoints.length === 0}
                    title="Ағымдағы полигонды тазалау"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            {/* Multi-polygon controls */}
            {isMultiPolygon ? (
                <div className="z-[400] flex items-center gap-1 border-t bg-white/95 px-2 py-1.5">
                    {polygons.map((poly, idx) => (
                        <div key={idx} className="flex items-center">
                            <button
                                type="button"
                                onClick={() => setActiveIndex(idx)}
                                className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                                    idx === activeIndex
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                Полигон {idx + 1}
                                {poly.length > 0 && (
                                    <span className="ml-1 opacity-70">
                                        ({poly.length})
                                    </span>
                                )}
                            </button>
                            {polygons.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => handleRemovePolygon(idx)}
                                    className="ml-0.5 rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                                    title="Полигонды жою"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    ))}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleAddPolygon}
                        className="h-7 px-2 text-xs"
                        title="Жаңа полигон қосу"
                    >
                        <Plus className="mr-1 h-3 w-3" />
                        Жаңа
                    </Button>
                    <span className="ml-auto text-xs text-gray-400">
                        {activePoints.length === 0
                            ? 'Картаға басыңыз'
                            : `${activePoints.length} нүкте`}
                    </span>
                </div>
            ) : (
                <div className="pointer-events-none absolute bottom-2 left-2 z-[400] rounded bg-white/90 p-2 text-xs">
                    {activePoints.length === 0
                        ? 'Полигон нүктелерін қосу үшін картаға басыңыз'
                        : `Нүктелер: ${activePoints.length}`}
                </div>
            )}
        </div>
    );
}
