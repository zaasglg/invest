import { Head } from '@inertiajs/react';
import IssuesWorkspace, {
    type IssueRecord,
} from '@/components/issues-workspace';
import { useCanModify } from '@/hooks/use-can-modify';
import AppLayout from '@/layouts/app-layout';
import { show as regionShow } from '@/routes/regions';
import { show as sezShow } from '@/routes/sezs';
import { destroy, store, update } from '@/routes/sezs/issues';

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

interface Sez {
    id: number;
    name: string;
    region?: Region;
}

interface Props {
    sez: Sez;
    issues: IssueRecord[];
}

export default function Issues({ sez, issues }: Props) {
    const canModify = useCanModify();

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: sez.region?.name || 'Аймақ',
                    href: sez.region ? regionShow.url(sez.region) : '',
                },
                { title: sez.name, href: sezShow.url(sez.id) },
                { title: 'Проблемалық мәселелер', href: '' },
            ]}
        >
            <Head title={`Проблемалық мәселелер - ${sez.name}`} />

            <IssuesWorkspace
                entityName={sez.name}
                entityLabel="Арнайы экономикалық аймақ"
                backLabel="АЭА бетіне қайту"
                backUrl={sezShow.url(sez.id)}
                issues={issues}
                canCreate={canModify}
                canUpdate={canModify}
                canDelete={canModify}
                showTitle
                showCategory
                severityOptions={severityOptions}
                statusOptions={statusOptions}
                storeUrl={store.url(sez)}
                updateUrl={(issue) =>
                    update.url({ sez: sez.id, issue: issue.id })
                }
                destroyUrl={(issue) =>
                    destroy.url({ sez: sez.id, issue: issue.id })
                }
                details={[
                    {
                        label: 'Аймақ',
                        value: sez.region?.name || 'Көрсетілмеген',
                    },
                ]}
            />
        </AppLayout>
    );
}
