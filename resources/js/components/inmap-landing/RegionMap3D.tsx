import {
    geoArea,
    geoCentroid,
    geoContains,
    geoMercator,
    geoPath,
} from 'd3-geo';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RegionStatisticsPanel } from './RegionStatisticsPanel';

type RegionFeature = {
    type: 'Feature';
    id: string;
    properties: {
        kato: string;
        name: string;
        name_kk: string;
        kind: 'district' | 'city';
    };
    bbox: [number, number, number, number];
    geometry: unknown;
};

type RegionCollection = {
    type: 'FeatureCollection';
    source: string;
    features: RegionFeature[];
};

type CameraView = {
    width: number;
    height: number;
    scale: number;
    translate: [number, number];
};

const REGION_ID = 'kz.61';
const SINGLE_CONTOUR_CITIES = new Set(['kz.61.10', 'kz.61.20']);

function removeDetachedCityZones(
    collection: RegionCollection,
): RegionCollection {
    return {
        ...collection,
        features: collection.features.map((feature) => {
            if (!SINGLE_CONTOUR_CITIES.has(feature.id)) return feature;
            const geometry = feature.geometry as {
                type?: string;
                coordinates?: number[][][][];
            };
            if (
                geometry.type !== 'MultiPolygon' ||
                !geometry.coordinates?.length
            )
                return feature;

            const mainContour = geometry.coordinates.reduce(
                (largest, polygon) => {
                    const largestArea = geoArea({
                        type: 'Polygon',
                        coordinates: largest,
                    } as never);
                    const polygonArea = geoArea({
                        type: 'Polygon',
                        coordinates: polygon,
                    } as never);
                    return polygonArea > largestArea ? polygon : largest;
                },
            );

            return {
                ...feature,
                geometry: { ...geometry, coordinates: [mainContour] },
            };
        }),
    };
}

const clamp = (value: number, min = 0, max = 1) =>
    Math.min(max, Math.max(min, value));

const smooth = (value: number) => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
};

function territoryName(feature?: RegionFeature) {
    if (!feature) return 'Туркестанская область';
    if (feature.id === 'kz.61.10') return 'Туркестан';
    if (feature.id === 'kz.61.16') return 'Арысь';
    if (feature.id === 'kz.61.20') return 'Кентау';
    if (feature.id === 'kz.61.36') return 'Байдибекский район';
    if (feature.id === 'kz.61.55') return 'Сауранский район';
    return feature.properties.name;
}

function cameraFor(
    regions: RegionCollection,
    selectedId: string,
    width: number,
    height: number,
): CameraView {
    const base = geoMercator().fitExtent(
        [
            [width * 0.06, height * 0.025],
            [width * 0.94, height * 0.91],
        ],
        regions as never,
    );
    const selected = regions.features.find(
        (region) => region.id === selectedId,
    );
    if (!selected) {
        return {
            width,
            height,
            scale: base.scale(),
            translate: base.translate() as [number, number],
        };
    }

    const scale = base.scale() * 1.18;
    const projection = geoMercator().scale(scale).translate([0, 0]);
    const point = projection(geoCentroid(selected as never)) || [0, 0];
    return {
        width,
        height,
        scale,
        translate: [width * 0.5 - point[0], height * 0.47 - point[1]],
    };
}

