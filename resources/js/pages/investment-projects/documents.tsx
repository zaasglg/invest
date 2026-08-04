import { Head, usePage } from '@inertiajs/react';
import DocumentWorkspace, {
    type WorkspaceDocument,
} from '@/components/document-workspace';
import { useCanModify } from '@/hooks/use-can-modify';
import AppLayout from '@/layouts/app-layout';
import { formatProjectTypeNames } from '@/lib/project-types';
import { show as projectShow } from '@/routes/investment-projects';
import {
    deleted,
    destroy,
    download,
    store,
} from '@/routes/investment-projects/documents';
import { show as regionShow } from '@/routes/regions';
import type { SharedData } from '@/types';

interface ProjectType {
    id: number;
    name: string;
}

interface Region {
    id: number;
    name: string;
}

interface InvestmentProject {
    id: number;
    name: string;
    region?: Region;
    project_type?: ProjectType;
    project_types?: ProjectType[];
}

interface Props {
    project: InvestmentProject;
    completedDocuments: WorkspaceDocument[];
    documents: WorkspaceDocument[];
    canDownload: boolean;
    participantCanCreate?: boolean;
    canMarkAsCompleted: boolean;
    canViewDeleted: boolean;
    deletedDocumentsCount: number;
}

export default function Documents({
    project,
    completedDocuments,
    documents,
    canDownload,
    participantCanCreate = false,
    canMarkAsCompleted,
    canViewDeleted,
    deletedDocumentsCount,
}: Props) {
    const canModify = useCanModify();
    const { auth } = usePage<SharedData>().props;
    const canManageProject =
        canModify || auth.user?.role_model?.name === 'moderator';
    const canEdit = canManageProject || participantCanCreate;

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: project.region?.name || 'Аудан',
                    href: project.region ? regionShow.url(project.region) : '',
                },
                {
                    title: project.name || 'Жоба',
                    href: projectShow.url(project.id),
                },
                { title: 'Құжаттар', href: '' },
            ]}
        >
            <Head title={`Құжаттар - ${project.name}`} />

            <DocumentWorkspace
                title="Жоба құжаттары"
                entityName={project.name}
                entityLabel="Инвестициялық жоба"
                backLabel="Жобаға қайту"
                backUrl={projectShow.url(project.id)}
                completedDocuments={completedDocuments}
                documents={documents}
                canEdit={canEdit}
                canDelete={canManageProject}
                canDownload={canDownload}
                canMarkAsCompleted={canMarkAsCompleted}
                canViewDeleted={canViewDeleted}
                deletedDocumentsCount={deletedDocumentsCount}
                deletedUrl={deleted.url(project)}
                storeUrl={store.url(project)}
                downloadUrl={(document) =>
                    download.url({
                        investmentProject: project.id,
                        document: document.id,
                    })
                }
                destroyUrl={(document) =>
                    destroy.url({
                        investmentProject: project.id,
                        document: document.id,
                    })
                }
                typePlaceholder="Мысалы: келісімшарт, есеп"
                details={[
                    {
                        label: 'Аймақ',
                        value: project.region?.name || 'Көрсетілмеген',
                    },
                    {
                        label: 'Жоба түрі',
                        value: formatProjectTypeNames(project, 'Көрсетілмеген'),
                    },
                ]}
            />
        </AppLayout>
    );
}
