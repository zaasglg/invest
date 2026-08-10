import { ExternalLink, MapPin } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type PanelView = 'summary' | 'sectors' | 'capital';

type StatisticFact = { value: string; label: string };

type RegionMetric = {
    id: string;
    label: string;
    value: number | null;
    unit: string;
    decimals: number;
    period: string;
    change?: number;
    changeLabel?: string;
    sourceId: string;
    facts: StatisticFact[];
};

type SectorStatistic = {
    id: string;
    label: string;
    short: string;
    value: number | null;
    unit: string;
    period: string;
    share: number | null;
    sourceId: string;
};

type IndustrialProduct = {
    name: string;
    value: string;
    measure: string;
};

type CapitalIndicator = {
    id: string;
    label: string;
    value: number | null;
    unit: string;
    period: string;
    detail: string;
    ratio: number | null;
    ratioLabel: string;
    sourceId: string;
};

type RegionProfile = {
    id: string;
    name: string;
    kind: 'region' | 'city' | 'district';
    metrics: RegionMetric[];
    sectors: SectorStatistic[];
    industrialProducts: IndustrialProduct[];
    capitalIndicators: CapitalIndicator[];
};

type StatisticSource = {
    id: string;
    label: string;
    period: string;
    url: string;
};

type RegionStatisticsDataset = {
    metadata: {
        title: string;
        updatedAt: string;
        methodology: string;
        sourcePage: string;
        sources: StatisticSource[];
    };
    profiles: RegionProfile[];
};

type TerritoryOption = { id: string; name: string };

function formatValue(value: number | null, decimals = 0) {
    if (value === null) return '—';
    const adaptiveDecimals =
        Math.abs(value) > 0 && Math.abs(value) < 1
            ? Math.max(decimals, 3)
            : decimals;
    return new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: adaptiveDecimals,
        maximumFractionDigits: adaptiveDecimals,
    }).format(value);
}

function formatChange(value?: number) {
    if (value === undefined) return null;
    return `${value > 0 ? '+' : ''}${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)}%`;
}

