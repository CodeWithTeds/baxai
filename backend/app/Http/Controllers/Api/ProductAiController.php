<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ProductAiController extends Controller
{
    use ApiResponse;

    private string $apiKey;

    private string $baseUrl = 'https://api.groq.com/openai/v1';

    public function __construct()
    {
        $this->apiKey = config('services.groq.api_key');
    }

    // ─── POST /api/v1/products/ai-assist ─────────────────────────────────────
    // Takes basic info (name, category, hint) and returns AI-generated
    // form suggestions: descriptions, badge, SKU, print specs, 3D flags.

    public function assist(Request $request): JsonResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:50'],
            'hint' => ['nullable', 'string', 'max:500'],
        ]);

        $name = $request->input('name');
        $category = $request->input('category');
        $hint = $request->input('hint', '');

        $systemPrompt = <<<'PROMPT'
You are a product copywriter for Placides, a custom printing shop in the Philippines (mugs, pins, stickers, t-shirts, tote bags, calendars).

Given a product name, category and optional hint, return ONLY a JSON object (no markdown, no explanation) with these keys:
- short_description: one line for shop cards, max 120 chars
- description: 2-3 sentences covering materials, print quality and use case
- badge: one of Bestseller, Deal, Fast Turnaround, High Demand, New — or empty string if none fits
- sku: uppercase code from the name, e.g. MUG-11OZ-WHT (letters, numbers, dashes only, max 20 chars)
- print_method: best print method for the category (sublimation, vinyl, DTG, offset)
- print_size: typical print area, e.g. 8 x 3.5 cm
- viewer_type: map the category — mugs→mug, pins→pin, tshirts→shirt, tote_bags→tote, stickers→sticker, calendars→calendar, otherwise none.
  For drinkware names be specific: glass cup→glass_cup, tumbler→tumbler, travel/insulated mug→travel_mug, coffee cup→coffee_cup, teacup→teacup, espresso/demitasse→espresso, latte→latte, cappuccino→cappuccino, beer mug/stein→stein, tankard→tankard, otherwise mug.
- has_3d_preview: true if viewer_type is not none
- is_customizable: true for mugs, pins, tshirts, tote_bags, stickers — else false
- allow_color_change, allow_custom_text, allow_image_upload: booleans sensible for the category
- max_text_length: integer (e.g. 30) if custom text allowed, else null
- customization_addon_price: number add-on fee in PHP (e.g. 50) or null
PROMPT;

        $userContent = "Name: {$name}\nCategory: {$category}\nHint: {$hint}";

        // gpt-oss intermittently returns empty content — retry before giving up
        $data = null;
        $attempts = 0;
        for ($attempts = 1; $attempts <= 3; $attempts++) {
            $response = Http::withToken($this->apiKey)
                ->timeout(60)
                ->post("{$this->baseUrl}/chat/completions", [
                    'model' => 'openai/gpt-oss-20b',
                    'messages' => [
                        ['role' => 'system', 'content' => $systemPrompt],
                        ['role' => 'user', 'content' => $userContent],
                    ],
                    'temperature' => 0.5,
                    'max_tokens' => 2048,
                ]);

            if ($response->failed()) {
                Log::error('Product AI assist error', ['attempt' => $attempts, 'status' => $response->status(), 'body' => $response->body()]);

                continue;
            }

            $reply = $response->json('choices.0.message.content', '');
            $reply = preg_replace('/<think>[\s\S]*?<\/think>/u', '', $reply);
            $reply = trim($reply ?? '');

            if (preg_match('/\{[\s\S]*\}/', $reply, $m)) {
                $decoded = json_decode($m[0], true);
                if (is_array($decoded)) {
                    $data = $decoded;
                    break;
                }
            }

            Log::warning('Product AI assist bad reply, retrying', ['attempt' => $attempts, 'reply' => mb_substr($reply, 0, 200)]);
        }

        if (! is_array($data)) {
            return $this->errorResponse('AI is busy, please try again', 502);
        }

        $allowed = [
            'short_description', 'description', 'badge', 'sku',
            'print_method', 'print_size', 'viewer_type', 'has_3d_preview',
            'is_customizable', 'allow_color_change', 'allow_custom_text',
            'allow_image_upload', 'max_text_length', 'customization_addon_price',
        ];

        $out = array_intersect_key($data, array_flip($allowed));

        // Force viewer_type into a valid enum value so saving never fails validation
        $viewers = ['none', 'mug', 'glass_cup', 'tumbler', 'travel_mug', 'coffee_cup', 'teacup', 'espresso', 'latte', 'cappuccino', 'stein', 'tankard', 'pin', 'shirt', 'tote', 'sticker', 'calendar', 'glb'];
        $vt = strtolower(trim((string) ($out['viewer_type'] ?? '')));
        if (! in_array($vt, $viewers, true)) {
            $haystack = strtolower($vt.' '.$category.' '.$name);
            $vt = 'none';
            // Specific drinkware first — generic 'mug' must come after 'travel mug' etc.
            foreach (['travel' => 'travel_mug', 'glass' => 'glass_cup', 'tumbler' => 'tumbler', 'demitasse' => 'espresso', 'espresso' => 'espresso', 'cappuccino' => 'cappuccino', 'latte' => 'latte', 'teacup' => 'teacup', 'tea cup' => 'teacup', 'coffee cup' => 'coffee_cup', 'stein' => 'stein', 'beer' => 'stein', 'tankard' => 'tankard', 'mug' => 'mug', 'pin' => 'pin', 'shirt' => 'shirt', 't-shirt' => 'shirt', 'tote' => 'tote', 'sticker' => 'sticker', 'calendar' => 'calendar'] as $needle => $mapped) {
                if (str_contains($haystack, $needle)) {
                    $vt = $mapped;
                    break;
                }
            }
            if ($vt === 'none') {
                $vt = match (strtolower($category)) {
                    'mugs' => 'mug',
                    'pins' => 'pin',
                    'tshirts' => 'shirt',
                    'tote_bags' => 'tote',
                    'stickers' => 'sticker',
                    'calendars' => 'calendar',
                    default => 'none',
                };
            }
        }
        $out['viewer_type'] = $vt;
        $out['has_3d_preview'] = $vt !== 'none';

        return $this->successResponse($out, 'AI suggestions generated');
    }
}
