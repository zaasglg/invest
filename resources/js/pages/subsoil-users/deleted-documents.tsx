import { Head } from '@inertiajs/react';
import DocumentArchiveWorkspace from '@/components/document-archive-workspace';
import type { AuditableDocument } from '@/components/document-details-dialog';
import AppLayout from '@/layouts/app-layout';
import { show as subsoilShow } from '@/routes/subsoil-users';
import {
    download,
    index as documentsIndex,
} from '@/routes/subsoil-users/documents';

interface SubsoilUser {
    id: number;
    name: string;
}

interface Props {
    subsoilUser: SubsoilUser;
    documents: AuditableDocument[];
}

export default function DeletedDocuments({ subsoilUser, documents }: Props) {
    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: subsoilUser.name,
                    href: subsoilShow.url(subsoilUser.id),
                },
                {
                    title: 'Құжаттар',
                    href: documentsIndex.url(subsoilUser),
                },
                { title: 'Өшірілген құжаттар', href: '' },
            ]}
        >
            <Head title={`Өшірілген құжаттар - ${subsoilUser.name}`} />

            <DocumentArchiveWorkspace
                entityName={subsoilUser.name}
                backUrl={documentsIndex.url(subsoilUser)}
                documents={documents}
                downloadUrl={(document) =>
                    download.url({
                        subsoilUser: subsoilUser.id,
                        document: document.id,
                    })
                }
            />
        </AppLayout>
    );
}