export function RegionStatisticsPanel({
    selectedId,
    selectedName,
    territories,
    onSelect,
    reveal,
}: {
    selectedId: string;
    selectedName: string;
    territories: TerritoryOption[];
    onSelect: (id: string) => void;
    reveal: number;
}) {
    const [dataset, setDataset] = useState<RegionStatisticsDataset | null>(
        null,
    );
    const [dataError, setDataError] = useState(false);
    const [panelView, setPanelView] = useState<PanelView>('summary');
    const [activeMetricId, setActiveMetricId] = useState('investment');
    const [activeSectorId, setActiveSectorId] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        fetch('/data/turkestan-region-statistics.json', {
            signal: controller.signal,
        })
            .then((response) => {
                if (!response.ok)
                    throw new Error(
                        `Statistics dataset returned ${response.status}`,
                    );
                return response.json() as Promise<RegionStatisticsDataset>;
            })
            .then((data) => {
                setDataset(data);
                setDataError(false);
            })
            .catch((error) => {
                if (
                    error instanceof DOMException &&
                    error.name === 'AbortError'
                )
                    return;
                setDataError(true);
            });
        return () => controller.abort();
    }, []);

    const profile = useMemo(
        () => dataset?.profiles.find((item) => item.id === selectedId) ?? null,
        [dataset, selectedId],
    );
    const sources = useMemo(
        () =>
            new Map(
                dataset?.metadata.sources.map((source) => [
                    source.id,
                    source,
                ]) ?? [],
            ),
        [dataset],
    );
    const activeMetric =
        profile?.metrics.find((metric) => metric.id === activeMetricId) ??
        profile?.metrics[0];
    const availableSectors = useMemo(
        () => profile?.sectors.filter((sector) => sector.value !== null) ?? [],
        [profile],
    );
    const quickSectors = availableSectors.slice(0, 6);
    const activeSector =
        availableSectors.find((sector) => sector.id === activeSectorId) ??
        availableSectors[0];
    const totalInvestment = profile?.metrics.find(
        (metric) => metric.id === 'investment',
    );

    const sourceLink = (sourceId: string) => {
        const source = sources.get(sourceId);
        if (!source) return null;
        return (
            <a
                className="region-source-link"
                href={source.url}
                target="_blank"
                rel="noreferrer"
            >
                {source.label} <ExternalLink size={10} />
            </a>
        );
    };

    return (
        <aside
            className="region-data-panel"
            aria-live="polite"
            style={{
                opacity: reveal,
                transform: `translateX(${(1 - reveal) * 42}px)`,
            }}
        >
            <div className="data-panel-topline">
                <span>
                    {panelView === 'summary'
                        ? 'Официальный профиль территории'
                        : panelView === 'sectors'
                          ? 'Инвестиции по отраслям'
                          : 'Основной капитал'}
                </span>
                <b>Факт · БНС</b>
            </div>
            <div className="data-panel-heading">
                <div>
                    <MapPin size={17} />
                </div>
                <h2>{selectedName}</h2>
                {selectedId !== 'kz.61' && (
                    <button type="button" onClick={() => onSelect('kz.61')}>
                        Вся область
                    </button>
                )}
            </div>

            <label className="territory-select" aria-label="Выбрать территорию">
                <select
                    value={selectedId}
                    onChange={(event) => onSelect(event.target.value)}
                >
                    <option value="kz.61">Вся область</option>
                    {territories.map((territory) => (
                        <option key={territory.id} value={territory.id}>
                            {territory.name}
                        </option>
                    ))}
                </select>
            </label>

            <div
                className="region-data-tabs"
                role="tablist"
                aria-label="Раздел данных"
            >
                {(
                    [
                        ['summary', 'Сводка'],
                        ['sectors', 'Отрасли'],
                        ['capital', 'Основной капитал'],
                    ] as Array<[PanelView, string]>
                ).map(([id, label]) => (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={panelView === id}
                        className={panelView === id ? 'active' : ''}
                        onClick={() => setPanelView(id)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {!profile && !dataError && (
                <div className="region-data-state">
                    Загружаем официальные показатели БНС…
                </div>
            )}
            {dataError && (
                <div className="region-data-state error">
                    Не удалось загрузить локальный набор статистики. Расчётные
                    значения не подставлены.
                </div>
            )}

            {profile && panelView === 'summary' && activeMetric && (
                <div className="region-summary-view">
                    <div className="region-metric-grid">
                        {profile.metrics.map((metric) => (
                            <button
                                key={metric.id}
                                className={
                                    activeMetric.id === metric.id
                                        ? 'active'
                                        : ''
                                }
                                type="button"
                                aria-pressed={activeMetric.id === metric.id}
                                onClick={() => setActiveMetricId(metric.id)}
                            >
                                <span>{metric.label}</span>
                                <strong>
                                    {formatValue(metric.value, metric.decimals)}
                                </strong>
                                <small>{metric.unit}</small>
                                {metric.change !== undefined && (
                                    <em
                                        className={
                                            metric.change < 0 ? 'negative' : ''
                                        }
                                    >
                                        {formatChange(metric.change)}
                                    </em>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="region-chart-section official-metric-detail">
                        <div className="chart-period">
                            <span>{activeMetric.period}</span>
                            {activeMetric.change !== undefined && (
                                <strong
                                    className={
                                        activeMetric.change < 0
                                            ? 'negative'
                                            : ''
                                    }
                                >
                                    {formatChange(activeMetric.change)}
                                </strong>
                            )}
                        </div>
                        <h3>{activeMetric.label}</h3>
                        <div className="metric-current-value">
                            <div>
                                <span>Опубликованное значение</span>
                                <strong>
                                    {formatValue(
                                        activeMetric.value,
                                        activeMetric.decimals,
                                    )}{' '}
                                    <small>{activeMetric.unit}</small>
                                </strong>
                            </div>
                            <p>
                                {activeMetric.changeLabel ??
                                    'Без модельных оценок и целевых подстановок'}
                            </p>
                        </div>
                        <div className="metric-facts">
                            {activeMetric.facts.map((fact) => (
                                <div key={fact.label}>
                                    <strong>{fact.value}</strong>
                                    <span>{fact.label}</span>
                                </div>
                            ))}
                        </div>
                        {sourceLink(activeMetric.sourceId)}
                    </div>
                </div>
            )}

            {profile && panelView === 'sectors' && (
                <div className="sector-report-view official-sector-view">
                    <div
                        className="sector-picker"
                        role="tablist"
                        aria-label="Крупнейшие отрасли по инвестициям"
                    >
                        {quickSectors.map((sector) => (
                            <button
                                key={sector.id}
                                type="button"
                                role="tab"
                                className={
                                    activeSector?.id === sector.id
                                        ? 'active'
                                        : ''
                                }
                                aria-selected={activeSector?.id === sector.id}
                                onClick={() => setActiveSectorId(sector.id)}
                            >
                                <span>{sector.short}</span>
                                <strong>
                                    {formatValue(
                                        sector.value,
                                        sector.value !== null &&
                                            sector.value < 1
                                            ? 3
                                            : 1,
                                    )}
                                </strong>
                                <small>{sector.unit}</small>
                            </button>
                        ))}
                    </div>
                    <label className="sector-full-select">
                        <span>Все опубликованные отрасли</span>
                        <select
                            value={activeSector?.id ?? ''}
                            onChange={(event) =>
                                setActiveSectorId(event.target.value)
                            }
                        >
                            {availableSectors.map((sector) => (
                                <option key={sector.id} value={sector.id}>
                                    {sector.label} —{' '}
                                    {formatValue(sector.value, 3)} млрд ₸
                                </option>
                            ))}
                        </select>
                    </label>

                    {activeSector && (
                        <div className="sector-detail">
                            <div className="sector-detail-heading">
                                <div>
                                    <span>{activeSector.period}</span>
                                    <h3>{activeSector.label}</h3>
                                </div>
                                <strong>
                                    {activeSector.share === null
                                        ? '—'
                                        : `${formatValue(activeSector.share, 1)}%`}
                                </strong>
                            </div>
                            <div className="sector-kpis official-sector-kpis">
                                <div>
                                    <span>Инвестиции отрасли</span>
                                    <strong>
                                        {formatValue(
                                            activeSector.value,
                                            activeSector.value !== null &&
                                                activeSector.value < 1
                                                ? 3
                                                : 1,
                                        )}{' '}
                                        <small>{activeSector.unit}</small>
                                    </strong>
                                </div>
                                <div>
                                    <span>Доля территории</span>
                                    <strong>
                                        {activeSector.share === null
                                            ? '—'
                                            : `${formatValue(activeSector.share, 1)}%`}
                                    </strong>
                                </div>
                                <div>
                                    <span>Все инвестиции</span>
                                    <strong>
                                        {formatValue(
                                            totalInvestment?.value ?? null,
                                            1,
                                        )}{' '}
                                        <small>млрд ₸</small>
                                    </strong>
                                </div>
                            </div>
                            {sourceLink(activeSector.sourceId)}
                        </div>
                    )}

                    <div className="sector-products-head">
                        <span>Опубликованная промышленная продукция</span>
                        <b>январь–июнь 2026</b>
                    </div>
                    {profile.industrialProducts.length ? (
                        <div className="sector-products official-products">
                            {profile.industrialProducts.map((product) => (
                                <div key={`${product.name}-${product.value}`}>
                                    <span title={product.name}>
                                        {product.name}
                                    </span>
                                    <i>
                                        <b style={{ width: '100%' }} />
                                    </i>
                                    <strong>{product.value}</strong>
                                    <small>{product.measure}</small>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="region-no-data">
                            В этой таблице БНС нет открытых товарных строк по
                            выбранной территории.
                        </div>
                    )}
                </div>
            )}

            {profile && panelView === 'capital' && (
                <div className="infrastructure-view official-capital-view">
                    <div className="infrastructure-heading">
                        <div>
                            <span>Только опубликованные значения</span>
                            <h3>Инвестиции и основные средства</h3>
                        </div>
                        <b>2025–2026</b>
                    </div>
                    <div className="infrastructure-grid">
                        {profile.capitalIndicators.map((item) => (
                            <article key={item.id}>
                                <div className="infrastructure-card-head">
                                    <span>{item.label}</span>
                                    <i>Факт</i>
                                </div>
                                <strong>
                                    {formatValue(
                                        item.value,
                                        item.value !== null && item.value < 1
                                            ? 3
                                            : 1,
                                    )}{' '}
                                    <small>{item.unit}</small>
                                </strong>
                                <p>
                                    {item.detail} · {item.period}
                                </p>
                                {item.ratio !== null && (
                                    <div className="infrastructure-progress">
                                        <i
                                            style={{
                                                width: `${Math.min(100, item.ratio)}%`,
                                            }}
                                        />
                                    </div>
                                )}
                                <footer>
                                    <span>{item.ratioLabel}</span>
                                    <b>
                                        {item.ratio === null
                                            ? '—'
                                            : `${formatValue(item.ratio, 1)}%`}
                                    </b>
                                </footer>
                                {sourceLink(item.sourceId)}
                            </article>
                        ))}
                    </div>
                    <div className="infrastructure-note">
                        Показатели приведены в периодах официальных публикаций
                        БНС; значения «—» не заменяются оценками.
                    </div>
                </div>
            )}

            {dataset && (
                <a
                    className="region-dataset-note"
                    href={dataset.metadata.sourcePage}
                    target="_blank"
                    rel="noreferrer"
                >
                    Полный перечень таблиц и методология БНС{' '}
                    <ExternalLink size={10} />
                </a>
            )}
        </aside>
    );
}
