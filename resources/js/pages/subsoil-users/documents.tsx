import { Head } from '@inertiajs/react';
import DocumentWorkspace, {
    type WorkspaceDocument,
} from '@/components/document-workspace';
import { useCanModify } from '@/hooks/use-can-modify';
import AppLayout from '@/layouts/app-layout';
import { show as regionShow } from '@/routes/regions';
import { show as subsoilShow } from '@/routes/subsoil-users';
import {
    deleted,
    destroy,
    download,
    store,
} from '@/routes/subsoil-users/documents';

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
    completedDocuments: WorkspaceDocument[];
    documents: WorkspaceDocument[];
    canMarkAsCompleted: boolean;
    canViewDeleted: boolean;
    deletedDocumentsCount: number;
}

export default function Documents({
    subsoilUser,
    completedDocuments,
    documents,
    canMarkAsCompleted,
    canViewDeleted,
    deletedDocumentsCount,
}: Props) {
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
                    title: subsoilUser.name || 'Жер қойнауын пайдаланушы',
                    href: subsoilShow.url(subsoilUser.id),
                },
                { title: 'Құжаттар', href: '' },
            ]}
        >
            <Head title={`Құжаттар - ${subsoilUser.name}`} />

            <DocumentWorkspace
                title="Жер қойнауын пайдаланушы құжаттары"
                entityName={subsoilUser.name}
                entityLabel="Жер қойнауын пайдаланушы"
                backLabel="Нысанға қайту"
                backUrl={subsoilShow.url(subsoilUser.id)}
                completedDocuments={completedDocuments}
                documents={documents}
                canEdit={canModify}
                canDelete={canModify}
                canDownload
                canMarkAsCompleted={canMarkAsCompleted}
                canViewDeleted={canViewDeleted}
                deletedDocumentsCount={deletedDocumentsCount}
                deletedUrl={deleted.url(subsoilUser)}
                storeUrl={store.url(subsoilUser)}
                downloadUrl={(document) =>
                    download.url({
                        subsoilUser: subsoilUser.id,
                        document: document.id,
                    })
                }
                destroyUrl={(document) =>
                    destroy.url({
                        subsoilUser: subsoilUser.id,
                        document: document.id,
                    })
                }
                typePlaceholder="Мысалы: лицензия, есеп"
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
