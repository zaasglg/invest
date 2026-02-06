import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useState, useEffect, useCallback } from 'react';
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

interface Props {
    value?: LatLng[];
    onChange: (value: LatLng[]) => void;
    className?: string;
}

function MapEvents({ onClick }: { onClick: (e: L.LeafletMouseEvent) => void }) {
    useMapEvents({
        click: onClick,
    });
    return null;
}

export default function LocationPicker({ value = [], onChange, className }: Props) {
    const [points, setPoints] = useState<LatLng[]>(value || []);

    useEffect(() => {
        setPoints(value || []);
    }, [value]);

    const handleMapClick = useCallback((e: L.LeafletMouseEvent) => {
        const newPoint = { lat: e.latlng.lat, lng: e.latlng.lng };
        const newPoints = [...points, newPoint];
        setPoints(newPoints);
        onChange(newPoints);
    }, [points, onChange]);

    const handleClear = () => {
        setPoints([]);
        onChange([]);
    };

    const handleUndo = () => {
        const newPoints = points.slice(0, -1);
        setPoints(newPoints);
        onChange(newPoints);
    };

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
