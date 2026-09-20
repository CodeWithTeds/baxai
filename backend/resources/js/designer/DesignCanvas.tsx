import { RefObject, useEffect, useRef } from 'react';

export interface DesignObject {
    id: string;
    kind: 'text' | 'image';
    x: number;
    y: number;
    rotation: number; // radians
    scale: number;
    opacity: number;
    text?: string;
    fontSize?: number;
    color?: string;
    fontFamily?: string;
    img?: HTMLImageElement;
    baseW?: number;
    baseH?: number;
}

interface Props {
    canvasRef: RefObject<HTMLCanvasElement | null>;
    w: number;
    h: number;
    bg: string;
    objects: DesignObject[];
    setObjects: (o: DesignObject[]) => void;
    selectedId: string | null;
    setSelectedId: (id: string | null) => void;
    onChange: () => void;
}

const HANDLE_R = 11;

export function objectSize(o: DesignObject, ctx: CanvasRenderingContext2D): { w: number; h: number } {
    if (o.kind === 'image') {
        return { w: (o.baseW ?? 100) * o.scale, h: (o.baseH ?? 100) * o.scale };
    }
    ctx.font = `${o.fontSize ?? 48}px ${o.fontFamily ?? 'Arial'}`;
    return { w: Math.max(ctx.measureText(o.text ?? '').width, 10), h: (o.fontSize ?? 48) * 1.25 };
}

export default function DesignCanvas({ canvasRef, w, h, bg, objects, setObjects, selectedId, setSelectedId, onChange }: Props) {
    const dragRef = useRef<{ mode: 'move' | 'rotate' | 'scale'; dx: number; dy: number; startRot: number; startScale: number; cx: number; cy: number } | null>(null);
    const sizeCache = useRef(new Map<string, { w: number; h: number }>());

    // draw
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, w, h);
        // Transparent bg keeps the shirt fabric visible — essential for the draped blue-tee look in the screenshot
        if (bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, w, h);
        }

        objects.forEach((o) => {
            const { w: ow, h: oh } = objectSize(o, ctx);
            sizeCache.current.set(o.id, { w: ow, h: oh });
            ctx.save();
            ctx.globalAlpha = o.opacity;
            ctx.translate(o.x, o.y);
            ctx.rotate(o.rotation);
            if (o.kind === 'image' && o.img) {
                ctx.drawImage(o.img, -ow / 2, -oh / 2, ow, oh);
            } else {
                ctx.font = `${o.fontSize ?? 48}px ${o.fontFamily ?? 'Arial'}`;
                ctx.fillStyle = o.color ?? '#1A1C1E';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(o.text ?? '', 0, 0);
            }
            ctx.restore();

            if (o.id === selectedId) {
                ctx.save();
                ctx.translate(o.x, o.y);
                ctx.rotate(o.rotation);
                ctx.strokeStyle = '#0052CC';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([7, 5]);
                ctx.strokeRect(-ow / 2, -oh / 2, ow, oh);
                ctx.setLineDash([]);
                // rotate handle (top center)
                ctx.beginPath();
                ctx.arc(0, -oh / 2 - 30, HANDLE_R, 0, Math.PI * 2);
                ctx.fillStyle = '#0052CC';
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, -oh / 2 - 30, 5, -0.6, Math.PI * 1.1);
                ctx.stroke();
                // scale handle (bottom right)
                ctx.beginPath();
                ctx.arc(ow / 2, oh / 2, HANDLE_R, 0, Math.PI * 2);
                ctx.fillStyle = '#22C55E';
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.beginPath();
                ctx.moveTo(ow / 2 - 5, oh / 2 - 5);
                ctx.lineTo(ow / 2 + 5, oh / 2 + 5);
                ctx.moveTo(ow / 2 + 5, oh / 2 - 5);
                ctx.lineTo(ow / 2 - 5, oh / 2 + 5);
                ctx.stroke();
                ctx.restore();
            }
        });
    }, [canvasRef, w, h, bg, objects, selectedId]);

    const toLocal = (e: React.PointerEvent) => {
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
        const canvas = canvasRef.current!;
        return {
            x: ((e.clientX - rect.left) / rect.width) * canvas.width,
            y: ((e.clientY - rect.top) / rect.height) * canvas.height,
        };
    };

    const hitHandle = (o: DesignObject, px: number, py: number): 'rotate' | 'scale' | null => {
        const s = sizeCache.current.get(o.id);
        if (!s) return null;
        const dx = px - o.x;
        const dy = py - o.y;
        const cos = Math.cos(-o.rotation);
        const sin = Math.sin(-o.rotation);
        const lx = dx * cos - dy * sin;
        const ly = dx * sin + dy * cos;
        if (Math.hypot(lx, ly + s.h / 2 + 30) < HANDLE_R + 4) return 'rotate';
        if (Math.hypot(lx - s.w / 2, ly - s.h / 2) < HANDLE_R + 4) return 'scale';
        return null;
    };

    const hitObject = (o: DesignObject, px: number, py: number): boolean => {
        const s = sizeCache.current.get(o.id);
        if (!s) return false;
        const dx = px - o.x;
        const dy = py - o.y;
        const cos = Math.cos(-o.rotation);
        const sin = Math.sin(-o.rotation);
        const lx = dx * cos - dy * sin;
        const ly = dx * sin + dy * cos;
        return Math.abs(lx) < s.w / 2 + 6 && Math.abs(ly) < s.h / 2 + 6;
    };

    const onDown = (e: React.PointerEvent) => {
        (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
        const p = toLocal(e);
        // handles of selected first
        const sel = objects.find((o) => o.id === selectedId);
        if (sel) {
            const hd = hitHandle(sel, p.x, p.y);
            if (hd) {
                dragRef.current = {
                    mode: hd,
                    dx: 0,
                    dy: 0,
                    startRot: sel.rotation,
                    startScale: sel.scale,
                    cx: sel.x,
                    cy: sel.y,
                };
                return;
            }
        }
        for (let i = objects.length - 1; i >= 0; i--) {
            if (hitObject(objects[i], p.x, p.y)) {
                const o = objects[i];
                setSelectedId(o.id);
                dragRef.current = { mode: 'move', dx: p.x - o.x, dy: p.y - o.y, startRot: o.rotation, startScale: o.scale, cx: o.x, cy: o.y };
                return;
            }
        }
        setSelectedId(null);
    };

    const onMove = (e: React.PointerEvent) => {
        const d = dragRef.current;
        if (!d) return;
        const p = toLocal(e);
        if (d.mode === 'move') {
            setObjects(objects.map((o) => (o.id === selectedId ? { ...o, x: p.x - d.dx, y: p.y - d.dy } : o)));
        } else if (d.mode === 'rotate') {
            const ang = Math.atan2(p.y - d.cy, p.x - d.cx) + Math.PI / 2;
            setObjects(objects.map((o) => (o.id === selectedId ? { ...o, rotation: ang } : o)));
        } else {
            const dist = Math.max(Math.hypot(p.x - d.cx, p.y - d.cy), 10);
            const base = Math.max(Math.hypot((sizeCache.current.get(selectedId!)?.w ?? 100) / 2, (sizeCache.current.get(selectedId!)?.h ?? 100) / 2), 10);
            const s = Math.min(Math.max((d.startScale * dist) / base, 0.1), 8);
            setObjects(objects.map((o) => (o.id === selectedId ? { ...o, scale: s } : o)));
        }
    };

    const onUp = () => {
        if (dragRef.current) {
            dragRef.current = null;
            onChange();
        }
    };

    return (
        <canvas
            ref={canvasRef}
            style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'none', cursor: 'default' }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
        />
    );
}
