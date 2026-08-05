import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    Award,
    Bot,
    BriefcaseBusiness,
    Building2,
    Factory,
    Lightbulb,
    Search,
    Sparkles,
    Target,
    TrendingUp,
    Users,
} from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { baskarmaRating } from '@/routes';
import * as akim from '@/routes/akim';
import { send as sendChatMessage } from '@/routes/chat';
import * as investmentProjects from '@/routes/investment-projects';
import type { BreadcrumbItem } from '@/types';

interface Summary {
    total_projects: number;
    total_investment: number;
    jobs_count: number;
    implementation_projects: number;
    launched_projects: number;
    suspended_projects: number;
    active_issues: number;
    critical_issues: number;
    total_tasks: number;
    completed_tasks: number;
    overdue_tasks: number;
}

interface QualityItem {
    rank: number;
    name: string;
    project_count: number;
    total_tasks: number;
    completed_tasks: number;
    active_tasks?: number;
    overdue_tasks: number;
    active_issues?: number;
    critical_issues?: number;
    completion_rate: number;
    deadline_rate: number;
    score: number | null;
    members_count?: number;
    regions?: string[];
}

interface NicheItem {
    id: number | null;
    rank: number;
    name: string;
    project_count: number;
    investment: number;
    jobs_count: number;
    plan_projects: number;
    implementation_projects: number;
    launched_projects: number;
    suspended_projects: number;
    active_issues: number;
    potential_score: number;
}

interface Analytics {
    scope: {
        oblast_id: number;
        oblast_name: string;
        districts_count: number;
        description: string;
    };
    summary: Summary;
    status_distribution: Array<{ name: string; value: number }>;
    district_quality: QualityItem[];
    management_quality: QualityItem[];
    niche_analytics: NicheItem[];
    regional_potential: {
        pipeline_projects: number;
        pipeline_investment: number;
        pipeline_jobs: number;
        assets: {
            sezs: number;
            industrial_zones: number;
            prom_zones: number;
            subsoil_users: number;
        };
        insights: string[];
    };
}

interface Props {
    analytics: Analytics;
}

const numberFormatter = new Intl.NumberFormat('kk-KZ');
const moneyFormatter = new Intl.NumberFormat('kk-KZ', {
    maximumFractionDigits: 0,
});

const formatNumber = (value: number) => numberFormatter.format(value);
const formatMoney = (value: number) => `${moneyFormatter.format(value)} ₸`;

function Score({ value }: { value: number | null }) {
    if (value === null) {
        return <span className="text-sm text-muted-foreground">Дерек жоқ</span>;
    }

    const color =
        value >= 80
            ? 'bg-emerald-500'
            : value >= 60
              ? 'bg-blue-500'
              : value >= 40
                ? 'bg-amber-500'
                : 'bg-red-500';

    return (
        <div className="flex min-w-36 items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                    className={`h-full rounded-full ${color}`}
                    style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                />
            </div>
            <span className="w-12 text-right font-semibold">{value}%</span>
        </div>
    );
}

function SummaryCard({
    title,
    value,
    hint,
    icon: Icon,
    warning = false,
}: {
    title: string;
    value: string;
    hint: string;
    icon: typeof BriefcaseBusiness;
    warning?: boolean;
}) {
    return (
        <Card className="overflow-hidden border-border/70 shadow-sm">
            <CardContent className="flex items-start justify-between p-5">
                <div>
                    <p className="text-sm text-muted-foreground">{title}</p>
                    <p className="mt-2 text-2xl font-bold tracking-tight">
                        {value}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
                </div>
                <div
                    className={`rounded-xl p-3 ${
                        warning
                            ? 'bg-red-50 text-red-600 dark:bg-red-950/40'
                            : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40'
                    }`}
                >
                    <Icon className="size-5" />
                </div>
            </CardContent>
        </Card>
    );
}

