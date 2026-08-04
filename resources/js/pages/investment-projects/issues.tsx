import { Head, usePage } from '@inertiajs/react';
import IssuesWorkspace, {
    type IssueRecord,
} from '@/components/issues-workspace';
import { useCanModify } from '@/hooks/use-can-modify';
import AppLayout from '@/layouts/app-layout';
import { show as projectShow } from '@/routes/investment-projects';
import { destroy, store, update } from '@/routes/investment-projects/issues';
import { show as regionShow } from '@/routes/regions';
import type { SharedData } from '@/types';

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

interface InvestmentProject {
    id: number;
    name: string;
    region?: Region;
}

interface Props {
    project: InvestmentProject;
    issues: IssueRecord[];
    participantCanCreate?: boolean;
}

export default function Issues({
    project,
    issues,
    participantCanCreate = false,
}: Props) {
    const canModify = useCanModify();
    const { auth } = usePage<SharedData>().props;
    const canManageProject =
        canModify || auth.user?.role_model?.name === 'moderator';

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: project.region?.name || 'Аудан',
                    href: project.region ? regionShow.url(project.region) : '',
                },
                {
                    title: project.name,
                    href: projectShow.url(project.id),
                },
                { title: 'Проблемалық мәселелер', href: '' },
            ]}
        >
            <Head title={`Проблемалық мәселелер - ${project.name}`} />

            <IssuesWorkspace
                entityName={project.name}
                entityLabel="Инвестициялық жоба"
                backLabel="Жобаға қайту"
                backUrl={projectShow.url(project.id)}
                issues={issues}
                canCreate={canManageProject || participantCanCreate}
                canUpdate={canManageProject}
                canDelete={canManageProject}
                showTitle
                showCategory
                severityOptions={severityOptions}
                statusOptions={statusOptions}
                storeUrl={store.url(project)}
                updateUrl={(issue) =>
                    update.url({
                        investmentProject: project.id,
                        issue: issue.id,
                    })
                }
                destroyUrl={(issue) =>
                    destroy.url({
                        investmentProject: project.id,
                        issue: issue.id,
                    })
                }
                details={[
                    {
                        label: 'Аймақ',
                        value: project.region?.name || 'Көрсетілмеген',
                    },
                ]}
            />
        </AppLayout>
    );
}
