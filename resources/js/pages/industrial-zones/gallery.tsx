import { Head, usePage } from '@inertiajs/react';
import GalleryWorkspace, {
    type DatedGallery,
    type GalleryPhoto,
} from '@/components/gallery-workspace';
import AppLayout from '@/layouts/app-layout';
import { show as industrialZoneShow } from '@/routes/industrial-zones';
import { destroy, store } from '@/routes/industrial-zones/gallery';
import { show as regionShow } from '@/routes/regions';
import type { SharedData } from '@/types';

interface Region {
    id: number;
    name: string;
}

interface IndustrialZone {
    id: number;
    name: string;
    region?: Region;
}

interface Props {
    industrialZone: IndustrialZone;
    mainGallery: GalleryPhoto[];
    datedGallery: DatedGallery;
    renderPhotos?: GalleryPhoto[];
    deletedPhotos?: GalleryPhoto[];
    canViewDeleted?: boolean;
}

export default function Gallery({
    industrialZone,
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
                    title: industrialZone.region?.name || 'Аймақ',
                    href: industrialZone.region
                        ? regionShow.url(industrialZone.region)
                        : '',
                },
                {
                    title: industrialZone.name,
                    href: industrialZoneShow.url(industrialZone.id),
                },
                { title: 'Галерея', href: '' },
            ]}
        >
            <Head title={`Галерея - ${industrialZone.name}`} />

            <GalleryWorkspace
                title="Индустриялық аймақ галереясы"
                entityName={industrialZone.name}
                entityLabel="Индустриялық аймақ"
                backLabel="Аймақ бетіне қайту"
                backUrl={industrialZoneShow.url(industrialZone.id)}
                mainGallery={mainGallery}
                datedGallery={datedGallery}
                renderPhotos={renderPhotos}
                deletedPhotos={deletedPhotos}
                canEdit={canManagePhotos}
                canDelete={canManagePhotos}
                canViewDeleted={canViewDeleted}
                canChooseGalleryDate={canManagePhotos}
                storeUrl={store.url(industrialZone)}
                destroyUrl={(photo) =>
                    destroy.url({
                        industrialZone: industrialZone.id,
                        photo: photo.id,
                    })
                }
                details={[
                    {
                        label: 'Аймақ',
                        value: industrialZone.region?.name || 'Көрсетілмеген',
                    },
                ]}
            />
        </AppLayout>
    );
}
