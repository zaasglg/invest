import { Link } from '@inertiajs/react';
import { geoCentroid, geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo';
import { Building2, Globe2, Route } from 'lucide-react';
import { useId, useMemo, useRef, useState } from 'react';
import { feature } from 'topojson-client';
import worldData from 'world-atlas/countries-110m.json';

import { formatMoneyCompact } from '@/lib/utils';
import {
    index as investmentProjectsIndex,
    show as showInvestmentProject,
} from '@/routes/investment-projects';
import { index as issuesIndex } from '@/routes/issues';

export interface AttractionProjectSummary {
    id: number;
    name: string;
    total_investment: number | string | null;
    jobs_count: number;
    attraction_stage: string | null;
    investor_latitude?: number | null;
    investor_longitude?: number | null;
    investor_city?: string | null;
    created_at?: string | null;
}

interface AttractionYearlyRow {
    year: number;
    investment: number;
    projects: number;
    jobs: number;
    issues: number;
}

export interface AttractionCountry {
    country_code: string;
    country_name: string;
    latitude: number | null;
    longitude: number | null;
    project_count: number;
    total_investment: number | string;
    jobs_count: number;
    issues_count: number;
    yearly: AttractionYearlyRow[];
    projects: AttractionProjectSummary[];
}

interface AttractionWorldMapProps {
    countries: AttractionCountry[];
}

interface MappedCountry extends AttractionCountry {
    point: [number, number];
}

interface MappedProject extends AttractionProjectSummary {
    point: [number, number];
}

type AttractionIndicatorKey = 'investment' | 'projects' | 'issues';

const ATTRACTION_INDICATORS: Array<{
    key: AttractionIndicatorKey;
    label: string;
    shortLabel: string;
}> = [
    {
        key: 'investment',
        label: 'Жобаларға салынған инвестициялар',
        shortLabel: 'Инвестициялар',
    },
    { key: 'projects', label: 'Тартылатын жобалар', shortLabel: 'Жобалар' },
    { key: 'issues', label: 'Жоба мәселелері', shortLabel: 'Мәселелер' },
];

const MAP_WIDTH = 1280;
const MAP_HEIGHT = 640;
const KAZAKHSTAN_ID = '398';
const TURKISTAN_COORDINATES: [number, number] = [68.25, 43.3];

const topology = worldData as unknown as {
    objects: { countries: unknown };
};
const worldCountries = feature(
    worldData as never,
    topology.objects.countries as never,
) as unknown as {
    type: 'FeatureCollection';
    features: Array<{
        id?: string | number;
        type: string;
        properties?: { name?: string };
    }>;
};
const projection = geoNaturalEarth1().fitExtent(
    [
        [24, 20],
        [MAP_WIDTH - 24, MAP_HEIGHT - 20],
    ],
    worldCountries as never,
);
const mapPath = geoPath(projection);
const spherePath = mapPath({ type: 'Sphere' } as never) ?? '';
const graticulePath = mapPath(geoGraticule10() as never) ?? '';
const countryPaths = worldCountries.features.map((country, index) => ({
    d: mapPath(country as never) ?? '',
    id: String(country.id ?? index).padStart(3, '0'),
}));
const turkistanPoint = projection(TURKISTAN_COORDINATES) ?? [820, 270];

const englishCountryNames = new Intl.DisplayNames(['en'], { type: 'region' });
const worldCountryNameAliases: Record<string, string> = {
    BO: 'Bolivia',
    BN: 'Brunei',
    CD: 'Dem. Rep. Congo',
    CG: 'Congo',
    DO: 'Dominican Rep.',
    EH: 'W. Sahara',
    FK: 'Falkland Is.',
    IR: 'Iran',
    KP: 'North Korea',
    KR: 'South Korea',
    LA: 'Laos',
    MD: 'Moldova',
    MK: 'North Macedonia',
    PS: 'Palestine',
    RU: 'Russia',
    SY: 'Syria',
    TR: 'Turkey',
    TZ: 'Tanzania',
    US: 'United States of America',
    VE: 'Venezuela',
    VN: 'Vietnam',
};
const normalizeCountryName = (value: string) =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/gi, '')
        .toLowerCase();
const worldCountryByName = new Map(
    worldCountries.features.flatMap((country) => {
        const name = country.properties?.name;

        return name ? [[normalizeCountryName(name), country] as const] : [];
    }),
);

const worldCountryForCode = (code: string) => {
    const normalizedCode = code.trim().toUpperCase();
    const worldName =
        worldCountryNameAliases[normalizedCode] ??
        englishCountryNames.of(normalizedCode);

    return worldName
        ? worldCountryByName.get(normalizeCountryName(worldName))
        : undefined;
};

const numberFormatter = new Intl.NumberFormat('kk-KZ', {
    maximumFractionDigits: 0,
});

const toFiniteNumber = (value: number | string | null | undefined) => {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
};

