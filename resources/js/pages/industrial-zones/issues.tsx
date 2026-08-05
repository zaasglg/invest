import { Head } from '@inertiajs/react';
import IssuesWorkspace, {
    type IssueRecord,
} from '@/components/issues-workspace';
import { useCanModify } from '@/hooks/use-can-modify';
import AppLayout from '@/layouts/app-layout';
import { show as industrialZoneShow } from '@/routes/industrial-zones';
import { destroy, store, update } from '@/routes/industrial-zones/issues';
import { show as regionShow } from '@/routes/regions';

const severityOptions = [
    { value: 'low', label: 'Төмен' },
    { value: 'medium', label: 'Орташа' },
    { value: 'high', label: 'Жоғары' },
    { value: 'critical', label: 'Сыни жағдай' },
];

const statusOptions = [
    { value: 'open', label: 'Ашық' },
    { value: 'in_progress', label: 'Орындалуда' },
    { value: 'resolved', label: 'Шешілді' },
];

interface Region {
    id: number;
    name: string;
}

interface IndustrialZone {
    id: number;
    name: string;
    region?: Region;
}

interface Props {
    industrialZone: IndustrialZone;
    issues: IssueRecord[];
}

export default function Issues({ industrialZone, issues }: Props) {
    const canModify = useCanModify();

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: industrialZone.region?.name || 'Аймақ',
                    href: industrialZone.region
                        ? regionShow.url(industrialZone.region)
                        : '',
                },
                {
                    title: industrialZone.name,
                    href: industrialZoneShow.url(industrialZone.id),
                },
                { title: 'Проблемалық мәселелер', href: '' },
            ]}
        >
            <Head title={`Проблемалық мәселелер - ${industrialZone.name}`} />

            <IssuesWorkspace
                entityName={industrialZone.name}
                entityLabel="Индустриялық аймақ"
                backLabel="Аймақ бетіне қайту"
                backUrl={industrialZoneShow.url(industrialZone.id)}
                issues={issues}
                canCreate={canModify}
                canUpdate={canModify}
                canDelete={canModify}
                showTitle
                showCategory
                severityOptions={severityOptions}
                statusOptions={statusOptions}
                storeUrl={store.url(industrialZone)}
                updateUrl={(issue) =>
                    update.url({
                        industrialZone: industrialZone.id,
                        issue: issue.id,
                    })
                }
                destroyUrl={(issue) =>
                    destroy.url({
                        industrialZone: industrialZone.id,
                        issue: issue.id,
                    })
                }
                details={[
                    {
                        label: 'Аймақ',
                        value: industrialZone.region?.name || 'Көрсетілмеген',
                    },
                ]}
            />
        </AppLayout>
    );
}