function QualityTable({
    items,
    emptyText,
    management = false,
}: {
    items: QualityItem[];
    emptyText: string;
    management?: boolean;
}) {
    if (items.length === 0) {
        return (
            <div className="py-12 text-center text-sm text-muted-foreground">
                {emptyText}
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <Table className="min-w-[840px]">
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-14">№</TableHead>
                        <TableHead>{management ? 'Басқарма' : 'Аудан/қала'}</TableHead>
                        <TableHead className="text-center">Жоба</TableHead>
                        <TableHead>Тапсырма</TableHead>
                        <TableHead className="text-center">Кешіккен</TableHead>
                        {!management && (
                            <TableHead className="text-center">Мәселе</TableHead>
                        )}
                        <TableHead className="min-w-52">Сапа бағасы</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item) => (
                        <TableRow key={`${item.rank}-${item.name}`}>
                            <TableCell>
                                <Badge
                                    variant={item.rank <= 3 ? 'default' : 'outline'}
                                >
                                    {item.rank}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <p className="font-medium">{item.name}</p>
                                {management && item.members_count !== undefined && (
                                    <p className="text-xs text-muted-foreground">
                                        {item.members_count} орындаушы
                                    </p>
                                )}
                            </TableCell>
                            <TableCell className="text-center">
                                {item.project_count}
                            </TableCell>
                            <TableCell>
                                <span className="font-medium text-emerald-600">
                                    {item.completed_tasks}
                                </span>
                                <span className="text-muted-foreground">
                                    {' '}
                                    / {item.total_tasks}
                                </span>
                            </TableCell>
                            <TableCell className="text-center">
                                <span
                                    className={
                                        item.overdue_tasks > 0
                                            ? 'font-semibold text-red-600'
                                            : 'text-muted-foreground'
                                    }
                                >
                                    {item.overdue_tasks}
                                </span>
                            </TableCell>
                            {!management && (
                                <TableCell className="text-center">
                                    {item.active_issues ?? 0}
                                </TableCell>
                            )}
                            <TableCell>
                                <Score value={item.score} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

export default function AkimAnalytics({ analytics }: Props) {
    const [search, setSearch] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');
    const { summary, regional_potential: potential } = analytics;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Облыс аналитикасы',
            href: akim.analytics.url(),
        },
    ];

    const submitSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!search.trim()) return;

        router.get(investmentProjects.index.url(), {
            search: search.trim(),
        });
    };

    const askAi = async (message: string) => {
        setAiLoading(true);
        setAiError('');

        try {
            const response = await fetch(sendChatMessage.url(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN':
                        document
                            .querySelector('meta[name="csrf-token"]')
                            ?.getAttribute('content') ?? '',
                },
                body: JSON.stringify({ message }),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = (await response.json()) as { message: string };
            setAiResponse(data.message);
        } catch {
            setAiError('ИИ жауабын алу мүмкін болмады. Қайта көріңіз.');
        } finally {
            setAiLoading(false);
        }
    };

    const statusMax = Math.max(
        1,
        ...analytics.status_distribution.map((item) => item.value),
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Облыс аналитикасы" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-6 text-white shadow-lg md:p-8">
                    <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
                        <div className="max-w-3xl">
                            <Badge className="mb-4 bg-white/15 text-white hover:bg-white/20">
                                Облыстық әкімге арналған басқарушылық панель
                            </Badge>
                            <h1 className="text-3xl font-bold tracking-tight md:text-4xl text-white">
                                {analytics.scope.oblast_name} аналитикасы
                            </h1>
                            <p className="mt-3 text-sm text-blue-100 md:text-base">
                                {analytics.scope.description}. Сапа көрсеткіштері,
                                рейтинг, нишалар және өңірдің инвестициялық әлеуеті
                                бір жерде.
                            </p>
                        </div>

                        <form
                            onSubmit={submitSearch}
                            className="flex w-full max-w-xl gap-2 rounded-xl bg-white/10 p-2 backdrop-blur"
                        >
                            <div className="relative flex-1">
                                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-blue-200" />
                                <Input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Жоба, ТОО атауы немесе БИН"
                                    className="border-white/20 bg-white/10 pl-9 text-white placeholder:text-blue-200"
                                />
                            </div>
                            <Button type="submit" variant="secondary">
                                Іздеу
                            </Button>
                        </form>
                    </div>
                </section>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                        title="Барлық жоба"
                        value={formatNumber(summary.total_projects)}
                        hint={`${summary.implementation_projects} іске асырылуда · ${summary.launched_projects} іске қосылған`}
                        icon={BriefcaseBusiness}
                    />
                    <SummaryCard
                        title="Инвестиция көлемі"
                        value={formatMoney(summary.total_investment)}
                        hint={`${analytics.scope.districts_count} аудан/қала қамтылды`}
                        icon={TrendingUp}
                    />
                    <SummaryCard
                        title="Жұмыс орындары"
                        value={formatNumber(summary.jobs_count)}
                        hint={`${formatNumber(potential.pipeline_jobs)} орын жоспарланған`}
                        icon={Users}
                    />
                    <SummaryCard
                        title="Бақылауды қажет етеді"
                        value={formatNumber(
                            summary.active_issues + summary.overdue_tasks,
                        )}
                        hint={`${summary.active_issues} мәселе · ${summary.overdue_tasks} кешіккен тапсырма`}
                        icon={AlertTriangle}
                        warning={
                            summary.active_issues + summary.overdue_tasks > 0
                        }
                    />
                </section>

                <section className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
                    <Card>
                        <CardHeader className="flex-row items-start justify-between gap-4">
                            <div>
                                <CardTitle>Аудан әкімдіктерінің жұмыс сапасы</CardTitle>
                                <CardDescription>
                                    Тапсырма орындалуы, мерзім тәртібі, мәселелердің
                                    шешілуі және жоба тұрақтылығы бойынша есептеледі.
                                </CardDescription>
                            </div>
                            <Award className="size-6 text-amber-500" />
                        </CardHeader>
                        <CardContent className="p-0">
                            <QualityTable
                                items={analytics.district_quality}
                                emptyText="Аудандар бойынша дерек жоқ"
                            />
                        </CardContent>
                    </Card>

                    <div className="grid gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Жобалар мәртебесі</CardTitle>
                                <CardDescription>
                                    Облыс бойынша белсенді жобалардың құрылымы
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {analytics.status_distribution.map((item) => (
                                    <div key={item.name}>
                                        <div className="mb-1.5 flex justify-between text-sm">
                                            <span>{item.name}</span>
                                            <span className="font-semibold">
                                                {item.value}
                                            </span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                                            <div
                                                className="h-full rounded-full bg-blue-600"
                                                style={{
                                                    width: `${(item.value / statusMax) * 100}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Өңір әлеуеті</CardTitle>
                                <CardDescription>
                                    Жоспарлау және іске асыру сатысындағы портфель
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4">
                                <div className="rounded-xl bg-muted/60 p-4">
                                    <p className="text-2xl font-bold">
                                        {potential.pipeline_projects}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        портфельдегі жоба
                                    </p>
                                </div>
                                <div className="rounded-xl bg-muted/60 p-4">
                                    <p className="text-lg font-bold">
                                        {formatMoney(
                                            potential.pipeline_investment,
                                        )}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        әлеуетті инвестиция
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                <Card>
                    <CardHeader className="flex-row items-start justify-between gap-4">
                        <div>
                            <CardTitle>Басқармалар жұмысының сапасы</CardTitle>
                            <CardDescription>
                                Облыстық және қосымша басқармаларға бекітілген
                                орындаушылардың нақты тапсырмалары бойынша.
                            </CardDescription>
                        </div>
                        <Button asChild variant="outline">
                            <Link href={baskarmaRating.url()}>
                                Толық рейтинг
                                <ArrowRight className="ml-2 size-4" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <QualityTable
                            items={analytics.management_quality}
                            emptyText="Басқармалар бойынша тапсырма дерегі жоқ"
                            management
                        />
                    </CardContent>
                </Card>

                <section className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Нишалық аналитика</CardTitle>
                            <CardDescription>
                                Инвестиция, жұмыс орны, жоба портфелі және тұрақтылық
                                негізіндегі салыстырмалы әлеует.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table className="min-w-[760px]">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Ниша</TableHead>
                                            <TableHead className="text-center">
                                                Жоба
                                            </TableHead>
                                            <TableHead>Инвестиция</TableHead>
                                            <TableHead className="text-center">
                                                Жұмыс орны
                                            </TableHead>
                                            <TableHead>Әлеует</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {analytics.niche_analytics.map((niche) => (
                                            <TableRow key={niche.id ?? 'none'}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline">
                                                            {niche.rank}
                                                        </Badge>
                                                        <div>
                                                            <p className="font-medium">
                                                                {niche.name}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {niche.implementation_projects}{' '}
                                                                іске асырылуда ·{' '}
                                                                {niche.launched_projects} іске
                                                                қосылған
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {niche.project_count}
                                                </TableCell>
                                                <TableCell>
                                                    {formatMoney(niche.investment)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {formatNumber(niche.jobs_count)}
                                                </TableCell>
                                                <TableCell>
                                                    <Score
                                                        value={niche.potential_score}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Factory className="size-5 text-blue-600" />
                                    Өңір активтері
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-3">
                                {[
                                    ['АЭА', potential.assets.sezs],
                                    [
                                        'Индустриялық аймақ',
                                        potential.assets.industrial_zones,
                                    ],
                                    ['Пром аймақ', potential.assets.prom_zones],
                                    [
                                        'Жер қойнауын пайдаланушы',
                                        potential.assets.subsoil_users,
                                    ],
                                ].map(([label, value]) => (
                                    <div
                                        key={label}
                                        className="rounded-xl border bg-card p-4"
                                    >
                                        <p className="text-2xl font-bold">{value}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {label}
                                        </p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Lightbulb className="size-5 text-amber-500" />
                                    Басқарушылық назар
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {potential.insights.map((insight) => (
                                    <div
                                        key={insight}
                                        className="flex gap-3 rounded-xl bg-muted/60 p-3 text-sm"
                                    >
                                        <Target className="mt-0.5 size-4 shrink-0 text-blue-600" />
                                        <span>{insight}</span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </section>

                <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:border-blue-900 dark:from-blue-950/40 dark:to-background">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bot className="size-6 text-blue-600" />
                            Әкімнің ИИ аналитигі
                        </CardTitle>
                        <CardDescription>
                            ИИ тек облысқа қолжетімді нақты жоба, тапсырма, мәселе,
                            рейтинг және нишалық әлеует деректеріне сүйеніп есеп пен
                            ұсыныс жасайды.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            {[
                                'Облыс бойынша қысқаша басқарушылық есеп жаса',
                                'Аудандар мен басқармалардың жұмыс сапасын талдап, кеңес бер',
                                'Нишалық аналитика мен өңір әлеуеті бойынша ұсыныс жаса',
                            ].map((prompt) => (
                                <Button
                                    key={prompt}
                                    type="button"
                                    variant="outline"
                                    disabled={aiLoading}
                                    onClick={() => void askAi(prompt)}
                                >
                                    <Sparkles className="mr-2 size-4" />
                                    {prompt}
                                </Button>
                            ))}
                        </div>

                        {aiLoading && (
                            <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">
                                ИИ облыстық деректерді талдап жатыр...
                            </div>
                        )}
                        {aiError && (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                {aiError}
                            </div>
                        )}
                        {aiResponse && !aiLoading && (
                            <div className="whitespace-pre-wrap rounded-xl border bg-background p-5 text-sm leading-6 shadow-sm">
                                {aiResponse}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-950/40">
                                <Building2 className="size-5" />
                            </div>
                            <div>
                                <p className="font-semibold">Барлық жобалар тізімі</p>
                                <p className="text-sm text-muted-foreground">
                                    Атауы, ТОО атауы немесе БИН арқылы толық іздеу
                                </p>
                            </div>
                        </div>
                        <Button asChild>
                            <Link href={investmentProjects.index.url()}>
                                Жобаларға өту
                                <ArrowRight className="ml-2 size-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
