import { Head } from '@inertiajs/react';
import DocumentArchiveWorkspace from '@/components/document-archive-workspace';
import type { AuditableDocument } from '@/components/document-details-dialog';
import AppLayout from '@/layouts/app-layout';
import { show as projectShow } from '@/routes/investment-projects';
import {
    download,
    index as documentsIndex,
} from '@/routes/investment-projects/documents';

interface Project {
    id: number;
    name: string;
}

interface Props {
    project: Project;
    documents: AuditableDocument[];
}

export default function DeletedDocuments({ project, documents }: Props) {
    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: project.name,
                    href: projectShow.url(project.id),
                },
                {
                    title: 'Құжаттар',
                    href: documentsIndex.url(project),
                },
                { title: 'Өшірілген құжаттар', href: '' },
            ]}
        >
            <Head title={`Өшірілген құжаттар - ${project.name}`} />

            <DocumentArchiveWorkspace
                entityName={project.name}
                backUrl={documentsIndex.url(project)}
                documents={documents}
                downloadUrl={(document) =>
                    download.url({
                        investmentProject: project.id,
                        document: document.id,
                    })
                }
            />
        </AppLayout>
    );
}
