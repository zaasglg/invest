import { Head } from '@inertiajs/react';
import IssuesWorkspace, {
    type IssueRecord,
} from '@/components/issues-workspace';
import { useCanModify } from '@/hooks/use-can-modify';
import AppLayout from '@/layouts/app-layout';
import { show as promZoneShow } from '@/routes/prom-zones';
import { destroy, store, update } from '@/routes/prom-zones/issues';
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

interface PromZone {
    id: number;
    name: string;
    region?: Region;
}

interface Props {
    promZone: PromZone;
    issues: IssueRecord[];
}

export default function Issues({ promZone, issues }: Props) {
    const canModify = useCanModify();

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: promZone.region?.name || 'Аймақ',
                    href: promZone.region
                        ? regionShow.url(promZone.region)
                        : '',
                },
                {
                    title: promZone.name,
                    href: promZoneShow.url(promZone.id),
                },
                { title: 'Проблемалық мәселелер', href: '' },
            ]}
        >
            <Head title={`Проблемалық мәселелер - ${promZone.name}`} />

            <IssuesWorkspace
                entityName={promZone.name}
                entityLabel="Өнеркәсіптік аймақ"
                backLabel="Аймақ бетіне қайту"
                backUrl={promZoneShow.url(promZone.id)}
                issues={issues}
                canCreate={canModify}
                canUpdate={canModify}
                canDelete={canModify}
                showTitle
                showCategory
                severityOptions={severityOptions}
                statusOptions={statusOptions}
                storeUrl={store.url(promZone)}
                updateUrl={(issue) =>
                    update.url({
                        promZone: promZone.id,
                        issue: issue.id,
                    })
                }
                destroyUrl={(issue) =>
                    destroy.url({
                        promZone: promZone.id,
                        issue: issue.id,
                    })
                }
                details={[
                    {
                        label: 'Аймақ',
                        value: promZone.region?.name || 'Көрсетілмеген',
                    },
                ]}
            />
        </AppLayout>
    );
}
