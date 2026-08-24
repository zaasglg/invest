import { MapPin } from 'lucide-react';
import { useState } from 'react';

import Map from '@/components/map';
import { Card } from '@/components/ui/card';

type ZoneType = 'sez' | 'iz' | 'prom';

interface ZoneMapEntity {
    id: number;
    name: string;
    status?: string;
    total_area?: number;
    location?: unknown;
}

interface ZoneMapProject {
    id: number;
    name: string;
    company_name?: string;
    total_investment?: number | string | null;
    status?: string;
    geometry?: unknown;
}

interface ZoneTerritoryMapCardProps {
    entity: ZoneMapEntity;
    entityType: ZoneType;
    projects?: ZoneMapProject[];
}

const zoneLabels: Record<
    ZoneType,
    { boundary: string; emptyDescription: string }
> = {
    sez: {
        boundary: 'СЭЗ шекарасы',
        emptyDescription:
            'СЭЗ аумағының координаттарын өңдеу бөлімінде қосыңыз.',
    },
    iz: {
        boundary: 'Индустриялық аймақ шекарасы',
        emptyDescription:
            'Индустриялық аймақ координаттарын өңдеу бөлімінде қосыңыз.',
    },
    prom: {
        boundary: 'Пром-аймақ шекарасы',
        emptyDescription: 'Пром-аймақ координаттарын өңдеу бөлімінде қосыңыз.',
    },
};

function normalizeBoundary(value: unknown): { lat: number; lng: number }[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter(
            (point): point is { lat?: unknown; lng?: unknown } =>
                typeof point === 'object' && point !== null,
        )
        .map((point) => ({
            lat: Number(point.lat),
            lng: Number(point.lng),
        }))
        .filter(
            (point) => Number.isFinite(point.lat) && Number.isFinite(point.lng),
        );
}

export default function ZoneTerritoryMapCard({
    entity,
    entityType,
    projects = [],
}: ZoneTerritoryMapCardProps) {
    const [baseLayer, setBaseLayer] = useState<'standard' | 'satellite'>(
        'standard',
    );
    const boundary = normalizeBoundary(entity.location);
    const hasBoundary = boundary.length >= 3;
    const firstPoint = boundary[0];
    const center: [number, number] = firstPoint
        ? [firstPoint.lat, firstPoint.lng]
        : [43.3016, 68.2692];
    const labels = zoneLabels[entityType];
    const normalizedEntity = { ...entity, location: boundary };
    const normalizedProjects = projects.flatMap((project) => {
        const geometry = normalizeBoundary(project.geometry);

        if (geometry.length === 0) {
            return [];
        }

        return [
            {
                ...project,
                geometry,
                ...(entityType === 'sez'
                    ? { sezs: [{ id: entity.id, name: entity.name }] }
                    : {}),
                ...(entityType === 'iz'
                    ? {
                          industrial_zones: [
                              { id: entity.id, name: entity.name },
                          ],
                      }
                    : {}),
                ...(entityType === 'prom'
                    ? { prom_zones: [{ id: entity.id, name: entity.name }] }
                    : {}),
            },
        ];
    });
    const entityLayer =
        entityType === 'sez'
            ? { sezs: [normalizedEntity] }
            : entityType === 'iz'
              ? { industrialZones: [normalizedEntity] }
              : { promZones: [normalizedEntity] };

    return (
        <Card className="overflow-hidden border-slate-200/80 py-0 shadow-none">
            <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-[10px] font-bold tracking-[0.14em] text-gold-dark uppercase">
                        Аумақ картасы
                    </p>
                    <h2 className="mt-1 text-lg font-extrabold tracking-tight text-navy">
                        {entity.name} орналасуы
                    </h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div
                        aria-label="Карта түрін таңдау"
                        className="inline-flex rounded-lg bg-slate-100 p-1"
                        role="group"
                    >
                        {(
                            [
                                ['standard', 'Қалыпты'],
                                ['satellite', 'Спутник'],
                            ] as const
                        ).map(([value, label]) => {
                            const isActive = baseLayer === value;

                            return (
                                <button
                                    key={value}
                                    aria-pressed={isActive}
                                    className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                                        isActive
                                            ? 'bg-white text-navy shadow-sm ring-1 ring-slate-200'
                                            : 'text-slate-500 hover:text-navy'
                                    }`}
                                    type="button"
                                    onClick={() => setBaseLayer(value)}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <span className="size-2 rounded-full bg-violet-500" />
                        <span>{labels.boundary}</span>
                        {entity.total_area !== undefined && (
                            <span className="ml-1 rounded-full bg-slate-100 px-2.5 py-1 text-navy tabular-nums">
                                {entity.total_area} га
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="relative h-[360px] bg-slate-100 sm:h-[440px]">
                {hasBoundary ? (
                    <Map
                        {...entityLayer}
                        aria-label={
                            normalizedProjects.length > 0
                                ? `${entity.name} аумағы мен инвестициялық жобаларының картасы`
                                : `${entity.name} аумағының картасы`
                        }
                        activeTab={entityType}
                        baseLayer={baseLayer}
                        center={center}
                        className="h-full w-full"
                        fitBounds
                        interactive
                        projects={normalizedProjects}
                        selectedEntityId={entity.id}
                        selectedEntityType={entityType}
                        showPolygons={false}
                        zoom={14}
                    />
                ) : (
                    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                        <span className="flex size-11 items-center justify-center rounded-full bg-white text-gold-dark shadow-sm ring-1 ring-slate-200">
                            <MapPin className="size-5" />
                        </span>
                        <p className="mt-4 text-sm font-bold text-navy">
                            Карта координаттары көрсетілмеген
                        </p>
                        <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
                            {labels.emptyDescription}
                        </p>
                    </div>
                )}
            </div>
        </Card>
    );
}
