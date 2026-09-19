import { Head, Link } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import StudioPreview3D, { StudioApi, StudioPart } from '@/designer/StudioPreview3D';
import DesignCanvas, { DesignObject } from '@/designer/DesignCanvas';
import { DESIGNER_PRODUCTS, designerConfigFor } from '@/designer/designer-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    ArrowLeft,
    ArrowUp,
    ArrowDown,
    Camera,
    ChevronLeft,
    Copy,
    ImagePlus,
    Layers,
    CircleStop,
    Trash2,
    Type,
    Video,
} from 'lucide-react';
import { cn } from '@/lib/utils';

let uid = 1;
const nid = () => `obj-${Date.now()}-${uid++}`;

const INKS = ['#1A1C1E', '#FFFFFF', '#0052CC', '#EF4444', '#22C55E', '#F59E0B', '#EC4899', '#8B5CF6'];

export default function DesignStudio({ initialType }: { initialType: string }) {
    const [type, setType] = useState(
        DESIGNER_PRODUCTS.some((p) => p.type === initialType) ? initialType : 'mug',
    );
    const config = designerConfigFor(type);
    const [objects, setObjects] = useState<DesignObject[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [bg, setBg] = useState('#FFFFFF');
    const [version, setVersion] = useState(0);
    const [parts, setParts] = useState<StudioPart[]>([]);
    const [recording, setRecording] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const studioRef = useRef<StudioApi | null>(null);
    const fileRef = useRef<HTMLInputElement | null>(null);

    // repaint once the Inter webfont arrives so canvas text uses it
    useEffect(() => {
        document.fonts?.ready.then(() => bump()).catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const bump = () => setVersion((v) => v + 1);
    const selected = objects.find((o) => o.id === selectedId) ?? null;
    const patch = (p: Partial<DesignObject>) => {
        if (!selected) return;
        setObjects(objects.map((o) => (o.id === selected.id ? { ...o, ...p } : o)));
        bump();
    };

    const switchProduct = (t: string) => {
        setType(t);
        setObjects([]);
        setSelectedId(null);
        setBg('#FFFFFF');
        setParts([]);
        bump();
    };

    const addText = () => {
        const o: DesignObject = {
            id: nid(),
            kind: 'text',
            text: 'Your Text',
            x: config.canvasW / 2,
            y: config.canvasH / 2,
            rotation: 0,
            scale: 1,
            opacity: 1,
            fontSize: Math.round(config.canvasW / 9),
            color: '#1A1C1E',
            fontFamily: 'Inter',
        };
        setObjects([...objects, o]);
        setSelectedId(o.id);
        bump();
    };

    const uploadImage = (f: File) => {
        const url = URL.createObjectURL(f);
        const img = new Image();
        img.onload = () => {
            const fit = Math.min(config.canvasW * 0.6 / img.naturalWidth, config.canvasH * 0.6 / img.naturalHeight, 1);
            const o: DesignObject = {
                id: nid(),
                kind: 'image',
                img,
                baseW: img.naturalWidth * fit,
                baseH: img.naturalHeight * fit,
                x: config.canvasW / 2,
                y: config.canvasH / 2,
                rotation: 0,
                scale: 1,
                opacity: 1,
            };
            setObjects([...objects, o]);
            setSelectedId(o.id);
            bump();
        };
        img.src = url;
    };

    const moveLayer = (dir: 1 | -1) => {
        if (!selected) return;
        const i = objects.findIndex((o) => o.id === selected.id);
        const j = i + dir;
        if (j < 0 || j >= objects.length) return;
        const next = [...objects];
        [next[i], next[j]] = [next[j], next[i]];
        setObjects(next);
        bump();
    };

    const duplicate = () => {
        if (!selected) return;
        const copy = { ...selected, id: nid(), x: selected.x + 24, y: selected.y + 24 };
        setObjects([...objects, copy]);
        setSelectedId(copy.id);
        bump();
    };

    const removeSelected = () => {
        if (!selected) return;
        setObjects(objects.filter((o) => o.id !== selected.id));
        setSelectedId(null);
        bump();
    };

    const snapshot = () => {
        const url = studioRef.current?.snapshot();
        if (!url) return;
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-mockup.png`;
        a.click();
    };

    const toggleRecord = () => {
        if (recording) {
            studioRef.current?.stopRecord();
            setRecording(false);
        } else if (studioRef.current?.startRecord()) {
            setRecording(true);
        }
    };

    return (
        <>
            <Head title={`Design Studio — ${config.label}`} />
            <div className="flex min-h-screen flex-col bg-[#ECEEF4] text-[#1A1C1E]">
                {/* top bar */}
                <header className="flex flex-wrap items-center gap-2 border-b border-[#E9EBF3] bg-white px-4 py-3">
                    <Link href="/products" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F1F2F7] transition hover:bg-[#E5E7EF]">
                        <ArrowLeft size={17} />
                    </Link>
                    <h1 className="text-[16px] font-extrabold tracking-tight">Design Studio</h1>
                    <div className="ml-2 flex flex-wrap gap-1.5">
                        {DESIGNER_PRODUCTS.map((p) => (
                            <button
                                key={p.type}
                                type="button"
                                onClick={() => switchProduct(p.type)}
                                className={cn(
                                    'rounded-full px-3.5 py-1.5 text-[12px] font-bold transition',
                                    p.type === type ? 'bg-[#1A1C1E] text-white' : 'bg-[#F1F2F7] text-[#3A3D48] hover:bg-[#E5E7EF]',
                                )}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <Button type="button" onClick={snapshot} className="rounded-full bg-white px-4 py-2 text-[13px] font-bold text-[#1A1C1E] shadow-sm ring-1 ring-[#E2E4EE] hover:bg-[#F6F7FB]">
                            <Camera size={15} /> PNG
                        </Button>
                        <Button
                            type="button"
                            onClick={toggleRecord}
                            className={cn('rounded-full px-4 py-2 text-[13px] font-bold shadow-sm', recording ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-[#5FDD78] text-[#0B3D1B] hover:bg-[#4CCB68]')}
                        >
                            {recording ? <><CircleStop size={15} /> Stop</> : <><Video size={15} /> Record</>}
                        </Button>
                    </div>
                </header>

                <main className="mx-auto grid w-full max-w-[1500px] flex-1 items-start gap-4 p-4 lg:grid-cols-[280px_1fr_380px]">
                    {/* LEFT — tools */}
                    <div className="space-y-4">
                        <section className="rounded-2xl bg-white p-4 shadow-sm">
                            <h3 className="mb-3 text-[13px] font-extrabold">Add to design</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <Button type="button" onClick={addText} className="rounded-xl bg-[#1A1C1E] py-2.5 text-[13px] font-bold text-white hover:bg-black">
                                    <Type size={15} /> Text
                                </Button>
                                <Button type="button" onClick={() => fileRef.current?.click()} className="rounded-xl bg-[#F1F2F7] py-2.5 text-[13px] font-bold text-[#1A1C1E] hover:bg-[#E5E7EF]">
                                    <ImagePlus size={15} /> Photo
                                </Button>
                            </div>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) uploadImage(f);
                                    e.target.value = '';
                                }}
                            />
                            <div className="mt-3 flex items-center gap-2">
                                <span className="text-[12px] font-bold text-[#8A8FA3]">Print area</span>
                                <input type="color" value={bg} onChange={(e) => { setBg(e.target.value); bump(); }} className="h-7 w-10 cursor-pointer rounded border border-[#E9EBF3] bg-white" />
                            </div>
                        </section>

                        <section className="rounded-2xl bg-white p-4 shadow-sm">
                            <h3 className="mb-3 flex items-center gap-1.5 text-[13px] font-extrabold"><Layers size={14} /> Layers</h3>
                            {objects.length === 0 && <p className="text-[12px] text-[#B9BED1]">Empty — add text or a photo.</p>}
                            <div className="space-y-1.5">
                                {[...objects].reverse().map((o) => (
                                    <div
                                        key={o.id}
                                        onClick={() => setSelectedId(o.id)}
                                        className={cn(
                                            'flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-semibold transition',
                                            o.id === selectedId ? 'bg-[#1A1C1E] text-white' : 'bg-[#F6F7FB] text-[#3A3D48] hover:bg-[#EEF0F6]',
                                        )}
                                    >
                                        <span className="min-w-0 flex-1 truncate">{o.kind === 'text' ? o.text : 'Photo'}</span>
                                        {o.id === selectedId && (
                                            <span className="flex shrink-0 gap-0.5" onClick={(e) => e.stopPropagation()}>
                                                <button type="button" onClick={() => moveLayer(1)} className="rounded p-1 hover:bg-white/20"><ArrowUp size={12} /></button>
                                                <button type="button" onClick={() => moveLayer(-1)} className="rounded p-1 hover:bg-white/20"><ArrowDown size={12} /></button>
                                                <button type="button" onClick={duplicate} className="rounded p-1 hover:bg-white/20"><Copy size={12} /></button>
                                                <button type="button" onClick={removeSelected} className="rounded p-1 hover:bg-white/20"><Trash2 size={12} /></button>
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>

                        {selected?.kind === 'text' && (
                            <section className="rounded-2xl bg-white p-4 shadow-sm">
                                <h3 className="mb-3 text-[13px] font-extrabold">Text</h3>
                                <Input value={selected.text ?? ''} onChange={(e) => patch({ text: e.target.value })} className="h-10 rounded-lg border-0 bg-[#F1F2F7] text-[13px]" />
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {INKS.map((c) => (
                                        <button key={c} type="button" onClick={() => patch({ color: c })} className={cn('h-6 w-6 rounded-full border', selected.color === c ? 'scale-110 border-[#1A1C1E] ring-2 ring-[#1A1C1E]/20' : 'border-[#E9EBF3]')} style={{ backgroundColor: c }} />
                                    ))}
                                    <input type="color" value={selected.color ?? '#1A1C1E'} onChange={(e) => patch({ color: e.target.value })} className="h-6 w-9 cursor-pointer rounded border border-[#E9EBF3]" />
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    <p className="flex h-9 items-center rounded-lg bg-[#F1F2F7] px-2 text-[12px] font-bold text-[#1A1C1E]">Inter</p>
                                    <label className="flex items-center gap-1.5 text-[12px] font-semibold">Size
                                        <input type="range" min={12} max={220} value={selected.fontSize ?? 48} onChange={(e) => patch({ fontSize: Number(e.target.value) })} className="w-full" />
                                    </label>
                                </div>
                            </section>
                        )}

                        {selected && (
                            <section className="rounded-2xl bg-white p-4 shadow-sm">
                                <h3 className="mb-3 text-[13px] font-extrabold">Object</h3>
                                <label className="flex items-center gap-2 text-[12px] font-semibold">Rotate
                                    <input type="range" min={-180} max={180} value={Math.round((selected.rotation * 180) / Math.PI)} onChange={(e) => patch({ rotation: (Number(e.target.value) * Math.PI) / 180 })} className="w-full" />
                                </label>
                                <label className="mt-2 flex items-center gap-2 text-[12px] font-semibold">Opacity
                                    <input type="range" min={10} max={100} value={Math.round(selected.opacity * 100)} onChange={(e) => patch({ opacity: Number(e.target.value) / 100 })} className="w-full" />
                                </label>
                                {selected.kind === 'image' && (
                                    <label className="mt-2 flex items-center gap-2 text-[12px] font-semibold">Scale
                                        <input type="range" min={10} max={400} value={Math.round(selected.scale * 100)} onChange={(e) => patch({ scale: Number(e.target.value) / 100 })} className="w-full" />
                                    </label>
                                )}
                            </section>
                        )}

                        {parts.length > 0 && (
                            <section className="rounded-2xl bg-white p-4 shadow-sm">
                                <h3 className="mb-3 text-[13px] font-extrabold">Product colors</h3>
                                <div className="space-y-2">
                                    {parts.map((p) => (
                                        <label key={p.id} className="flex items-center gap-2.5 text-[12px] font-semibold">
                                            <input
                                                type="color"
                                                value={p.color}
                                                onChange={(e) => {
                                                    studioRef.current?.setPartColor(p.id, e.target.value);
                                                    setParts(parts.map((x) => (x.id === p.id ? { ...x, color: e.target.value } : x)));
                                                }}
                                                className="h-7 w-10 shrink-0 cursor-pointer rounded border border-[#E9EBF3] bg-white"
                                            />
                                            <span className="truncate">{p.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* CENTER — print area */}
                    <section className="rounded-2xl bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center gap-2 text-[12px] text-[#8A8FA3]">
                            <ChevronLeft size={14} className="md:hidden" />
                            <span className="font-semibold">Print area — drag objects, blue handle rotates, green scales</span>
                        </div>
                        <div className="mx-auto rounded-xl border border-[#E9EBF3]" style={{ maxWidth: config.canvasW > config.canvasH ? 640 : 440 }}>
                            <DesignCanvas
                                canvasRef={canvasRef}
                                w={config.canvasW}
                                h={config.canvasH}
                                bg={bg}
                                objects={objects}
                                setObjects={(o) => { setObjects(o); }}
                                selectedId={selectedId}
                                setSelectedId={setSelectedId}
                                onChange={bump}
                            />
                        </div>
                    </section>

                    {/* RIGHT — 3D */}
                    <section className="rounded-2xl bg-white p-4 shadow-sm lg:sticky lg:top-4">
                        <h3 className="mb-3 text-[13px] font-extrabold">3D mockup — drag to spin</h3>
                        <div className="h-[420px] overflow-hidden rounded-xl bg-gradient-to-b from-[#F8F9FC] to-[#ECEEF4]">
                            <StudioPreview3D
                                ref={studioRef}
                                config={config}
                                designCanvasRef={canvasRef}
                                designVersion={version}
                                onParts={setParts}
                                onRecordEnd={(blob) => {
                                    const a = document.createElement('a');
                                    a.href = URL.createObjectURL(blob);
                                    a.download = `${type}-spin.webm`;
                                    a.click();
                                }}
                            />
                        </div>
                        <p className="mt-2 text-[12px] text-[#B9BED1]">PNG downloads the mockup • Record captures a spin video.</p>
                    </section>
                </main>
            </div>
        </>
    );
}

(DesignStudio as unknown as { layout: [] }).layout = [];
