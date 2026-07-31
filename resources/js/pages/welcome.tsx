import { Head, router, usePage } from '@inertiajs/react';
import { useEffect } from 'react';

import LandingApp from '@/components/inmap/LandingApp';
import { dashboard } from '@/routes';
import type { SharedData } from '@/types';

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;
    const isAuthenticated = !!auth.user;

    useEffect(() => {
        if (isAuthenticated) {
            router.visit(dashboard());
        }
    }, [isAuthenticated]);

    if (isAuthenticated) {
        return null;
    }

    return (
        <>
            <Head title="IN-MAP — Туркестанская область">
                <meta
                    name="description"
                    content="Единая цифровая экосистема инвестиций Туркестанской области."
                />
            </Head>

            <div className="inmap-page">
                <LandingApp />
            </div>
        </>
    );
}
