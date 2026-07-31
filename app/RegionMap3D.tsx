"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, MapPin } from "lucide-react";
import { geoArea, geoCentroid, geoContains, geoMercator, geoPath } from "d3-geo";

type RegionFeature = {
  type: "Feature";
  id: string;
  properties: {
    kato: string;
    name: string;
    name_kk: string;
    kind: "district" | "city";
  };
  bbox: [number, number, number, number];
  geometry: unknown;
};

type RegionCollection = {
  type: "FeatureCollection";
  source: string;
  features: RegionFeature[];
};

type CameraView = {
  width: number;
  height: number;
  scale: number;
  translate: [number, number];
};

type RegionMetric = {
  id: string;
  label: string;
  unit: string;
  decimals: number;
  series: number[];
  years: string[];
  period: string;
  target: number;
  test?: boolean;
  facts?: Array<{ value: string; label: string }>;
};

const REGION_ID = "kz.61";
const SINGLE_CONTOUR_CITIES = new Set(["kz.61.10", "kz.61.20"]);

function removeDetachedCityZones(collection: RegionCollection): RegionCollection {
  return {
    ...collection,
    features: collection.features.map((feature) => {
      if (!SINGLE_CONTOUR_CITIES.has(feature.id)) return feature;
      const geometry = feature.geometry as {
        type?: string;
        coordinates?: number[][][][];
      };
      if (geometry.type !== "MultiPolygon" || !geometry.coordinates?.length) return feature;

      const mainContour = geometry.coordinates.reduce((largest, polygon) => {
        const largestArea = geoArea({ type: "Polygon", coordinates: largest } as never);
        const polygonArea = geoArea({ type: "Polygon", coordinates: polygon } as never);
        return polygonArea > largestArea ? polygon : largest;
      });

      return {
        ...feature,
        geometry: { ...geometry, coordinates: [mainContour] },
      };
    }),
  };
}