export function RegionMap3D({ progress }: { progress: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const progressRef = useRef(progress);
    const drawRef = useRef<() => void>(() => undefined);
    const drawFrameRef = useRef(0);
    const selectedIdRef = useRef(REGION_ID);
    const liftWeightsRef = useRef<Record<string, number>>({});
    const liftFrameRef = useRef(0);
    const cameraViewRef = useRef<CameraView | null>(null);
    const [regions, setRegions] = useState<RegionCollection | null>(null);
    const hoveredIdRef = useRef<string | null>(null);
    const [selectedId, setSelectedId] = useState(REGION_ID);

    useEffect(() => {
        const controller = new AbortController();
        fetch('/data/turkestan-districts.json', { signal: controller.signal })
            .then((response) => response.json())
            .then((data: RegionCollection) =>
                setRegions(removeDetachedCityZones(data)),
            )
            .catch(() => undefined);
        return () => controller.abort();
    }, []);

    const selected = useMemo(
        () => regions?.features.find((item) => item.id === selectedId),
        [regions, selectedId],
    );
    const selectedName = territoryName(selected);

    useEffect(() => {
        selectedIdRef.current = selectedId;
        window.cancelAnimationFrame(liftFrameRef.current);
        if (!regions) return;

        const canvas = canvasRef.current;
        const width = canvas?.clientWidth || 1;
        const height = canvas?.clientHeight || 1;
        const startedAt = performance.now();
        const desiredCamera = cameraFor(regions, selectedId, width, height);
        const currentCamera = cameraViewRef.current;
        const startCamera =
            currentCamera &&
            currentCamera.width === width &&
            currentCamera.height === height
                ? {
                      ...currentCamera,
                      translate: [...currentCamera.translate] as [
                          number,
                          number,
                      ],
                  }
                : cameraFor(regions, REGION_ID, width, height);
        const startWeights = Object.fromEntries(
            regions.features.map((region) => [
                region.id,
                liftWeightsRef.current[region.id] || 0,
            ]),
        );

        const animateLift = (now: number) => {
            const amount = smooth((now - startedAt) / 480);
            cameraViewRef.current = {
                width,
                height,
                scale:
                    startCamera.scale +
                    (desiredCamera.scale - startCamera.scale) * amount,
                translate: [
                    startCamera.translate[0] +
                        (desiredCamera.translate[0] -
                            startCamera.translate[0]) *
                            amount,
                    startCamera.translate[1] +
                        (desiredCamera.translate[1] -
                            startCamera.translate[1]) *
                            amount,
                ],
            };
            for (const region of regions.features) {
                const target = region.id === selectedId ? 1 : 0;
                const start = startWeights[region.id] || 0;
                liftWeightsRef.current[region.id] =
                    start + (target - start) * amount;
            }
            drawRef.current();
            if (amount < 1)
                liftFrameRef.current =
                    window.requestAnimationFrame(animateLift);
        };

        liftFrameRef.current = window.requestAnimationFrame(animateLift);
        return () => window.cancelAnimationFrame(liftFrameRef.current);
    }, [regions, selectedId]);

    useEffect(() => {
        progressRef.current = progress;
        window.cancelAnimationFrame(drawFrameRef.current);
        drawFrameRef.current = window.requestAnimationFrame(() =>
            drawRef.current(),
        );
        return () => window.cancelAnimationFrame(drawFrameRef.current);
    }, [progress]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !regions) return;
        const context = canvas.getContext('2d');
        if (!context) return;
        const renderOrder = regions.features
            .map((region, index) => ({ region, index }))
            .sort(
                (a, b) =>
                    Number(a.region.properties.kind === 'city') -
                    Number(b.region.properties.kind === 'city'),
            );

        let width = canvas.clientWidth;
        let height = canvas.clientHeight;

        let projectionWidth = -1;
        let projectionHeight = -1;
        let baseCamera: CameraView | null = null;
        let cachedPaths: Path2D[] = [];
        let cachedWholePath = new Path2D();

        const ensureGeometry = (w: number, h: number) => {
            if (w !== projectionWidth || h !== projectionHeight) {
                projectionWidth = w;
                projectionHeight = h;
                baseCamera = cameraFor(regions, REGION_ID, w, h);
                cameraViewRef.current = cameraFor(
                    regions,
                    selectedIdRef.current,
                    w,
                    h,
                );
                const baseProjection = geoMercator()
                    .scale(baseCamera.scale)
                    .translate(baseCamera.translate);
                const path = geoPath(baseProjection);
                cachedPaths = regions.features.map(
                    (region) => new Path2D(path(region as never) || ''),
                );
                cachedWholePath = new Path2D();
                cachedPaths.forEach((featurePath) =>
                    cachedWholePath.addPath(featurePath),
                );
            }
        };

        const projectionFor = (w: number, h: number) => {
            ensureGeometry(w, h);
            const camera =
                cameraViewRef.current || cameraFor(regions, REGION_ID, w, h);
            return geoMercator()
                .scale(camera.scale)
                .translate(camera.translate);
        };

        const render = () => {
            width = canvas.clientWidth;
            height = canvas.clientHeight;
            const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
            const pixelWidth = Math.round(width * ratio);
            const pixelHeight = Math.round(height * ratio);
            if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
                canvas.width = pixelWidth;
                canvas.height = pixelHeight;
            }
            ensureGeometry(width, height);
            const camera =
                cameraViewRef.current ||
                cameraFor(regions, REGION_ID, width, height);
            const geometryCamera =
                baseCamera || cameraFor(regions, REGION_ID, width, height);
            const morph = smooth(clamp((progressRef.current - 0.36) / 0.64));
            const bordersReveal = smooth(clamp((morph - 0.18) / 0.62));
            const tilt = 0.052 * morph;
            const scaleY = 1 - 0.2 * morph;
            const offsetY = height * (0.025 + morph * 0.045);
            const depth = Math.max(12, Math.min(23, width * 0.025)) * morph;
            const mapZoom = camera.scale / geometryCamera.scale;
            const mapX =
                camera.translate[0] - geometryCamera.translate[0] * mapZoom;
            const mapY =
                camera.translate[1] - geometryCamera.translate[1] * mapZoom;
            const setMapTransform = (verticalOffset: number) => {
                context.setTransform(
                    ratio * mapZoom,
                    ratio * tilt * mapZoom,
                    0,
                    ratio * scaleY * mapZoom,
                    ratio * mapX,
                    ratio * (tilt * mapX + scaleY * mapY + verticalOffset),
                );
            };

            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            context.clearRect(0, 0, width, height);

            context.save();
            setMapTransform(offsetY + depth + 9 * morph);
            context.shadowColor = `rgba(0, 0, 0, ${0.58 * morph})`;
            context.shadowBlur = 30 * morph;
            context.fillStyle = `rgba(0, 8, 10, ${0.72 * morph})`;
            context.fill(cachedWholePath);
            context.restore();

            for (let layer = depth; layer >= 1; layer -= 3) {
                renderOrder.forEach(({ region, index }) => {
                    const cityLift =
                        region.properties.kind === 'city' ? 2.5 : 0;
                    const lift =
                        ((liftWeightsRef.current[region.id] || 0) * 11 +
                            cityLift) *
                        bordersReveal;
                    context.save();
                    setMapTransform(offsetY + layer - lift);
                    context.fillStyle = index % 2 === 0 ? '#092b2f' : '#0d3538';
                    context.fill(cachedPaths[index]);
                    context.strokeStyle = 'rgba(3, 18, 20, .72)';
                    context.lineWidth = 0.7;
                    context.stroke(cachedPaths[index]);
                    context.restore();
                });
            }

            renderOrder.forEach(({ region, index }) => {
                const isHovered = region.id === hoveredIdRef.current;
                const isCity = region.properties.kind === 'city';
                const selectedWeight = liftWeightsRef.current[region.id] || 0;
                const isSelected = selectedWeight > 0.001;
                const lift =
                    (selectedWeight * 11 + (isCity ? 2.5 : 0)) * bordersReveal;
                context.save();
                setMapTransform(offsetY - lift);
                if (isHovered && morph > 0.76) context.fillStyle = '#67aa78';
                else if (isCity) context.fillStyle = '#2d6764';
                else
                    context.fillStyle =
                        index % 3 === 0
                            ? '#184a48'
                            : index % 3 === 1
                              ? '#1c5350'
                              : '#225b55';
                context.shadowColor = isSelected
                    ? `rgba(165, 239, 82, ${0.24 * selectedWeight * bordersReveal})`
                    : 'transparent';
                context.shadowBlur = isSelected
                    ? 15 * selectedWeight * bordersReveal
                    : 0;
                context.fill(cachedPaths[index]);
                context.shadowBlur = 0;
                if (isSelected && morph > 0.68) {
                    context.fillStyle = `rgba(165, 239, 82, ${selectedWeight})`;
                    context.fill(cachedPaths[index]);
                }
                context.strokeStyle = isSelected
                    ? `rgba(239, 255, 222, ${selectedWeight * bordersReveal})`
                    : `rgba(196, 231, 224, ${0.08 + bordersReveal * 0.62})`;
                context.lineWidth = isSelected
                    ? 0.9 + selectedWeight * 0.9
                    : 0.9;
                context.stroke(cachedPaths[index]);
                context.restore();
            });
        };

        drawRef.current = render;

        const featureAt = (event: PointerEvent) => {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const screenY = event.clientY - rect.top;
            const morph = smooth(clamp((progressRef.current - 0.36) / 0.64));
            if (morph < 0.76) return undefined;
            const tilt = 0.052 * morph;
            const scaleY = 1 - 0.2 * morph;
            const offsetY = height * (0.025 + morph * 0.045);
            const y = (screenY - offsetY - tilt * x) / scaleY;
            const coordinates = projectionFor(width, height).invert?.([x, y]);
            if (!coordinates) return undefined;
            return regions.features
                .filter((region) => geoContains(region as never, coordinates))
                .sort((a, b) => {
                    const areaA =
                        (a.bbox[2] - a.bbox[0]) * (a.bbox[3] - a.bbox[1]);
                    const areaB =
                        (b.bbox[2] - b.bbox[0]) * (b.bbox[3] - b.bbox[1]);
                    return areaA - areaB;
                })[0];
        };

        const onMove = (event: PointerEvent) => {
            const region = featureAt(event);
            const nextId = region?.id ?? null;
            if (hoveredIdRef.current !== nextId) {
                hoveredIdRef.current = nextId;
                render();
            }
            canvas.style.cursor = region ? 'pointer' : 'default';
        };
        const onLeave = () => {
            if (hoveredIdRef.current !== null) {
                hoveredIdRef.current = null;
                render();
            }
        };
        const onClick = (event: PointerEvent) => {
            const region = featureAt(event);
            if (region) setSelectedId(region.id);
            else setSelectedId(REGION_ID);
        };

        render();
        const observer = new ResizeObserver(render);
        observer.observe(canvas);
        canvas.addEventListener('pointermove', onMove);
        canvas.addEventListener('pointerleave', onLeave);
        canvas.addEventListener('click', onClick);
        return () => {
            drawRef.current = () => undefined;
            observer.disconnect();
            canvas.removeEventListener('pointermove', onMove);
            canvas.removeEventListener('pointerleave', onLeave);
            canvas.removeEventListener('click', onClick);
        };
    }, [regions]);

    const layerOpacity = smooth((progress - 0.08) / 0.48);
    const mapTravel = smooth((progress - 0.06) / 0.84);
    const panelReveal = smooth((progress - 0.78) / 0.2);
    const mapShift = (1 - mapTravel) * 36;
    const mapScale = 0.56 + mapTravel * 0.44;

    return (
        <section
            className="region-explorer"
            id="region-map"
            style={{
                opacity: layerOpacity,
                pointerEvents: progress > 0.8 ? 'auto' : 'none',
            }}
        >
            <div className="explorer-grid" aria-hidden="true" />

            <div
                className="map-model-wrap"
                style={{
                    opacity: smooth(progress / 0.2),
                    transform: `translateX(${mapShift}vw) scale(${mapScale})`,
                }}
            >
                <div className="region-map-title">
                    <span>03</span> Карта региона
                </div>
                <canvas
                    ref={canvasRef}
                    className="region-model"
                    role="img"
                    aria-label="Интерактивная объёмная карта районов и городов Туркестанской области"
                />
                <div className="model-legend">
                    <span>
                        <i className="legend-district" /> Районы
                    </span>
                    <span>
                        <i className="legend-city" /> Города
                    </span>
                </div>
            </div>

            <RegionStatisticsPanel
                selectedId={selectedId}
                selectedName={selectedName}
                territories={(regions?.features ?? []).map((region) => ({
                    id: region.id,
                    name: territoryName(region),
                }))}
                onSelect={setSelectedId}
                reveal={panelReveal}
            />

            <div className="explorer-source" style={{ opacity: panelReveal }}>
                Границы: геопортал области · Показатели: официальные электронные
                таблицы БНС
            </div>
        </section>
    );
}
