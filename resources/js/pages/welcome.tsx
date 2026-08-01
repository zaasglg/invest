import { Head, router, usePage } from '@inertiajs/react';
import { useEffect } from 'react';

import InmapLanding from '@/components/inmap-landing/InmapLanding';
import { dashboard } from '@/routes';
import type { SharedData } from '@/types';

const TITLE = 'IN-MAP — карта инвестиционных возможностей';
const DESCRIPTION =
    'Единая цифровая платформа инвестиционного потенциала Казахстана и Туркестанской области.';

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
            <Head title={TITLE}>
                <meta name="description" content={DESCRIPTION} />
                <meta property="og:title" content={TITLE} />
                <meta property="og:description" content={DESCRIPTION} />
                <meta property="og:image" content="/og.jpg" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:image" content="/og.jpg" />
            </Head>

            <InmapLanding />
        </>
    );
}
