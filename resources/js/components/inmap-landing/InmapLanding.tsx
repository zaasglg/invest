import { useEffect } from 'react';

import { GlobeExperience } from './GlobeExperience';
import './landing.css';

const HTML_ACTIVE_CLASS = 'inmap-globe-active';

/**
 * Wraps the scroll-driven landing experience.
 *
 * The stylesheet is scoped to `.inmap-globe`, so the wrapper element is
 * required. Smooth scrolling and the dark overscroll background have to live on
 * <html> (the real scrolling element) and are toggled only while mounted, so
 * client-side navigation back into the app leaves no residue.
 */
export default function InmapLanding() {
    useEffect(() => {
        const root = document.documentElement;
        root.classList.add(HTML_ACTIVE_CLASS);

        return () => {
            root.classList.remove(HTML_ACTIVE_CLASS);
        };
    }, []);

    return (
        <div className="inmap-globe">
            <GlobeExperience />
        </div>
    );
}
