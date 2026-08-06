import { Head, usePage } from '@inertiajs/react';
import GalleryWorkspace, {
    type DatedGallery,
    type GalleryPhoto,
} from '@/components/gallery-workspace';
import AppLayout from '@/layouts/app-layout';
import { show as regionShow } from '@/routes/regions';
import { show as sezShow } from '@/routes/sezs';
import { destroy, store } from '@/routes/sezs/gallery';
import type { SharedData } from '@/types';

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
    mainGallery: GalleryPhoto[];
    datedGallery: DatedGallery;
    renderPhotos?: GalleryPhoto[];
    deletedPhotos?: GalleryPhoto[];
    canViewDeleted?: boolean;
}

export default function Gallery({
    sez,
    mainGallery,
    datedGallery,
    renderPhotos = [],
    deletedPhotos = [],
    canViewDeleted = false,
}: Props) {
    const { auth } = usePage<SharedData>().props;
    const roleName = (auth.user?.role_model?.name || '').toLowerCase();
    const canManagePhotos = roleName === 'superadmin' || roleName === 'invest';

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: sez.region?.name || 'Аймақ',
                    href: sez.region ? regionShow.url(sez.region) : '',
                },
                { title: sez.name, href: sezShow.url(sez.id) },
                { title: 'Галерея', href: '' },
            ]}
        >
            <Head title={`Галерея - ${sez.name}`} />

            <GalleryWorkspace
                title="АЭА галереясы"
                entityName={sez.name}
                entityLabel="Арнайы экономикалық аймақ"
                backLabel="АЭА бетіне қайту"
                backUrl={sezShow.url(sez.id)}
                mainGallery={mainGallery}
                datedGallery={datedGallery}
                renderPhotos={renderPhotos}
                deletedPhotos={deletedPhotos}
                canEdit={canManagePhotos}
                canDelete={canManagePhotos}
                canViewDeleted={canViewDeleted}
                canChooseGalleryDate={canManagePhotos}
                storeUrl={store.url(sez)}
                destroyUrl={(photo) =>
                    destroy.url({ sez: sez.id, photo: photo.id })
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
