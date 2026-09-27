<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PrintCategory;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PrintItemAiController extends Controller
{
    use ApiResponse;

    private string $apiKey;
    private string $baseUrl = 'https://api.groq.com/openai/v1';

    public function __construct()
    {
        $this->apiKey = config('services.groq.api_key') ?? env('GROQ_API', '');
    }

    // ─── POST /api/v1/print-items/ai-recognize ─────────────────────────────────

    public function recognize(Request $request): JsonResponse
    {
        $request->validate([
            'image' => ['nullable', 'file', 'mimes:jpeg,png,jpg,webp', 'max:10240'],
            'image_base64' => ['nullable', 'string'],
        ]);

        $tmpDir = storage_path('app/tmp');
        if (! is_dir($tmpDir)) {
            mkdir($tmpDir, 0755, true);
        }

        $tmpPath = $tmpDir . '/scan_' . uniqid() . '.jpg';

        try {
            if ($request->hasFile('image')) {
                $file = $request->file('image');
                copy($file->getRealPath(), $tmpPath);
            } elseif ($request->filled('image_base64')) {
                $base64Data = $request->input('image_base64');
                if (preg_match('/^data:image\/(\w+);base64,/', $base64Data, $type)) {
                    $base64Data = substr($base64Data, strpos($base64Data, ',') + 1);
                }
                $decoded = base64_decode($base64Data);
                if ($decoded === false) {
                    return $this->errorResponse('Invalid base64 image data.', 422);
                }
                file_put_contents($tmpPath, $decoded);
            } else {
                return $this->errorResponse('No image file or base64 photo provided.', 422);
            }

            // Multi-pass Tesseract OCR to capture all text blocks and sparse label codes
            $tesseractBin = file_exists('/opt/homebrew/bin/tesseract') ? '/opt/homebrew/bin/tesseract' : 'tesseract';
            
            $cmd1 = escapeshellcmd($tesseractBin) . ' ' . escapeshellarg($tmpPath) . ' stdout --psm 3 2>&1';
            $ocrText1 = shell_exec($cmd1) ?? '';
            
            $cmd2 = escapeshellcmd($tesseractBin) . ' ' . escapeshellarg($tmpPath) . ' stdout --psm 11 2>&1';
            $ocrText2 = shell_exec($cmd2) ?? '';

            $ocrText = trim($ocrText1 . "\n" . $ocrText2);

            if (file_exists($tmpPath)) {
                @unlink($tmpPath);
            }

            if (empty($ocrText)) {
                return $this->errorResponse('Could not read product label. Please ensure the label text or box is clear and legible in the camera frame.', 422);
            }

            // Call Groq AI with extracted OCR text
            $systemPrompt = <<<'PROMPT'
You are an expert printing shop inventory engineer for Placides Printing Services in the Philippines.
You are given raw OCR text extracted from a product label, box, paper ream, ink cartridge, toner, printer, or equipment packaging.

Thoroughly analyze ALL text and extract detailed, product-specific specifications.
Return ONLY a JSON object (no markdown, no ```json code wrapper) containing these exact keys:

- name: Full official product title including Brand + Model + Material/Type (e.g. "Epson EcoTank L3210 All-in-One Inkjet Printer", "HP 85A Black LaserJet Toner Cartridge", "Advance 70gsm Premium Bond Paper Reams", "Orajet Waterproof Glossy Vinyl Sticker Roll")
- brand: Manufacturer or Brand name (e.g. Epson, HP, Canon, Advance, Neenah, Orajet, Fellowes, Dahle) or best inferred brand
- model: Exact model number, part number, MPN, or SKU code (e.g. L3210, CE285A, GI-790, AP-70A4, 3164G) or empty string
- category_code: Primary category code — use STOCK for paper/cardstock/rolls/media, EQUIPMENT for printers/inks/toner/cutters/tools, DOCS for documents, MKTG for flyers/posters, PHOTO for photo prints, STAT for cards/stationery, LABEL for stickers/labels, PUB for publications, MENU for menus.
- paper_type: Detailed paper stock material, gsm weight, and finish (e.g. "70gsm Premium Bond Paper", "260gsm Archival Glossy Photo Paper", "350gsm Heavyweight Matte White Cardstock", "Waterproof Glossy Vinyl Adhesive")
- paper_size: Exact dimensions or trim size (e.g. "A4 (8.27 x 11.69 in)", "4R (4 x 6 in)", "SRA3 (12 x 18 in)", "1.27m x 50m Roll")
- compatibility: Detailed list of compatible printer models or machine series (e.g. "Compatible with Epson EcoTank L3210 / L3250 / L5290", "Compatible with HP LaserJet Pro P1102 / P1102w / M1212nf")
- available_quantity: Quantity count integer extracted from package or sheet count (e.g. 150, 100, 85, 24, 4)
- unit: Unit of measure (one of: reams, packs, rolls, cartridges, bottles, sets, units, pcs)
- description: Comprehensive 2-3 sentence overview detailing materials, print quality, and primary commercial use cases.
- notes: Full technical specifications including page yield, gsm weight, handling/cutting instructions, storage conditions, and warranty/finish details.
PROMPT;

            $userContent = "Scanned Label OCR Text:\n" . $ocrText;

            $modelsToTry = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3.8-27b'];
            $data = null;

            foreach ($modelsToTry as $groqModel) {
                try {
                    $response = Http::withToken($this->apiKey)
                        ->timeout(35)
                        ->post("{$this->baseUrl}/chat/completions", [
                            'model' => $groqModel,
                            'messages' => [
                                ['role' => 'system', 'content' => $systemPrompt],
                                ['role' => 'user', 'content' => $userContent],
                            ],
                            'temperature' => 0.2,
                            'max_tokens' => 1024,
                        ]);

                    if ($response->failed()) {
                        Log::error('Groq OCR structurization failed', ['model' => $groqModel, 'status' => $response->status()]);
                        continue;
                    }

                    $reply = $response->json('choices.0.message.content', '');
                    $reply = preg_replace('/<think>[\s\S]*?<\/think>/u', '', $reply);
                    $reply = trim($reply ?? '');
                    $reply = str_replace(['```json', '```'], '', $reply);

                    if (preg_match('/\{[\s\S]*\}/', $reply, $m)) {
                        $decoded = json_decode($m[0], true);
                        if (is_array($decoded) && ! empty($decoded['name'])) {
                            $data = $decoded;
                            break;
                        }
                    }
                } catch (\Throwable $e) {
                    Log::error('Groq LLM exception', ['error' => $e->getMessage()]);
                }
            }

            if (! is_array($data)) {
                $lines = array_values(array_filter(explode("\n", $ocrText)));
                $firstLine = $lines[0] ?? 'Scanned Print Item';
                $data = [
                    'name' => mb_substr($firstLine, 0, 100),
                    'brand' => 'Generic',
                    'model' => '',
                    'category_code' => 'STOCK',
                    'paper_type' => '70gsm Premium Bond Paper',
                    'paper_size' => 'A4 (8.27 x 11.69 in)',
                    'compatibility' => 'Compatible with standard printers',
                    'available_quantity' => 100,
                    'unit' => 'reams',
                    'description' => 'Scanned product resource: ' . mb_substr(implode(' ', $lines), 0, 200),
                    'notes' => 'Extracted label OCR text: ' . mb_substr($ocrText, 0, 300),
                ];
            }

            // Map category_code to category_id
            $categoryCode = strtoupper(trim((string) ($data['category_code'] ?? 'STOCK')));
            $category = PrintCategory::where('code', $categoryCode)->first()
                        ?? PrintCategory::where('slug', strtolower($categoryCode))->first()
                        ?? PrintCategory::first();

            $data['category_id'] = $category ? $category->id : null;
            $data['category_name'] = $category ? $category->name : 'General';

            return $this->successResponse($data, 'Product successfully recognized from label scan');
        } catch (\Throwable $e) {
            if (file_exists($tmpPath)) {
                @unlink($tmpPath);
            }
            Log::error('AI recognition exception', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return $this->errorResponse('Image processing failed: ' . $e->getMessage(), 500);
        }
    }
}