const REGION_METRICS: RegionMetric[] = [
  {
    id: "investment",
    label: "Инвестиции",
    unit: "трлн ₸",
    decimals: 2,
    series: [1.1, 1.4, 1.746],
    years: ["2023", "2024", "2025"],
    period: "Динамика 2023–2025",
    target: 1.784,
    facts: [{ value: "$2 млрд", label: "ПИИ" }, { value: "58", label: "запущено проектов" }, { value: "8 340", label: "новых рабочих мест" }],
  },
  {
    id: "grp",
    label: "ВРП",
    unit: "трлн ₸",
    decimals: 2,
    series: [2.85, 3.25, 3.586],
    years: ["9М 2023", "9М 2024", "9М 2025"],
    period: "Сопоставимая оценка · 9 месяцев",
    target: 4,
    test: true,
    facts: [{ value: "+10,1%", label: "реальный рост" }, { value: "1,67 млн ₸", label: "ВРП на человека" }, { value: "334,9 млрд ₸", label: "транспорт и склады" }],
  },
  {
    id: "market",
    label: "Рынок / население",
    unit: "млн чел.",
    decimals: 2,
    series: [2.12, 2.14, 2.147],
    years: ["2024", "2025", "6М 2026"],
    period: "Ёмкость локального рынка",
    target: 2.2,
    test: true,
    facts: [{ value: "2,147 млн", label: "население региона" }, { value: "74,6%", label: "сельские жители" }, { value: "4,3%", label: "зарегистр. безработица" }],
  },
  {
    id: "industry",
    label: "Промышленность",
    unit: "трлн ₸",
    decimals: 2,
    series: [1.05, 1.28, 1.59],
    years: ["2023", "2024", "2025"],
    period: "Динамика 2023–2025",
    target: 1.8,
    test: true,
    facts: [{ value: "+50,8%", label: "обработка · 6М 2026" }, { value: "+32,4%", label: "вся промышленность" }, { value: "+19%", label: "добывающий сектор" }],
  },
  {
    id: "agriculture",
    label: "АПК",
    unit: "трлн ₸",
    decimals: 3,
    series: [0.95, 1.08, 1.154],
    years: ["2023", "2024", "11М 2025"],
    period: "Выпуск сельского хозяйства",
    target: 1.3,
    test: true,
    facts: [{ value: "76%", label: "теплиц Казахстана" }, { value: "$355,5 млн", label: "экспорт АПК" }, { value: "214,4 млрд ₸", label: "инвестиции в АПК" }],
  },
  {
    id: "fdi",
    label: "Прямые инвестиции",
    unit: "млрд $",
    decimals: 2,
    series: [0.9, 1.4, 1.998],
    years: ["2023", "2024", "2025"],
    period: "Иностранный капитал",
    target: 2.2,
    test: true,
    facts: [{ value: "$1,998 млрд", label: "факт 2025" }, { value: "121,6%", label: "рост всех инвестиций" }, { value: "111", label: "проектов в портфеле" }],
  },
  {
    id: "trade",
    label: "Торговля ЕАЭС",
    unit: "млн $",
    decimals: 1,
    series: [245, 281, 319.4],
    years: ["5М 2024", "5М 2025", "5М 2026"],
    period: "Взаимная торговля со странами ЕАЭС",
    target: 350,
    test: true,
    facts: [{ value: "$189,3 млн", label: "экспорт" }, { value: "$130,1 млн", label: "импорт" }, { value: "Узбекистан", label: "прямой выход на рынок" }],
  },
  {
    id: "tourism",
    label: "Туристический поток",
    unit: "тыс. чел.",
    decimals: 0,
    series: [380, 431, 500],
    years: ["2023", "2024", "2025"],
    period: "Гости в местах размещения",
    target: 600,
    test: true,
    facts: [{ value: "+15,9%", label: "рост в 2025" }, { value: "1,012 млн", label: "исторические объекты" }, { value: "36,3 млрд ₸", label: "инвестиции · 5М 2026" }],
  },
  {
    id: "projects",
    label: "Проекты",
    unit: "проектов",
    decimals: 0,
    series: [38, 47, 58],
    years: ["2023", "2024", "2025"],
    period: "Запущенные и плановые проекты",
    target: 111,
    test: true,
    facts: [{ value: "2,8 трлн ₸", label: "портфель 2026–2029" }, { value: "66", label: "запусков в 2026" }, { value: "20 000", label: "рабочих мест в плане" }],
  },
  {
    id: "jobs",
    label: "Новые рабочие места",
    unit: "мест",
    decimals: 0,
    series: [5200, 6800, 8340],
    years: ["2023", "2024", "2025"],
    period: "Занятость в инвестпроектах",
    target: 20000,
    test: true,
    facts: [{ value: "8 340", label: "создано в 2025" }, { value: "20 000", label: "план 2026–2029" }, { value: "5 879", label: "мест на промплощадках" }],
  },
  {
    id: "salary",
    label: "Средняя зарплата",
    unit: "тыс. ₸",
    decimals: 1,
    series: [276, 310.6, 332.6],
    years: ["2024", "2025", "1К 2026"],
    period: "Стоимость трудовых ресурсов",
    target: 350,
    test: true,
    facts: [{ value: "+7,1%", label: "рост за год" }, { value: "187,7 тыс.", label: "кадры в АПК" }, { value: "98,4 тыс.", label: "промышленность и стройка" }],
  },
  {
    id: "spaces",
    label: "Свободные площадки",
    unit: "площадок",
    decimals: 0,
    series: [48, 57, 68],
    years: ["2023", "2024", "2025"],
    period: "Готовность инвестиционных площадок",
    target: 100,
    test: true,
    facts: [{ value: "29", label: "производственных площадок" }, { value: "275", label: "готовых зданий" }, { value: "6%", label: "льготная ставка" }],
  },
];

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const smooth = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

function territoryName(feature?: RegionFeature) {
  if (!feature) return "Туркестанская область";
  if (feature.id === "kz.61.10") return "Туркестан";
  if (feature.id === "kz.61.16") return "Арысь";
  if (feature.id === "kz.61.20") return "Кентау";
  if (feature.id === "kz.61.36") return "Байдибекский район";
  if (feature.id === "kz.61.55") return "Сауранский район";
  return feature.properties.name;
}

function metricsFor(id: string): RegionMetric[] {
  if (id === REGION_ID) return REGION_METRICS;
  const seed = id
    .split("")
    .reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const coefficient = 0.045 + (seed % 7) * 0.008;
  return REGION_METRICS.map((metric, metricIndex) => {
    const series = metric.id === "spaces"
      ? [4 + seed % 5, 6 + seed % 7, 9 + seed % 9]
      : metric.series.map((value) => Number((value * coefficient).toFixed(metric.decimals + 1)));
    return {
      ...metric,
      series,
      target: Number((series.at(-1)! * (1.14 + metricIndex * 0.015)).toFixed(metric.decimals + 1)),
      test: true,
      facts: undefined,
    };
  });
}

