import { Head, usePage } from '@inertiajs/react';
import GalleryWorkspace, {
    type DatedGallery,
    type GalleryPhoto,
} from '@/components/gallery-workspace';
import AppLayout from '@/layouts/app-layout';
import { show as promZoneShow } from '@/routes/prom-zones';
import { destroy, store } from '@/routes/prom-zones/gallery';
import { show as regionShow } from '@/routes/regions';
import type { SharedData } from '@/types';

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
    mainGallery: GalleryPhoto[];
    datedGallery: DatedGallery;
    renderPhotos?: GalleryPhoto[];
    deletedPhotos?: GalleryPhoto[];
    canViewDeleted?: boolean;
}

export default function Gallery({
    promZone,
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
                    title: promZone.region?.name || 'Аймақ',
                    href: promZone.region
                        ? regionShow.url(promZone.region)
                        : '',
                },
                {
                    title: promZone.name,
                    href: promZoneShow.url(promZone.id),
                },
                { title: 'Галерея', href: '' },
            ]}
        >
            <Head title={`Галерея - ${promZone.name}`} />

            <GalleryWorkspace
                title="Өнеркәсіптік аймақ галереясы"
                entityName={promZone.name}
                entityLabel="Өнеркәсіптік аймақ"
                backLabel="Аймақ бетіне қайту"
                backUrl={promZoneShow.url(promZone.id)}
                mainGallery={mainGallery}
                datedGallery={datedGallery}
                renderPhotos={renderPhotos}
                deletedPhotos={deletedPhotos}
                canEdit={canManagePhotos}
                canDelete={canManagePhotos}
                canViewDeleted={canViewDeleted}
                canChooseGalleryDate={canManagePhotos}
                storeUrl={store.url(promZone)}
                destroyUrl={(photo) =>
                    destroy.url({
                        promZone: promZone.id,
                        photo: photo.id,
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
