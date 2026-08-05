import { Head } from '@inertiajs/react';
import IssuesWorkspace, {
    type IssueRecord,
} from '@/components/issues-workspace';
import { useCanModify } from '@/hooks/use-can-modify';
import AppLayout from '@/layouts/app-layout';
import { show as regionShow } from '@/routes/regions';
import { show as subsoilShow } from '@/routes/subsoil-users';
import { destroy, store, update } from '@/routes/subsoil-users/issues';

const severityOptions = [
    { value: 'medium', label: 'Орташа' },
    { value: 'high', label: 'Жоғары' },
];

const statusOptions = [
    { value: 'open', label: 'Ашық' },
    { value: 'resolved', label: 'Шешілді' },
];

interface Region {
    id: number;
    name: string;
}

interface SubsoilUser {
    id: number;
    name: string;
    region?: Region;
}

interface Props {
    subsoilUser: SubsoilUser;
    issues: IssueRecord[];
}

export default function Issues({ subsoilUser, issues }: Props) {
    const canModify = useCanModify();

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: subsoilUser.region?.name || 'Аймақ',
                    href: subsoilUser.region
                        ? regionShow.url(subsoilUser.region)
                        : '',
                },
                {
                    title: subsoilUser.name,
                    href: subsoilShow.url(subsoilUser.id),
                },
                { title: 'Проблемалық мәселелер', href: '' },
            ]}
        >
            <Head title={`Проблемалық мәселелер - ${subsoilUser.name}`} />

            <IssuesWorkspace
                entityName={subsoilUser.name}
                entityLabel="Жер қойнауын пайдаланушы"
                backLabel="Нысанға қайту"
                backUrl={subsoilShow.url(subsoilUser.id)}
                issues={issues}
                canCreate={canModify}
                canUpdate={canModify}
                canDelete={canModify}
                showTitle={false}
                showCategory={false}
                severityOptions={severityOptions}
                statusOptions={statusOptions}
                storeUrl={store.url(subsoilUser)}
                updateUrl={(issue) =>
                    update.url({
                        subsoilUser: subsoilUser.id,
                        issue: issue.id,
                    })
                }
                destroyUrl={(issue) =>
                    destroy.url({
                        subsoilUser: subsoilUser.id,
                        issue: issue.id,
                    })
                }
                details={[
                    {
                        label: 'Аймақ',
                        value: subsoilUser.region?.name || 'Көрсетілмеген',
                    },
                ]}
            />
        </AppLayout>
    );
}
