import { Head, router, usePage } from '@inertiajs/react';
import { useEffect } from 'react';

import {
    AboutSection,
    HeroSection,
    LandingFooter,
    SectorsBentoGrid,
    StatisticsSection,
    StickyNavbar,
    WhyTurkistanSection,
} from '@/components/landing';
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
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=inter:400,500,600,700,800,900"
                    rel="stylesheet"
                />
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
