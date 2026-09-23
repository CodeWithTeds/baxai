import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="10" fill="#0052CC" />
            <rect x="1" y="1" width="38" height="20" rx="9" fill="#ffffff" opacity="0.08" />
            <text
                x="20"
                y="28.5"
                textAnchor="middle"
                fontSize="21"
                fontWeight="800"
                fill="#ffffff"
                fontFamily="'DM Sans', ui-sans-serif, system-ui, sans-serif"
            >
                N
            </text>
        </svg>
    );
}
