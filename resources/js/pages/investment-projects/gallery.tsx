import { Head, usePage } from '@inertiajs/react';
import GalleryWorkspace, {
    type DatedGallery,
    type GalleryPhoto,
} from '@/components/gallery-workspace';
import { useCanModify } from '@/hooks/use-can-modify';
import AppLayout from '@/layouts/app-layout';
import { show as projectShow } from '@/routes/investment-projects';
import { destroy, download, store } from '@/routes/investment-projects/gallery';
import { show as regionShow } from '@/routes/regions';
import type { SharedData } from '@/types';

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
    mainGallery: GalleryPhoto[];
    datedGallery: DatedGallery;
    renderPhotos?: GalleryPhoto[];
    deletedPhotos?: GalleryPhoto[];
    canDownload: boolean;
    canViewDeleted?: boolean;
    participantCanCreate?: boolean;
}

export default function Gallery({
    project,
    mainGallery,
    datedGallery,
    renderPhotos = [],
    deletedPhotos = [],
    canDownload,
    canViewDeleted = false,
    participantCanCreate = false,
}: Props) {
    const canModify = useCanModify();
    const { auth } = usePage<SharedData>().props;
    const isModerator = auth.user?.role_model?.name === 'moderator';
    const canManageProject = canModify || isModerator;
    const canEdit = canManageProject || participantCanCreate;
    const isSuperadmin = auth.user?.role_model?.name === 'superadmin';

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
                { title: 'Галерея', href: '' },
            ]}
        >
            <Head title={`Галерея - ${project.name}`} />

            <GalleryWorkspace
                title="Жоба галереясы"
                entityName={project.name}
                entityLabel="Инвестициялық жоба"
                backLabel="Жобаға қайту"
                backUrl={projectShow.url(project.id)}
                mainGallery={mainGallery}
                datedGallery={datedGallery}
                renderPhotos={renderPhotos}
                deletedPhotos={deletedPhotos}
                canEdit={canEdit}
                canDelete={canManageProject}
                canDownload={canDownload}
                canViewDeleted={canViewDeleted}
                canChooseGalleryDate={isSuperadmin}
                defaultDateToToday
                storeUrl={store.url(project)}
                destroyUrl={(photo) =>
                    destroy.url({
                        investmentProject: project.id,
                        photo: photo.id,
                    })
                }
                downloadUrl={(photo) =>
                    download.url({
                        investmentProject: project.id,
                        photo: photo.id,
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
