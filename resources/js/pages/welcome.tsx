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
            <Head title="Turkistan Invest — Gateway to Central Asia">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=inter:300,400,500,600,700,800,900"
                    rel="stylesheet"
                />
                <meta
                    name="description"
                    content="Discover world-class investment opportunities in Turkistan, Kazakhstan. Agriculture, tourism, industry, and special economic zones."
                />
            </Head>

            <div className="min-h-screen bg-white">
                <StickyNavbar />
                <HeroSection />
                <AboutSection />
                <SectorsBentoGrid />
                <StatisticsSection />
                <WhyTurkistanSection />
                <LandingFooter />
            </div>
        </>
    );
}
