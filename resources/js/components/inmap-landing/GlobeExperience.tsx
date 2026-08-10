import { Link } from '@inertiajs/react';
import {
    geoContains,
    geoDistance,
    geoGraticule10,
    geoOrthographic,
    geoPath,
    type GeoProjection,
} from 'd3-geo';
import {
    ArrowDown,
    ArrowLeft,
    ArrowUpRight,
    ChevronDown,
    ExternalLink,
    LogIn,
    Search,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { feature } from 'topojson-client';
import worldData from 'world-atlas/countries-110m.json';

import { login } from '@/routes';
import { AssetsExplorer } from './AssetsExplorer';
// Keep the landing subcomponents in the welcome page chunk. A lazy boundary
// here can make Rollup drop the Inertia page facade from Vite's manifest.
import { RegionMap3D } from './RegionMap3D';

const KAZAKHSTAN_ID = '398';
const KAZAKHSTAN_COORDINATES: [number, number] = [66.9237, 48.0196];

type TradeDirection = 'export' | 'import';

type TradePartner = {
    id: string;
    name: string;
    mapId?: string | null;
    coordinates: [number, number] | null;
    turnover: number;
    export: number;
    import: number;
    turnoverShare?: number;
    exportShare?: number;
    importShare?: number;
    rank?: number;
    period?: string;
    previous?: { turnover: number; export: number; import: number } | null;
    annual?: {
        '2024': { turnover: number; export: number; import: number } | null;
        '2025': { turnover: number; export: number; import: number } | null;
    };
    growth?: {
        turnover: number | null;
        export: number | null;
        import: number | null;
    } | null;
    exportProducts: Array<{ code?: string; name: string; value: number }>;
    importProducts: Array<{ code?: string; name: string; value: number }>;
};

type RawTradeMetric = {
    turnover: number;
    export: number;
    import: number;
    turnoverShare: number;
    exportShare: number;
    importShare: number;
};

type RawTradeDataset = {
    metadata: {
        source: string;
        sourcePage: string;
        currentPeriod: string;
        productPeriod: string;
        publishedAt: string;
    };
    coverage: {
        partners: number;
        currentPartners: number;
        mappedPartners: number;
    };
    totals: {
        current: { '2025': RawTradeMetric; '2026': RawTradeMetric };
        currentGrowth: {
            turnover: number | null;
            export: number | null;
            import: number | null;
        };
    };
    partners: Array<{
        key: string;
        mapId: string | null;
        nameRu: string;
        coordinates: [number, number] | null;
        rank: number;
        annual: {
            '2024': RawTradeMetric | null;
            '2025': RawTradeMetric | null;
        };
        current: {
            '2025': RawTradeMetric | null;
            '2026': RawTradeMetric | null;
        };
        currentGrowth: {
            turnover: number | null;
            export: number | null;
            import: number | null;
        } | null;
        annualGrowth: {
            turnover: number | null;
            export: number | null;
            import: number | null;
        } | null;
        products2025: {
            export: Array<{ code: string; name: string; value: number }>;
            import: Array<{ code: string; name: string; value: number }>;
        };
    }>;
};

type KdbCountryProfile = {
    iso3: string;
    nameRu: string;
    latestYear: number;
    annual: Array<{
        year: number;
        marketImport: number;
        fromKazakhstan: number | null;
        kazakhstanShare: number | null;
    }>;
    categories: Array<{
        type: string | null;
        category: string;
        processing: string | null;
        marketImport: number;
        fromKazakhstan: number | null;
        kazakhstanShare: number | null;
    }>;
    products: Array<{
        code: string;
        name: string;
        marketImport: number;
        fromKazakhstan: number | null;
        kazakhstanShare: number | null;
    }>;
};

type RawKdbDataset = {
    metadata: {
        source: string;
        sourcePage: string;
        lastRefreshAt: string | null;
        latestYear: number;
    };
    countries: Record<string, KdbCountryProfile>;
};

const TRADE_PARTNERS: TradePartner[] = [
    {
        id: '156',
        name: 'Китай',
        coordinates: [104.2, 35.9],
        turnover: 34.166,
        export: 15.196,
        import: 18.97,
        exportProducts: [
            { name: 'Руды и концентраты', value: 3.944 },
            { name: 'Минеральное топливо', value: 3.278 },
            { name: 'Медь', value: 2.695 },
            { name: 'Неорганическая химия', value: 1.776 },
            { name: 'Чёрные металлы', value: 1.101 },
        ],
        importProducts: [
            { name: 'Машины и оборудование', value: 3.702 },
            { name: 'Электроника', value: 2.385 },
            { name: 'Транспорт', value: 2.313 },
            { name: 'Одежда', value: 0.608 },
            { name: 'Изделия из металла', value: 0.583 },
        ],
    },
    {
        id: '643',
        name: 'Россия',
        coordinates: [90, 61],
        turnover: 27.787,
        export: 8.248,
        import: 19.539,
        exportProducts: [
            { name: 'Неорганическая химия', value: 2.245 },
            { name: 'Чёрные металлы', value: 1.215 },
            { name: 'Машины и оборудование', value: 0.996 },
            { name: 'Руды и концентраты', value: 0.81 },
            { name: 'Электрооборудование', value: 0.637 },
        ],
        importProducts: [
            { name: 'Минеральное топливо', value: 1.771 },
            { name: 'Чёрные металлы', value: 1.541 },
            { name: 'Изделия из металла', value: 1.15 },
            { name: 'Машины и оборудование', value: 1.082 },
            { name: 'Пластмассы', value: 0.934 },
        ],
    },
    {
        id: '380',
        name: 'Италия',
        coordinates: [12.5, 42.8],
        turnover: 16.918,
        export: 15.639,
        import: 1.279,
        exportProducts: [
            { name: 'Нефть и нефтепродукты', value: 18.406 },
            { name: 'Чёрные металлы', value: 0.073 },
            { name: 'Алюминий', value: 0.069 },
            { name: 'Зерновые', value: 0.057 },
            { name: 'Овощная продукция', value: 0.029 },
        ],
        importProducts: [
            { name: 'Машины и оборудование', value: 0.4 },
            { name: 'Фармацевтика', value: 0.157 },
            { name: 'Изделия из металла', value: 0.102 },
            { name: 'Электрооборудование', value: 0.075 },
            { name: 'Одежда', value: 0.041 },
        ],
    },
    {
        id: '792',
        name: 'Турция',
        coordinates: [35.2, 39],
        turnover: 5.409,
        export: 3.897,
        import: 1.513,
        exportProducts: [
            { name: 'Минеральное топливо', value: 1.459 },
            { name: 'Медь', value: 1.367 },
            { name: 'Авиационная техника', value: 0.144 },
            { name: 'Овощная продукция', value: 0.077 },
            { name: 'Хлопок', value: 0.048 },
        ],
        importProducts: [
            { name: 'Машины и оборудование', value: 0.274 },
            { name: 'Трикотажная одежда', value: 0.155 },
            { name: 'Текстильная одежда', value: 0.121 },
            { name: 'Фармацевтика', value: 0.105 },
            { name: 'Электрооборудование', value: 0.082 },
        ],
    },
    {
        id: '860',
        name: 'Узбекистан',
        coordinates: [64.6, 41.4],
        turnover: 4.765,
        export: 3.486,
        import: 1.279,
        exportProducts: [
            { name: 'Зерновые', value: 0.627 },
            { name: 'Чёрные металлы', value: 0.516 },
            { name: 'Масла и жиры', value: 0.182 },
            { name: 'Минеральное топливо', value: 0.162 },
            { name: 'Мука и продукты помола', value: 0.154 },
        ],
        importProducts: [
            { name: 'Транспорт', value: 0.308 },
            { name: 'Машины и оборудование', value: 0.177 },
            { name: 'Фрукты и орехи', value: 0.105 },
            { name: 'Овощи', value: 0.087 },
            { name: 'Пластмассы', value: 0.059 },
        ],
    },
    {
        id: '276',
        name: 'Германия',
        coordinates: [10.4, 51.1],
        turnover: 4.544,
        export: 1.306,
        import: 3.238,
        exportProducts: [
            { name: 'Минеральное топливо', value: 0.927 },
            { name: 'Чёрные металлы', value: 0.102 },
            { name: 'Неорганическая химия', value: 0.044 },
            { name: 'Древесина', value: 0.015 },
            { name: 'Электрооборудование', value: 0.01 },
        ],
        importProducts: [
            { name: 'Машины и оборудование', value: 0.814 },
            { name: 'Фармацевтика', value: 0.383 },
            { name: 'Транспорт', value: 0.379 },
            { name: 'Медицинские приборы', value: 0.198 },
            { name: 'Электрооборудование', value: 0.182 },
        ],
    },
    {
        id: '840',
        name: 'США',
        coordinates: [-98.5, 39.5],
        turnover: 3.194,
        export: 1.032,
        import: 2.162,
        exportProducts: [
            { name: 'Минеральное топливо', value: 1.108 },
            { name: 'Неорганическая химия', value: 0.339 },
            { name: 'Драгоценные металлы', value: 0.24 },
            { name: 'Чёрные металлы', value: 0.188 },
            { name: 'Машины и оборудование', value: 0.04 },
        ],
        importProducts: [
            { name: 'Машины и оборудование', value: 0.62 },
            { name: 'Транспорт', value: 0.367 },
            { name: 'Электрооборудование', value: 0.202 },
            { name: 'Фармацевтика', value: 0.184 },
            { name: 'Медицинские приборы', value: 0.177 },
        ],
    },
    {
        id: '410',
        name: 'Южная Корея',
        coordinates: [127.8, 36.4],
        turnover: 3.171,
        export: 0.928,
        import: 2.243,
        exportProducts: [
            { name: 'Минеральное топливо', value: 1.138 },
            { name: 'Чёрные металлы', value: 0.065 },
            { name: 'Прочие металлы', value: 0.039 },
            { name: 'Машины и оборудование', value: 0.008 },
            { name: 'Приборы', value: 0.001 },
        ],
        importProducts: [
            { name: 'Транспорт', value: 0.993 },
            { name: 'Машины и оборудование', value: 0.441 },
            { name: 'Электрооборудование', value: 0.098 },
            { name: 'Пластмассы', value: 0.075 },
            { name: 'Медицинские приборы', value: 0.064 },
        ],
    },
];

const TRADE_TOTALS = {
    turnover: 56.35,
    export: 30.36,
    import: 25.99,
    growth: 4.35,
};
const REGION_MAP_TRANSITION_START = 0.7;
const REGION_MAP_TRANSITION_LENGTH = 0.295;

const formatTradeValue = (value: number) => {
    if (value <= 0) return '$0';
    if (value >= 1) {
        return `$${value.toLocaleString('ru-RU', { maximumFractionDigits: value >= 10 ? 1 : 2 })} млрд`;
    }

    const millions = value * 1000;
    if (millions >= 0.001) {
        const maximumFractionDigits =
            millions >= 10
                ? 1
                : millions >= 1
                  ? 2
                  : millions >= 0.1
                    ? 1
                    : millions >= 0.01
                      ? 2
                      : 3;
        return `$${millions.toLocaleString('ru-RU', { maximumFractionDigits })} млн`;
    }

    const thousands = value * 1_000_000;
    if (thousands >= 1) {
        return `$${thousands.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} тыс.`;
    }
    return `$${Math.round(value * 1_000_000_000).toLocaleString('ru-RU')}`;
};

const formatGrowth = (value?: number | null) =>
    value == null || !Number.isFinite(value)
        ? '—'
        : `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

const formatMillionUsd = (value?: number | null) =>
    value == null || !Number.isFinite(value)
        ? '—'
        : formatTradeValue(value / 1000);

const formatPercent = (value?: number | null) =>
    value == null || !Number.isFinite(value)
        ? '—'
        : `${value.toLocaleString('ru-RU', { maximumFractionDigits: value >= 1 ? 2 : 4 })}%`;

const clamp = (value: number, min = 0, max = 1) =>
    Math.min(max, Math.max(min, value));

const ease = (value: number) => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
};

export function GlobeExperience() {
    const storyRef = useRef<HTMLElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const tradeTooltipRef = useRef<HTMLDivElement>(null);
    const tradePickerRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef(0);
    const [progress, setProgress] = useState(0);
    const [tradePartners, setTradePartners] =
        useState<TradePartner[]>(TRADE_PARTNERS);
    const [tradeSummary, setTradeSummary] = useState({
        ...TRADE_TOTALS,
        period: 'январь–май 2026',
        partnerCount: TRADE_PARTNERS.length,
        source: 'Бюро национальной статистики',
        sourcePage:
            'https://stat.gov.kz/ru/industries/economy/foreign-market/spreadsheets/',
        publishedAt: '2026-07-15',
    });
    const [tradeDataState, setTradeDataState] = useState<
        'loading' | 'ready' | 'fallback'
    >('loading');
    const [countryPickerOpen, setCountryPickerOpen] = useState(false);
    const [countrySearch, setCountrySearch] = useState('');
    const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
    const [tradeDirection, setTradeDirection] =
        useState<TradeDirection>('export');
    const [tradeDetailOpen, setTradeDetailOpen] = useState(false);
    const [detailDataSource, setDetailDataSource] = useState<'bns' | 'kdb'>(
        'bns',
    );
    const [kdbProfiles, setKdbProfiles] = useState<
        Record<string, KdbCountryProfile>
    >({});
    const [kdbMetadata, setKdbMetadata] = useState<
        RawKdbDataset['metadata'] | null
    >(null);
    const [kdbDataState, setKdbDataState] = useState<
        'loading' | 'ready' | 'unavailable'
    >('loading');
    const [assetsOpen, setAssetsOpen] = useState(false);
    const closeAssets = useCallback(() => setAssetsOpen(false), []);

    const selectedTrade = tradePartners.find(
        (partner) => partner.id === selectedTradeId,
    );
    const regionMapRequested = progress > 0.58;
    const filteredTradePartners = tradePartners
        .filter((partner) =>
            partner.name
                .toLocaleLowerCase('ru-RU')
                .includes(countrySearch.trim().toLocaleLowerCase('ru-RU')),
        )
        .slice(0, 60);

    const openTradePartner = (partnerId: string) => {
        setTradeDirection('export');
        setTradeDetailOpen(false);
        setDetailDataSource('bns');
        setSelectedTradeId(partnerId);
        setCountryPickerOpen(false);
        setCountrySearch('');
    };

    useEffect(() => {
        const controller = new AbortController();
        fetch('/data/trade/kazakhstan-trade.json', {
            signal: controller.signal,
        })
            .then((response) => {
                if (!response.ok)
                    throw new Error(
                        `Trade dataset returned ${response.status}`,
                    );
                return response.json() as Promise<RawTradeDataset>;
            })
            .then((dataset) => {
                const partners = dataset.partners
                    .map((partner): TradePartner | null => {
                        const latest =
                            partner.current['2026'] ?? partner.annual['2025'];
                        if (!latest || latest.turnover <= 0) return null;
                        const previous = partner.current['2026']
                            ? partner.current['2025']
                            : partner.annual['2024'];
                        return {
                            id: partner.key,
                            mapId: partner.mapId,
                            name: partner.nameRu,
                            coordinates: partner.coordinates,
                            turnover: latest.turnover / 1000,
                            export: latest.export / 1000,
                            import: latest.import / 1000,
                            turnoverShare: latest.turnoverShare,
                            exportShare: latest.exportShare,
                            importShare: latest.importShare,
                            rank: partner.rank,
                            period: partner.current['2026']
                                ? dataset.metadata.currentPeriod
                                : '2025 год',
                            previous: previous
                                ? {
                                      turnover: previous.turnover / 1000,
                                      export: previous.export / 1000,
                                      import: previous.import / 1000,
                                  }
                                : null,
                            annual: {
                                '2024': partner.annual['2024']
                                    ? {
                                          turnover:
                                              partner.annual['2024'].turnover /
                                              1000,
                                          export:
                                              partner.annual['2024'].export /
                                              1000,
                                          import:
                                              partner.annual['2024'].import /
                                              1000,
                                      }
                                    : null,
                                '2025': partner.annual['2025']
                                    ? {
                                          turnover:
                                              partner.annual['2025'].turnover /
                                              1000,
                                          export:
                                              partner.annual['2025'].export /
                                              1000,
                                          import:
                                              partner.annual['2025'].import /
                                              1000,
                                      }
                                    : null,
                            },
                            growth: partner.current['2026']
                                ? partner.currentGrowth
                                : partner.annualGrowth,
                            exportProducts: partner.products2025.export.map(
                                (product) => ({
                                    ...product,
                                    value: product.value / 1000,
                                }),
                            ),
                            importProducts: partner.products2025.import.map(
                                (product) => ({
                                    ...product,
                                    value: product.value / 1000,
                                }),
                            ),
                        };
                    })
                    .filter(
                        (partner): partner is TradePartner => partner !== null,
                    );
                const total = dataset.totals.current['2026'];
                setTradePartners(partners);
                setTradeSummary({
                    turnover: total.turnover / 1000,
                    export: total.export / 1000,
                    import: total.import / 1000,
                    growth: dataset.totals.currentGrowth.turnover ?? 0,
                    period: dataset.metadata.currentPeriod,
                    partnerCount: dataset.coverage.currentPartners,
                    source: dataset.metadata.source,
                    sourcePage: dataset.metadata.sourcePage,
                    publishedAt: dataset.metadata.publishedAt,
                });
                setTradeDataState('ready');
            })
            .catch((error) => {
                if (
                    error instanceof DOMException &&
                    error.name === 'AbortError'
                )
                    return;
                setTradeDataState('fallback');
            });
        return () => controller.abort();
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        fetch('/data/trade/kdb-import-profile.json', {
            signal: controller.signal,
        })
            .then((response) => {
                if (!response.ok)
                    throw new Error(`BRK dataset returned ${response.status}`);
                return response.json() as Promise<RawKdbDataset>;
            })
            .then((dataset) => {
                setKdbProfiles(dataset.countries);
                setKdbMetadata(dataset.metadata);
                setKdbDataState('ready');
            })
            .catch((error) => {
                if (
                    error instanceof DOMException &&
                    error.name === 'AbortError'
                )
                    return;
                setKdbDataState('unavailable');
            });
        return () => controller.abort();
    }, []);

    useEffect(() => {
        if (!countryPickerOpen) return;
        const closePicker = (event: PointerEvent) => {
            if (!tradePickerRef.current?.contains(event.target as Node))
                setCountryPickerOpen(false);
        };
        const closePickerOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setCountryPickerOpen(false);
        };
        document.addEventListener('pointerdown', closePicker);
        window.addEventListener('keydown', closePickerOnEscape);
        return () => {
            document.removeEventListener('pointerdown', closePicker);
            window.removeEventListener('keydown', closePickerOnEscape);
        };
    }, [countryPickerOpen]);

    useEffect(() => {
        if (!selectedTradeId) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setSelectedTradeId(null);
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', closeOnEscape);
        };
    }, [selectedTradeId]);

    useEffect(() => {
        const story = storyRef.current;
        const canvas = canvasRef.current;
        if (!story || !canvas) return;

        const context = canvas.getContext('2d');
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
            (country) => String(country.id).padStart(3, '0') === KAZAKHSTAN_ID,
        );
        const tradeCountries = tradePartners.flatMap((partner) => {
            const mapId = partner.mapId ?? partner.id;
            const country = countries.features.find(
                (featureItem) =>
                    String(featureItem.id).padStart(3, '0') === mapId,
            );
            return country ? [{ partner, country }] : [];
        });
        const maxTradeTurnover = Math.max(
            1,
            ...tradeCountries.map(({ partner }) => partner.turnover),
        );
        let turkestanRegion: {
            type: string;
            features: Array<{ type: string }>;
        } | null = null;
        const regionController = new AbortController();
        fetch('/data/turkestan-region.json', {
            signal: regionController.signal,
        })
            .then((response) => response.json())
            .then((data) => {
                turkestanRegion = data;
            })
            .catch(() => {
                // The country sequence remains usable if regional data is unavailable.
            });

        let frame = 0;
        let scrollFrame = 0;
        let lastRenderedProgress = -1;
        let width = window.innerWidth;
        let height = window.innerHeight;
        let currentProgress = 0;
        let reducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;
        let globeCleared = false;
        let globeLongitude = 14;
        let globeLatitude = 13;
        let longitudeVelocity = 0;
        let latitudeVelocity = 0;
        let lastFrameTime = 0;
        let lastInteractionTime = Number.NEGATIVE_INFINITY;
        let lastPointerTime = 0;
        let lastPointerX = 0;
        let lastPointerY = 0;
        let activePointerId: number | null = null;
        let dragDistance = 0;
        let hoverPointer: [number, number] | null = null;
        let hoveredTradeId: string | null = null;
        let hitProjection: GeoProjection | null = null;
        let hitGlobe = { x: 0, y: 0, radius: 0 };

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
            if (scrollFrame) return;
            scrollFrame = window.requestAnimationFrame(() => {
                scrollFrame = 0;
                const latest = progressRef.current;
                if (Math.abs(latest - lastRenderedProgress) > 0.0005) {
                    lastRenderedProgress = latest;
                    setProgress(latest);
                }
                if (!frame && !document.hidden)
                    frame = window.requestAnimationFrame(draw);
            });
        };

        const partnerAtPosition = (point: [number, number]) => {
            if (!hitProjection || progressRef.current > 0.24) return undefined;
            if (
                Math.hypot(point[0] - hitGlobe.x, point[1] - hitGlobe.y) >
                hitGlobe.radius
            )
                return undefined;
            const coordinates = hitProjection.invert?.(point);
            if (!coordinates) return undefined;
            return tradeCountries.find(({ country }) =>
                geoContains(country as never, coordinates),
            );
        };

        const updateHoveredPartner = (point: [number, number] | null) => {
            const match = point ? partnerAtPosition(point) : undefined;
            hoveredTradeId = match?.partner.id || null;
            const tooltip = tradeTooltipRef.current;
            if (tooltip && point && match) {
                tooltip.textContent = `${match.partner.name} · ${formatTradeValue(match.partner.turnover)}`;
                tooltip.style.left = `${Math.min(width - 190, point[0] + 16)}px`;
                tooltip.style.top = `${Math.max(104, point[1] - 8)}px`;
                tooltip.style.opacity = '1';
            } else if (tooltip) {
                tooltip.style.opacity = '0';
            }
            if (activePointerId === null) {
                canvas.style.cursor = match
                    ? 'pointer'
                    : progressRef.current < 0.24
                      ? 'grab'
                      : 'default';
            }
            return match;
        };

        const onPointerDown = (event: PointerEvent) => {
            if (progressRef.current > 0.24 || event.button > 0) return;
            activePointerId = event.pointerId;
            lastPointerX = event.clientX;
            lastPointerY = event.clientY;
            lastPointerTime = performance.now();
            lastInteractionTime = lastPointerTime;
            dragDistance = 0;
            hoverPointer = null;
            updateHoveredPartner(null);
            longitudeVelocity = 0;
            latitudeVelocity = 0;
            canvas.setPointerCapture(event.pointerId);
            canvas.style.cursor = 'grabbing';
        };

        const onPointerMove = (event: PointerEvent) => {
            if (activePointerId === null) {
                const rect = canvas.getBoundingClientRect();
                hoverPointer = [
                    event.clientX - rect.left,
                    event.clientY - rect.top,
                ];
                updateHoveredPartner(hoverPointer);
                return;
            }
            if (activePointerId !== event.pointerId) return;
            event.preventDefault();
            const now = performance.now();
            const elapsed = Math.max(8, now - lastPointerTime);
            const longitudeDelta = -(event.clientX - lastPointerX) * 0.22;
            const latitudeDelta = (event.clientY - lastPointerY) * 0.16;
            dragDistance +=
                Math.abs(event.clientX - lastPointerX) +
                Math.abs(event.clientY - lastPointerY);
            globeLongitude += longitudeDelta;
            globeLatitude = clamp(globeLatitude + latitudeDelta, -38, 62);
            longitudeVelocity = longitudeDelta / elapsed;
            latitudeVelocity = latitudeDelta / elapsed;
            lastPointerX = event.clientX;
            lastPointerY = event.clientY;
            lastPointerTime = now;
            lastInteractionTime = now;
        };

        const finishPointerDrag = (event: PointerEvent) => {
            if (activePointerId !== event.pointerId) return;
            const rect = canvas.getBoundingClientRect();
            const clickPoint: [number, number] = [
                event.clientX - rect.left,
                event.clientY - rect.top,
            ];
            activePointerId = null;
            lastInteractionTime = performance.now();
            if (canvas.hasPointerCapture(event.pointerId))
                canvas.releasePointerCapture(event.pointerId);
            hoverPointer = clickPoint;
            const match = updateHoveredPartner(clickPoint);
            if (dragDistance < 7 && match) {
                setTradeDirection('export');
                setTradeDetailOpen(false);
                setSelectedTradeId(match.partner.id);
            }
        };

        const onPointerLeave = () => {
            if (activePointerId !== null) return;
            hoverPointer = null;
            updateHoveredPartner(null);
        };

        const draw = (time: number) => {
            frame = 0;
            if (document.hidden) return;
            const frameDelta = lastFrameTime
                ? Math.min(34, time - lastFrameTime)
                : 16;
            lastFrameTime = time;
            if (activePointerId === null) {
                globeLongitude += longitudeVelocity * frameDelta;
                globeLatitude = clamp(
                    globeLatitude + latitudeVelocity * frameDelta,
                    -38,
                    62,
                );
                const inertiaDecay = Math.pow(0.9, frameDelta / 16);
                longitudeVelocity *= inertiaDecay;
                latitudeVelocity *= inertiaDecay;
                const autoRotation = reducedMotion
                    ? 0
                    : ease(clamp((time - lastInteractionTime - 650) / 1250));
                globeLongitude += frameDelta * 0.00155 * autoRotation;
            }
            if (Math.abs(globeLongitude) > 540) globeLongitude %= 360;
            if (canvas.style.cursor !== 'grabbing') {
                canvas.style.cursor =
                    currentProgress < 0.24 ? 'grab' : 'default';
            }
            currentProgress +=
                (progressRef.current - currentProgress) *
                (reducedMotion ? 1 : 0.075);
            if (currentProgress > 0.995 && progressRef.current > 0.995) {
                if (!globeCleared) {
                    context.clearRect(0, 0, width, height);
                    globeCleared = true;
                }
                return;
            }
            globeCleared = false;
            const countryFocus = ease(clamp((currentProgress - 0.12) / 0.48));
            const regionFocus = ease(clamp((currentProgress - 0.52) / 0.24));
            const modelHandoff = ease(
                clamp(
                    (currentProgress - REGION_MAP_TRANSITION_START) /
                        REGION_MAP_TRANSITION_LENGTH,
                ),
            );
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
            const startLon = globeLongitude;
            const countryLon = startLon + (67 - startLon) * countryFocus;
            const countryLat =
                globeLatitude + (48 - globeLatitude) * countryFocus;
            const viewLon = countryLon + (68.25 - countryLon) * regionFocus;
            const viewLat = countryLat + (43.3 - countryLat) * regionFocus;
            const regionGlobeX =
                initialX +
                (targetX - initialX) * countryFocus +
                (regionX - targetX) * regionFocus;
            const regionGlobeY =
                initialY +
                (targetY - initialY) * countryFocus +
                (regionY - targetY) * regionFocus;
            const globeX = regionGlobeX + (mapX - regionGlobeX) * mapTravel;
            const globeY = regionGlobeY + (mapY - regionGlobeY) * mapTravel;

            const projection = geoOrthographic()
                .translate([globeX, globeY])
                .scale(globeScale)
                .rotate([-viewLon, -viewLat, 0])
                .clipAngle(90)
                .precision(0.45);
            const path = geoPath(projection, context);
            const tradeVisibility =
                1 - ease(clamp((currentProgress - 0.2) / 0.18));
            const viewCenter: [number, number] = [viewLon, viewLat];
            const kazakhstanPoint = projection(KAZAKHSTAN_COORDINATES);
            const kazakhstanVisible =
                geoDistance(viewCenter, KAZAKHSTAN_COORDINATES) <
                Math.PI * 0.49;
            hitProjection = projection;
            hitGlobe = { x: globeX, y: globeY, radius: globeScale };
            if (activePointerId === null && hoverPointer)
                updateHoveredPartner(hoverPointer);

            context.clearRect(0, 0, width, height);

            // Subtle, deterministic star field.
            context.save();
            for (let i = 0; i < 92; i += 1) {
                const x = (Math.sin(i * 982.31) * 0.5 + 0.5) * width;
                const y = (Math.sin(i * 371.17 + 2) * 0.5 + 0.5) * height;
                const alpha =
                    (0.12 + (i % 5) * 0.045) * (1 - countryFocus * 0.75);
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
            path({ type: 'Sphere' } as never);
            context.fillStyle = 'rgba(8, 30, 31, .9)';
            context.fill();
            context.restore();

            context.save();
            context.beginPath();
            path({ type: 'Sphere' } as never);
            context.clip();
            const ocean = context.createRadialGradient(
                initialX - globeScale * 0.28,
                initialY - globeScale * 0.34,
                globeScale * 0.04,
                initialX,
                initialY,
                globeScale * 1.3,
            );
            ocean.addColorStop(0, '#153f40');
            ocean.addColorStop(0.46, '#092d30');
            ocean.addColorStop(1, '#031819');
            context.fillStyle = ocean;
            context.fillRect(0, 0, width, height);

            context.beginPath();
            path(geoGraticule10());
            context.strokeStyle = `rgba(145, 194, 180, ${0.09 + countryFocus * 0.035})`;
            context.lineWidth = 0.55;
            context.stroke();

            context.beginPath();
            countries.features.forEach((country) => path(country as never));
            context.fillStyle = '#31584b';
            context.fill();
            context.strokeStyle = 'rgba(175, 213, 195, .22)';
            context.lineWidth = Math.max(
                0.25,
                0.72 - countryFocus * 0.25 - regionFocus * 0.18,
            );
            context.stroke();

            if (tradeVisibility > 0.01) {
                tradeCountries.forEach(({ partner, country }) => {
                    const isHovered = partner.id === hoveredTradeId;
                    const isSelected = partner.id === selectedTradeId;
                    const intensity =
                        Math.log1p(partner.turnover) /
                        Math.log1p(maxTradeTurnover);
                    context.save();
                    context.beginPath();
                    path(country as never);
                    context.fillStyle =
                        isHovered || isSelected
                            ? `rgba(165, 239, 82, ${0.5 * tradeVisibility})`
                            : `rgba(98, 200, 224, ${(0.07 + intensity * 0.3) * tradeVisibility})`;
                    context.fill();
                    context.shadowColor =
                        isHovered || isSelected
                            ? 'rgba(165, 239, 82, .7)'
                            : 'transparent';
                    context.shadowBlur = isHovered || isSelected ? 18 : 0;
                    context.strokeStyle =
                        isHovered || isSelected
                            ? `rgba(224, 255, 190, ${0.95 * tradeVisibility})`
                            : `rgba(132, 220, 229, ${(0.25 + intensity * 0.45) * tradeVisibility})`;
                    context.lineWidth = isHovered || isSelected ? 1.8 : 0.65;
                    context.stroke();
                    context.restore();
                });
            }

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
            sheen.addColorStop(0, 'rgba(0,0,0,.68)');
            sheen.addColorStop(0.48, 'rgba(255,255,255,.035)');
            sheen.addColorStop(0.76, 'rgba(0,0,0,.08)');
            sheen.addColorStop(1, 'rgba(0,0,0,.78)');
            context.fillStyle = sheen;
            context.fillRect(0, 0, width, height);

            if (
                tradeVisibility > 0.01 &&
                kazakhstanPoint &&
                kazakhstanVisible
            ) {
                const drawRoute = (
                    partner: TradePartner,
                    direction: TradeDirection,
                    partnerIndex: number,
                ) => {
                    if (!partner.coordinates) return;
                    const end = projection(partner.coordinates);
                    if (
                        !end ||
                        geoDistance(viewCenter, partner.coordinates) >=
                            Math.PI * 0.49
                    )
                        return;

                    const start = kazakhstanPoint;
                    const dx = end[0] - start[0];
                    const dy = end[1] - start[1];
                    const distance = Math.max(1, Math.hypot(dx, dy));
                    const side = direction === 'export' ? 1 : -1;
                    const curve = Math.min(76, distance * 0.22) * side;
                    const controlX =
                        (start[0] + end[0]) * 0.5 - (dy / distance) * curve;
                    const controlY =
                        (start[1] + end[1]) * 0.5 + (dx / distance) * curve;
                    const color =
                        direction === 'export'
                            ? '165, 239, 82'
                            : '98, 200, 224';
                    const routeIntensity =
                        Math.log1p(partner.turnover) /
                        Math.log1p(maxTradeTurnover);
                    const focusedId = hoveredTradeId ?? selectedTradeId;
                    const emphasis = focusedId
                        ? focusedId === partner.id
                            ? 1
                            : 0.035
                        : 0.12 + routeIntensity * 0.58;

                    context.save();
                    context.beginPath();
                    context.moveTo(start[0], start[1]);
                    context.quadraticCurveTo(
                        controlX,
                        controlY,
                        end[0],
                        end[1],
                    );
                    context.strokeStyle = `rgba(${color}, ${0.42 * tradeVisibility * emphasis})`;
                    context.lineWidth =
                        (direction === 'export' ? 0.9 : 0.75) +
                        routeIntensity * 0.5;
                    context.setLineDash(
                        direction === 'export' ? [7, 6] : [2, 6],
                    );
                    context.stroke();

                    let routeProgress =
                        (time * 0.00018 + partnerIndex * 0.137) % 1;
                    if (direction === 'import')
                        routeProgress = 1 - routeProgress;
                    const inverse = 1 - routeProgress;
                    const pointX =
                        inverse * inverse * start[0] +
                        2 * inverse * routeProgress * controlX +
                        routeProgress * routeProgress * end[0];
                    const pointY =
                        inverse * inverse * start[1] +
                        2 * inverse * routeProgress * controlY +
                        routeProgress * routeProgress * end[1];
                    context.setLineDash([]);
                    context.shadowColor = `rgba(${color}, .8)`;
                    context.shadowBlur = focusedId === partner.id ? 12 : 5;
                    context.fillStyle = `rgba(${color}, ${tradeVisibility * Math.min(1, emphasis * 1.35)})`;
                    context.beginPath();
                    context.arc(
                        pointX,
                        pointY,
                        1.25 + routeIntensity * 1.5,
                        0,
                        Math.PI * 2,
                    );
                    context.fill();
                    context.restore();
                };

                const routePartners = tradePartners.filter(
                    (partner) => partner.coordinates,
                );
                routePartners.forEach((partner, partnerIndex) => {
                    drawRoute(partner, 'export', partnerIndex);
                    drawRoute(partner, 'import', partnerIndex);
                });

                context.save();
                context.fillStyle = `rgba(165, 239, 82, ${tradeVisibility})`;
                context.shadowColor = 'rgba(165, 239, 82, .75)';
                context.shadowBlur = 13;
                context.beginPath();
                context.arc(
                    kazakhstanPoint[0],
                    kazakhstanPoint[1],
                    4.5,
                    0,
                    Math.PI * 2,
                );
                context.fill();
                context.restore();
            }
            context.restore();

            context.beginPath();
            path({ type: 'Sphere' } as never);
            context.strokeStyle = 'rgba(167, 237, 206, .28)';
            context.lineWidth = 1;
            context.stroke();

            frame = window.requestAnimationFrame(draw);
        };

        const motionQuery = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        );
        const updateMotion = () => {
            reducedMotion = motionQuery.matches;
            if (!frame && !document.hidden)
                frame = window.requestAnimationFrame(draw);
        };
        const updateVisibility = () => {
            if (document.hidden) {
                window.cancelAnimationFrame(frame);
                frame = 0;
                return;
            }
            lastFrameTime = 0;
            updateProgress();
        };
        resize();
        updateProgress();
        window.addEventListener('resize', resize);
        window.addEventListener('scroll', updateProgress, { passive: true });
        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', finishPointerDrag);
        canvas.addEventListener('pointercancel', finishPointerDrag);
        canvas.addEventListener('pointerleave', onPointerLeave);
        motionQuery.addEventListener('change', updateMotion);
        document.addEventListener('visibilitychange', updateVisibility);

        return () => {
            window.cancelAnimationFrame(frame);
            window.cancelAnimationFrame(scrollFrame);
            window.removeEventListener('resize', resize);
            window.removeEventListener('scroll', updateProgress);
            canvas.removeEventListener('pointerdown', onPointerDown);
            canvas.removeEventListener('pointermove', onPointerMove);
            canvas.removeEventListener('pointerup', finishPointerDrag);
            canvas.removeEventListener('pointercancel', finishPointerDrag);
            canvas.removeEventListener('pointerleave', onPointerLeave);
            motionQuery.removeEventListener('change', updateMotion);
            document.removeEventListener('visibilitychange', updateVisibility);
            regionController.abort();
        };
    }, [selectedTradeId, tradePartners]);

    const heroFade = 1 - ease(clamp((progress - 0.05) / 0.32));
    const countryReveal =
        ease(clamp((progress - 0.3) / 0.14)) *
        (1 - ease(clamp((progress - 0.55) / 0.11)));
    const regionReveal =
        ease(clamp((progress - 0.59) / 0.1)) *
        (1 - ease(clamp((progress - 0.82) / 0.145)));
    const modelReveal = ease(
        clamp(
            (progress - REGION_MAP_TRANSITION_START) /
                REGION_MAP_TRANSITION_LENGTH,
        ),
    );
    const globeFade = 1 - ease(clamp((progress - 0.88) / 0.115));

    const goToKazakhstan = () => {
        const story = storyRef.current;
        if (!story) return;
        const target =
            story.offsetTop + (story.offsetHeight - window.innerHeight) * 0.45;
        window.scrollTo({ top: target, behavior: 'smooth' });
    };

    const goToRegion = () => {
        const story = storyRef.current;
        if (!story) return;
        const target =
            story.offsetTop + (story.offsetHeight - window.innerHeight) * 0.68;
        window.scrollTo({ top: target, behavior: 'smooth' });
    };

    const goToRegionMap = () => {
        const story = storyRef.current;
        if (!story) return;
        const target =
            story.offsetTop + (story.offsetHeight - window.innerHeight) * 0.995;
        window.scrollTo({ top: target, behavior: 'smooth' });
    };

    const selectedVolume = selectedTrade?.[tradeDirection] || 0;
    const selectedShare =
        tradeDirection === 'export'
            ? (selectedTrade?.exportShare ?? 0)
            : (selectedTrade?.importShare ?? 0);
    const selectedBalance = selectedTrade
        ? selectedTrade.export - selectedTrade.import
        : 0;
    const annualMax = Math.max(
        0.001,
        selectedTrade?.annual?.['2024']?.turnover ?? 0,
        selectedTrade?.annual?.['2025']?.turnover ?? 0,
    );
    const selectedProducts = selectedTrade?.[`${tradeDirection}Products`] ?? [];
    const productMax = Math.max(
        0.001,
        ...selectedProducts.map((product) => product.value),
    );
    const selectedKdbProfile = selectedTrade
        ? kdbProfiles[selectedTrade.id]
        : undefined;
    const latestKdbMetric = selectedKdbProfile?.annual.find(
        (metric) => metric.year === selectedKdbProfile.latestYear,
    );
    const kdbAnnualMax = Math.max(
        0.001,
        ...(selectedKdbProfile?.annual.map((metric) => metric.marketImport) ??
            []),
    );
    const kdbCategoryMax = Math.max(
        0.001,
        ...(selectedKdbProfile?.categories.map(
            (category) => category.marketImport,
        ) ?? []),
    );
    const kdbProductMax = Math.max(
        0.001,
        ...(selectedKdbProfile?.products.map(
            (product) => product.marketImport,
        ) ?? []),
    );

    return (
        <main>
            <section className="story" ref={storyRef} id="story">
                <div className="stage">
                    <canvas
                        className="globe-canvas"
                        ref={canvasRef}
                        role="img"
                        style={{ opacity: globeFade }}
                        aria-label="Интерактивный вращающийся глобус: перетащите его, чтобы изменить направление обзора"
                    />
                    <div className="ambient-glow" aria-hidden="true" />

                    <header className="site-header">
                        <a
                            className="brand"
                            href="#story"
                            aria-label="in-map — на главную"
                        >
                            <span className="brand-mark">
                                <i />
                                <i />
                                <i />
                            </span>
                            <span>in-map</span>
                        </a>
                        <nav aria-label="Главная навигация">
                            <button type="button" onClick={goToKazakhstan}>
                                Казахстан
                            </button>
                            <button type="button" onClick={goToRegionMap}>
                                Регион
                            </button>
                            <a
                                className="project-analysis-link"
                                href="https://turkistan-invest-opportunity-map.chatgpt-edu-7368.chatgpt.site/"
                                target="_blank"
                                rel="noreferrer"
                                aria-label="Открыть анализ проекта в новой вкладке"
                            >
                                Анализ проекта <ExternalLink size={13} />
                            </a>
                            <button
                                className="assets-nav-button"
                                type="button"
                                onClick={() => setAssetsOpen(true)}
                            >
                                Активы
                            </button>
                        </nav>
                        <div className="header-actions">
                            <button
                                className="lang"
                                type="button"
                                aria-label="Выбрать язык"
                            >
                                RU <span>⌄</span>
                            </button>
                            <Link
                                className="login"
                                href={login()}
                                aria-label="Войти в систему"
                            >
                                <LogIn size={16} /> <span>Войти</span>
                            </Link>
                        </div>
                    </header>

                    <div
                        className="hero-copy"
                        style={{
                            opacity: heroFade,
                            transform: `translateY(${(1 - heroFade) * -28}px)`,
                        }}
                    >
                        <div className="eyebrow">
                            <span /> Инвестиционная платформа нового поколения
                        </div>
                        <h1>
                            Карта возможностей.
                            <br />
                            <em>Территория роста.</em>
                        </h1>
                        <p>
                            Единая цифровая среда, где территория,
                            инвестиционные проекты и управленческие данные
                            соединяются в ясную картину будущего.
                        </p>
                        <div
                            className="trade-overview"
                            aria-label="Ключевые показатели внешней торговли Казахстана"
                        >
                            <div className="trade-overview-head">
                                <span>
                                    Внешняя торговля ·{' '}
                                    {tradeSummary.partnerCount} партнёров
                                </span>
                                <b>{tradeSummary.period}</b>
                            </div>
                            <div className="trade-overview-values">
                                <div>
                                    <span>Товарооборот</span>
                                    <strong>
                                        {formatTradeValue(
                                            tradeSummary.turnover,
                                        )}
                                    </strong>
                                    <em>{formatGrowth(tradeSummary.growth)}</em>
                                </div>
                                <div>
                                    <span>Экспорт</span>
                                    <strong>
                                        {formatTradeValue(tradeSummary.export)}
                                    </strong>
                                    <em className="export">из Казахстана</em>
                                </div>
                                <div>
                                    <span>Импорт</span>
                                    <strong>
                                        {formatTradeValue(tradeSummary.import)}
                                    </strong>
                                    <em className="import">в Казахстан</em>
                                </div>
                            </div>
                            <div className="trade-route-legend">
                                <span>
                                    <i className="export" /> Экспорт
                                </span>
                                <span>
                                    <i className="import" /> Импорт
                                </span>
                                <div
                                    className="trade-country-control"
                                    ref={tradePickerRef}
                                >
                                    <button
                                        className="trade-country-trigger"
                                        type="button"
                                        aria-haspopup="listbox"
                                        aria-expanded={countryPickerOpen}
                                        onClick={() =>
                                            setCountryPickerOpen(
                                                (open) => !open,
                                            )
                                        }
                                    >
                                        {tradeDataState === 'loading'
                                            ? 'Загрузка стран…'
                                            : 'Выбрать страну'}
                                        <ChevronDown size={12} />
                                    </button>
                                    {countryPickerOpen && (
                                        <div className="trade-country-dropdown">
                                            <label>
                                                <Search size={13} />
                                                <input
                                                    autoFocus
                                                    value={countrySearch}
                                                    onChange={(event) =>
                                                        setCountrySearch(
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="Введите название страны"
                                                    aria-label="Поиск страны"
                                                />
                                            </label>
                                            <div
                                                className="trade-country-list"
                                                role="listbox"
                                                aria-label="Торговые партнёры"
                                            >
                                                {filteredTradePartners.map(
                                                    (partner) => (
                                                        <button
                                                            key={partner.id}
                                                            type="button"
                                                            role="option"
                                                            aria-selected={
                                                                partner.id ===
                                                                selectedTradeId
                                                            }
                                                            onClick={() =>
                                                                openTradePartner(
                                                                    partner.id,
                                                                )
                                                            }
                                                        >
                                                            <span>
                                                                <b>
                                                                    {
                                                                        partner.name
                                                                    }
                                                                </b>
                                                                <small>
                                                                    №
                                                                    {partner.rank ??
                                                                        '—'}{' '}
                                                                    ·{' '}
                                                                    {
                                                                        partner.period
                                                                    }
                                                                </small>
                                                            </span>
                                                            <strong>
                                                                {formatTradeValue(
                                                                    partner.turnover,
                                                                )}
                                                            </strong>
                                                        </button>
                                                    ),
                                                )}
                                                {!filteredTradePartners.length && (
                                                    <p>Страна не найдена</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="trade-data-meta">
                                <span className={tradeDataState}>
                                    {tradeDataState === 'ready'
                                        ? 'Данные обновлены'
                                        : tradeDataState === 'loading'
                                          ? 'Загружаем данные'
                                          : 'Резервные данные'}
                                </span>
                                <a
                                    href={tradeSummary.sourcePage}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Источник: {tradeSummary.source}{' '}
                                    <ExternalLink size={11} />
                                </a>
                            </div>
                        </div>
                        <div className="hero-actions">
                            <button
                                className="primary-cta"
                                type="button"
                                onClick={goToKazakhstan}
                            >
                                Исследовать потенциал <ArrowUpRight size={18} />
                            </button>
                            <span>
                                От страны
                                <br />к конкретной площадке
                            </span>
                        </div>
                    </div>

                    <div
                        ref={tradeTooltipRef}
                        className="trade-hover-tooltip"
                        aria-hidden="true"
                    />

                    <aside
                        className="side-index"
                        aria-label="Этапы путешествия"
                    >
                        <span className={progress < 0.28 ? 'active' : ''}>
                            Мир
                        </span>
                        <i>
                            <b
                                style={{
                                    height: `${Math.max(5, clamp(progress / 0.38) * 100)}%`,
                                }}
                            />
                        </i>
                        <span
                            className={
                                progress >= 0.28 && progress < 0.56
                                    ? 'active'
                                    : ''
                            }
                        >
                            Казахстан
                        </span>
                        <i>
                            <b
                                style={{
                                    height: `${Math.max(0, clamp((progress - 0.38) / 0.3) * 100)}%`,
                                }}
                            />
                        </i>
                        <span
                            className={
                                progress >= 0.56 && progress < 0.8
                                    ? 'active'
                                    : ''
                            }
                        >
                            Туркестан
                        </span>
                        <i>
                            <b
                                style={{
                                    height: `${Math.max(0, clamp((progress - 0.68) / 0.28) * 100)}%`,
                                }}
                            />
                        </i>
                        <span className={progress >= 0.8 ? 'active' : ''}>
                            Карта
                        </span>
                    </aside>

                    <div
                        className="country-copy"
                        style={{
                            opacity: countryReveal,
                            transform: `translateY(${(1 - countryReveal) * 34}px)`,
                        }}
                        aria-hidden={countryReveal < 0.3}
                    >
                        <div className="country-kicker">
                            <span>01</span> Казахстан
                        </div>
                        <h2>
                            В центре
                            <br />
                            новых возможностей
                        </h2>
                        <p>
                            Страна становится отправной точкой инвестиционного
                            маршрута.
                        </p>
                        <div className="coordinate">
                            48.0196° N&nbsp;&nbsp; 66.9237° E
                        </div>
                        <button
                            className="continue-region"
                            type="button"
                            onClick={goToRegion}
                        >
                            Перейти к области <ArrowDown size={15} />
                        </button>
                    </div>

                    <div
                        className="region-copy"
                        style={{
                            opacity: regionReveal,
                            transform: `translateY(${(1 - regionReveal) * 34}px)`,
                        }}
                        aria-hidden={regionReveal < 0.3}
                    >
                        <div className="country-kicker">
                            <span>02</span> Туркестанская область
                        </div>
                        <h2>
                            Регион, где
                            <br />
                            <em>начинается рост</em>
                        </h2>
                        <p>
                            Следующий масштаб инвестиционной карты — территория,
                            проекты и точки развития Туркестанской области.
                        </p>
                        <div className="coordinate">
                            43.3000° N&nbsp;&nbsp; 68.2500° E
                        </div>
                        <button
                            className="continue-region"
                            type="button"
                            onClick={goToRegionMap}
                        >
                            К карте районов <ArrowDown size={15} />
                        </button>
                        <div className="map-source">
                            Границы: официальный геопортал Туркестанской области
                        </div>
                    </div>

                    {regionMapRequested && (
                        <RegionMap3D progress={modelReveal} />
                    )}

                    {selectedTrade && (
                        <div
                            className="trade-modal-backdrop"
                            role="presentation"
                            onMouseDown={() => setSelectedTradeId(null)}
                        >
                            <section
                                className={
                                    tradeDetailOpen
                                        ? 'trade-modal detailed'
                                        : 'trade-modal'
                                }
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="trade-modal-title"
                                onMouseDown={(event) => event.stopPropagation()}
                            >
                                <div className="trade-modal-topline">
                                    <span>
                                        {tradeDetailOpen
                                            ? 'Детальные данные'
                                            : 'Торговый профиль'}{' '}
                                        · {selectedTrade.period}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTradeId(null)}
                                        aria-label="Закрыть окно"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                                <div className="trade-modal-heading">
                                    <div>
                                        <span>
                                            Казахстан ↔ торговый партнёр
                                        </span>
                                        <h2 id="trade-modal-title">
                                            {selectedTrade.name}
                                        </h2>
                                    </div>
                                    <strong>
                                        {formatTradeValue(
                                            selectedTrade.turnover,
                                        )}
                                        <small>
                                            товарооборот · №
                                            {selectedTrade.rank ?? '—'}
                                        </small>
                                    </strong>
                                </div>

                                <div
                                    className="trade-tabs"
                                    role="tablist"
                                    aria-label="Направление торговли"
                                >
                                    <button
                                        className={
                                            tradeDirection === 'export'
                                                ? 'active export'
                                                : ''
                                        }
                                        type="button"
                                        role="tab"
                                        aria-selected={
                                            tradeDirection === 'export'
                                        }
                                        onClick={() =>
                                            setTradeDirection('export')
                                        }
                                    >
                                        Экспорт из Казахстана{' '}
                                        <b>
                                            {formatTradeValue(
                                                selectedTrade.export,
                                            )}
                                        </b>
                                    </button>
                                    <button
                                        className={
                                            tradeDirection === 'import'
                                                ? 'active import'
                                                : ''
                                        }
                                        type="button"
                                        role="tab"
                                        aria-selected={
                                            tradeDirection === 'import'
                                        }
                                        onClick={() =>
                                            setTradeDirection('import')
                                        }
                                    >
                                        Импорт в Казахстан{' '}
                                        <b>
                                            {formatTradeValue(
                                                selectedTrade.import,
                                            )}
                                        </b>
                                    </button>
                                </div>

                                <div className="trade-modal-summary">
                                    <div>
                                        <span>Объём направления</span>
                                        <strong>
                                            {formatTradeValue(selectedVolume)}
                                        </strong>
                                    </div>
                                    <div>
                                        <span>
                                            Доля в{' '}
                                            {tradeDirection === 'export'
                                                ? 'экспорте'
                                                : 'импорте'}{' '}
                                            РК
                                        </span>
                                        <strong>
                                            {selectedShare.toFixed(1)}%
                                        </strong>
                                    </div>
                                    <div>
                                        <span>
                                            Изменение к сопоставимому периоду
                                        </span>
                                        <strong
                                            className={
                                                (selectedTrade.growth?.[
                                                    tradeDirection
                                                ] ?? 0) >= 0
                                                    ? 'positive'
                                                    : 'negative'
                                            }
                                        >
                                            {formatGrowth(
                                                selectedTrade.growth?.[
                                                    tradeDirection
                                                ],
                                            )}
                                        </strong>
                                    </div>
                                </div>

                                <div className="trade-balance-line">
                                    <span>
                                        Торговый баланс за выбранный период
                                    </span>
                                    <strong
                                        className={
                                            selectedBalance >= 0
                                                ? 'positive'
                                                : 'negative'
                                        }
                                    >
                                        {selectedBalance >= 0 ? '+' : '−'}
                                        {formatTradeValue(
                                            Math.abs(selectedBalance),
                                        )}
                                    </strong>
                                </div>

                                {!tradeDetailOpen ? (
                                    <div className="trade-brief-footer">
                                        <p>
                                            Сводка за выбранный период. Годовая
                                            динамика и товарные отрасли доступны
                                            в подробном профиле.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setTradeDetailOpen(true)
                                            }
                                        >
                                            Подробнее <ArrowUpRight size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="trade-detail-content">
                                        <div className="trade-detail-nav">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setTradeDetailOpen(false)
                                                }
                                            >
                                                <ArrowLeft size={13} /> К сводке
                                            </button>
                                            <span>
                                                Официальная детализация БНС
                                            </span>
                                        </div>
                                        <div
                                            className="trade-detail-source-tabs"
                                            role="tablist"
                                            aria-label="Источник детальных данных"
                                        >
                                            <button
                                                type="button"
                                                role="tab"
                                                aria-selected={
                                                    detailDataSource === 'bns'
                                                }
                                                className={
                                                    detailDataSource === 'bns'
                                                        ? 'active'
                                                        : ''
                                                }
                                                onClick={() =>
                                                    setDetailDataSource('bns')
                                                }
                                            >
                                                Торговля Казахстана
                                                <small>
                                                    БНС · экспорт и импорт РК
                                                </small>
                                            </button>
                                            <button
                                                type="button"
                                                role="tab"
                                                aria-selected={
                                                    detailDataSource === 'kdb'
                                                }
                                                className={
                                                    detailDataSource === 'kdb'
                                                        ? 'active kdb'
                                                        : ''
                                                }
                                                onClick={() =>
                                                    setDetailDataSource('kdb')
                                                }
                                            >
                                                Импортный рынок страны
                                                <small>
                                                    БРК · спрос, доля РК и
                                                    товары
                                                </small>
                                            </button>
                                        </div>
                                        {detailDataSource === 'bns' ? (
                                            <>
                                                <div className="trade-history-head">
                                                    <div>
                                                        <span>
                                                            Годовая динамика
                                                        </span>
                                                        <h3>
                                                            Товарооборот с
                                                            партнёром
                                                        </h3>
                                                    </div>
                                                    <b>2024–2025</b>
                                                </div>
                                                <div className="trade-history">
                                                    {(
                                                        [
                                                            '2024',
                                                            '2025',
                                                        ] as const
                                                    ).map((year) => {
                                                        const metric =
                                                            selectedTrade
                                                                .annual?.[year];
                                                        return (
                                                            <div
                                                                className="trade-history-year"
                                                                key={year}
                                                            >
                                                                <span>
                                                                    {year}
                                                                </span>
                                                                <div>
                                                                    <strong>
                                                                        {metric
                                                                            ? formatTradeValue(
                                                                                  metric.turnover,
                                                                              )
                                                                            : 'Нет данных'}
                                                                    </strong>
                                                                    <i>
                                                                        <b
                                                                            style={{
                                                                                width: `${metric ? Math.max(3, (metric.turnover / annualMax) * 100) : 0}%`,
                                                                            }}
                                                                        />
                                                                    </i>
                                                                </div>
                                                                <em>
                                                                    {metric
                                                                        ? `${formatTradeValue(metric.export)} экспорт · ${formatTradeValue(metric.import)} импорт`
                                                                        : '—'}
                                                                </em>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <div className="trade-products-head">
                                                    <div>
                                                        <span>
                                                            Товарные отрасли ·
                                                            ТН ВЭД
                                                        </span>
                                                        <h3>
                                                            {tradeDirection ===
                                                            'export'
                                                                ? 'Что Казахстан экспортирует'
                                                                : 'Что Казахстан импортирует'}
                                                        </h3>
                                                    </div>
                                                    <b>2025 год</b>
                                                </div>
                                                <div className="trade-products">
                                                    {selectedProducts.map(
                                                        (product) => (
                                                            <div
                                                                key={`${product.code}-${product.name}`}
                                                            >
                                                                <span>
                                                                    {product.code ??
                                                                        '—'}
                                                                </span>
                                                                <div>
                                                                    <strong>
                                                                        {
                                                                            product.name
                                                                        }
                                                                    </strong>
                                                                    <i>
                                                                        <b
                                                                            style={{
                                                                                width: `${Math.max(3, (product.value / productMax) * 100)}%`,
                                                                            }}
                                                                        />
                                                                    </i>
                                                                </div>
                                                                <em>
                                                                    {formatTradeValue(
                                                                        product.value,
                                                                    )}
                                                                </em>
                                                            </div>
                                                        ),
                                                    )}
                                                    {!selectedProducts.length && (
                                                        <p className="trade-products-empty">
                                                            Для этого
                                                            направления товарная
                                                            детализация
                                                            отсутствует.
                                                        </p>
                                                    )}
                                                </div>
                                                <p className="trade-modal-note">
                                                    Источник: Бюро национальной
                                                    статистики РК. Товарные
                                                    позиции показаны на уровне 4
                                                    знаков ТН ВЭД ЕАЭС; значения
                                                    округлены только для
                                                    отображения.
                                                </p>
                                            </>
                                        ) : selectedKdbProfile ? (
                                            <div className="kdb-profile">
                                                <div className="kdb-profile-hero">
                                                    <div>
                                                        <span>
                                                            Импортный профиль
                                                            рынка · БРК
                                                        </span>
                                                        <h3>
                                                            Спрос{' '}
                                                            {selectedTrade.name}{' '}
                                                            на товары из мира
                                                        </h3>
                                                        <p>
                                                            Показывает ёмкость
                                                            рынка страны,
                                                            фактические поставки
                                                            из Казахстана и
                                                            незанятую долю.
                                                        </p>
                                                    </div>
                                                    <b>
                                                        {
                                                            selectedKdbProfile.latestYear
                                                        }{' '}
                                                        год
                                                    </b>
                                                </div>

                                                <div className="kdb-key-metrics">
                                                    <div>
                                                        <span>
                                                            Импорт страны из
                                                            мира
                                                        </span>
                                                        <strong>
                                                            {formatMillionUsd(
                                                                latestKdbMetric?.marketImport,
                                                            )}
                                                        </strong>
                                                    </div>
                                                    <div>
                                                        <span>
                                                            Поставки из
                                                            Казахстана
                                                        </span>
                                                        <strong>
                                                            {formatMillionUsd(
                                                                latestKdbMetric?.fromKazakhstan,
                                                            )}
                                                        </strong>
                                                    </div>
                                                    <div>
                                                        <span>
                                                            Доля Казахстана
                                                        </span>
                                                        <strong>
                                                            {formatPercent(
                                                                latestKdbMetric?.kazakhstanShare,
                                                            )}
                                                        </strong>
                                                    </div>
                                                </div>

                                                <div className="trade-history-head kdb-section-head">
                                                    <div>
                                                        <span>
                                                            Динамика рынка
                                                        </span>
                                                        <h3>
                                                            Импорт страны по
                                                            годам
                                                        </h3>
                                                    </div>
                                                    <b>
                                                        {
                                                            selectedKdbProfile
                                                                .annual[0]?.year
                                                        }
                                                        –
                                                        {
                                                            selectedKdbProfile.latestYear
                                                        }
                                                    </b>
                                                </div>
                                                <div className="trade-history kdb-history">
                                                    {selectedKdbProfile.annual.map(
                                                        (metric) => (
                                                            <div
                                                                className="trade-history-year"
                                                                key={
                                                                    metric.year
                                                                }
                                                            >
                                                                <span>
                                                                    {
                                                                        metric.year
                                                                    }
                                                                </span>
                                                                <div>
                                                                    <strong>
                                                                        {formatMillionUsd(
                                                                            metric.marketImport,
                                                                        )}
                                                                    </strong>
                                                                    <i>
                                                                        <b
                                                                            style={{
                                                                                width: `${Math.max(3, (metric.marketImport / kdbAnnualMax) * 100)}%`,
                                                                            }}
                                                                        />
                                                                    </i>
                                                                </div>
                                                                <em>
                                                                    {formatMillionUsd(
                                                                        metric.fromKazakhstan,
                                                                    )}{' '}
                                                                    из РК ·{' '}
                                                                    {formatPercent(
                                                                        metric.kazakhstanShare,
                                                                    )}
                                                                </em>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>

                                                <div className="trade-products-head kdb-section-head">
                                                    <div>
                                                        <span>
                                                            Структура импорта
                                                        </span>
                                                        <h3>
                                                            Категории и уровень
                                                            передела
                                                        </h3>
                                                    </div>
                                                    <b>
                                                        {
                                                            selectedKdbProfile.latestYear
                                                        }{' '}
                                                        год
                                                    </b>
                                                </div>
                                                <div className="kdb-categories">
                                                    {selectedKdbProfile.categories.map(
                                                        (category, index) => (
                                                            <div
                                                                key={`${category.category}-${category.processing}-${index}`}
                                                            >
                                                                <span>
                                                                    {category.type ??
                                                                        'Категория'}
                                                                </span>
                                                                <div>
                                                                    <strong>
                                                                        {
                                                                            category.category
                                                                        }
                                                                        {category.processing
                                                                            ? ` · ${category.processing}`
                                                                            : ''}
                                                                    </strong>
                                                                    <i>
                                                                        <b
                                                                            style={{
                                                                                width: `${Math.max(3, (category.marketImport / kdbCategoryMax) * 100)}%`,
                                                                            }}
                                                                        />
                                                                    </i>
                                                                    <small>
                                                                        {formatMillionUsd(
                                                                            category.fromKazakhstan,
                                                                        )}{' '}
                                                                        из
                                                                        Казахстана
                                                                        · доля{' '}
                                                                        {formatPercent(
                                                                            category.kazakhstanShare,
                                                                        )}
                                                                    </small>
                                                                </div>
                                                                <em>
                                                                    {formatMillionUsd(
                                                                        category.marketImport,
                                                                    )}
                                                                </em>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>

                                                <div className="trade-products-head kdb-section-head">
                                                    <div>
                                                        <span>
                                                            Товарные позиции ·
                                                            ТН ВЭД 6 знаков
                                                        </span>
                                                        <h3>
                                                            Крупнейшие сегменты
                                                            импортного спроса
                                                        </h3>
                                                    </div>
                                                    <b>
                                                        {
                                                            selectedKdbProfile.latestYear
                                                        }{' '}
                                                        год
                                                    </b>
                                                </div>
                                                <div className="kdb-products">
                                                    {selectedKdbProfile.products.map(
                                                        (product) => (
                                                            <div
                                                                key={`${product.code}-${product.name}`}
                                                            >
                                                                <span>
                                                                    {
                                                                        product.code
                                                                    }
                                                                </span>
                                                                <div>
                                                                    <strong>
                                                                        {
                                                                            product.name
                                                                        }
                                                                    </strong>
                                                                    <i>
                                                                        <b
                                                                            style={{
                                                                                width: `${Math.max(3, (product.marketImport / kdbProductMax) * 100)}%`,
                                                                            }}
                                                                        />
                                                                    </i>
                                                                    <small>
                                                                        {formatMillionUsd(
                                                                            product.fromKazakhstan,
                                                                        )}{' '}
                                                                        из
                                                                        Казахстана
                                                                        · доля{' '}
                                                                        {formatPercent(
                                                                            product.kazakhstanShare,
                                                                        )}
                                                                    </small>
                                                                </div>
                                                                <em>
                                                                    {formatMillionUsd(
                                                                        product.marketImport,
                                                                    )}
                                                                </em>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                                <p className="trade-modal-note">
                                                    Источник:{' '}
                                                    <a
                                                        href={
                                                            kdbMetadata?.sourcePage ??
                                                            'https://www.kdb.kz/analytics/analiticheskiy-portal-importnogo-profilya-stran-mira/'
                                                        }
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        АО «Банк Развития
                                                        Казахстана»{' '}
                                                        <ExternalLink
                                                            size={11}
                                                        />
                                                    </a>
                                                    . Значения загружены из
                                                    публичной модели «Импортный
                                                    профиль» и округлены только
                                                    для отображения.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="kdb-profile-empty">
                                                <strong>
                                                    {kdbDataState === 'loading'
                                                        ? 'Загружаем профиль БРК…'
                                                        : 'Для этой страны профиль БРК не найден'}
                                                </strong>
                                                <p>
                                                    Данные БНС о торговле
                                                    Казахстана остаются доступны
                                                    в соседней вкладке.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </section>
                        </div>
                    )}

                    {assetsOpen && <AssetsExplorer onClose={closeAssets} />}

                    <button
                        className="scroll-hint"
                        type="button"
                        onClick={goToKazakhstan}
                        style={{ opacity: Math.max(0, 1 - progress * 3) }}
                    >
                        <span>
                            Прокрутите,
                            <br />
                            чтобы приблизиться
                        </span>
                        <i>
                            <ArrowDown size={16} />
                        </i>
                    </button>

                    <div className="progress-rail" aria-hidden="true">
                        <span style={{ width: `${progress * 100}%` }} />
                    </div>
                </div>
            </section>
        </main>
    );
}
