"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, LogIn, X } from "lucide-react";
import { geoDistance, geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import worldData from "world-atlas/countries-110m.json";
import { RegionMap3D } from "./RegionMap3D";

const KAZAKHSTAN_ID = "398";
const KAZAKHSTAN_COORDINATES: [number, number] = [66.9237, 48.0196];

type TradeDirection = "export" | "import";

type TradePartner = {
  id: string;
  name: string;
  coordinates: [number, number];
  turnover: number;
  export: number;
  import: number;
  exportProducts: Array<{ name: string; value: number }>;
  importProducts: Array<{ name: string; value: number }>;
};

const TRADE_PARTNERS: TradePartner[] = [
  {
    id: "156", name: "Китай", coordinates: [104.2, 35.9], turnover: 34.166, export: 15.196, import: 18.97,
    exportProducts: [{ name: "Руды и концентраты", value: 3.944 }, { name: "Минеральное топливо", value: 3.278 }, { name: "Медь", value: 2.695 }, { name: "Неорганическая химия", value: 1.776 }, { name: "Чёрные металлы", value: 1.101 }],
    importProducts: [{ name: "Машины и оборудование", value: 3.702 }, { name: "Электроника", value: 2.385 }, { name: "Транспорт", value: 2.313 }, { name: "Одежда", value: 0.608 }, { name: "Изделия из металла", value: 0.583 }],
  },
  {
    id: "643", name: "Россия", coordinates: [90, 61], turnover: 27.787, export: 8.248, import: 19.539,
    exportProducts: [{ name: "Неорганическая химия", value: 2.245 }, { name: "Чёрные металлы", value: 1.215 }, { name: "Машины и оборудование", value: 0.996 }, { name: "Руды и концентраты", value: 0.81 }, { name: "Электрооборудование", value: 0.637 }],
    importProducts: [{ name: "Минеральное топливо", value: 1.771 }, { name: "Чёрные металлы", value: 1.541 }, { name: "Изделия из металла", value: 1.15 }, { name: "Машины и оборудование", value: 1.082 }, { name: "Пластмассы", value: 0.934 }],
  },
  {
    id: "380", name: "Италия", coordinates: [12.5, 42.8], turnover: 16.918, export: 15.639, import: 1.279,
    exportProducts: [{ name: "Нефть и нефтепродукты", value: 18.406 }, { name: "Чёрные металлы", value: 0.073 }, { name: "Алюминий", value: 0.069 }, { name: "Зерновые", value: 0.057 }, { name: "Овощная продукция", value: 0.029 }],
    importProducts: [{ name: "Машины и оборудование", value: 0.4 }, { name: "Фармацевтика", value: 0.157 }, { name: "Изделия из металла", value: 0.102 }, { name: "Электрооборудование", value: 0.075 }, { name: "Одежда", value: 0.041 }],
  },
  {
    id: "792", name: "Турция", coordinates: [35.2, 39], turnover: 5.409, export: 3.897, import: 1.513,
    exportProducts: [{ name: "Минеральное топливо", value: 1.459 }, { name: "Медь", value: 1.367 }, { name: "Авиационная техника", value: 0.144 }, { name: "Овощная продукция", value: 0.077 }, { name: "Хлопок", value: 0.048 }],
    importProducts: [{ name: "Машины и оборудование", value: 0.274 }, { name: "Трикотажная одежда", value: 0.155 }, { name: "Текстильная одежда", value: 0.121 }, { name: "Фармацевтика", value: 0.105 }, { name: "Электрооборудование", value: 0.082 }],
  },
  {
    id: "860", name: "Узбекистан", coordinates: [64.6, 41.4], turnover: 4.765, export: 3.486, import: 1.279,
    exportProducts: [{ name: "Зерновые", value: 0.627 }, { name: "Чёрные металлы", value: 0.516 }, { name: "Масла и жиры", value: 0.182 }, { name: "Минеральное топливо", value: 0.162 }, { name: "Мука и продукты помола", value: 0.154 }],
    importProducts: [{ name: "Транспорт", value: 0.308 }, { name: "Машины и оборудование", value: 0.177 }, { name: "Фрукты и орехи", value: 0.105 }, { name: "Овощи", value: 0.087 }, { name: "Пластмассы", value: 0.059 }],
  },
  {
    id: "276", name: "Германия", coordinates: [10.4, 51.1], turnover: 4.544, export: 1.306, import: 3.238,
    exportProducts: [{ name: "Минеральное топливо", value: 0.927 }, { name: "Чёрные металлы", value: 0.102 }, { name: "Неорганическая химия", value: 0.044 }, { name: "Древесина", value: 0.015 }, { name: "Электрооборудование", value: 0.01 }],
    importProducts: [{ name: "Машины и оборудование", value: 0.814 }, { name: "Фармацевтика", value: 0.383 }, { name: "Транспорт", value: 0.379 }, { name: "Медицинские приборы", value: 0.198 }, { name: "Электрооборудование", value: 0.182 }],
  },
  {
    id: "840", name: "США", coordinates: [-98.5, 39.5], turnover: 3.194, export: 1.032, import: 2.162,
    exportProducts: [{ name: "Минеральное топливо", value: 1.108 }, { name: "Неорганическая химия", value: 0.339 }, { name: "Драгоценные металлы", value: 0.24 }, { name: "Чёрные металлы", value: 0.188 }, { name: "Машины и оборудование", value: 0.04 }],
    importProducts: [{ name: "Машины и оборудование", value: 0.62 }, { name: "Транспорт", value: 0.367 }, { name: "Электрооборудование", value: 0.202 }, { name: "Фармацевтика", value: 0.184 }, { name: "Медицинские приборы", value: 0.177 }],
  },
  {
    id: "410", name: "Южная Корея", coordinates: [127.8, 36.4], turnover: 3.171, export: 0.928, import: 2.243,
    exportProducts: [{ name: "Минеральное топливо", value: 1.138 }, { name: "Чёрные металлы", value: 0.065 }, { name: "Прочие металлы", value: 0.039 }, { name: "Машины и оборудование", value: 0.008 }, { name: "Приборы", value: 0.001 }],
    importProducts: [{ name: "Транспорт", value: 0.993 }, { name: "Машины и оборудование", value: 0.441 }, { name: "Электрооборудование", value: 0.098 }, { name: "Пластмассы", value: 0.075 }, { name: "Медицинские приборы", value: 0.064 }],
  },
];

const TRADE_TOTALS = { turnover: 44.9, export: 24, import: 20.9 };

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const ease = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

export function GlobeExperience() {
  const storyRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tradeNodeRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const progressRef = useRef(0);
  const [progress, setProgress] = useState(0);
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [tradeDirection, setTradeDirection] = useState<TradeDirection>("export");

  const selectedTrade = TRADE_PARTNERS.find((partner) => partner.id === selectedTradeId);

  useEffect(() => {
    if (!selectedTradeId) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedTradeId(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedTradeId]);

  useEffect(() => {
    const story = storyRef.current;
    const canvas = canvasRef.current;
    if (!story || !canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const topology = worldData as unknown as {
      objects: { countries: unknown };
    };
    const countries = feature(
      worldData as never,
      topology.objects.countries as never,
    ) as unknown as {
      features: Array<{ id?: string | number; type: string }>;
    };
    const kazakhstan = countries.features.find(
      (country) => String(country.id).padStart(3, "0") === KAZAKHSTAN_ID,
    );
    let turkestanRegion: { type: string; features: Array<{ type: string }> } | null = null;
    const regionController = new AbortController();
    fetch("/data/turkestan-region.json", { signal: regionController.signal })
      .then((response) => response.json())
      .then((data) => {
        turkestanRegion = data;
      })
      .catch(() => {
        // The country sequence remains usable if regional data is unavailable.
      });

    let frame = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let currentProgress = 0;
    let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let globeCleared = false;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const updateProgress = () => {
      const total = Math.max(story.offsetHeight - window.innerHeight, 1);
      const next = clamp((window.scrollY - story.offsetTop) / total);
      progressRef.current = next;
      setProgress(next);
    };

    const draw = (time: number) => {
      currentProgress += (progressRef.current - currentProgress) * (reducedMotion ? 1 : 0.075);
      if (currentProgress > 0.945 && progressRef.current > 0.945) {
        if (!globeCleared) {
          context.clearRect(0, 0, width, height);
          globeCleared = true;
        }
        frame = window.requestAnimationFrame(draw);
        return;
      }
      globeCleared = false;
      const countryFocus = ease(clamp((currentProgress - 0.12) / 0.48));
      const regionFocus = ease(clamp((currentProgress - 0.52) / 0.24));
      const modelHandoff = ease(clamp((currentProgress - 0.74) / 0.22));
      const mapTravel = ease(clamp((modelHandoff - 0.08) / 0.72));
      const mobile = width < 760;
      const baseScale = Math.min(width, height) * (mobile ? 0.34 : 0.39);
      const countryScale = 1 + countryFocus * (mobile ? 2.35 : 3.2);
      const globeScale =
        baseScale *
        countryScale *
        (1 + regionFocus * (mobile ? 1.28 : 1.5)) *
        (1 + mapTravel * (mobile ? 0.34 : 0.76));
      const initialX = mobile ? width * 0.5 : width * 0.73;
      const initialY = mobile ? height * 0.64 : height * 0.54;
      const targetX = mobile ? width * 0.5 : width * 0.57;
      const targetY = mobile ? height * 0.51 : height * 0.53;
      const regionX = mobile ? width * 0.52 : width * 0.71;
      const regionY = mobile ? height * 0.47 : height * 0.52;
      const mapX = mobile ? width * 0.5 : width * 0.347;
      const mapY = mobile ? height * 0.43 : height * 0.515;
      const drift = reducedMotion ? 0 : time * 0.00155;
      const startLon = 14 + drift;
      const countryLon = startLon + (67 - startLon) * countryFocus;
      const countryLat = 13 + (48 - 13) * countryFocus;
      const viewLon = countryLon + (68.25 - countryLon) * regionFocus;
      const viewLat = countryLat + (43.3 - countryLat) * regionFocus;
      const regionGlobeX = initialX + (targetX - initialX) * countryFocus + (regionX - targetX) * regionFocus;
      const regionGlobeY = initialY + (targetY - initialY) * countryFocus + (regionY - targetY) * regionFocus;
      const globeX = regionGlobeX + (mapX - regionGlobeX) * mapTravel;
      const globeY = regionGlobeY + (mapY - regionGlobeY) * mapTravel;

      const projection = geoOrthographic()
        .translate([globeX, globeY])
        .scale(globeScale)
        .rotate([-viewLon, -viewLat, 0])
        .clipAngle(90)
        .precision(0.45);
      const path = geoPath(projection, context);
      const tradeVisibility = 1 - ease(clamp((currentProgress - 0.2) / 0.18));
      const viewCenter: [number, number] = [viewLon, viewLat];
      const kazakhstanPoint = projection(KAZAKHSTAN_COORDINATES);
      const kazakhstanVisible = geoDistance(viewCenter, KAZAKHSTAN_COORDINATES) < Math.PI * 0.49;

      TRADE_PARTNERS.forEach((partner) => {
        const node = tradeNodeRefs.current[partner.id];
        if (!node) return;
        const point = projection(partner.coordinates);
        const visible = Boolean(
          point && kazakhstanVisible &&
          geoDistance(viewCenter, partner.coordinates) < Math.PI * 0.49 &&
          tradeVisibility > 0.02,
        );
        node.style.left = `${point?.[0] || 0}px`;
        node.style.top = `${point?.[1] || 0}px`;
        node.style.opacity = visible ? String(tradeVisibility) : "0";
        node.style.pointerEvents = visible ? "auto" : "none";
      });

      context.clearRect(0, 0, width, height);

      // Subtle, deterministic star field.
      context.save();
      for (let i = 0; i < 92; i += 1) {
        const x = (Math.sin(i * 982.31) * 0.5 + 0.5) * width;
        const y = (Math.sin(i * 371.17 + 2) * 0.5 + 0.5) * height;
        const alpha = (0.12 + (i % 5) * 0.045) * (1 - countryFocus * 0.75);
        context.fillStyle = `rgba(192, 228, 213, ${alpha})`;
        context.beginPath();
        context.arc(x, y, i % 11 === 0 ? 1.3 : 0.65, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();

      // Outer atmosphere.
      context.save();
      context.shadowColor = `rgba(81, 255, 180, ${0.16 + countryFocus * 0.14})`;
      context.shadowBlur = 44 + countryFocus * 20;
      context.beginPath();
      path({ type: "Sphere" } as never);
      context.fillStyle = "rgba(8, 30, 31, .9)";
      context.fill();
      context.restore();

      context.save();
      context.beginPath();
      path({ type: "Sphere" } as never);
      context.clip();
      const ocean = context.createRadialGradient(
        initialX - globeScale * 0.28,
        initialY - globeScale * 0.34,
        globeScale * 0.04,
        initialX,
        initialY,
        globeScale * 1.3,
      );
      ocean.addColorStop(0, "#153f40");
      ocean.addColorStop(0.46, "#092d30");
      ocean.addColorStop(1, "#031819");
      context.fillStyle = ocean;
      context.fillRect(0, 0, width, height);

      context.beginPath();
      path(geoGraticule10());
      context.strokeStyle = `rgba(145, 194, 180, ${0.09 + countryFocus * 0.035})`;
      context.lineWidth = 0.55;
      context.stroke();

      context.beginPath();
      countries.features.forEach((country) => path(country as never));
      context.fillStyle = "#31584b";
      context.fill();
      context.strokeStyle = "rgba(175, 213, 195, .22)";
      context.lineWidth = Math.max(0.25, 0.72 - countryFocus * 0.25 - regionFocus * 0.18);
      context.stroke();

      if (kazakhstan) {
        context.save();
        context.beginPath();
        path(kazakhstan as never);
        context.fillStyle = `rgba(159, 239, 78, ${0.2 + countryFocus * 0.72 - regionFocus * 0.72})`;
        context.shadowColor = `rgba(166, 255, 90, ${countryFocus * 0.5 * (1 - regionFocus * 0.85)})`;
        context.shadowBlur = 12 + countryFocus * 20;
        context.fill();
        context.shadowBlur = 0;
        context.strokeStyle = `rgba(218, 255, 178, ${0.3 + countryFocus * 0.66 - regionFocus * 0.66})`;
        context.lineWidth = 1.2 + countryFocus * 0.6;
        context.stroke();
        context.restore();
      }

      if (turkestanRegion?.features?.[0]) {
        context.save();
        context.beginPath();
        path(turkestanRegion.features[0] as never);
        context.fillStyle = `rgba(116, 178, 105, ${regionFocus * 0.44})`;
        context.shadowColor = `rgba(131, 204, 116, ${regionFocus * 0.24})`;
        context.shadowBlur = 6 + regionFocus * 14;
        context.fill();
        context.shadowBlur = 0;
        context.strokeStyle = `rgba(224, 247, 214, ${regionFocus * 0.82})`;
        context.lineWidth = 1 + regionFocus * 0.5;
        context.stroke();
        context.restore();
      }

      const sheen = context.createLinearGradient(
        initialX - globeScale,
        0,
        initialX + globeScale,
        0,
      );
      sheen.addColorStop(0, "rgba(0,0,0,.68)");
      sheen.addColorStop(0.48, "rgba(255,255,255,.035)");
      sheen.addColorStop(0.76, "rgba(0,0,0,.08)");
      sheen.addColorStop(1, "rgba(0,0,0,.78)");
      context.fillStyle = sheen;
      context.fillRect(0, 0, width, height);

      if (tradeVisibility > 0.01 && kazakhstanPoint && kazakhstanVisible) {
        const drawRoute = (
          partner: TradePartner,
          direction: TradeDirection,
          partnerIndex: number,
        ) => {
          const end = projection(partner.coordinates);
          if (!end || geoDistance(viewCenter, partner.coordinates) >= Math.PI * 0.49) return;

          const start = kazakhstanPoint;
          const dx = end[0] - start[0];
          const dy = end[1] - start[1];
          const distance = Math.max(1, Math.hypot(dx, dy));
          const side = direction === "export" ? 1 : -1;
          const curve = Math.min(76, distance * 0.22) * side;
          const controlX = (start[0] + end[0]) * 0.5 - (dy / distance) * curve;
          const controlY = (start[1] + end[1]) * 0.5 + (dx / distance) * curve;
          const color = direction === "export" ? "165, 239, 82" : "98, 200, 224";

          context.save();
          context.beginPath();
          context.moveTo(start[0], start[1]);
          context.quadraticCurveTo(controlX, controlY, end[0], end[1]);
          context.strokeStyle = `rgba(${color}, ${0.48 * tradeVisibility})`;
          context.lineWidth = direction === "export" ? 1.25 : 1.05;
          context.setLineDash(direction === "export" ? [7, 6] : [2, 6]);
          context.stroke();

          let routeProgress = (time * 0.00018 + partnerIndex * 0.137) % 1;
          if (direction === "import") routeProgress = 1 - routeProgress;
          const inverse = 1 - routeProgress;
          const pointX = inverse * inverse * start[0] + 2 * inverse * routeProgress * controlX + routeProgress * routeProgress * end[0];
          const pointY = inverse * inverse * start[1] + 2 * inverse * routeProgress * controlY + routeProgress * routeProgress * end[1];
          context.setLineDash([]);
          context.shadowColor = `rgba(${color}, .8)`;
          context.shadowBlur = 10;
          context.fillStyle = `rgba(${color}, ${tradeVisibility})`;
          context.beginPath();
          context.arc(pointX, pointY, 2.5, 0, Math.PI * 2);
          context.fill();
          context.restore();
        };

        TRADE_PARTNERS.forEach((partner, partnerIndex) => {
          drawRoute(partner, "export", partnerIndex);
          drawRoute(partner, "import", partnerIndex);
        });

        context.save();
        context.fillStyle = `rgba(165, 239, 82, ${tradeVisibility})`;
        context.shadowColor = "rgba(165, 239, 82, .75)";
        context.shadowBlur = 13;
        context.beginPath();
        context.arc(kazakhstanPoint[0], kazakhstanPoint[1], 4.5, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
      context.restore();

      context.beginPath();
      path({ type: "Sphere" } as never);
      context.strokeStyle = "rgba(167, 237, 206, .28)";
      context.lineWidth = 1;
      context.stroke();

      frame = window.requestAnimationFrame(draw);
    };

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => {
      reducedMotion = motionQuery.matches;
    };
    resize();
    updateProgress();
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", updateProgress, { passive: true });
    motionQuery.addEventListener("change", updateMotion);
    frame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", updateProgress);
      motionQuery.removeEventListener("change", updateMotion);
      regionController.abort();
    };
  }, []);

  const heroFade = 1 - ease(clamp((progress - 0.05) / 0.32));
  const countryReveal =
    ease(clamp((progress - 0.3) / 0.14)) *
    (1 - ease(clamp((progress - 0.55) / 0.11)));
  const regionReveal =
    ease(clamp((progress - 0.59) / 0.1)) *
    (1 - ease(clamp((progress - 0.79) / 0.12)));
  const modelReveal = ease(clamp((progress - 0.74) / 0.22));
  const globeFade = 1 - ease(clamp((progress - 0.86) / 0.11));

  const goToKazakhstan = () => {
    const story = storyRef.current;
    if (!story) return;
    const target = story.offsetTop + (story.offsetHeight - window.innerHeight) * 0.45;
    window.scrollTo({ top: target, behavior: "smooth" });
  };

  const goToRegion = () => {
    const story = storyRef.current;
    if (!story) return;
    const target = story.offsetTop + (story.offsetHeight - window.innerHeight) * 0.68;
    window.scrollTo({ top: target, behavior: "smooth" });
  };

  const goToRegionMap = () => {
    const story = storyRef.current;
    if (!story) return;
    const target = story.offsetTop + (story.offsetHeight - window.innerHeight) * 0.97;
    window.scrollTo({ top: target, behavior: "smooth" });
  };

  const selectedProducts = selectedTrade?.[`${tradeDirection}Products`];
  const selectedVolume = selectedTrade?.[tradeDirection] || 0;
  const selectedShare = (selectedVolume / (tradeDirection === "export" ? 79.2295 : 65.431)) * 100;
  const productMax = Math.max(0.001, ...(selectedProducts?.map((product) => product.value) || [0]));

  return (
    <main>
      <section className="story" ref={storyRef} id="story">
        <div className="stage">
          <canvas
            className="globe-canvas"
            ref={canvasRef}
            role="img"
            style={{ opacity: globeFade }}
            aria-label="Вращающийся глобус, приближающийся к Казахстану и Туркестанской области при прокрутке"
          />
          <div className="ambient-glow" aria-hidden="true" />

          <header className="site-header">
            <a className="brand" href="#story" aria-label="in-map — на главную">
              <span className="brand-mark"><i /><i /><i /></span>
              <span>in-map</span>
            </a>
            <nav aria-label="Главная навигация">
              <button type="button">О платформе</button>
              <button type="button" onClick={goToKazakhstan}>Возможности</button>
              <button type="button" onClick={goToRegion}>Регион</button>
            </nav>
            <div className="header-actions">
              <button className="lang" type="button" aria-label="Выбрать язык">RU <span>⌄</span></button>
              <button className="login" type="button"><LogIn size={16} /> Войти</button>
            </div>
          </header>

          <div
            className="hero-copy"
            style={{ opacity: heroFade, transform: `translateY(${(1 - heroFade) * -28}px)` }}
          >
            <div className="eyebrow"><span /> Инвестиционная платформа нового поколения</div>
            <h1>Карта возможностей.<br /><em>Территория роста.</em></h1>
            <p>
              Единая цифровая среда, где территория, инвестиционные проекты
              и управленческие данные соединяются в ясную картину будущего.
            </p>
            <div className="trade-overview" aria-label="Ключевые показатели внешней торговли Казахстана">
              <div className="trade-overview-head">
                <span>Внешняя торговля</span>
                <b>Январь–апрель 2026</b>
              </div>
              <div className="trade-overview-values">
                <div><span>Товарооборот</span><strong>${TRADE_TOTALS.turnover} млрд</strong><em>+7,9%</em></div>
                <div><span>Экспорт</span><strong>${TRADE_TOTALS.export} млрд</strong><em className="export">из Казахстана</em></div>
                <div><span>Импорт</span><strong>${TRADE_TOTALS.import} млрд</strong><em className="import">в Казахстан</em></div>
              </div>
              <div className="trade-route-legend">
                <span><i className="export" /> Экспорт</span>
                <span><i className="import" /> Импорт</span>
                <b>Нажмите на страну</b>
              </div>
            </div>
            <div className="hero-actions">
              <button className="primary-cta" type="button" onClick={goToKazakhstan}>
                Исследовать потенциал <ArrowUpRight size={18} />
              </button>
              <span>От страны<br />к конкретной площадке</span>
            </div>
          </div>

          <div className="trade-node-layer" aria-label="Ключевые торговые партнёры Казахстана">
            {TRADE_PARTNERS.map((partner) => (
              <button
                key={partner.id}
                ref={(node) => { tradeNodeRefs.current[partner.id] = node; }}
                type="button"
                onClick={() => {
                  setTradeDirection("export");
                  setSelectedTradeId(partner.id);
                }}
                aria-label={`Открыть торговый профиль: ${partner.name}`}
              >
                <i />
                <span>{partner.name}</span>
                <small>${partner.turnover.toFixed(1)} млрд</small>
              </button>
            ))}
          </div>

          <aside className="side-index" aria-label="Этапы путешествия">
            <span className={progress < 0.28 ? "active" : ""}>Мир</span>
            <i><b style={{ height: `${Math.max(5, clamp(progress / 0.38) * 100)}%` }} /></i>
            <span className={progress >= 0.28 && progress < 0.56 ? "active" : ""}>Казахстан</span>
            <i><b style={{ height: `${Math.max(0, clamp((progress - 0.38) / 0.3) * 100)}%` }} /></i>
            <span className={progress >= 0.56 && progress < 0.8 ? "active" : ""}>Туркестан</span>
            <i><b style={{ height: `${Math.max(0, clamp((progress - 0.68) / 0.28) * 100)}%` }} /></i>
            <span className={progress >= 0.8 ? "active" : ""}>Карта</span>
          </aside>

          <div
            className="country-copy"
            style={{ opacity: countryReveal, transform: `translateY(${(1 - countryReveal) * 34}px)` }}
            aria-hidden={countryReveal < 0.3}
          >
            <div className="country-kicker"><span>01</span> Казахстан</div>
            <h2>В центре<br />новых возможностей</h2>
            <p>Страна становится отправной точкой инвестиционного маршрута.</p>
            <div className="coordinate">48.0196° N&nbsp;&nbsp; 66.9237° E</div>
            <button className="continue-region" type="button" onClick={goToRegion}>
              Перейти к области <ArrowDown size={15} />
            </button>
          </div>

          <div
            className="region-copy"
            style={{ opacity: regionReveal, transform: `translateY(${(1 - regionReveal) * 34}px)` }}
            aria-hidden={regionReveal < 0.3}
          >
            <div className="country-kicker"><span>02</span> Туркестанская область</div>
            <h2>Регион, где<br /><em>начинается рост</em></h2>
            <p>
              Следующий масштаб инвестиционной карты — территория, проекты
              и точки развития Туркестанской области.
            </p>
            <div className="coordinate">43.3000° N&nbsp;&nbsp; 68.2500° E</div>
            <button className="continue-region" type="button" onClick={goToRegionMap}>
              К карте районов <ArrowDown size={15} />
            </button>
            <div className="map-source">Границы: официальный геопортал Туркестанской области</div>
          </div>

          <RegionMap3D progress={modelReveal} />

          {selectedTrade && (
            <div className="trade-modal-backdrop" role="presentation" onMouseDown={() => setSelectedTradeId(null)}>
              <section
                className="trade-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="trade-modal-title"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="trade-modal-topline">
                  <span>Торговый профиль · 2025</span>
                  <button type="button" onClick={() => setSelectedTradeId(null)} aria-label="Закрыть окно">
                    <X size={18} />
                  </button>
                </div>
                <div className="trade-modal-heading">
                  <div>
                    <span>Казахстан ↔ торговый партнёр</span>
                    <h2 id="trade-modal-title">{selectedTrade.name}</h2>
                  </div>
                  <strong>${selectedTrade.turnover.toFixed(2)} млрд<small>товарооборот</small></strong>
                </div>

                <div className="trade-tabs" role="tablist" aria-label="Направление торговли">
                  <button
                    className={tradeDirection === "export" ? "active export" : ""}
                    type="button"
                    role="tab"
                    aria-selected={tradeDirection === "export"}
                    onClick={() => setTradeDirection("export")}
                  >Экспорт из Казахстана <b>${selectedTrade.export.toFixed(2)} млрд</b></button>
                  <button
                    className={tradeDirection === "import" ? "active import" : ""}
                    type="button"
                    role="tab"
                    aria-selected={tradeDirection === "import"}
                    onClick={() => setTradeDirection("import")}
                  >Импорт в Казахстан <b>${selectedTrade.import.toFixed(2)} млрд</b></button>
                </div>

                <div className="trade-modal-summary">
                  <div><span>Объём направления</span><strong>${selectedVolume.toFixed(2)} млрд</strong></div>
                  <div><span>Доля в {tradeDirection === "export" ? "экспорте" : "импорте"} РК</span><strong>{selectedShare.toFixed(1)}%</strong></div>
                  <div><span>Торговый баланс</span><strong className={selectedTrade.export - selectedTrade.import >= 0 ? "positive" : "negative"}>{selectedTrade.export - selectedTrade.import >= 0 ? "+" : ""}${(selectedTrade.export - selectedTrade.import).toFixed(2)} млрд</strong></div>
                </div>

                <div className="trade-products-head">
                  <div><span>Основные товарные группы</span><h3>{tradeDirection === "export" ? "Что Казахстан поставляет" : "Что Казахстан закупает"}</h3></div>
                  <b>Структура товаров · 2024</b>
                </div>
                <div className="trade-products">
                  {selectedProducts?.map((product, index) => (
                    <div key={product.name}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div><strong>{product.name}</strong><i><b style={{ width: `${Math.max(5, (product.value / productMax) * 100)}%` }} /></i></div>
                      <em>${product.value >= 1 ? product.value.toFixed(2) + " млрд" : Math.round(product.value * 1000) + " млн"}</em>
                    </div>
                  ))}
                </div>
                <p className="trade-modal-note">Объёмы по странам — официальные итоги 2025 года. Детализация товарных групп показана по последней сопоставимой двусторонней структуре за 2024 год.</p>
              </section>
            </div>
          )}

          <button
            className="scroll-hint"
            type="button"
            onClick={goToKazakhstan}
            style={{ opacity: Math.max(0, 1 - progress * 3) }}
          >
            <span>Прокрутите,<br />чтобы приблизиться</span>
            <i><ArrowDown size={16} /></i>
          </button>

          <div className="progress-rail" aria-hidden="true">
            <span style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      </section>
      <section className="next-chapter" aria-label="Следующий раздел">
        <span>Следующий маршрут</span>
        <strong>Инвестиционный профиль выбранной территории</strong>
        <i>Скоро</i>
      </section>
    </main>
  );
}
