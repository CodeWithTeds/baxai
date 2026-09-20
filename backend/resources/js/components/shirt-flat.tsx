import { shirtFitFor } from './shirt-builder';

// Flat technical-sketch icons for each T-shirt fit — same visual language as a
// fit-guide card (white tee, dark outline, silhouette per category). Used in the
// template dropdown so every option shows its shape, not just its name.

const CX = 24;
const TOP = 8;
const INK = '#1A1C1E';

function f(n: number): number {
    return Math.round(n * 10) / 10;
}

export function ShirtFlatIcon({ type, className }: { type: string; className?: string }) {
    const fit = shirtFitFor(type);

    // Body block — proportions follow the same fit params as the 3D morph
    const bodyHW = Math.min(13 * fit.w, 19);
    const hemY = Math.min(TOP + 34 * fit.len, 52);
    const waistInset = fit.taper * 45;
    const hemInset = waistInset * 0.5;
    const midY = (TOP + hemY) / 2;

    // Sleeves — flare reads wide/loose, negative reads fitted
    const sleeveLen = 10 * Math.pow(Math.max(fit.len, 0.4), 0.7) + fit.shoulderDrop * 40;
    const sleeveOut = 7 * (0.7 + 0.3 * fit.w) + 10 * fit.sleeveFlare;
    const sleeveBand = 5.5 * (1 + fit.sleeveFlare);

    // Neckline
    const neckHalf = fit.neck === 'scoop' ? 7 : fit.neck === 'v' ? 6 : 5.5;
    const heavy = fit.heavy;
    const strokeW = heavy ? 2.4 : 1.6;
    const trimW = heavy ? 2.8 : 2.2;

    const neckL = CX - neckHalf;
    const neckR = CX + neckHalf;
    const shL = CX - bodyHW;
    const shR = CX + bodyHW;

    const bodyPath = [
        `M ${f(neckL)} ${TOP}`,
        `L ${f(shL)} ${f(TOP + 1.5)}`,
        `L ${f(shL + waistInset)} ${f(midY)}`,
        `L ${f(shL + hemInset)} ${f(hemY)}`,
        `L ${f(shR - hemInset)} ${f(hemY)}`,
        `L ${f(shR - waistInset)} ${f(midY)}`,
        `L ${f(shR)} ${f(TOP + 1.5)}`,
        `L ${f(neckR)} ${TOP}`,
    ].join(' ');

    const collar =
        fit.neck === 'v' ? (
            <path d={`M ${f(neckL)} ${TOP} L ${CX} ${f(TOP + 7)} L ${f(neckR)} ${TOP}`} fill="none" stroke={INK} strokeWidth={strokeW} strokeLinejoin="round" />
        ) : fit.neck === 'scoop' ? (
            <path d={`M ${f(neckL)} ${TOP} Q ${CX} ${f(TOP + 10)} ${f(neckR)} ${TOP}`} fill="none" stroke={INK} strokeWidth={strokeW} />
        ) : (
            <path d={`M ${f(neckL)} ${TOP} Q ${CX} ${f(TOP + 5)} ${f(neckR)} ${TOP}`} fill="none" stroke={INK} strokeWidth={fit.ringer ? trimW : strokeW} />
        );

    const sleeve = (side: -1 | 1) => {
        const x0 = side === -1 ? shL : shR;
        const dir = side;
        const pts = [
            `${f(x0 + dir * 1)},${f(TOP + 1)}`,
            `${f(x0 + dir * sleeveOut)},${f(TOP + 3)}`,
            `${f(x0 + dir * (sleeveOut - 2))},${f(TOP + 3 + sleeveLen)}`,
            `${f(x0 - dir * 2.5)},${f(TOP + 5 + sleeveLen * 0.85)}`,
        ].join(' ');
        return <polygon points={pts} fill="#FFFFFF" stroke={INK} strokeWidth={fit.ringer ? trimW : strokeW} strokeLinejoin="round" />;
    };

    // Auto-fit wide silhouettes (oversized/boxy) inside the 48-wide viewBox
    const need = bodyHW + Math.max(sleeveOut, 0);
    const s = Math.min(1, 22.5 / (need || 1));

    return (
        <svg viewBox="0 0 48 56" className={className} aria-hidden="true">
            <g transform={`translate(${CX} 30) scale(${f(s)}) translate(${-CX} -30)`}>
                {sleeve(-1)}
                {sleeve(1)}
                <path d={bodyPath} fill="#FFFFFF" stroke={INK} strokeWidth={strokeW} strokeLinejoin="round" />
                {collar}
                {fit.neck === 'henley' && (
                    <g stroke={INK} strokeWidth={1.2}>
                        <line x1={CX} y1={f(TOP + 2.5)} x2={CX} y2={f(TOP + 9)} />
                        <circle cx={CX} cy={f(TOP + 5)} r={0.9} fill={INK} />
                        <circle cx={CX} cy={f(TOP + 7.5)} r={0.9} fill={INK} />
                    </g>
                )}
                {fit.pocket && (
                    <rect
                        x={f(CX + bodyHW * 0.32 - 2.6)}
                        y={f(TOP + 14)}
                        width={5.2}
                        height={5.6}
                        fill="#FFFFFF"
                        stroke={INK}
                        strokeWidth={1.2}
                    />
                )}
                {fit.graphic && (
                    <rect
                        x={f(CX - 6)}
                        y={f(TOP + 15)}
                        width={12}
                        height={9}
                        fill="none"
                        stroke={INK}
                        strokeWidth={1.2}
                        strokeDasharray="2.5 1.8"
                    />
                )}
            </g>
        </svg>
    );
}
