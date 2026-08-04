import { Head, usePage } from '@inertiajs/react';
import GalleryWorkspace, {
    type DatedGallery,
    type GalleryPhoto,
} from '@/components/gallery-workspace';
import AppLayout from '@/layouts/app-layout';
import { show as regionShow } from '@/routes/regions';
import { show as subsoilShow } from '@/routes/subsoil-users';
import { destroy, store } from '@/routes/subsoil-users/gallery';
import type { SharedData } from '@/types';

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
    mainGallery: GalleryPhoto[];
    datedGallery: DatedGallery;
    renderPhotos?: GalleryPhoto[];
}

export default function Gallery({
    subsoilUser,
    mainGallery,
    datedGallery,
    renderPhotos = [],
}: Props) {
    const { auth } = usePage<SharedData>().props;
    const roleName = (auth.user?.role_model?.name || '').toLowerCase();
    const canManagePhotos = roleName === 'superadmin' || roleName === 'invest';

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
                { title: 'Галерея', href: '' },
            ]}
        >
            <Head title={`Галерея - ${subsoilUser.name}`} />

            <GalleryWorkspace
                title="Нысан галереясы"
                entityName={subsoilUser.name}
                entityLabel="Жер қойнауын пайдаланушы"
                backLabel="Нысанға қайту"
                backUrl={subsoilShow.url(subsoilUser.id)}
                mainGallery={mainGallery}
                datedGallery={datedGallery}
                renderPhotos={renderPhotos}
                canEdit={canManagePhotos}
                canDelete={canManagePhotos}
                canChooseGalleryDate={canManagePhotos}
                storeUrl={store.url(subsoilUser)}
                destroyUrl={(photo) =>
                    destroy.url({
                        subsoilUser: subsoilUser.id,
                        photo: photo.id,
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
