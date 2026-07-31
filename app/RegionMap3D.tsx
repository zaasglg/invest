"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Box, MapPin } from "lucide-react";
import { geoCentroid, geoContains, geoMercator, geoPath } from "d3-geo";

type RegionFeature = {
  type: "Feature";
  properties: {
    osm_id: number;
    name: string;
  };
  geometry: unknown;
};

type RegionCollection = {
  type: "FeatureCollection";
  features: RegionFeature[];
};

const CITY_IDS = new Set([5496366, 3407442, 17322798]);

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const smooth = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

function territoryName(feature?: RegionFeature) {
  if (!feature) return "Туркестан";
  const id = feature.properties.osm_id;
  if (id === 5496366) return "Туркестан";
  if (id === 3407442) return "Арысь";
  if (id === 17322798) return "Кентау";
  if (id === 3407558) return "Байдибекский район";
  return feature.properties.name;
}

function shortName(feature: RegionFeature) {
  return territoryName(feature)
    .replace(" район", "")
    .replace("ский", "")
    .replace("ской", "")
    .replace("альный", "");
}

export function RegionMap3D({ progress }: { progress: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(progress);
  const drawRef = useRef<() => void>(() => undefined);
  const [regions, setRegions] = useState<RegionCollection | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState(5496366);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/data/turkestan-districts.json", { signal: controller.signal })
      .then((response) => response.json())
      .then((data: RegionCollection) => setRegions(data))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const selected = useMemo(
    () => regions?.features.find((item) => item.properties.osm_id === selectedId),
    [regions, selectedId],
  );

  useEffect(() => {
    progressRef.current = progress;
    drawRef.current();
  }, [progress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !regions) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let width = canvas.clientWidth;
    let height = canvas.clientHeight;

    const projectionFor = (w: number, h: number) =>
      geoMercator().fitExtent(
        [[w * 0.055, h * 0.035], [w * 0.94, h * 0.91]],
        regions as never,
      );

    const render = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      const projection = projectionFor(width, height);
      const path = geoPath(projection, context);
      const morph = smooth(progressRef.current);
      const territoriesReveal = smooth(clamp((morph - 0.22) / 0.64));
      const matrixY = 0.075 * morph;
      const matrixScaleY = 1 - 0.27 * morph;
      const offsetY = height * (0.045 + morph * 0.05);
      const depth = Math.max(14, Math.min(25, width * 0.026)) * morph;

      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      // Soft shadow under the complete raised model.
      context.save();
      context.setTransform(ratio, ratio * matrixY, 0, ratio * matrixScaleY, 0, ratio * (offsetY + depth + 10 * morph));
      context.beginPath();
      regions.features.forEach((region) => path(region as never));
      context.shadowColor = `rgba(0, 0, 0, ${0.55 * morph})`;
      context.shadowBlur = 28 * morph;
      context.fillStyle = `rgba(0, 9, 10, ${0.72 * morph})`;
      context.fill();
      context.restore();

      // Extruded side wall, painted back-to-front in narrow layers.
      for (let layer = depth; layer >= 1; layer -= 2) {
        context.save();
        context.setTransform(ratio, ratio * matrixY, 0, ratio * matrixScaleY, 0, ratio * (offsetY + layer));
        regions.features.forEach((region, index) => {
          context.beginPath();
          path(region as never);
          context.fillStyle = index % 3 === 0 ? "#092b2a" : index % 3 === 1 ? "#0d3532" : "#113b36";
          context.fill();
          context.strokeStyle = "rgba(7, 22, 22, .72)";
          context.lineWidth = 0.7;
          context.stroke();
        });
        context.restore();
      }

      // Top surfaces.
      context.save();
      context.setTransform(ratio, ratio * matrixY, 0, ratio * matrixScaleY, 0, ratio * offsetY);
      regions.features.forEach((region, index) => {
        const id = region.properties.osm_id;
        const isHovered = id === hoveredId;
        const isSelected = id === selectedId;
        context.beginPath();
        path(region as never);
        if (territoriesReveal < 0.14) context.fillStyle = "#214a42";
        else if (isSelected && morph > 0.72) context.fillStyle = "#8ccf78";
        else if (isHovered && morph > 0.82) context.fillStyle = "#5f9f6b";
        else if (CITY_IDS.has(id)) context.fillStyle = "#28594f";
        else context.fillStyle = index % 3 === 0 ? "#173f3b" : index % 3 === 1 ? "#1b4942" : "#214f46";
        context.shadowColor = isSelected && morph > 0.72 ? `rgba(140, 207, 120, ${0.38 * territoriesReveal})` : "transparent";
        context.shadowBlur = isSelected ? 18 * territoriesReveal : 0;
        context.fill();
        context.shadowBlur = 0;
        context.strokeStyle = isSelected && morph > 0.72
          ? `rgba(229, 248, 218, ${territoriesReveal})`
          : `rgba(190, 225, 211, ${0.05 + territoriesReveal * 0.53})`;
        context.lineWidth = isSelected && morph > 0.72 ? 1.8 : 0.85;
        context.stroke();
      });
      context.restore();

      // Labels stay upright while the model itself is tilted.
      if (width > 720 && morph > 0.62) {
        context.save();
        context.globalAlpha = smooth((morph - 0.62) / 0.3);
        context.font = "600 9px Manrope, Arial, sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        regions.features.forEach((region) => {
          const point = projection(geoCentroid(region as never));
          if (!point) return;
          const x = point[0];
          const y = offsetY + matrixY * point[0] + matrixScaleY * point[1];
          const active = region.properties.osm_id === selectedId;
          context.fillStyle = active ? "#09231e" : "rgba(220, 239, 230, .68)";
          context.fillText(shortName(region), x, y);
        });
        context.restore();
      }
    };

    drawRef.current = render;

    const featureAt = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;
      const morph = smooth(progressRef.current);
      if (morph < 0.82) return undefined;
      const matrixY = 0.075 * morph;
      const matrixScaleY = 1 - 0.27 * morph;
      const offsetY = height * (0.045 + morph * 0.05);
      const y = (screenY - offsetY - matrixY * x) / matrixScaleY;
      const coordinates = projectionFor(width, height).invert?.([x, y]);
      if (!coordinates) return undefined;
      return regions.features.find((region) => geoContains(region as never, coordinates));
    };

    const onMove = (event: PointerEvent) => {
      const region = featureAt(event);
      const nextId = region?.properties.osm_id ?? null;
      setHoveredId((current) => current === nextId ? current : nextId);
      canvas.style.cursor = region ? "pointer" : "default";
    };
    const onLeave = () => setHoveredId(null);
    const onClick = (event: PointerEvent) => {
      const region = featureAt(event);
      if (region) setSelectedId(region.properties.osm_id);
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
  }, [regions, hoveredId, selectedId]);

  const layerOpacity = smooth(progress / 0.34);
  const contentOpacity = smooth((progress - 0.42) / 0.42);

  return (
    <section
      className="region-explorer"
      id="region-map"
      style={{
        opacity: layerOpacity,
        pointerEvents: progress > 0.84 ? "auto" : "none",
      }}
    >
      <div className="explorer-grid" aria-hidden="true" />
      <div className="explorer-copy" style={{ opacity: contentOpacity }}>
        <div className="country-kicker"><span>03</span> Карта региона</div>
        <h2>Область<br /><em>в деталях</em></h2>
        <p>
          Наведите курсор и выберите территорию. Каждый район и город станет
          отдельной точкой входа в данные, проекты и инвестиционные площадки.
        </p>
        <div className="territory-summary">
          <div><strong>14</strong><span>районов</span></div>
          <div><strong>3</strong><span>города</span></div>
          <div><strong>17</strong><span>территорий</span></div>
        </div>
      </div>

      <div className="map-model-wrap" style={{ opacity: smooth(progress / 0.25) }}>
        <div className="model-label"><Box size={15} /> Интерактивная 3D-модель</div>
        <canvas
          ref={canvasRef}
          className="region-model"
          role="img"
          aria-label="Интерактивная объёмная карта районов и городов Туркестанской области"
        />
        <div className="model-legend">
          <span><i className="legend-district" /> Районы</span>
          <span><i className="legend-city" /> Города</span>
          <span><i className="legend-selected" /> Выбрано</span>
        </div>
      </div>

      <aside className="territory-card" aria-live="polite" style={{ opacity: contentOpacity }}>
        <div className="territory-card-icon"><MapPin size={18} /></div>
        <span>{selected && CITY_IDS.has(selected.properties.osm_id) ? "Городская администрация" : "Район области"}</span>
        <strong>{territoryName(selected)}</strong>
        <label>
          Выбрать территорию
          <select value={selectedId} onChange={(event) => setSelectedId(Number(event.target.value))}>
            {regions?.features.map((region) => (
              <option key={region.properties.osm_id} value={region.properties.osm_id}>
                {territoryName(region)}
              </option>
            ))}
          </select>
        </label>
        <button type="button">Профиль территории <ArrowUpRight size={16} /></button>
      </aside>

      <div className="explorer-source" style={{ opacity: contentOpacity }}>Границы: © OpenStreetMap contributors</div>
    </section>
  );
}
