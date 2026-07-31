import {
    DISTRICT_BORDER_PATHS,
    MAP_CITIES,
    MAP_HEIGHT,
    MAP_WIDTH,
    REGION_OUTLINE_PATHS,
} from '@/components/auth/turkistan-map-paths';

const OUTLINE_PATH = REGION_OUTLINE_PATHS.join(' ');
const DISTRICTS_PATH = DISTRICT_BORDER_PATHS.map(({ d }) => d).join(' ');
const CAPITAL = MAP_CITIES.find((city) => city.primary);

type Props = {
    className?: string;
};

/**
 * Static map of Türkistan oblysy: real administrative boundaries of the
 * 17 districts, pre-projected to SVG paths. Rendered as two merged paths
 * to keep the DOM light.
 */
export default function TurkistanDistrictMap({ className }: Props) {
    return (
        <svg
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            className={className}
            aria-hidden="true"
            focusable="false"
            fill="none"
        >
            <path
                d={OUTLINE_PATH}
                stroke="rgba(103, 232, 249, 0.34)"
                strokeWidth={1.3}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
            />
            <path
                d={DISTRICTS_PATH}
                stroke="rgba(148, 210, 234, 0.2)"
                strokeWidth={0.8}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
            />
            {CAPITAL && (
                <g>
                    <circle
                        cx={CAPITAL.x}
                        cy={CAPITAL.y}
                        r={9}
                        stroke="rgba(232, 196, 118, 0.4)"
                        strokeWidth={1}
                    />
                    <circle
                        cx={CAPITAL.x}
                        cy={CAPITAL.y}
                        r={3.5}
                        fill="rgba(232, 196, 118, 0.95)"
                    />
                </g>
            )}
        </svg>
    );
}
