"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, MapPin } from "lucide-react";
import { geoContains, geoMercator, geoPath } from "d3-geo";

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

const REGION_ID = "kz.61";

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

function demoStats(id: string) {
  const seed = id
    .split("")
    .reduce((sum, character) => sum + character.charCodeAt(0), 0);
  if (id === REGION_ID) {
    return {
      investment: "3 493,9",
      projects: "327",
      jobs: "35 660",
      sites: "19",
      chart: [18, 24, 32, 43, 88],
    };
  }
  return {
    investment: `${8 + seed % 17},${(seed * 7) % 10}00`,
    projects: String(5 + seed % 14),
    jobs: String(180 + (seed % 24) * 35),
    sites: String(1 + seed % 6),
    chart: [20 + seed % 14, 27 + seed % 18, 35 + seed % 20, 48 + seed % 17, 72 + seed % 24],
  };
}

export function RegionMap3D({ progress }: { progress: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(progress);
  const drawRef = useRef<() => void>(() => undefined);
  const drawFrameRef = useRef(0);
  const [regions, setRegions] = useState<RegionCollection | null>(null);
  const hoveredIdRef = useRef<string | null>(null);
  const [selectedId, setSelectedId] = useState(REGION_ID);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/data/turkestan-districts.json", { signal: controller.signal })
      .then((response) => response.json())
      .then((data: RegionCollection) => setRegions(data))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const selected = useMemo(
    () => regions?.features.find((item) => item.id === selectedId),
    [regions, selectedId],
  );
  const selectedName = territoryName(selected);
  const stats = demoStats(selectedId);
  const isWholeRegion = selectedId === REGION_ID;

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

    let width = canvas.clientWidth;
    let height = canvas.clientHeight;

    let viewProgress = 0;
    let zoomFrame = 0;
    let projectionWidth = -1;
    let projectionHeight = -1;
    let baseProjection = geoMercator();
    let targetProjection = geoMercator();
    let pathCacheKey = "";
    let cachedPaths: Path2D[] = [];
    let cachedWholePath = new Path2D();

    const projectionFor = (w: number, h: number) => {
      if (w !== projectionWidth || h !== projectionHeight) {
        projectionWidth = w;
        projectionHeight = h;
        baseProjection = geoMercator().fitExtent(
          [[w * 0.06, h * 0.025], [w * 0.94, h * 0.91]],
          regions as never,
        );
        if (selected && selectedId !== REGION_ID) {
          targetProjection = geoMercator().fitExtent(
            [[w * 0.06, h * 0.06], [w * 0.94, h * 0.88]],
            selected as never,
          );
        }
        pathCacheKey = "";
      }
      if (!selected || selectedId === REGION_ID) return baseProjection;
      const amount = smooth(viewProgress);
      const baseTranslate = baseProjection.translate();
      const targetTranslate = targetProjection.translate();
      return geoMercator()
        .scale(baseProjection.scale() + (targetProjection.scale() - baseProjection.scale()) * amount)
        .translate([
          baseTranslate[0] + (targetTranslate[0] - baseTranslate[0]) * amount,
          baseTranslate[1] + (targetTranslate[1] - baseTranslate[1]) * amount,
        ]);
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
      const nextPathKey = `${width}:${height}:${selectedId}:${viewProgress.toFixed(3)}`;
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
        context.save();
        context.setTransform(
          ratio,
          ratio * tilt,
          0,
          ratio * scaleY,
          0,
          ratio * (offsetY + layer),
        );
        regions.features.forEach((_, index) => {
          context.fillStyle = index % 2 === 0 ? "#092b2f" : "#0d3538";
          context.fill(cachedPaths[index]);
          context.strokeStyle = "rgba(3, 18, 20, .72)";
          context.lineWidth = 0.7;
          context.stroke(cachedPaths[index]);
        });
        context.restore();
      }

      context.save();
      context.setTransform(ratio, ratio * tilt, 0, ratio * scaleY, 0, ratio * offsetY);
      regions.features.forEach((region, index) => {
        const isHovered = region.id === hoveredIdRef.current;
        const isSelected = region.id === selectedId;
        const isCity = region.properties.kind === "city";
        if (isSelected && morph > 0.68) context.fillStyle = "#a5ef52";
        else if (isHovered && morph > 0.76) context.fillStyle = "#67aa78";
        else if (isCity) context.fillStyle = "#2d6764";
        else context.fillStyle = index % 3 === 0 ? "#184a48" : index % 3 === 1 ? "#1c5350" : "#225b55";
        context.shadowColor = isSelected ? `rgba(165, 239, 82, ${0.28 * bordersReveal})` : "transparent";
        context.shadowBlur = isSelected ? 18 * bordersReveal : 0;
        context.fill(cachedPaths[index]);
        context.shadowBlur = 0;
        context.strokeStyle = isSelected
          ? `rgba(239, 255, 222, ${bordersReveal})`
          : `rgba(196, 231, 224, ${0.08 + bordersReveal * 0.62})`;
        context.lineWidth = isSelected ? 1.8 : 0.9;
        context.stroke(cachedPaths[index]);
      });
      context.restore();
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
    if (selectedId !== REGION_ID) {
      const startedAt = performance.now();
      const animateZoom = (now: number) => {
        viewProgress = clamp((now - startedAt) / 620);
        render();
        if (viewProgress < 1) zoomFrame = window.requestAnimationFrame(animateZoom);
      };
      zoomFrame = window.requestAnimationFrame(animateZoom);
    }
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("click", onClick);
    return () => {
      drawRef.current = () => undefined;
      window.cancelAnimationFrame(zoomFrame);
      observer.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("click", onClick);
    };
  }, [regions, selectedId, selected]);

  const layerOpacity = smooth((progress - 0.08) / 0.32);
  const mapTravel = smooth((progress - 0.08) / 0.72);
  const panelReveal = smooth((progress - 0.72) / 0.25);
  const mapShift = (1 - mapTravel) * 34;
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
          <b>Тестовые данные</b>
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

        <div className="region-stat-grid">
          <div><span>Инвестиции</span><strong>{stats.investment}</strong><small>млрд ₸</small><em>+0.0% за период</em></div>
          <div><span>Проекты</span><strong>{stats.projects}</strong><small>ед.</small><em>+0.0% за период</em></div>
          <div><span>Рабочие места</span><strong>{stats.jobs}</strong><small>чел.</small><em>+0.0% за период</em></div>
          <div><span>Площадки</span><strong>{stats.sites}</strong><small>ед.</small><em>Демо-показатель</em></div>
        </div>

        <div className="region-chart-section">
          <div className="chart-period"><span>2022–2026</span><strong>+0.0%</strong></div>
          <h3>Инвестиции в проекты</h3>
          <div className="chart-tabs"><button className="active" type="button">Инвестиции</button><button type="button">Проекты</button><button type="button">Рабочие места</button></div>
          <div className="region-bars" aria-label="Демонстрационный график инвестиций за 2022–2026 годы">
            {stats.chart.map((height, index) => (
              <div key={index}><i style={{ height: `${height}%` }} /><span>{2022 + index}</span></div>
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