function formatMetric(value: number, decimals: number) {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function cameraFor(
  regions: RegionCollection,
  selectedId: string,
  width: number,
  height: number,
): CameraView {
  const base = geoMercator().fitExtent(
    [[width * 0.06, height * 0.025], [width * 0.94, height * 0.91]],
    regions as never,
  );
  const selected = regions.features.find((region) => region.id === selectedId);
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
  const [activeMetricId, setActiveMetricId] = useState("investment");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/data/turkestan-districts.json", { signal: controller.signal })
      .then((response) => response.json())
      .then((data: RegionCollection) => setRegions(removeDetachedCityZones(data)))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const selected = useMemo(
    () => regions?.features.find((item) => item.id === selectedId),
    [regions, selectedId],
  );
  const selectedName = territoryName(selected);
  const isWholeRegion = selectedId === REGION_ID;
  const metrics = useMemo(() => metricsFor(selectedId), [selectedId]);
  const activeMetric = metrics.find((metric) => metric.id === activeMetricId) || metrics[0];
  const currentMetricValue = activeMetric.series.at(-1)!;
  const metricGrowth = Math.round((currentMetricValue / activeMetric.series[0] - 1) * 100);
  const metricProgress = Math.min(100, Math.round((currentMetricValue / activeMetric.target) * 100));
  const metricChartMax = Math.max(activeMetric.target, ...activeMetric.series);

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
    const startCamera = currentCamera && currentCamera.width === width && currentCamera.height === height
      ? { ...currentCamera, translate: [...currentCamera.translate] as [number, number] }
      : cameraFor(regions, REGION_ID, width, height);
    const startWeights = Object.fromEntries(
      regions.features.map((region) => [region.id, liftWeightsRef.current[region.id] || 0]),
    );

    const animateLift = (now: number) => {
      const amount = smooth((now - startedAt) / 480);
      cameraViewRef.current = {
        width,
        height,
        scale: startCamera.scale + (desiredCamera.scale - startCamera.scale) * amount,
        translate: [
          startCamera.translate[0] + (desiredCamera.translate[0] - startCamera.translate[0]) * amount,
          startCamera.translate[1] + (desiredCamera.translate[1] - startCamera.translate[1]) * amount,
        ],
      };
      for (const region of regions.features) {
        const target = region.id === selectedId ? 1 : 0;
        const start = startWeights[region.id] || 0;
        liftWeightsRef.current[region.id] = start + (target - start) * amount;
      }
      drawRef.current();
      if (amount < 1) liftFrameRef.current = window.requestAnimationFrame(animateLift);
    };

    liftFrameRef.current = window.requestAnimationFrame(animateLift);
    return () => window.cancelAnimationFrame(liftFrameRef.current);
  }, [regions, selectedId]);

  useEffect(() => {
    progressRef.current = progress;
    window.cancelAnimationFrame(drawFrameRef.current);
    drawFrameRef.current = window.requestAnimationFrame(() => drawRef.current());
    return () => window.cancelAnimationFrame(drawFrameRef.current);
  }, [progress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !regions) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const renderOrder = regions.features
      .map((region, index) => ({ region, index }))
      .sort((a, b) => Number(a.region.properties.kind === "city") - Number(b.region.properties.kind === "city"));

    let width = canvas.clientWidth;
    let height = canvas.clientHeight;

    let projectionWidth = -1;
    let projectionHeight = -1;
    let pathCacheKey = "";
    let cachedPaths: Path2D[] = [];
    let cachedWholePath = new Path2D();

    const projectionFor = (w: number, h: number) => {
      if (w !== projectionWidth || h !== projectionHeight) {
        projectionWidth = w;
        projectionHeight = h;
        cameraViewRef.current = cameraFor(regions, selectedIdRef.current, w, h);
        pathCacheKey = "";
      }
      const camera = cameraViewRef.current || cameraFor(regions, REGION_ID, w, h);
      return geoMercator().scale(camera.scale).translate(camera.translate);
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
      const projection = projectionFor(width, height);
      const camera = cameraViewRef.current;
      const nextPathKey = camera
        ? `${width}:${height}:${camera.scale.toFixed(3)}:${camera.translate[0].toFixed(2)}:${camera.translate[1].toFixed(2)}`
        : `${width}:${height}`;
      if (pathCacheKey !== nextPathKey) {
        const path = geoPath(projection);
        cachedPaths = regions.features.map((region) => new Path2D(path(region as never) || ""));
        cachedWholePath = new Path2D();
        cachedPaths.forEach((featurePath) => cachedWholePath.addPath(featurePath));
        pathCacheKey = nextPathKey;
      }
      const morph = smooth(clamp((progressRef.current - 0.36) / 0.64));
      const bordersReveal = smooth(clamp((morph - 0.18) / 0.62));
      const tilt = 0.052 * morph;
      const scaleY = 1 - 0.2 * morph;
      const offsetY = height * (0.025 + morph * 0.045);
      const depth = Math.max(12, Math.min(23, width * 0.025)) * morph;

      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      context.save();
      context.setTransform(
        ratio,
        ratio * tilt,
        0,
        ratio * scaleY,
        0,
        ratio * (offsetY + depth + 9 * morph),
      );
      context.shadowColor = `rgba(0, 0, 0, ${0.58 * morph})`;
      context.shadowBlur = 30 * morph;
      context.fillStyle = `rgba(0, 8, 10, ${0.72 * morph})`;
      context.fill(cachedWholePath);
      context.restore();

      for (let layer = depth; layer >= 1; layer -= 3) {
        renderOrder.forEach(({ region, index }) => {
          const cityLift = region.properties.kind === "city" ? 2.5 : 0;
          const lift = ((liftWeightsRef.current[region.id] || 0) * 11 + cityLift) * bordersReveal;
          context.save();
          context.setTransform(
            ratio,
            ratio * tilt,
            0,
            ratio * scaleY,
            0,
            ratio * (offsetY + layer - lift),
          );
          context.fillStyle = index % 2 === 0 ? "#092b2f" : "#0d3538";
          context.fill(cachedPaths[index]);
          context.strokeStyle = "rgba(3, 18, 20, .72)";
          context.lineWidth = 0.7;
          context.stroke(cachedPaths[index]);
          context.restore();
        });
      }

      renderOrder.forEach(({ region, index }) => {
        const isHovered = region.id === hoveredIdRef.current;
        const isCity = region.properties.kind === "city";
        const selectedWeight = liftWeightsRef.current[region.id] || 0;
        const isSelected = selectedWeight > 0.001;
        const lift = (selectedWeight * 11 + (isCity ? 2.5 : 0)) * bordersReveal;
        context.save();
        context.setTransform(
          ratio,
          ratio * tilt,
          0,
          ratio * scaleY,
          0,
          ratio * (offsetY - lift),
        );
        if (isHovered && morph > 0.76) context.fillStyle = "#67aa78";
        else if (isCity) context.fillStyle = "#2d6764";
        else context.fillStyle = index % 3 === 0 ? "#184a48" : index % 3 === 1 ? "#1c5350" : "#225b55";
        context.shadowColor = isSelected ? `rgba(165, 239, 82, ${0.24 * selectedWeight * bordersReveal})` : "transparent";
        context.shadowBlur = isSelected ? 15 * selectedWeight * bordersReveal : 0;
        context.fill(cachedPaths[index]);
        context.shadowBlur = 0;
        if (isSelected && morph > 0.68) {
          context.fillStyle = `rgba(165, 239, 82, ${selectedWeight})`;
          context.fill(cachedPaths[index]);
        }
        context.strokeStyle = isSelected
          ? `rgba(239, 255, 222, ${selectedWeight * bordersReveal})`
          : `rgba(196, 231, 224, ${0.08 + bordersReveal * 0.62})`;
        context.lineWidth = isSelected ? 0.9 + selectedWeight * 0.9 : 0.9;
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
          const areaA = (a.bbox[2] - a.bbox[0]) * (a.bbox[3] - a.bbox[1]);
          const areaB = (b.bbox[2] - b.bbox[0]) * (b.bbox[3] - b.bbox[1]);
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
      canvas.style.cursor = region ? "pointer" : "default";
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
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("click", onClick);
    return () => {
      drawRef.current = () => undefined;
      observer.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("click", onClick);
    };
  }, [regions]);

  const layerOpacity = smooth((progress - 0.08) / 0.32);
  const mapTravel = smooth((progress - 0.08) / 0.72);
  const panelReveal = smooth((progress - 0.72) / 0.25);
  const mapShift = (1 - mapTravel) * 36;
  const mapScale = 0.56 + mapTravel * 0.44;

  return (
    <section
      className="region-explorer"
      id="region-map"
      style={{
        opacity: layerOpacity,
        pointerEvents: progress > 0.8 ? "auto" : "none",
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
        <div className="region-map-title"><span>03</span> Карта региона</div>
        <canvas
          ref={canvasRef}
          className="region-model"
          role="img"
          aria-label="Интерактивная объёмная карта районов и городов Туркестанской области"
        />
        <div className="model-legend">
          <span><i className="legend-district" /> Районы</span>
          <span><i className="legend-city" /> Города</span>
        </div>
      </div>

      <aside
        className="region-data-panel"
        aria-live="polite"
        style={{
          opacity: panelReveal,
          transform: `translateX(${(1 - panelReveal) * 42}px)`,
        }}
      >
        <div className="data-panel-topline">
          <span>{isWholeRegion ? "Сводка по региону" : "Профиль территории"}</span>
          <b>{isWholeRegion ? "Факт + оценка" : "Тестовые данные"}</b>
        </div>
        <div className="data-panel-heading">
          <div><MapPin size={17} /></div>
          <h2>{selectedName}</h2>
          {!isWholeRegion && (
            <button type="button" onClick={() => setSelectedId(REGION_ID)}>Вся область</button>
          )}
        </div>

        <label className="territory-select" aria-label="Выбрать территорию">
          <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
            <option value={REGION_ID}>Вся область</option>
            {regions?.features.map((region) => (
              <option key={region.id} value={region.id}>
                {territoryName(region)}
              </option>
            ))}
          </select>
        </label>

        <div className="region-metric-grid">
          {metrics.map((metric) => {
            const current = metric.series.at(-1)!;
            const growth = Math.round((current / metric.series[0] - 1) * 100);
            return (
              <button
                key={metric.id}
                className={activeMetric.id === metric.id ? "active" : ""}
                type="button"
                aria-pressed={activeMetric.id === metric.id}
                onClick={() => setActiveMetricId(metric.id)}
              >
                <span>{metric.label}</span>
                <strong>{formatMetric(current, metric.decimals)}</strong>
                <small>{metric.unit}</small>
                <em>+{growth}%</em>
                {metric.test && <i>{isWholeRegion && metric.id !== "spaces" ? "Оценка" : "Тест"}</i>}
              </button>
            );
          })}
        </div>

        <div className="region-chart-section">
          <div className="chart-period"><span>{activeMetric.period}</span><strong>+{metricGrowth}%</strong></div>
          <h3>{activeMetric.label}</h3>

          <div className="metric-target">
            <div className="metric-target-head"><span>Выполнение цели</span><strong>{metricProgress}%</strong></div>
            <div className="metric-target-track"><i style={{ width: `${metricProgress}%` }} /></div>
            <div className="metric-target-values">
              <span>Факт <b>{formatMetric(currentMetricValue, activeMetric.decimals)}</b></span>
              <span>Ориентир <b>{formatMetric(activeMetric.target, activeMetric.decimals)} {activeMetric.unit}</b></span>
            </div>
          </div>

          {activeMetric.facts && (
            <div className="metric-facts">
              {activeMetric.facts.map((fact) => (
                <div key={fact.label}><strong>{fact.value}</strong><span>{fact.label}</span></div>
              ))}
            </div>
          )}

          <div className="region-bars" aria-label={`Динамика показателя ${activeMetric.label}`}>
            {[...activeMetric.series, activeMetric.target].map((value, index) => (
              <div key={index} className={index === activeMetric.series.length ? "target" : ""}>
                <b>{formatMetric(value, activeMetric.decimals)}</b>
                <i style={{ height: `${Math.max(8, (value / metricChartMax) * 82)}%` }} />
                <span>{index === activeMetric.series.length ? "Цель" : activeMetric.years[index]}</span>
              </div>
            ))}
          </div>
        </div>

        {!isWholeRegion && (
          <button className="open-territory" type="button">Открыть профиль <ArrowRight size={16} /></button>
        )}
      </aside>

      <div className="explorer-source" style={{ opacity: panelReveal }}>
        Границы: официальный геопортал Туркестанской области
      </div>
    </section>
  );
}
