import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Camera, CheckCircle2, LoaderCircle, RefreshCw, Sparkles, Upload } from 'lucide-react';

interface CameraScanModalProps {
    open: boolean;
    onClose: () => void;
    onRecognize: (data: RecognizedProductData) => void;
}

export interface RecognizedProductData {
    name: string;
    brand?: string;
    model?: string;
    category_id?: number;
    category_name?: string;
    paper_type?: string;
    paper_size?: string;
    compatibility?: string;
    available_quantity?: number;
    unit?: string;
    description?: string;
    notes?: string;
}

export default function CameraScanModal({ open, onClose, onRecognize }: CameraScanModalProps) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [stream, setStream] = useState<MediaStream | null>(null);
    const [cameraActive, setCameraActive] = useState<boolean>(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [statusText, setStatusText] = useState<string>('');
    const [recognizedResult, setRecognizedResult] = useState<RecognizedProductData | null>(null);

    // Start video camera
    const startCamera = async () => {
        setCameraError(null);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                await videoRef.current.play();
            }
            setCameraActive(true);
        } catch (err: any) {
            console.error('Camera access error:', err);
            setCameraError('Could not access camera. Please check camera permissions or upload a photo below.');
            setCameraActive(false);
        }
    };

    // Stop video camera
    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
        setCameraActive(false);
    };

    useEffect(() => {
        if (open) {
            setRecognizedResult(null);
            setPreviewImage(null);
            startCamera();
        } else {
            stopCamera();
            setPreviewImage(null);
            setRecognizedResult(null);
            setLoading(false);
            setCameraError(null);
        }
        return () => {
            stopCamera();
        };
    }, [open]);

    // Capture photo from video stream
    const captureSnapshot = () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setPreviewImage(dataUrl);
            stopCamera();
            processImageWithAi(dataUrl);
        }
    };

    // Handle File Upload Fallback
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            setPreviewImage(dataUrl);
            stopCamera();
            processImageWithAi(dataUrl);
        };
        reader.readAsDataURL(file);
    };

    // Send Image payload to AI Vision endpoint
    const processImageWithAi = async (imageBase64: string) => {
        setLoading(true);
        setStatusText('Scanning label & extracting product metadata with AI…');
        setRecognizedResult(null);

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

            const res = await fetch('/print-items/ai-recognize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({ image_base64: imageBase64 }),
            });

            const data = await res.json();

            if (res.ok && data && (data.status === 'success' || data.data)) {
                const recognized = data.data || data;
                setRecognizedResult(recognized);
            } else {
                setCameraError(data?.message || 'Could not recognize product. Please try again.');
            }
        } catch (err: any) {
            console.error('AI Recognition Error:', err);
            setCameraError('Failed to connect to AI Vision service. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleApply = () => {
        if (recognizedResult) {
            onRecognize(recognizedResult);
            onClose();
        }
    };

    const handleRescan = () => {
        setRecognizedResult(null);
        setPreviewImage(null);
        startCamera();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="rounded-none border-[#1A1C1E] sm:max-w-xl">
                <DialogHeader className="border-b border-[#E5E7EB] pb-2">
                    <DialogTitle className="font-mono text-sm font-bold text-[#1A1C1E] flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                            <Sparkles className="h-4 w-4 text-emerald-600" />
                            {recognizedResult ? 'AI Scanned Product Details' : 'AI Camera Product Recognizer'}
                        </span>
                        {recognizedResult && (
                            <span className="rounded-none border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] uppercase font-mono text-emerald-800 flex items-center gap-1">
                                <CheckCircle2 size={11} className="text-emerald-600" />
                                Scanned & Verified
                            </span>
                        )}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Review product details recognized from camera photo before populating form.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 font-sans text-xs">
                    {/* IF RECOGNIZED RESULT EXISTS: SHOW DETAILED PREVIEW CARD */}
                    {recognizedResult ? (
                        <div className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-3">
                                {/* SCAN IMAGE THUMBNAIL */}
                                <div className="sm:col-span-1 border border-[#E5E7EB] bg-black p-1 flex items-center justify-center h-full max-h-[180px]">
                                    {previewImage && (
                                        <img src={previewImage} alt="Scanned Product" className="max-h-full max-w-full object-contain" />
                                    )}
                                </div>

                                {/* STRUCTURED METADATA DETAILS */}
                                <div className="sm:col-span-2 space-y-2 border border-[#E5E7EB] bg-[#F9FAFB] p-2.5 font-mono text-xs">
                                    <div className="border-b border-[#E5E7EB] pb-1">
                                        <span className="text-[10px] text-[#6B7280] uppercase block">Product Name</span>
                                        <h4 className="font-bold text-sm text-[#1A1C1E]">{recognizedResult.name}</h4>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                                        <div>
                                            <span className="text-[#6B7280]">Category:</span>{' '}
                                            <strong className="text-[#1A1C1E]">{recognizedResult.category_name || 'General'}</strong>
                                        </div>
                                        <div>
                                            <span className="text-[#6B7280]">Est. Stock:</span>{' '}
                                            <strong className="text-emerald-700">{recognizedResult.available_quantity ?? 100} {recognizedResult.unit || 'pcs'}</strong>
                                        </div>
                                        {recognizedResult.brand && (
                                            <div>
                                                <span className="text-[#6B7280]">Brand:</span>{' '}
                                                <strong className="text-[#1A1C1E]">{recognizedResult.brand}</strong>
                                            </div>
                                        )}
                                        {recognizedResult.model && (
                                            <div>
                                                <span className="text-[#6B7280]">Model:</span>{' '}
                                                <strong className="text-[#1A1C1E]">{recognizedResult.model}</strong>
                                            </div>
                                        )}
                                        {recognizedResult.paper_type && (
                                            <div>
                                                <span className="text-[#6B7280]">Stock Type:</span>{' '}
                                                <strong className="text-[#1A1C1E]">{recognizedResult.paper_type}</strong>
                                            </div>
                                        )}
                                        {recognizedResult.paper_size && (
                                            <div>
                                                <span className="text-[#6B7280]">Size:</span>{' '}
                                                <strong className="text-[#1A1C1E]">{recognizedResult.paper_size}</strong>
                                            </div>
                                        )}
                                    </div>

                                    {recognizedResult.compatibility && (
                                        <div className="border-t border-[#E5E7EB] pt-1.5 text-[10px]">
                                            <span className="text-[#6B7280] uppercase block">Compatibility</span>
                                            <p className="text-[#1A1C1E] font-semibold">{recognizedResult.compatibility}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* DESCRIPTION & NOTES */}
                            {recognizedResult.description && (
                                <div className="rounded-none border border-[#E5E7EB] bg-white p-2">
                                    <span className="font-mono text-[10px] uppercase text-[#4A4E5A] block mb-0.5">Description</span>
                                    <p className="text-xs text-[#374151] leading-relaxed">{recognizedResult.description}</p>
                                </div>
                            )}

                            {recognizedResult.notes && (
                                <div className="rounded-none border border-[#E5E7EB] bg-white p-2 text-xs font-mono">
                                    <span className="text-[10px] uppercase text-[#4A4E5A] block mb-0.5">Technical Specs & Notes</span>
                                    <p className="text-[#4B5563] italic">{recognizedResult.notes}</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* CAMERA FEED & SNAPSHOT CONTAINER */
                        <div className="space-y-3">
                            <div className="relative aspect-video w-full overflow-hidden border border-[#1A1C1E] bg-black flex items-center justify-center">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center p-6 text-center text-white space-y-2">
                                        <LoaderCircle className="h-8 w-8 animate-spin text-emerald-400" />
                                        <p className="font-mono text-xs font-semibold">{statusText}</p>
                                        <p className="text-[10px] text-gray-400">Extracting product name, brand, model & specs...</p>
                                    </div>
                                ) : previewImage ? (
                                    <img src={previewImage} alt="Captured product" className="h-full w-full object-contain" />
                                ) : cameraActive ? (
                                    <>
                                        <video ref={videoRef} playsInline autoPlay muted className="h-full w-full object-cover" />
                                        <div className="absolute inset-4 pointer-events-none border-2 border-dashed border-white/60 rounded-sm flex items-center justify-center">
                                            <span className="bg-black/60 px-2 py-1 font-mono text-[10px] text-white rounded">
                                                Align Product Label / Box Here
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="p-6 text-center text-gray-400 space-y-2">
                                        <Camera className="mx-auto h-8 w-8 text-gray-500" />
                                        <p className="text-xs font-mono">Camera feed paused or disabled</p>
                                    </div>
                                )}

                                <canvas ref={canvasRef} className="hidden" />
                            </div>

                            {cameraError && (
                                <div className="rounded-none border border-red-300 bg-red-50 p-2 text-xs text-red-700 font-mono">
                                    {cameraError}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* MODAL FOOTER ACTIONS */}
                <DialogFooter className="border-t border-[#E5E7EB] pt-2.5 flex flex-wrap items-center justify-between gap-2">
                    {recognizedResult ? (
                        <div className="flex items-center justify-between w-full gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleRescan}
                                className="h-8 rounded-none border-[#D1D5DB] px-3 text-xs font-mono text-[#1A1C1E] bg-white hover:bg-gray-50"
                            >
                                <RefreshCw className="mr-1.5 h-3 w-3" />
                                Rescan Photo
                            </Button>

                            <Button
                                type="button"
                                onClick={handleApply}
                                className="h-8 rounded-none bg-emerald-700 px-4 text-xs font-mono font-semibold text-white hover:bg-emerald-800 flex-1"
                            >
                                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                Apply to Form
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between w-full gap-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={handleFileUpload}
                            />

                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={loading}
                                className="h-8 rounded-none border-[#D1D5DB] px-3 text-xs font-mono text-[#1A1C1E] bg-white hover:bg-gray-50"
                            >
                                <Upload className="mr-1.5 h-3 w-3" />
                                Upload Photo
                            </Button>

                            {cameraActive && !loading && (
                                <Button
                                    type="button"
                                    onClick={captureSnapshot}
                                    className="h-8 rounded-none bg-[#1A1C1E] px-4 text-xs font-normal text-white hover:bg-black flex-1"
                                >
                                    <Camera className="mr-1.5 h-3.5 w-3.5" />
                                    Capture & Recognize
                                </Button>
                            )}
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
