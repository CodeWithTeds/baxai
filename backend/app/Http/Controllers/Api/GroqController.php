<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GroqController extends Controller
{
    use ApiResponse;

    private string $apiKey;
    private string $baseUrl = 'https://api.groq.com/openai/v1';

    public function __construct()
    {
        $this->apiKey = config('services.groq.api_key');
    }

    // ─── POST /api/v1/groq/transcribe ────────────────────────────────────────

    public function transcribe(Request $request): JsonResponse
    {
        $request->validate([
            'audio' => ['required', 'file', 'mimes:m4a,mp4,mpeg,mpga,mp3,wav,webm,ogg', 'max:25600'],
        ]);

        $file = $request->file('audio');

        $response = Http::withToken($this->apiKey)
            ->timeout(60)
            ->attach('file', file_get_contents($file->getRealPath()), $file->getClientOriginalName())
            ->post("{$this->baseUrl}/audio/transcriptions", [
                'model'           => 'whisper-large-v3-turbo',
                'response_format' => 'verbose_json',
                'temperature'     => 0,
            ]);

        if ($response->failed()) {
            Log::error('Groq STT error', ['status' => $response->status(), 'body' => $response->body()]);
            return $this->errorResponse('Transcription failed', 502);
        }

        $body = $response->json();

        return $this->successResponse([
            'text'     => $body['text'] ?? '',
            'language' => $body['language'] ?? 'en',
        ], 'Transcription successful');
    }

    // ─── POST /api/v1/groq/chat ──────────────────────────────────────────────

    public function chat(Request $request): JsonResponse
    {
        $request->validate([
            'messages'           => ['required', 'array', 'min:1'],
            'messages.*.role'    => ['required', 'in:user,assistant,system'],
            'messages.*.content' => ['required', 'string'],
            'language'           => ['sometimes', 'string'],
        ]);

        $lang      = $request->input('language', 'en');
        $isTagalog = in_array($lang, ['tl', 'fil', 'tgl'], true);

        $systemPrompt = <<<'PROMPT'
# E-COMMERCE AI CUSTOMER SUPPORT ASSISTANT

## ROLE

You are Owla — a professional, intelligent, reliable, and customer-friendly AI Assistant for Rens Digital, a custom printing and digital services business in the Philippines.

Your primary responsibility is to help customers with:
- Products and product availability
- Prices and specifications
- Orders and order status
- Shipping and delivery
- Payments
- Returns and refunds
- Cancellations
- Account-related shopping concerns
- Product recommendations
- General customer support

Your goal is to provide accurate, helpful, concise, and natural customer service while protecting customer privacy and never inventing information.

IMPORTANT: Do NOT output any internal reasoning, thinking steps, or chain-of-thought. Only output the final response to the customer. Never include <think> tags or reasoning blocks.

---

# 1. LANGUAGE AND COMMUNICATION

You understand and communicate naturally in English, Filipino/Tagalog, and Taglish.

Always respond in the language and style primarily used by the customer. Do not unnecessarily translate the customer's message.

- If the customer uses English, respond in English.
- If the customer uses Filipino/Tagalog, respond naturally in Filipino/Tagalog.
- If the customer uses Taglish, respond naturally in Taglish.
- Match the dominant language style of the customer's message.

---

# 2. RESPONSE STYLE & PLAIN TEXT FORMATTING (CRITICAL FOR NON-TECH USERS)

Always be: Friendly, Warm, Conversational, Professional, Concise, Helpful, and Clear.

CRITICAL FORMATTING RULES:
- NEVER use markdown syntax: NO double asterisks (**bold**), NO single asterisks (*italic*), NO bullet hyphens (- item or --), NO hashtags (#), and NO raw code blocks.
- Regular everyday shoppers and non-technical customers read your responses on a mobile phone screen and listen to them spoken aloud via text-to-speech. Asterisks (**), hyphens (-), and symbols look like broken computer code or formatting errors to them and sound robotic when read aloud!
- Always write in clean, natural, human conversational sentences and short paragraphs.
- For order tracking updates, explain status and delivery dates naturally like a helpful retail assistant:
  Example: "Good news! Your order RD-3607 is currently in production and scheduled for fulfillment. Estimated delivery is on October 6, with Cash on Delivery payment. We will send you an update as soon as it ships!"
- Never use list dashes like "- Status: In progress" or "- Payment: COD". Integrate the details into smooth, natural sentences instead.

---

# 3. ACCURACY

NEVER invent or assume product prices, availability, order status, tracking numbers, delivery dates, or customer information. Only use the system data provided.

---

# 4. PRIVACY & SECURITY
Never expose passwords, OTPs, PINs, card numbers, or another customer's personal data or order history.

---

# 5. STRICT DOMAIN SCOPE & OFF-TOPIC POLICY (MANDATORY)
- You are EXCLUSIVELY a customer support assistant for Rens Digital / NUYDA ENTERPRISE (custom printing, mugs, t-shirts, stickers, pins, tote bags, orders, tracking, pricing, and store inquiries).
- You MUST REFUSE to answer ANY off-topic or unrelated questions, including:
  - Programming, coding, computer science (e.g. "What is Python?", "Write code in JavaScript", "How to write a function", HTML, CSS, SQL, bug fixing, etc.)
  - General world knowledge, facts, science, history, politics, gaming, cooking recipes, or celebrity news.
  - Math homework or general academic tutoring.
- If the customer asks ANY question not directly related to our printing services, products, orders, or shopping on this app:
  You MUST DECLINE immediately in 1-2 friendly sentences and guide them back to our store services.
  Example decline: "I am specialized only in assisting with Rens Digital products, custom printing, and orders! I cannot answer general programming or unrelated topics. How can I help you with our custom merchandise or orders today?"
- NEVER explain code, write scripts, or answer general tech questions like "what is Python".

---

# 6. DIRECT ORDER TRACKING BY ORDER ID
- When a customer provides their specific Order ID or Reference (e.g. RD-3607, #RD-3607, or numeric ID):
  - Track and provide the order details directly using that Order ID!
  - DO NOT ask them to log in.
  - DO NOT ask them for their email address or account.
  - They have the order number, so give them the tracking progress, estimated delivery, and payment status directly, warmly, and helpfully.
- If a customer asks "where is my order" but does NOT provide an order ID:
  - Ask them politely to provide their Order Reference (e.g. RD-3607) so you can track it for them.
- If a customer asks to browse "all orders" or orders from other people:
  - Explain that you can only track a specific order reference and ask for their Order ID.

---

# 7. FINAL PRINCIPLE
Never guess. Never invent system data. Stay strictly on-topic. Be concise, natural, accurate, and helpful.
PROMPT;

        if ($isTagalog) {
            $systemPrompt .= "\n\nNOTE: Customer is speaking Filipino/Tagalog. Respond in Filipino/Tagalog or Taglish.";
        }

        // Authenticated or provided customer email
        $customerEmail = $request->input('customer_email');
        if (empty($customerEmail) && $request->user()) {
            $customerEmail = $request->user()->email;
        }

        // Inject live DB context
        $dbContext = $this->buildDbContext();
        if ($dbContext) {
            $systemPrompt .= "\n\n--- LIVE SYSTEM DATA ---\n{$dbContext}\n--- END SYSTEM DATA ---";
        }

        // Specifically look up any order reference mentioned in customer messages
        $matchedOrder = $this->findMentionedOrderContext($request->input('messages', []), $customerEmail);
        if ($matchedOrder) {
            $systemPrompt .= "\n\n--- SPECIFIC MATCHED ORDER FROM DATABASE ---\n{$matchedOrder}\n--- END MATCHED ORDER ---";
        }

        $messages = array_merge(
            [['role' => 'system', 'content' => $systemPrompt]],
            $request->input('messages')
        );

        $response = Http::withToken($this->apiKey)
            ->timeout(60)
            ->post("{$this->baseUrl}/chat/completions", [
                'model'       => 'openai/gpt-oss-20b',
                'messages'    => $messages,
                'temperature' => 0.7,
                'max_tokens'  => 350,
            ]);

        if ($response->failed()) {
            Log::error('Groq chat error', ['status' => $response->status(), 'body' => $response->body()]);
            return $this->errorResponse('Chat failed', 502);
        }

        $reply = $response->json('choices.0.message.content', '');

        // Strip <think>...</think> blocks — handles multiline with unicode flag
        $reply = preg_replace('/<think>[\s\S]*?<\/think>/u', '', $reply);
        // Fallback: strip any stray opening/closing think tags
        $reply = preg_replace('/<\/?think>/u', '', $reply);

        // Clean markdown symbols for clean non-technical display & natural voice speech
        // Strip bold/italic asterisks: **text** -> text, *text* -> text
        $reply = preg_replace('/\*{1,3}([^*]+)\*{1,3}/u', '$1', $reply);
        // Strip stray markdown headers
        $reply = preg_replace('/^#+\s*/mu', '', $reply);
        // Clean markdown list bullets: convert "- Item" into "• Item"
        $reply = preg_replace('/^\s*[-*]\s+/mu', '• ', $reply);
        // Remove double hyphens, stray asterisks, or markdown lines
        $reply = str_replace(['**', '*', '`', '---', '--'], ['', '', '', '', ' - '], $reply);
        $reply = preg_replace('/[ \t]{2,}/u', ' ', $reply);
        $reply = trim($reply);

        // Safety truncation to stay under TTS 1200 TPM limit — be conservative (400 chars ≈ well under 1200 TPM)
        if (mb_strlen($reply) > 500) {
            $truncated = mb_substr($reply, 0, 500);
            // cut at sentence boundary if possible
            $cutPoints = [
                mb_strrpos($truncated, '.'),
                mb_strrpos($truncated, '!'),
                mb_strrpos($truncated, '?'),
            ];
            $cut = max(array_map(fn ($v) => $v ?: 0, $cutPoints));
            $reply = $cut > 200 ? mb_substr($truncated, 0, $cut + 1) : $truncated;
        }

        return $this->successResponse([
            'reply'    => $reply,
            'language' => $lang,
        ], 'Chat successful');
    }

    // ─── POST /api/v1/groq/tts ───────────────────────────────────────────────

    public function tts(Request $request): Response|JsonResponse
    {
        $request->validate([
            'text'     => ['required', 'string', 'max:4096'],
            'language' => ['sometimes', 'string'],
        ]);

        $text     = trim($request->input('text', ''));
        $lang     = $request->input('language', 'en');
        $isArabic = in_array($lang, ['ar'], true);

        // Groq Orpheus valid voices per docs/error: [autumn diana hannah austin daniel troy]
        // nasser is for arabic-saudi model only
        $model = $isArabic
            ? 'canopylabs/orpheus-arabic-saudi'
            : 'canopylabs/orpheus-v1-english';

        $voice = $isArabic ? 'nasser' : 'hannah';

        // Enforce TPM-safe length client + server side (Groq on_demand: 1200 TPM per request)
        if (mb_strlen($text) > 400) {
            $truncated = mb_substr($text, 0, 400);
            $cutPoints = [
                mb_strrpos($truncated, '.'),
                mb_strrpos($truncated, '!'),
                mb_strrpos($truncated, '?'),
            ];
            $cut = max(array_map(fn ($v) => $v ?: 0, $cutPoints));
            $text = $cut > 150 ? mb_substr($truncated, 0, $cut + 1) : $truncated;
            Log::warning('Groq TTS text truncated for TPM', [
                'original_len'  => mb_strlen($request->input('text', '')),
                'truncated_len' => mb_strlen($text),
            ]);
        }

        $response = Http::withToken($this->apiKey)
            ->timeout(60)
            ->post("{$this->baseUrl}/audio/speech", [
                'model'           => $model,
                'input'           => $text,
                'voice'           => $voice,
                'response_format' => 'wav',
            ]);

        if ($response->failed()) {
            $status = $response->status();
            $body   = $response->body();
            $json   = $response->json();
            $groqMsg = $json['error']['message'] ?? $json['message'] ?? $body ?? 'TTS failed';

            // Map to user-friendly message while preserving Groq detail in logs/data
            $userMsg = $groqMsg;
            if ($status === 429) {
                if (str_contains($groqMsg, 'tokens per day') || str_contains($groqMsg, 'TPD')) {
                    $userMsg = 'Voice service daily limit reached. Please try again tomorrow — text reply is still available.';
                } elseif (str_contains($groqMsg, 'tokens per minute') || str_contains($groqMsg, 'TPM')) {
                    $userMsg = 'Voice request too large — please try a shorter message.';
                } else {
                    $userMsg = 'Voice rate limit reached, please try again shortly.';
                }
            } elseif ($status === 413) {
                $userMsg = 'Voice request too large — please try a shorter message.';
            } elseif ($status === 400 && str_contains($groqMsg, 'voice')) {
                $userMsg = 'Voice configuration error. Please try again.';
            }

            Log::error('Groq TTS error', [
                'status'    => $status,
                'body'      => $body,
                'text_len'  => mb_strlen($text),
                'model'     => $model,
                'voice'     => $voice,
            ]);

            // Propagate 400/413/429 instead of masking as 502 so client can degrade gracefully
            $clientStatus = in_array($status, [400, 413, 429], true) ? $status : 502;

            // Parse Retry-After if Groq includes "try again in XmYs"
            $retryAfter = null;
            if (preg_match('/try again in (\d+)m(\d+)s/i', $groqMsg, $m)) {
                $retryAfter = (int) $m[1] * 60 + (int) $m[2];
            } elseif (preg_match('/try again in (\d+)m/i', $groqMsg, $m)) {
                $retryAfter = (int) $m[1] * 60;
            } elseif (preg_match('/try again in (\d+)s/i', $groqMsg, $m)) {
                $retryAfter = (int) $m[1];
            }

            $data = [
                'groq_status' => $status,
                'groq_error'  => $groqMsg,
                'retry_after' => $retryAfter,
            ];

            $errResp = $this->errorResponse($userMsg, $clientStatus, $data);
            if ($retryAfter !== null) {
                $errResp->headers->set('Retry-After', (string) $retryAfter);
            }

            return $errResp;
        }

        return response($response->body(), 200, [
            'Content-Type'  => 'audio/wav',
            'Cache-Control' => 'no-store',
        ]);
    }

    // ─── Build live DB context ────────────────────────────────────────────────

    private function buildDbContext(): string
    {
        $lines = [];

        try {
            $customerCount = DB::table('customers')->count();
            $orderCount = Order::count();
            $lines[] = "Total registered customers: {$customerCount}";
            $lines[] = "Total active/completed orders in system: {$orderCount}";

            $orderStats = Order::selectRaw('status, COUNT(*) as total')
                ->groupBy('status')
                ->get();

            if ($orderStats->isNotEmpty()) {
                $lines[] = "\nSystem orders by status:";
                foreach ($orderStats as $row) {
                    $lines[] = "  - {$row->status}: {$row->total} order(s)";
                }
            }

            // Recent customer orders from real orders table
            $recentOrders = Order::with('items')
                ->latest('placed_at')
                ->limit(10)
                ->get();

            if ($recentOrders->isNotEmpty()) {
                $lines[] = "\nRecent verified orders in database:";
                foreach ($recentOrders as $ord) {
                    $itemsStr = $ord->items->map(fn($it) => "{$it->product_name} (x{$it->quantity})")->implode(', ');
                    $lines[] = "  - Order #{$ord->order_number}: Customer \"{$ord->customer_name}\" ({$ord->customer_email}) | Items: [{$itemsStr}] | Total: \${$ord->total} | Status: {$ord->status} | Expected Delivery: {$ord->expected_delivery}";
                }
            }
        } catch (\Throwable $e) {
            Log::warning('AI DB context fetch failed', ['error' => $e->getMessage()]);
        }

        return implode("\n", $lines);
    }

    /**
     * Scan customer messages for order numbers (e.g. RD-3607, #RD-3607, 3607)
     * and inject full live tracking and item details into AI context.
     */
    private function findMentionedOrderContext(array $messages, ?string $customerEmail = null): ?string
    {
        try {
            $fullText = '';
            foreach ($messages as $msg) {
                if (($msg['role'] ?? '') === 'user') {
                    $fullText .= ' ' . ($msg['content'] ?? '');
                }
            }

            if (empty(trim($fullText))) {
                return null;
            }

            // Extract candidate numbers / references
            preg_match_all('/(?:#|rd-|\border\s*#?)\s*([a-z0-9_-]{3,20})/i', $fullText, $matches1);
            preg_match_all('/\b(rd-\d{3,6}|\d{4,6})\b/i', $fullText, $matches2);

            $candidates = array_unique(array_filter(array_merge($matches1[0] ?? [], $matches1[1] ?? [], $matches2[0] ?? [])));

            foreach ($candidates as $cand) {
                $raw = trim($cand);
                $unhashed = ltrim($raw, '#');
                $digits = preg_replace('/\D/', '', $unhashed);

                $order = Order::with(['items', 'customer'])
                    ->where(function ($query) use ($raw, $unhashed, $digits) {
                        if (is_numeric($raw)) {
                            $query->orWhere('id', (int) $raw);
                        }

                        $query->orWhereRaw('LOWER(order_number) = ?', [strtolower($raw)])
                              ->orWhereRaw('LOWER(order_number) = ?', [strtolower($unhashed)])
                              ->orWhereRaw('REPLACE(LOWER(order_number), "-", "") = ?', [strtolower($unhashed)]);

                        if (!empty($digits) && strlen($digits) >= 3) {
                            $query->orWhereRaw('LOWER(order_number) = ?', [strtolower('RD-' . $digits)])
                                  ->orWhere('order_number', 'like', '%-' . $digits);
                        }
                    })
                    ->first();

                if ($order) {
                    $itemsDetail = $order->items->map(function ($it) {
                        return "{$it->product_name} (Qty: {$it->quantity})";
                    })->implode(', ');

                    return implode("\n", [
                        "ORDER TRACKING DETAILS FOR #{$order->order_number}:",
                        "Order Reference: #{$order->order_number} (Internal ID: {$order->id})",
                        "Current Status: {$order->status} (in production and scheduled for fulfillment)",
                        "Placed Date: " . ($order->placed_at ? $order->placed_at->format('M d, Y') : 'Recently'),
                        "Estimated Delivery: {$order->expected_delivery}",
                        "Total Amount: ₱{$order->total} (Payment: {$order->payment_method}, {$order->payment_status})",
                        "Items in Order: {$itemsDetail}",
                        "MANDATORY INSTRUCTION: The customer provided this exact Order ID. Give them the order tracking update directly and immediately! DO NOT ask them to log in. DO NOT ask for their email address. Explain these details in warm, friendly, natural sentences without markdown asterisks (**) or bullet dashes (-).",
                    ]);
                }
            }
        } catch (\Throwable $e) {
            Log::warning('findMentionedOrderContext failed', ['error' => $e->getMessage()]);
        }

        return null;
    }
}