const indicatorValueLabel = (
    key: AttractionIndicatorKey,
    value: number,
): string =>
    key === 'investment'
        ? formatMoneyCompact(value, { maxFractionDigits: 1 })
        : numberFormatter.format(value);

const seriesGrowthPercent = (values: number[]): number | null => {
    const firstPositiveIndex = values.findIndex((value) => value > 0);
    if (firstPositiveIndex < 0 || firstPositiveIndex === values.length - 1) {
        return null;
    }

    const first = values[firstPositiveIndex];
    const last = values.at(-1) ?? 0;

    return ((last - first) / first) * 100;
};

const routePath = (
    [startX, startY]: [number, number],
    [endX, endY]: [number, number],
) => {
    const distance = Math.hypot(endX - startX, endY - startY);
    const curveHeight = Math.min(120, Math.max(36, distance * 0.2));
    const controlX = (startX + endX) / 2;
    const controlY = Math.min(startY, endY) - curveHeight;

    return `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
};

const countryKey = (country: AttractionCountry) =>
    country.country_code.trim().toUpperCase();

const coordinatesFor = (
    country: AttractionCountry,
): [number, number] | null => {
    const latitude = Number(country.latitude);
    const longitude = Number(country.longitude);
    if (
        country.latitude !== null &&
        country.longitude !== null &&
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180 &&
        (latitude !== 0 || longitude !== 0)
    ) {
        return [longitude, latitude];
    }

    const worldCountry = worldCountryForCode(countryKey(country));
    if (!worldCountry) return null;

    const [centroidLongitude, centroidLatitude] = geoCentroid(
        worldCountry as never,
    );

    return Number.isFinite(centroidLongitude) &&
        Number.isFinite(centroidLatitude)
        ? [centroidLongitude, centroidLatitude]
        : null;
};

export default function AttractionWorldMap({
    countries,
}: AttractionWorldMapProps) {
    const glowId = useId().replaceAll(':', '');
    const analyticsPanelRef = useRef<HTMLElement | null>(null);
    const [hoveredCountryCode, setHoveredCountryCode] = useState<string | null>(
        null,
    );
    const [selectedCountryCode, setSelectedCountryCode] = useState<
        string | null
    >(null);
    const [activeIndicatorKey, setActiveIndicatorKey] =
        useState<AttractionIndicatorKey>('investment');
    const [countryMenuOpen, setCountryMenuOpen] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
        null,
    );

    const mappedCountries = useMemo<MappedCountry[]>(
        () =>
            countries.flatMap((country) => {
                const coordinates = coordinatesFor(country);
                const point = coordinates ? projection(coordinates) : null;

                if (!point || toFiniteNumber(country.project_count) <= 0) {
                    return [];
                }

                return [
                    {
                        ...country,
                        country_code: countryKey(country),
                        point,
                        project_count: Math.max(
                            0,
                            toFiniteNumber(country.project_count),
                        ),
                        total_investment: toFiniteNumber(
                            country.total_investment,
                        ),
                        jobs_count: Math.max(
                            0,
                            toFiniteNumber(country.jobs_count),
                        ),
                        issues_count: Math.max(
                            0,
                            toFiniteNumber(country.issues_count),
                        ),
                        yearly: country.yearly.map((row) => ({
                            year: toFiniteNumber(row.year),
                            investment: toFiniteNumber(row.investment),
                            projects: toFiniteNumber(row.projects),
                            jobs: toFiniteNumber(row.jobs),
                            issues: toFiniteNumber(row.issues),
                        })),
                    },
                ];
            }),
        [countries],
    );

    const emphasizedCountryCode = hoveredCountryCode ?? selectedCountryCode;
    const selectedCountry = mappedCountries.find(
        (country) => country.country_code === selectedCountryCode,
    );
    const selectedProjectPoints = useMemo<MappedProject[]>(
        () =>
            (selectedCountry?.projects ?? []).flatMap((project) => {
                const latitude = Number(project.investor_latitude);
                const longitude = Number(project.investor_longitude);
                const hasCoordinates =
                    project.investor_latitude !== null &&
                    project.investor_latitude !== undefined &&
                    project.investor_longitude !== null &&
                    project.investor_longitude !== undefined &&
                    Number.isFinite(latitude) &&
                    Number.isFinite(longitude) &&
                    latitude >= -90 &&
                    latitude <= 90 &&
                    longitude >= -180 &&
                    longitude <= 180 &&
                    (latitude !== 0 || longitude !== 0);
                const point = hasCoordinates
                    ? projection([longitude, latitude])
                    : null;

                return point ? [{ ...project, point }] : [];
            }),
        [selectedCountry],
    );
    const totalProjects = mappedCountries.reduce(
        (total, country) => total + country.project_count,
        0,
    );
    const totalInvestment = mappedCountries.reduce(
        (total, country) => total + toFiniteNumber(country.total_investment),
        0,
    );
    const totalIssues = mappedCountries.reduce(
        (total, country) => total + country.issues_count,
        0,
    );

    const overallYearly = useMemo<AttractionYearlyRow[]>(() => {
        const years = Array.from(
            new Set(
                mappedCountries.flatMap((country) =>
                    country.yearly.map((row) => row.year),
                ),
            ),
        ).sort((left, right) => left - right);

        return years.map((year) =>
            mappedCountries.reduce<AttractionYearlyRow>(
                (total, country) => {
                    const row = country.yearly.find(
                        (candidate) => candidate.year === year,
                    );

                    if (row) {
                        total.investment += row.investment;
                        total.projects += row.projects;
                        total.jobs += row.jobs;
                        total.issues += row.issues;
                    }

                    return total;
                },
                {
                    year,
                    investment: 0,
                    projects: 0,
                    jobs: 0,
                    issues: 0,
                },
            ),
        );
    }, [mappedCountries]);

    const scrollAnalyticsToTop = () => {
        requestAnimationFrame(() => {
            analyticsPanelRef.current?.scrollTo({
                top: 0,
                behavior: 'smooth',
            });
        });
    };

    const selectCountry = (countryCode: string) => {
        setSelectedCountryCode(countryCode);
        setSelectedProjectId(null);
        scrollAnalyticsToTop();
    };

    const clearSelectedCountry = () => {
        setSelectedCountryCode(null);
        setSelectedProjectId(null);
        scrollAnalyticsToTop();
    };

    const latestCountryProjects = useMemo(
        () =>
            [...(selectedCountry?.projects ?? [])]
                .sort((left, right) => {
                    const leftCreatedAt = left.created_at
                        ? Date.parse(left.created_at)
                        : 0;
                    const rightCreatedAt = right.created_at
                        ? Date.parse(right.created_at)
                        : 0;

                    if (rightCreatedAt !== leftCreatedAt) {
                        return rightCreatedAt - leftCreatedAt;
                    }

                    return right.id - left.id;
                })
                .slice(0, 5),
        [selectedCountry],
    );

    const panelProjectCount = selectedCountry
        ? selectedCountry.project_count
        : totalProjects;
    const panelInvestment = selectedCountry
        ? toFiniteNumber(selectedCountry.total_investment)
        : totalInvestment;
    const panelIssues = selectedCountry
        ? selectedCountry.issues_count
        : totalIssues;
    const panelYearly = selectedCountry?.yearly ?? overallYearly;
    const activeIndicator =
        ATTRACTION_INDICATORS.find(
            (indicator) => indicator.key === activeIndicatorKey,
        ) ?? ATTRACTION_INDICATORS[0];
    const chartValues = panelYearly.map((row) => row[activeIndicatorKey]);
    const chartMaximum = Math.max(...chartValues, 1);
    const chartGrowth = seriesGrowthPercent(chartValues);
    const yearRange =
        panelYearly.length > 0
            ? `${panelYearly[0].year}–${panelYearly.at(-1)?.year}`
            : '';
    const panelIndicatorValues: Record<AttractionIndicatorKey, number> = {
        investment: panelInvestment,
        projects: panelProjectCount,
        issues: panelIssues,
    };
    const issuesUrl = issuesIndex({
        query: {
            sector: 'all_projects',
            project_status: 'plan',
            investor_country_code: selectedCountry?.country_code,
        },
    }).url;
    const selectedCountryProjectsUrl = selectedCountry
        ? investmentProjectsIndex({
              query: {
                  status: 'plan',
                  investor_country_code: selectedCountry.country_code,
              },
          }).url
        : investmentProjectsIndex({ query: { status: 'plan' } }).url;

    return (
        <section className="inmap-embed inmap-embed--districts">
            <style>{`
                @keyframes attraction-route-flow {
                    to { stroke-dashoffset: -42; }
                }

                @keyframes attraction-marker-pulse {
                    0%, 100% { opacity: .12; transform: scale(.82); }
                    50% { opacity: .42; transform: scale(1.42); }
                }

                @keyframes attraction-turkistan-pulse {
                    0%, 100% { opacity: .18; transform: scale(.88); }
                    50% { opacity: .5; transform: scale(1.28); }
                }

                .attraction-map-route {
                    animation: attraction-route-flow 2.8s linear infinite;
                }

                .attraction-map-marker-pulse,
                .attraction-map-turkistan-pulse {
                    transform-box: fill-box;
                    transform-origin: center;
                }

                .attraction-map-marker-pulse {
                    animation: attraction-marker-pulse 2.6s ease-in-out infinite;
                }

                .attraction-map-turkistan-pulse {
                    animation: attraction-turkistan-pulse 2.2s ease-in-out infinite;
                }

                .attraction-world-map-canvas {
                    position: absolute;
                    inset: 0;
                    overflow: hidden;
                }

                .attraction-world-map-canvas > svg {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                }

                .attraction-analytics-panel {
                    overflow-y: auto;
                    overflow-x: hidden;
                    overscroll-behavior-y: contain;
                    padding-bottom: 32px;
                    scrollbar-gutter: stable;
                    scrollbar-width: thin;
                    scrollbar-color: rgba(103, 232, 249, .45) rgba(15, 23, 42, .5);
                }

                .attraction-analytics-panel .analytics-detail {
                    flex: none;
                    min-height: auto;
                }

                .attraction-analytics-panel > * {
                    flex-shrink: 0;
                }

                .attraction-analytics-panel .analytics-chart {
                    height: 210px;
                    min-height: 210px;
                    flex: 0 0 210px;
                }

                .attraction-projects-section {
                    position: relative;
                    z-index: 1;
                    flex: none;
                }

                .attraction-analytics-panel::-webkit-scrollbar {
                    width: 8px;
                }

                .attraction-analytics-panel::-webkit-scrollbar-track {
                    background: rgba(15, 23, 42, .5);
                }

                .attraction-analytics-panel::-webkit-scrollbar-thumb {
                    border: 2px solid rgba(15, 23, 42, .5);
                    border-radius: 999px;
                    background: rgba(103, 232, 249, .45);
                }

                .attraction-project-point {
                    opacity: .86;
                    transition: opacity 160ms ease;
                }

                .attraction-project-point:hover,
                .attraction-project-point:focus-visible,
                .attraction-project-point.is-active {
                    opacity: 1;
                    outline: none;
                }

                @media (prefers-reduced-motion: reduce) {
                    .attraction-map-route,
                    .attraction-map-marker-pulse,
                    .attraction-map-turkistan-pulse {
                        animation: none !important;
                    }
                }
            `}</style>

            <div className="district-explorer">
                <div className="district-dashboard">
                    <section
                        className="district-map-panel"
                        aria-label="Тартылатын жобалардың әлем картасы"
                    >
                        <div
                            className={
                                countryMenuOpen
                                    ? 'district-map-menu is-open'
                                    : 'district-map-menu'
                            }
                        >
                            <button
                                type="button"
                                className="district-map-menu__toggle"
                                aria-label={
                                    countryMenuOpen
                                        ? 'Елдер мәзірін жабу'
                                        : 'Елдер мәзірін ашу'
                                }
                                aria-expanded={countryMenuOpen}
                                aria-controls="attraction-country-menu"
                                onClick={() =>
                                    setCountryMenuOpen((open) => !open)
                                }
                            >
                                <span />
                                <span />
                                <span />
                            </button>

                            {countryMenuOpen && (
                                <div
                                    id="attraction-country-menu"
                                    className="district-map-menu__panel"
                                    role="listbox"
                                    aria-label="Жобасы бар инвестор елдері"
                                >
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={
                                            selectedCountryCode === null
                                        }
                                        className={
                                            selectedCountryCode === null
                                                ? 'district-map-menu__item is-active'
                                                : 'district-map-menu__item'
                                        }
                                        onClick={() => {
                                            clearSelectedCountry();
                                            setCountryMenuOpen(false);
                                        }}
                                    >
                                        Барлық елдер
                                    </button>
                                    {mappedCountries.map((country) => {
                                        const isSelected =
                                            selectedCountryCode ===
                                            country.country_code;

                                        return (
                                            <button
                                                key={country.country_code}
                                                type="button"
                                                role="option"
                                                aria-selected={isSelected}
                                                className={
                                                    isSelected
                                                        ? 'district-map-menu__item is-active'
                                                        : 'district-map-menu__item'
                                                }
                                                onMouseEnter={() =>
                                                    setHoveredCountryCode(
                                                        country.country_code,
                                                    )
                                                }
                                                onMouseLeave={() =>
                                                    setHoveredCountryCode(null)
                                                }
                                                onFocus={() =>
                                                    setHoveredCountryCode(
                                                        country.country_code,
                                                    )
                                                }
                                                onBlur={() =>
                                                    setHoveredCountryCode(null)
                                                }
                                                onClick={() => {
                                                    selectCountry(
                                                        country.country_code,
                                                    );
                                                    setCountryMenuOpen(false);
                                                }}
                                            >
                                                {country.country_name}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div
                            className="district-map-canvas attraction-world-map-canvas"
                            onClick={(event) => {
                                const target = event.target;
                                if (
                                    target instanceof Element &&
                                    target.closest(
                                        '[data-attraction-map-interactive]',
                                    )
                                ) {
                                    return;
                                }

                                clearSelectedCountry();
                            }}
                        >
                            <svg
                                viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                                preserveAspectRatio="xMidYMid meet"
                                role="img"
                                aria-label="Тартылатын жобалардың әлем картасы"
                            >
                                <defs>
                                    <filter
                                        id={`${glowId}-country`}
                                        x="-160%"
                                        y="-160%"
                                        width="420%"
                                        height="420%"
                                    >
                                        <feGaussianBlur
                                            stdDeviation="5"
                                            result="blur"
                                        />
                                        <feMerge>
                                            <feMergeNode in="blur" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                    <linearGradient
                                        id={`${glowId}-kazakhstan`}
                                        x1="0"
                                        y1="0"
                                        x2="1"
                                        y2="1"
                                    >
                                        <stop offset="0%" stopColor="#36e6e1" />
                                        <stop
                                            offset="100%"
                                            stopColor="#0797b3"
                                        />
                                    </linearGradient>
                                </defs>

                                <path
                                    d={spherePath}
                                    fill="#061923"
                                    stroke="rgba(82, 150, 169, .32)"
                                    strokeWidth="1"
                                />
                                <path
                                    d={graticulePath}
                                    fill="none"
                                    stroke="rgba(85, 153, 170, .12)"
                                    strokeWidth="0.7"
                                />

                                <g aria-hidden="true">
                                    {countryPaths.map((country) => (
                                        <path
                                            key={country.id}
                                            d={country.d}
                                            fill={
                                                country.id === KAZAKHSTAN_ID
                                                    ? `url(#${glowId}-kazakhstan)`
                                                    : '#0e3b4b'
                                            }
                                            stroke={
                                                country.id === KAZAKHSTAN_ID
                                                    ? 'rgba(114, 246, 238, .9)'
                                                    : 'rgba(83, 139, 157, .54)'
                                            }
                                            strokeWidth={
                                                country.id === KAZAKHSTAN_ID
                                                    ? 1.4
                                                    : 0.62
                                            }
                                            vectorEffect="non-scaling-stroke"
                                        />
                                    ))}
                                </g>

                                {mappedCountries.map((country, index) => {
                                    const isSelected =
                                        country.country_code ===
                                        selectedCountryCode;
                                    const isEmphasized =
                                        country.country_code ===
                                        emphasizedCountryCode;

                                    return (
                                        <path
                                            key={`route-${country.country_code}`}
                                            d={routePath(
                                                country.point,
                                                turkistanPoint as [
                                                    number,
                                                    number,
                                                ],
                                            )}
                                            className="attraction-map-route"
                                            fill="none"
                                            stroke={
                                                isSelected
                                                    ? 'rgba(190, 242, 100, .92)'
                                                    : isEmphasized
                                                      ? 'rgba(103, 232, 249, .86)'
                                                      : 'rgba(45, 212, 191, .44)'
                                            }
                                            strokeWidth={
                                                isSelected
                                                    ? 2.8
                                                    : isEmphasized
                                                      ? 2.2
                                                      : 1.35
                                            }
                                            strokeDasharray="5 9"
                                            strokeLinecap="round"
                                            vectorEffect="non-scaling-stroke"
                                            style={{
                                                animationDelay: `${index * -0.32}s`,
                                            }}
                                        />
                                    );
                                })}

                                {mappedCountries.map((country, index) => {
                                    const isSelected =
                                        country.country_code ===
                                        selectedCountryCode;
                                    const isEmphasized =
                                        country.country_code ===
                                        emphasizedCountryCode;
                                    const markerRadius = Math.min(
                                        9,
                                        5 + Math.sqrt(country.project_count),
                                    );

                                    return (
                                        <g key={country.country_code}>
                                            <g
                                                className="cursor-pointer focus:outline-none"
                                                data-attraction-map-interactive
                                                role="button"
                                                tabIndex={0}
                                                aria-label={`${country.country_name}: ${country.project_count} жоба`}
                                                aria-pressed={
                                                    selectedCountryCode ===
                                                    country.country_code
                                                }
                                                onMouseEnter={() =>
                                                    setHoveredCountryCode(
                                                        country.country_code,
                                                    )
                                                }
                                                onMouseLeave={() =>
                                                    setHoveredCountryCode(null)
                                                }
                                                onFocus={() =>
                                                    setHoveredCountryCode(
                                                        country.country_code,
                                                    )
                                                }
                                                onBlur={() =>
                                                    setHoveredCountryCode(null)
                                                }
                                                onClick={() =>
                                                    selectCountry(
                                                        country.country_code,
                                                    )
                                                }
                                                onKeyDown={(event) => {
                                                    if (
                                                        event.key === 'Enter' ||
                                                        event.key === ' '
                                                    ) {
                                                        event.preventDefault();
                                                        selectCountry(
                                                            country.country_code,
                                                        );
                                                    }
                                                }}
                                            >
                                                <circle
                                                    className="attraction-map-marker-pulse"
                                                    cx={country.point[0]}
                                                    cy={country.point[1]}
                                                    r={markerRadius * 2.3}
                                                    fill={
                                                        isSelected
                                                            ? '#ecfccb'
                                                            : '#bef264'
                                                    }
                                                    style={{
                                                        animationDelay: `${index * -0.38}s`,
                                                    }}
                                                />
                                                <circle
                                                    cx={country.point[0]}
                                                    cy={country.point[1]}
                                                    r={markerRadius + 3}
                                                    fill="rgba(190, 242, 100, .16)"
                                                    stroke="rgba(190, 242, 100, .48)"
                                                    strokeWidth={
                                                        isSelected
                                                            ? 2.8
                                                            : isEmphasized
                                                              ? 2
                                                              : 1
                                                    }
                                                    filter={`url(#${glowId}-country)`}
                                                />
                                                {isSelected && (
                                                    <circle
                                                        cx={country.point[0]}
                                                        cy={country.point[1]}
                                                        r={markerRadius + 10}
                                                        fill="none"
                                                        stroke="#ecfccb"
                                                        strokeWidth="2.2"
                                                        strokeDasharray="3 4"
                                                        vectorEffect="non-scaling-stroke"
                                                    />
                                                )}
                                                <circle
                                                    cx={country.point[0]}
                                                    cy={country.point[1]}
                                                    r={markerRadius}
                                                    fill={
                                                        isSelected ||
                                                        isEmphasized
                                                            ? '#ecfccb'
                                                            : '#bef264'
                                                    }
                                                    stroke="#f7fee7"
                                                    strokeWidth={
                                                        isSelected ? 2.2 : 1.5
                                                    }
                                                />
                                                {isSelected && (
                                                    <g
                                                        transform={`translate(${country.point[0] + markerRadius + 8} ${country.point[1] - 24})`}
                                                        aria-hidden="true"
                                                        className="pointer-events-none"
                                                    >
                                                        <rect
                                                            x="0"
                                                            y="0"
                                                            width="76"
                                                            height="22"
                                                            rx="7"
                                                            fill="rgba(7, 25, 36, .94)"
                                                            stroke="rgba(236, 252, 203, .72)"
                                                            strokeWidth="1"
                                                        />
                                                        <text
                                                            x="38"
                                                            y="15"
                                                            fill="#ecfccb"
                                                            fontSize="11"
                                                            fontWeight="800"
                                                            textAnchor="middle"
                                                        >
                                                            {
                                                                country.country_code
                                                            }{' '}
                                                            ·{' '}
                                                            {
                                                                country.project_count
                                                            }
                                                        </text>
                                                    </g>
                                                )}
                                            </g>
                                        </g>
                                    );
                                })}

                                {selectedProjectPoints.map((project, index) => {
                                    const isActive =
                                        selectedProjectId === project.id;

                                    return (
                                        <g
                                            key={`project-${project.id}`}
                                            data-attraction-map-interactive
                                            className={
                                                isActive
                                                    ? 'attraction-project-point is-active cursor-pointer'
                                                    : 'attraction-project-point cursor-pointer'
                                            }
                                            role="button"
                                            tabIndex={0}
                                            aria-label={`${project.name}: картадағы жоба нүктесі`}
                                            onMouseEnter={() =>
                                                setSelectedProjectId(project.id)
                                            }
                                            onFocus={() =>
                                                setSelectedProjectId(project.id)
                                            }
                                            onClick={() =>
                                                setSelectedProjectId(project.id)
                                            }
                                            onKeyDown={(event) => {
                                                if (
                                                    event.key === 'Enter' ||
                                                    event.key === ' '
                                                ) {
                                                    event.preventDefault();
                                                    setSelectedProjectId(
                                                        project.id,
                                                    );
                                                }
                                            }}
                                        >
                                            <circle
                                                cx={project.point[0]}
                                                cy={project.point[1]}
                                                r="7"
                                                fill="rgba(34, 211, 238, .2)"
                                                stroke="#67e8f9"
                                                strokeWidth={
                                                    isActive ? 2.5 : 1.5
                                                }
                                                filter={`url(#${glowId}-country)`}
                                            />
                                            <circle
                                                cx={project.point[0]}
                                                cy={project.point[1]}
                                                r="2.8"
                                                fill="#ecfeff"
                                            />
                                            <text
                                                x={project.point[0] + 10}
                                                y={project.point[1] - 9}
                                                fill="#cffafe"
                                                fontSize="9"
                                                fontWeight="800"
                                            >
                                                {index + 1}
                                            </text>
                                        </g>
                                    );
                                })}

                                <g
                                    transform={`translate(${turkistanPoint[0]} ${turkistanPoint[1]})`}
                                    aria-hidden="true"
                                >
                                    <circle
                                        className="attraction-map-turkistan-pulse"
                                        r="20"
                                        fill="#22d3ee"
                                    />
                                    <circle
                                        r="11"
                                        fill="rgba(34, 211, 238, .22)"
                                        stroke="rgba(165, 243, 252, .75)"
                                        strokeWidth="1.5"
                                    />
                                    <circle
                                        r="5"
                                        fill="#67e8f9"
                                        stroke="#ecfeff"
                                        strokeWidth="1.5"
                                        filter={`url(#${glowId}-country)`}
                                    />
                                    <text
                                        x="16"
                                        y="4"
                                        fill="#d9fbff"
                                        fontSize="13"
                                        fontWeight="800"
                                        letterSpacing=".05em"
                                    >
                                        ТҮРКІСТАН
                                    </text>
                                </g>
                            </svg>

                            <div className="pointer-events-none absolute top-3 right-3 flex flex-wrap justify-end gap-2 text-[10px] text-slate-300 sm:top-4 sm:right-4 sm:text-xs">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#071924]/80 px-2.5 py-1.5 backdrop-blur-md">
                                    <span className="size-2 rounded-full bg-lime-300 shadow-[0_0_10px_rgba(190,242,100,0.8)]" />
                                    Инвестор елі
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#071924]/80 px-2.5 py-1.5 backdrop-blur-md">
                                    <span className="size-2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.8)]" />
                                    Түркістан
                                </span>
                            </div>

                            {mappedCountries.length === 0 ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-[#071d29]/58 p-5 backdrop-blur-[2px]">
                                    <div className="max-w-md rounded-2xl border border-cyan-200/15 bg-[#071924]/88 px-6 py-7 text-center shadow-2xl backdrop-blur-xl">
                                        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                                            <Globe2
                                                className="size-6"
                                                aria-hidden="true"
                                            />
                                        </div>
                                        <h2 className="mt-4 text-base font-bold text-white sm:text-lg">
                                            Картаға жоба қосылмаған
                                        </h2>
                                        <p className="mt-2 text-xs leading-5 text-slate-300 sm:text-sm">
                                            Жоспарлаудағы жобаға инвестор елін
                                            белгілегеннен кейін осы жерде сол
                                            елден Түркістанға бағытталған
                                            байланыс көрінеді.
                                        </p>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </section>

                    <aside
                        ref={analyticsPanelRef}
                        className="district-analytics attraction-analytics-panel"
                        aria-live="polite"
                        aria-label="Инвестициялық статистика"
                    >
                        <div className="district-analytics__heading">
                            <div>
                                <p>
                                    {selectedCountry
                                        ? 'Ел профилі'
                                        : 'Жалпы статистика'}
                                </p>
                                <h2>
                                    {selectedCountry
                                        ? selectedCountry.country_name
                                        : 'Барлық елдер'}
                                </h2>
                            </div>
                            {selectedCountry && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        clearSelectedCountry();
                                    }}
                                >
                                    Барлық елдер
                                </button>
                            )}
                        </div>

                        <div className="analytics-kpis">
                            {ATTRACTION_INDICATORS.map((indicator) => {
                                const values = panelYearly.map(
                                    (row) => row[indicator.key],
                                );
                                const growth = seriesGrowthPercent(values);
                                const isIssues = indicator.key === 'issues';
                                const content = (
                                    <>
                                        <span>{indicator.shortLabel}</span>
                                        <strong>
                                            {indicatorValueLabel(
                                                indicator.key,
                                                panelIndicatorValues[
                                                    indicator.key
                                                ],
                                            )}
                                        </strong>
                                        <p>
                                            {isIssues
                                                ? 'Жоба мәселелері →'
                                                : growth === null
                                                  ? 'Салыстыруға дерек жоқ'
                                                  : `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}% кезең ішінде`}
                                        </p>
                                    </>
                                );

                                return isIssues ? (
                                    <Link
                                        key={indicator.key}
                                        href={issuesUrl}
                                        className="analytics-kpi-link"
                                    >
                                        <article>{content}</article>
                                    </Link>
                                ) : (
                                    <article key={indicator.key}>
                                        {content}
                                    </article>
                                );
                            })}
                        </div>

                        <section className="analytics-detail">
                            <div className="analytics-detail__header">
                                <div>
                                    <span>
                                        {yearRange
                                            ? `${yearRange} аралығында тартуға енгізілген жобалар`
                                            : 'Жылдық динамика'}
                                    </span>
                                    <h3>{activeIndicator.label}</h3>
                                </div>
                                {chartGrowth !== null && (
                                    <strong>
                                        {chartGrowth >= 0 ? '+' : ''}
                                        {chartGrowth.toFixed(1)}%
                                    </strong>
                                )}
                            </div>

                            <div
                                className="indicator-tabs"
                                aria-label="Статистика көрсеткішін таңдау"
                            >
                                {ATTRACTION_INDICATORS.map((indicator) =>
                                    indicator.key === 'issues' ? (
                                        <Link
                                            key={indicator.key}
                                            href={issuesUrl}
                                        >
                                            {indicator.shortLabel}
                                        </Link>
                                    ) : (
                                        <button
                                            key={indicator.key}
                                            type="button"
                                            className={
                                                activeIndicatorKey ===
                                                indicator.key
                                                    ? 'is-active'
                                                    : ''
                                            }
                                            aria-pressed={
                                                activeIndicatorKey ===
                                                indicator.key
                                            }
                                            onClick={() =>
                                                setActiveIndicatorKey(
                                                    indicator.key,
                                                )
                                            }
                                        >
                                            {indicator.shortLabel}
                                        </button>
                                    ),
                                )}
                            </div>

                            <div className="analytics-chart">
                                {panelYearly.map((row) => {
                                    const value = row[activeIndicatorKey];
                                    const height =
                                        value > 0
                                            ? Math.max(
                                                  8,
                                                  (value / chartMaximum) * 100,
                                              )
                                            : 0;

                                    return (
                                        <div
                                            key={row.year}
                                            className="analytics-chart__column"
                                        >
                                            <span className="analytics-chart__value">
                                                {indicatorValueLabel(
                                                    activeIndicatorKey,
                                                    value,
                                                )}
                                            </span>
                                            <div className="analytics-chart__track">
                                                <span
                                                    className="analytics-chart__bar"
                                                    style={{
                                                        height: `${height}%`,
                                                        backgroundColor:
                                                            activeIndicatorKey ===
                                                            'issues'
                                                                ? '#fbbf24'
                                                                : '#22d3ee',
                                                        boxShadow:
                                                            value > 0
                                                                ? activeIndicatorKey ===
                                                                  'issues'
                                                                    ? '0 0 18px rgba(251,191,36,.22)'
                                                                    : '0 0 18px rgba(34,211,238,.25)'
                                                                : 'none',
                                                    }}
                                                    aria-label={`${row.year}: ${indicatorValueLabel(activeIndicatorKey, value)}`}
                                                />
                                            </div>
                                            <strong>{row.year}</strong>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {selectedCountry ? (
                            <section className="attraction-projects-section mt-5 border-t border-white/10 pt-5">
                                <div className="flex items-center gap-2">
                                    <Building2
                                        className="size-4 text-cyan-300"
                                        aria-hidden="true"
                                    />
                                    <h3 className="text-sm font-bold text-white">
                                        Тартылатын жобалар
                                    </h3>
                                    <span className="ml-auto rounded-full bg-cyan-300/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">
                                        {numberFormatter.format(
                                            selectedCountry.projects.length,
                                        )}
                                    </span>
                                </div>

                                {selectedProjectPoints.length <
                                    selectedCountry.projects.length && (
                                    <p className="mt-2 text-[10px] leading-4 text-slate-500">
                                        Нақты координаты енгізілмеген жобалар
                                        елдің ортақ белгісінде жинақталған.
                                        Картада бөлек нүкте шығару үшін инвестор
                                        орналасқан қала немесе координатты
                                        енгізіңіз.
                                    </p>
                                )}

                                {selectedCountry.projects.length > 0 ? (
                                    <ul className="mt-3 space-y-1.5">
                                        {latestCountryProjects.map(
                                            (project, index) => (
                                                <li key={project.id}>
                                                    <Link
                                                        href={showInvestmentProject.url(
                                                            project.id,
                                                        )}
                                                        className={`flex items-center gap-2 border px-2.5 py-2 text-xs transition ${
                                                            selectedProjectId ===
                                                            project.id
                                                                ? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-100'
                                                                : 'border-white/[0.08] bg-white/[0.025] text-slate-200 hover:border-cyan-200/25 hover:bg-cyan-300/[0.06]'
                                                        }`}
                                                        onMouseEnter={() =>
                                                            setSelectedProjectId(
                                                                project.id,
                                                            )
                                                        }
                                                        onFocus={() =>
                                                            setSelectedProjectId(
                                                                project.id,
                                                            )
                                                        }
                                                    >
                                                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-cyan-300/10 text-[9px] font-bold text-cyan-200">
                                                            {index + 1}
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate font-semibold">
                                                                {project.name}
                                                            </span>
                                                            {project.investor_city && (
                                                                <span className="mt-0.5 block truncate text-[9px] text-slate-500">
                                                                    {
                                                                        project.investor_city
                                                                    }
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="shrink-0 text-[10px] text-cyan-200">
                                                            →
                                                        </span>
                                                    </Link>
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                ) : (
                                    <p className="mt-3 text-xs leading-5 text-slate-400">
                                        Бұл елге байланыстырылған жоба жоқ.
                                    </p>
                                )}

                                {selectedCountry.projects.length > 0 && (
                                    <Link
                                        href={selectedCountryProjectsUrl}
                                        className="mt-3 flex w-full items-center justify-center gap-2 border border-cyan-300/25 bg-cyan-300/[0.07] px-3 py-2.5 text-xs font-bold text-cyan-100 transition hover:border-cyan-200/45 hover:bg-cyan-300/[0.13]"
                                    >
                                        Толық көру
                                        <span aria-hidden="true">→</span>
                                    </Link>
                                )}
                            </section>
                        ) : (
                            <div className="mt-5 flex items-start gap-3 rounded-xl border border-cyan-200/10 bg-cyan-300/[0.045] p-3.5">
                                <Route
                                    className="mt-0.5 size-4 shrink-0 text-cyan-300"
                                    aria-hidden="true"
                                />
                                <div>
                                    <p className="text-xs font-bold text-white">
                                        Елді картадан немесе тізімнен таңдаңыз
                                    </p>
                                    <p className="mt-1 text-[11px] leading-5 text-slate-400">
                                        Таңдалған ел картада сақталып
                                        белгіленеді, ал жобалары осы панельде
                                        ашылады.
                                    </p>
                                </div>
                            </div>
                        )}
                    </aside>
                </div>
            </div>
        </section>
    );
}
