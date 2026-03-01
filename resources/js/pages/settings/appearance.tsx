import { Head } from '@inertiajs/react';
import AppearanceTabs from '@/components/appearance-tabs';
import Heading from '@/components/heading';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit as editAppearance } from '@/routes/appearance';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Настройки оформления',
        href: editAppearance().url,
    },
];

export default function Appearance() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Настройки оформления" />

            <h1 className="sr-only">Настройки оформления</h1>

            <SettingsLayout>
                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <Heading
                        variant="small"
                        title="Оформление"
                        description="Измените внешний вид приложения"
                    />
                    <div className="mt-4">
                        <AppearanceTabs />
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
