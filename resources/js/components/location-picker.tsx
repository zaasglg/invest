import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Undo2 } from 'lucide-react';

// Fix icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
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

interface Props {
    value?: LatLng[];
    onChange: (value: LatLng[]) => void;
    className?: string;
    regionBoundary?: LatLng[];
    overlayEntities?: OverlayEntity[];
}

function MapEvents({ onClick }: { onClick: (e: L.LeafletMouseEvent) => void }) {
    useMapEvents({
        click: onClick,
    });
    return null;
}

function FitBoundsController({ regionBoundary, overlayEntities }: { regionBoundary?: LatLng[]; overlayEntities?: OverlayEntity[] }) {
    const map = useMap();
    const prevBoundsKey = useRef('');

    useEffect(() => {
        const allPoints: [number, number][] = [];

        // Collect selected entity points first (priority)
        if (overlayEntities && overlayEntities.length > 0) {
            overlayEntities.forEach(e => {
                if (e.location && Array.isArray(e.location)) {
                    e.location.forEach(p => {
                        if (p && typeof p.lat === 'number' && typeof p.lng === 'number') {
                            allPoints.push([p.lat, p.lng]);
                        }
                    });
                }
            });
        }

        // If no entity points, use region boundary
        if (allPoints.length === 0 && regionBoundary && regionBoundary.length > 0) {
            regionBoundary.forEach(p => {
                if (p && typeof p.lat === 'number' && typeof p.lng === 'number') {
                    allPoints.push([p.lat, p.lng]);
                }
            });
        }

        // Only fit bounds if the underlying data actually changed
        const boundsKey = JSON.stringify(allPoints);
        if (boundsKey === prevBoundsKey.current) return;
        prevBoundsKey.current = boundsKey;

        if (allPoints.length > 0) {
            const bounds = L.latLngBounds(allPoints);
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: true, duration: 0.5 });
        }
    }, [regionBoundary, overlayEntities, map]);

    return null;
}

const entityColors: Record<string, { color: string; fill: string }> = {
    sez: { color: '#7c3aed', fill: '#8b5cf6' },
    iz: { color: '#d97706', fill: '#f59e0b' },
    subsoil: { color: '#1f2937', fill: '#4b5563' },
};

// Convert various location formats to LatLng[]
function toLatLngArray(val: any): LatLng[] {
    if (!val) return [];
    // Already an array of points
    if (Array.isArray(val)) {
        return val
            .map(normalizePoint)
            .filter((p): p is LatLng => p !== null);
    }
    // Object with bounds (e.g. {center: [...], bounds: [[lat,lng],...]})
    if (typeof val === 'object' && 'bounds' in val && Array.isArray(val.bounds)) {
        return val.bounds
            .map((b: any) => {
                if (Array.isArray(b) && b.length >= 2) {
                    return { lat: Number(b[0]), lng: Number(b[1]) };
                }
                return normalizePoint(b);
            })
            .filter((p: LatLng | null): p is LatLng => p !== null);
    }
    return [];
}

export default function LocationPicker({ value = [], onChange, className, regionBoundary, overlayEntities }: Props) {
    const [points, setPoints] = useState<LatLng[]>(() => toLatLngArray(value));
    const isInternalChange = useRef(false);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    // Sync external value changes to internal state,
    // but skip when the change originated from within this component
    useEffect(() => {
        if (isInternalChange.current) {
            isInternalChange.current = false;
            return;
        }
        setPoints(toLatLngArray(value));
    }, [value]);

    const handleMapClick = useCallback((e: L.LeafletMouseEvent) => {
        const newPoint = { lat: e.latlng.lat, lng: e.latlng.lng };
        setPoints(prev => {
            const newPoints = [...prev, newPoint];
            isInternalChange.current = true;
            onChangeRef.current(newPoints);
            return newPoints;
        });
    }, []);

    const handleClear = useCallback(() => {
        isInternalChange.current = true;
        setPoints([]);
        onChangeRef.current([]);
    }, []);

    const handleUndo = useCallback(() => {
        setPoints(prev => {
            const newPoints = prev.slice(0, -1);
            isInternalChange.current = true;
            onChangeRef.current(newPoints);
            return newPoints;
        });
    }, []);

    // Center on Turkestan region by default
    const center: [number, number] = [43.3, 68.25];

    return (
        <div className={`relative h-[400px] w-full rounded-md border overflow-hidden ${className}`}>
            <MapContainer
                center={center}
                zoom={9}
                scrollWheelZoom={true}
                className="h-full w-full z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapEvents onClick={handleMapClick} />
                <FitBoundsController regionBoundary={regionBoundary} overlayEntities={overlayEntities} />

                {(() => {
                    const safeBoundary = (regionBoundary || [])
                        .map(normalizePoint)
                        .filter((p): p is LatLng => p !== null);
                    return safeBoundary.length > 0 ? (
                        <Polygon
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
                })()}

                {overlayEntities && overlayEntities.map((entity) => {
                    if (!entity.location || !Array.isArray(entity.location) || entity.location.length === 0) return null;
                    const positions = entity.location
                        .filter(p => p && typeof p.lat === 'number' && typeof p.lng === 'number')
                        .map(p => [p.lat, p.lng] as [number, number]);
                    if (positions.length === 0) return null;
                    const colors = entityColors[entity.type] || entityColors.sez;
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

                {points.length > 0 && (
                    <>
                        <Polygon positions={points} pathOptions={{ color: 'blue' }} />
                        {points.map((point, idx) => (
                            <Marker key={idx} position={point} />
                        ))}
                    </>
                )}
            </MapContainer>

            <div className="absolute top-2 right-2 flex flex-col gap-2 z-[400]">
                <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={handleUndo}
                    disabled={points.length === 0}
                    title="Отменить последнюю точку"
                >
                    <Undo2 className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={handleClear}
                    disabled={points.length === 0}
                    title="Очистить"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            <div className="absolute bottom-2 left-2 bg-white/90 p-2 rounded text-xs z-[400] pointer-events-none">
                {points.length === 0 ? 'Кликните по карте, чтобы добавить точки полигона' : `Точек: ${points.length}`}
            </div>
        </div>
    );
}
