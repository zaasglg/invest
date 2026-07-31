"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, LogIn } from "lucide-react";
import { geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import worldData from "world-atlas/countries-110m.json";
import { RegionMap3D } from "./RegionMap3D";

const KAZAKHSTAN_ID = "398";

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const ease = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

export function GlobeExperience() {
  const storyRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(0);
  const [progress, setProgress] = useState(0);

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

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
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
      const countryFocus = ease(clamp((currentProgress - 0.12) / 0.48));
      const regionFocus = ease(clamp((currentProgress - 0.64) / 0.34));
      const mobile = width < 760;
      const baseScale = Math.min(width, height) * (mobile ? 0.34 : 0.39);
      const countryScale = 1 + countryFocus * (mobile ? 2.35 : 3.2);
      const globeScale = baseScale * countryScale * (1 + regionFocus * (mobile ? 1.28 : 1.5));
      const initialX = mobile ? width * 0.5 : width * 0.73;
      const initialY = mobile ? height * 0.64 : height * 0.54;
      const targetX = mobile ? width * 0.5 : width * 0.57;
      const targetY = mobile ? height * 0.51 : height * 0.53;
      const regionX = mobile ? width * 0.52 : width * 0.71;
      const regionY = mobile ? height * 0.47 : height * 0.52;
      const drift = reducedMotion ? 0 : time * 0.00155;
      const startLon = 14 + drift;
      const countryLon = startLon + (67 - startLon) * countryFocus;
      const countryLat = 13 + (48 - 13) * countryFocus;
      const viewLon = countryLon + (68.25 - countryLon) * regionFocus;
      const viewLat = countryLat + (43.3 - countryLat) * regionFocus;
      const globeX = initialX + (targetX - initialX) * countryFocus + (regionX - targetX) * regionFocus;
      const globeY = initialY + (targetY - initialY) * countryFocus + (regionY - targetY) * regionFocus;

      const projection = geoOrthographic()
        .translate([globeX, globeY])
        .scale(globeScale)
        .rotate([-viewLon, -viewLat, 0])
        .clipAngle(90)
        .precision(0.45);
      const path = geoPath(projection, context);

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
    ease(clamp((progress - 0.38) / 0.16)) *
    (1 - ease(clamp((progress - 0.64) / 0.13)));
  const regionReveal = ease(clamp((progress - 0.78) / 0.18));

  const goToKazakhstan = () => {
    const story = storyRef.current;
    if (!story) return;
    const target = story.offsetTop + (story.offsetHeight - window.innerHeight) * 0.53;
    window.scrollTo({ top: target, behavior: "smooth" });
  };

  const goToRegion = () => {
    const story = storyRef.current;
    if (!story) return;
    const target = story.offsetTop + (story.offsetHeight - window.innerHeight) * 0.94;
    window.scrollTo({ top: target, behavior: "smooth" });
  };

  const goToRegionMap = () => {
    document.querySelector("#region-map")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main>
      <section className="story" ref={storyRef} id="story">
        <div className="stage">
          <canvas
            className="globe-canvas"
            ref={canvasRef}
            role="img"
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
            <div className="hero-actions">
              <button className="primary-cta" type="button" onClick={goToKazakhstan}>
                Исследовать потенциал <ArrowUpRight size={18} />
              </button>
              <span>От страны<br />к конкретной площадке</span>
            </div>
          </div>

          <aside className="side-index" aria-label="Этапы путешествия">
            <span className={progress < 0.36 ? "active" : ""}>Мир</span>
            <i><b style={{ height: `${Math.max(5, clamp(progress / 0.5) * 100)}%` }} /></i>
            <span className={progress >= 0.36 && progress < 0.73 ? "active" : ""}>Казахстан</span>
            <i><b style={{ height: `${Math.max(0, clamp((progress - 0.5) / 0.5) * 100)}%` }} /></i>
            <span className={progress >= 0.73 ? "active" : ""}>Туркестан</span>
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
            <div className="map-source">Границы: © OpenStreetMap contributors</div>
          </div>

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
      <RegionMap3D />
      <section className="next-chapter" aria-label="Следующий раздел">
        <span>Следующий маршрут</span>
        <strong>Инвестиционный профиль выбранной территории</strong>
        <i>Скоро</i>
      </section>
    </main>
  );
}
