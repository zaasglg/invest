import {
    Boxes,
    Building2,
    ExternalLink,
    Factory,
    Gavel,
    Landmark,
    MapPinned,
    Search,
    Sprout,
    TrainFront,
    Waves,
    X,
    Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type AssetCategory =
    | 'industrial'
    | 'logistics'
    | 'energy'
    | 'agriculture'
    | 'tourism'
    | 'infrastructure'
    | 'bank_collateral';

type RegionAsset = {
    id: string;
    territoryId: string;
    category: AssetCategory;
    title: string;
    description: string;
    status: string;
    facts: string[];
    sourceUrl: string;
    sourceLabel?: string;
    bank?: string;
    verifiedAt?: string;
};

type Territory = {
    id: string;
    name: string;
    kind: 'city' | 'district';
};

type AssetsDataset = {
    metadata: {
        title: string;
        updatedAt: string;
        note: string;
        sources: Array<{ label: string; url: string }>;
    };
    territories: Territory[];
    assets: RegionAsset[];
};

const CATEGORY_META: Record<
    AssetCategory,
    { label: string; icon: typeof Factory }
> = {
    industrial: { label: 'Промышленность', icon: Factory },
    logistics: { label: 'Логистика', icon: TrainFront },
    energy: { label: 'Энергетика', icon: Zap },
    agriculture: { label: 'АПК', icon: Sprout },
    tourism: { label: 'Туризм', icon: Landmark },
    infrastructure: { label: 'Инфраструктура', icon: Building2 },
    bank_collateral: { label: 'Залоги банков', icon: Gavel },
};

export function AssetsExplorer({ onClose }: { onClose: () => void }) {
    const [dataset, setDataset] = useState<AssetsDataset | null>(null);
    const [selectedTerritory, setSelectedTerritory] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState<
        AssetCategory | 'all'
    >('all');
    const [search, setSearch] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        fetch('/data/turkestan-assets.json', { signal: controller.signal })
            .then((response) => {
                if (!response.ok)
                    throw new Error(
                        `Assets dataset returned ${response.status}`,
                    );
                return response.json() as Promise<AssetsDataset>;
            })
            .then(setDataset)
            .catch((error) => {
                if (
                    error instanceof DOMException &&
                    error.name === 'AbortError'
                )
                    return;
                setDataset(null);
            });
        return () => controller.abort();
    }, []);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', closeOnEscape);
        };
    }, [onClose]);

    const territoryCounts = useMemo(() => {
        const counts = new Map<string, number>();
        dataset?.assets.forEach((asset) =>
            counts.set(
                asset.territoryId,
                (counts.get(asset.territoryId) ?? 0) + 1,
            ),
        );
        return counts;
    }, [dataset]);

    const filteredAssets = useMemo(() => {
        if (!dataset) return [];
        const needle = search.trim().toLocaleLowerCase('ru-RU');
        return dataset.assets.filter((asset) => {
            if (
                selectedTerritory !== 'all' &&
                asset.territoryId !== selectedTerritory
            )
                return false;
            if (
                selectedCategory !== 'all' &&
                asset.category !== selectedCategory
            )
                return false;
            if (!needle) return true;
            return `${asset.title} ${asset.description} ${asset.bank ?? ''} ${asset.facts.join(' ')}`
                .toLocaleLowerCase('ru-RU')
                .includes(needle);
        });
    }, [dataset, search, selectedCategory, selectedTerritory]);

    const activeTerritory = dataset?.territories.find(
        (territory) => territory.id === selectedTerritory,
    );
    const cityCount =
        dataset?.territories.filter((territory) => territory.kind === 'city')
            .length ?? 0;

    return (
        <div
            className="assets-backdrop"
            role="presentation"
            onMouseDown={onClose}
        >
            <section
                className="assets-explorer"
                role="dialog"
                aria-modal="true"
                aria-labelledby="assets-title"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <header className="assets-header">
                    <div className="assets-title-mark">
                        <Boxes size={22} />
                    </div>
                    <div>
                        <span>Туркестанская область · каталог территории</span>
                        <h2 id="assets-title">Активы региона</h2>
                    </div>
                    <div className="assets-header-stats">
                        <div>
                            <strong>
                                {dataset?.territories.length ?? '—'}
                            </strong>
                            <span>территорий</span>
                        </div>
                        <div>
                            <strong>{dataset?.assets.length ?? '—'}</strong>
                            <span>активов</span>
                        </div>
                        <div>
                            <strong>{cityCount}</strong>
                            <span>города обл. значения</span>
                        </div>
                    </div>
                    <button
                        className="assets-close"
                        type="button"
                        onClick={onClose}
                        aria-label="Закрыть каталог активов"
                    >
                        <X size={19} />
                    </button>
                </header>

                <div className="assets-layout">
                    <aside
                        className="assets-territories"
                        aria-label="Территории Туркестанской области"
                    >
                        <div className="assets-territories-head">
                            <MapPinned size={15} />
                            <span>Районы и города</span>
                        </div>
                        <button
                            type="button"
                            className={
                                selectedTerritory === 'all' ? 'active' : ''
                            }
                            onClick={() => setSelectedTerritory('all')}
                        >
                            <span>
                                <strong>Вся область</strong>
                                <small>единый каталог</small>
                            </span>
                            <b>{dataset?.assets.length ?? 0}</b>
                        </button>
                        <div className="assets-territory-list">
                            {dataset?.territories.map((territory) => (
                                <button
                                    type="button"
                                    key={territory.id}
                                    className={
                                        selectedTerritory === territory.id
                                            ? 'active'
                                            : ''
                                    }
                                    onClick={() =>
                                        setSelectedTerritory(territory.id)
                                    }
                                >
                                    <span>
                                        <strong>{territory.name}</strong>
                                        <small>
                                            {territory.kind === 'city'
                                                ? 'город'
                                                : 'район'}
                                        </small>
                                    </span>
                                    <b>
                                        {territoryCounts.get(territory.id) ?? 0}
                                    </b>
                                </button>
                            ))}
                        </div>
                    </aside>

                    <div className="assets-content">
                        <div className="assets-toolbar">
                            <label className="assets-search">
                                <Search size={15} />
                                <input
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Поиск актива, отрасли или объекта"
                                    aria-label="Поиск по каталогу активов"
                                />
                            </label>
                            <label className="assets-mobile-territory">
                                <select
                                    value={selectedTerritory}
                                    onChange={(event) =>
                                        setSelectedTerritory(event.target.value)
                                    }
                                >
                                    <option value="all">Вся область</option>
                                    {dataset?.territories.map((territory) => (
                                        <option
                                            key={territory.id}
                                            value={territory.id}
                                        >
                                            {territory.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <div
                            className="assets-category-filters"
                            role="tablist"
                            aria-label="Категории активов"
                        >
                            <button
                                type="button"
                                className={
                                    selectedCategory === 'all' ? 'active' : ''
                                }
                                onClick={() => setSelectedCategory('all')}
                            >
                                Все
                            </button>
                            {(
                                Object.entries(CATEGORY_META) as Array<
                                    [
                                        AssetCategory,
                                        (typeof CATEGORY_META)[AssetCategory],
                                    ]
                                >
                            ).map(([id, item]) => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        type="button"
                                        key={id}
                                        className={
                                            selectedCategory === id
                                                ? 'active'
                                                : ''
                                        }
                                        onClick={() => setSelectedCategory(id)}
                                    >
                                        <Icon size={12} /> {item.label}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="assets-results-head">
                            <div>
                                <span>
                                    {activeTerritory
                                        ? activeTerritory.kind === 'city'
                                            ? 'Город'
                                            : 'Район'
                                        : 'Область'}
                                </span>
                                <h3>
                                    {activeTerritory?.name ?? 'Все территории'}
                                </h3>
                            </div>
                            <b>
                                {filteredAssets.length}{' '}
                                {filteredAssets.length === 1
                                    ? 'актив'
                                    : 'активов'}
                            </b>
                        </div>

                        <div className="assets-grid">
                            {filteredAssets.map((asset) => {
                                const category = CATEGORY_META[asset.category];
                                const Icon =
                                    asset.category === 'infrastructure'
                                        ? Waves
                                        : category.icon;
                                const territory = dataset?.territories.find(
                                    (item) => item.id === asset.territoryId,
                                );
                                return (
                                    <article
                                        className={`asset-card category-${asset.category}`}
                                        key={asset.id}
                                    >
                                        <div className="asset-card-topline">
                                            <span>
                                                <Icon size={13} />{' '}
                                                {category.label}
                                            </span>
                                            <b>{asset.status}</b>
                                        </div>
                                        <h4>{asset.title}</h4>
                                        <p>{asset.description}</p>
                                        {asset.bank && (
                                            <div className="asset-bank-line">
                                                <Landmark size={12} />
                                                <strong>{asset.bank}</strong>
                                                {asset.verifiedAt && (
                                                    <span>
                                                        проверено{' '}
                                                        {asset.verifiedAt}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        <div className="asset-facts">
                                            {asset.facts.map((fact) => (
                                                <span key={fact}>{fact}</span>
                                            ))}
                                        </div>
                                        <footer>
                                            <span>
                                                <MapPinned size={12} />{' '}
                                                {territory?.name}
                                            </span>
                                            <a
                                                href={asset.sourceUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                aria-label={`Открыть источник: ${asset.title}`}
                                            >
                                                {asset.sourceLabel ??
                                                    'Источник'}{' '}
                                                <ExternalLink size={11} />
                                            </a>
                                        </footer>
                                    </article>
                                );
                            })}
                            {!dataset && (
                                <div className="assets-empty">
                                    <strong>Загружаем каталог активов…</strong>
                                </div>
                            )}
                            {dataset && !filteredAssets.length && (
                                <div className="assets-empty">
                                    <strong>
                                        По выбранным фильтрам активы не найдены
                                    </strong>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearch('');
                                            setSelectedCategory('all');
                                        }}
                                    >
                                        Сбросить фильтры
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="assets-data-note">
                            <span>{dataset?.metadata.note}</span>
                            <div>
                                {dataset?.metadata.sources.map((source) => (
                                    <a
                                        key={source.url}
                                        href={source.url}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        {source.label}
                                        <ExternalLink size={10} />
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
