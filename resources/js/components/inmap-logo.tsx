import { useId } from 'react';

import { cn } from '@/lib/utils';

type InMapLogoProps = {
    className?: string;
    iconClassName?: string;
    wordmarkClassName?: string;
};

export default function InMapLogo({
    className,
    iconClassName,
    wordmarkClassName,
}: InMapLogoProps) {
    const maskId = `inmap-logo-${useId().replace(/:/g, '')}`;

    return (
        <span className={cn('inline-flex items-center gap-2.5', className)}>
            <svg
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                className={cn('size-8 shrink-0', iconClassName)}
            >
                <defs>
                    <mask id={maskId}>
                        <circle cx="20" cy="20" r="20" fill="white" />
                        <g
                            fill="black"
                            transform="translate(20 20) rotate(14) translate(-20 -20)"
                        >
                            <rect
                                x="11.2"
                                y="18.2"
                                width="4.2"
                                height="10"
                                rx="2.1"
                            />
                            <rect
                                x="17.9"
                                y="10.4"
                                width="4.2"
                                height="17.8"
                                rx="2.1"
                            />
                            <rect
                                x="24.6"
                                y="14.2"
                                width="4.2"
                                height="14"
                                rx="2.1"
                            />
                        </g>
                    </mask>
                </defs>
                <circle
                    cx="20"
                    cy="20"
                    r="20"
                    fill="#C8F54B"
                    mask={`url(#${maskId})`}
                />
            </svg>
            <span
                className={cn(
                    'text-[1.2rem] font-semibold tracking-[-0.03em] text-white lowercase',
                    wordmarkClassName,
                )}
            >
                in-map
            </span>
        </span>
    );
}
