<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiConversation;
use App\Models\Order;
use App\Models\Product;
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
                'model' => 'whisper-large-v3-turbo',
                'response_format' => 'verbose_json',
                'temperature' => 0,
            ]);

        if ($response->failed()) {
            Log::error('Groq STT error', ['status' => $response->status(), 'body' => $response->body()]);

            return $this->errorResponse('Transcription failed', 502);
        }

        $body = $response->json();

        return $this->successResponse([
            'text' => $body['text'] ?? '',
            'language' => $body['language'] ?? 'en',
        ], 'Transcription successful');
    }

    // ─── POST /api/v1/groq/chat ──────────────────────────────────────────────

    public function chat(Request $request): JsonResponse
    {
        $request->validate([
            'messages' => ['required', 'array', 'min:1'],
            'messages.*.role' => ['required', 'in:user,assistant,system'],
            'messages.*.content' => ['required', 'string'],
            'language' => ['sometimes', 'string'],
            'customer_email' => ['sometimes', 'nullable', 'string'],
            'conversation_id' => ['sometimes', 'nullable', 'string'],
        ]);

        $conversationId = $request->input('conversation_id');
        if ($conversationId) {
            $conversation = AiConversation::where('conversation_id', $conversationId)->first();
            if ($conversation) {
                if (! $conversation->is_verified) {
                    return $this->errorResponse('Security verification required before first response in conversation.', 403);
                }
                $meta = $conversation->metadata ?? [];
                $meta['messages_count'] = ($meta['messages_count'] ?? 0) + 1;
                $meta['last_activity'] = now()->toIso8601String();
                $conversation->metadata = $meta;
                $conversation->save();
            }
        }

        $lang = $request->input('language', 'en');
        $isTagalog = in_array($lang, ['tl', 'fil', 'tgl'], true);

        $systemPrompt = <<<'PROMPT'
# E-COMMERCE AI CUSTOMER SUPPORT ASSISTANT

## ROLE

You are Owla — a professional, intelligent, reliable, and customer-friendly AI Assistant for NUYDA ENTERPRISE, a custom printing and digital services business in the Philippines.

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
- You are EXCLUSIVELY a customer support assistant for NUYDA ENTERPRISE (custom printing, mugs, t-shirts, stickers, pins, tote bags, orders, tracking, pricing, and store inquiries).
- You MUST REFUSE to answer ANY off-topic or unrelated questions, including:
  - Programming, coding, computer science (e.g. "What is Python?", "Write code in JavaScript", "How to write a function", HTML, CSS, SQL, bug fixing, etc.)
  - General world knowledge, facts, science, history, politics, gaming, cooking recipes, or celebrity news.
  - Math homework or general academic tutoring.
- If the customer asks ANY question not directly related to our printing services, products, orders, or shopping on this app:
  You MUST DECLINE immediately in 1-2 friendly sentences and guide them back to our store services.
  Example decline: "I am specialized only in assisting with NUYDA ENTERPRISE products, custom printing, and orders! I cannot answer general programming or unrelated topics. How can I help you with our custom merchandise or orders today?"
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

# 7. INTERACTIVE PRODUCT RECOMMENDATION QUIZ ("HELP ME CHOOSE")
- When a customer taps "Help me choose", asks for recommendations, or isn't sure what product to buy:
  - Respond with warm, helpful enthusiasm!
  - Ask them 3 short, friendly questions to help match the ideal product:
    1. What is the occasion or purpose? (Gift, souvenir, school event, business giveaway, or personal use?)
    2. How many pieces do you need? (Single piece, small batch of 2-10, or bulk order?)
    3. What is your target budget? (Under ₱200, ₱200 to ₱500, or flexible?)
  - When the customer provides their answers or describes what they want:
    - Match 1 to 3 specific products directly from our live store products in database.
    - Mention each recommended product by its name (such as "Custom Ceramic Mug", "Button Pin", "Custom Cotton T-Shirt", "Tote Bag", "Custom Sticker", "Wall Calendar") so our mobile app automatically displays interactive product cards with photos, prices, and Customize buttons!
    - Explain why each product fits their occasion and budget in clean conversational sentences.

---

# 8. FINAL PRINCIPLE
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
                'model' => 'openai/gpt-oss-20b',
                'messages' => $messages,
                'temperature' => 0.7,
                'max_tokens' => 350,
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

        $products = $this->findMentionedProducts($request->input('messages', []), $reply);

        return $this->successResponse([
            'reply' => $reply,
            'language' => $lang,
            'conversation_id' => $conversationId,
            'products' => $products,
        ], 'Chat successful');
    }

    // ─── POST /api/v1/groq/conversation/verify-stage ────────────────────────
    public function verifyStage(Request $request): JsonResponse
    {
        $request->validate([
            'conversation_id' => ['required', 'string', 'min:5', 'max:100'],
            'stage' => ['required', 'in:user,data,security'],
            'user_email' => ['nullable', 'string', 'max:255'],
            'messages' => ['nullable', 'array'],
        ]);

        $conversationId = trim($request->input('conversation_id'));
        $stage = $request->input('stage');
        $userEmail = trim($request->input('user_email') ?? '');

        $conversation = AiConversation::firstOrCreate(
            ['conversation_id' => $conversationId],
            [
                'user_email' => $userEmail ?: null,
                'ip_address' => $request->ip(),
                'user_agent' => substr((string) $request->userAgent(), 0, 500),
            ]
        );

        if ($userEmail && ! $conversation->user_email) {
            $conversation->user_email = $userEmail;
        }

        // STAGE 1: Checking User — Validate authenticated user/session & confirm current user context is valid
        if ($stage === 'user') {
            if (! empty($userEmail)) {
                if (! filter_var($userEmail, FILTER_VALIDATE_EMAIL)) {
                    return $this->errorResponse('Invalid user email format provided for session verification.', 422);
                }
            }

            // Rate-limiting check per IP to prevent session flooding
            $ip = $request->ip();
            $recentCount = AiConversation::where('ip_address', $ip)
                ->where('created_at', '>=', now()->subMinutes(10))
                ->count();

            if ($recentCount > 100) {
                return $this->errorResponse('Too many session initialization requests. Please wait a moment.', 429);
            }

            $conversation->stage_user_verified = true;
            $conversation->save();

            return $this->successResponse([
                'stage' => 'user',
                'completed' => true,
                'is_verified' => $conversation->is_verified,
            ], 'User session and context validated successfully.');
        }

        // STAGE 2: Checking Data — Validate user/conversation/request data & confirm request has expected info
        if ($stage === 'data') {
            if (! $conversation->stage_user_verified) {
                return $this->errorResponse('Sequential requirement: Stage 1 (Checking User) must complete before Checking Data.', 400);
            }

            $messages = $request->input('messages');
            if (empty($messages) || ! is_array($messages)) {
                return $this->errorResponse('Invalid conversation data. Expected message payload array.', 422);
            }

            foreach ($messages as $idx => $msg) {
                if (! isset($msg['role']) || ! in_array($msg['role'], ['user', 'assistant', 'system'])) {
                    return $this->errorResponse("Invalid message role in conversation data at index {$idx}.", 422);
                }
                $content = $msg['content'] ?? $msg['text'] ?? '';
                if (! is_string($content) || strlen($content) === 0) {
                    return $this->errorResponse("Empty or invalid message content at index {$idx}.", 422);
                }
                if (strlen($content) > 10000) {
                    return $this->errorResponse('Message content exceeds maximum allowed character length.', 422);
                }
            }

            $conversation->stage_data_verified = true;
            $conversation->save();

            return $this->successResponse([
                'stage' => 'data',
                'completed' => true,
                'is_verified' => $conversation->is_verified,
            ], 'Conversation and request data verified successfully.');
        }

        // STAGE 3: Securing Request — Perform required request/session security validation
        if ($stage === 'security') {
            if (! $conversation->stage_user_verified) {
                return $this->errorResponse('Sequential requirement: Stage 1 (Checking User) must complete first.', 400);
            }
            if (! $conversation->stage_data_verified) {
                return $this->errorResponse('Sequential requirement: Stage 2 (Checking Data) must complete first.', 400);
            }

            // Anti-abuse & security sanitization audit
            $meta = $conversation->metadata ?? [];
            $meta['security_check_passed'] = true;
            $meta['verified_at'] = now()->toIso8601String();
            $meta['ip'] = $request->ip();

            $conversation->metadata = $meta;
            $conversation->stage_security_verified = true;
            $conversation->is_verified = true;
            $conversation->verified_at = now();
            $conversation->save();

            return $this->successResponse([
                'stage' => 'security',
                'completed' => true,
                'is_verified' => true,
                'verified_at' => $conversation->verified_at->toIso8601String(),
            ], 'Security validation passed. Request secured for AI processing.');
        }

        return $this->errorResponse('Unknown verification stage requested.', 400);
    }

    // ─── GET /api/v1/groq/conversation/{conversation_id}/status ──────────────
    public function conversationStatus(string $conversation_id): JsonResponse
    {
        $conversation = AiConversation::where('conversation_id', $conversation_id)->first();

        if (! $conversation) {
            return $this->successResponse([
                'exists' => false,
                'is_verified' => false,
                'stages' => [
                    'user' => false,
                    'data' => false,
                    'security' => false,
                ],
            ], 'Conversation not initialized yet.');
        }

        return $this->successResponse([
            'exists' => true,
            'is_verified' => $conversation->is_verified,
            'stages' => [
                'user' => $conversation->stage_user_verified,
                'data' => $conversation->stage_data_verified,
                'security' => $conversation->stage_security_verified,
            ],
            'verified_at' => $conversation->verified_at?->toIso8601String(),
        ], 'Conversation status retrieved.');
    }

    // ─── POST /api/v1/groq/tts ───────────────────────────────────────────────

    public function tts(Request $request): Response|JsonResponse
    {
        $request->validate([
            'text' => ['required', 'string', 'max:4096'],
            'language' => ['sometimes', 'string'],
        ]);

        $text = trim($request->input('text', ''));
        $lang = $request->input('language', 'en');
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
                'original_len' => mb_strlen($request->input('text', '')),
                'truncated_len' => mb_strlen($text),
            ]);
        }

        $response = Http::withToken($this->apiKey)
            ->timeout(60)
            ->post("{$this->baseUrl}/audio/speech", [
                'model' => $model,
                'input' => $text,
                'voice' => $voice,
                'response_format' => 'wav',
            ]);

        if ($response->failed()) {
            $status = $response->status();
            $body = $response->body();
            $json = $response->json();
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
                'status' => $status,
                'body' => $body,
                'text_len' => mb_strlen($text),
                'model' => $model,
                'voice' => $voice,
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
                'groq_error' => $groqMsg,
                'retry_after' => $retryAfter,
            ];

            $errResp = $this->errorResponse($userMsg, $clientStatus, $data);
            if ($retryAfter !== null) {
                $errResp->headers->set('Retry-After', (string) $retryAfter);
            }

            return $errResp;
        }

        return response($response->body(), 200, [
            'Content-Type' => 'audio/wav',
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

            // Live store products from database
            $products = Product::whereNull('deleted_at')->get();
            if ($products->isNotEmpty()) {
                $lines[] = "\nLive Available Store Products in Database:";
                foreach ($products as $p) {
                    $has3D = $p->has_3d_preview ? '3D Preview/Customizable' : 'Standard';
                    $sku = $p->sku ?: 'No SKU';
                    $lines[] = "  - Product ID: {$p->id} | Name: \"{$p->name}\" | Category: {$p->category} | Price: ₱{$p->base_price} | SKU: {$sku} | Type: {$has3D} | Viewer: {$p->viewer_type}";
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
                    $itemsStr = $ord->items->map(fn ($it) => "{$it->product_name} (x{$it->quantity})")->implode(', ');
                    $lines[] = "  - Order #{$ord->order_number}: Customer \"{$ord->customer_name}\" ({$ord->customer_email}) | Items: [{$itemsStr}] | Total: \${$ord->total} | Status: {$ord->status} | Expected Delivery: {$ord->expected_delivery}";
                }
            }
        } catch (\Throwable $e) {
            Log::warning('AI DB context fetch failed', ['error' => $e->getMessage()]);
        }

        return implode("\n", $lines);
    }

    /**
     * Scan customer messages and assistant reply for products mentioned or recommended
     * and return structured product metadata for rich product card display in mobile UI.
     */
    private function findMentionedProducts(array $messages, string $reply): array
    {
        try {
            $userText = '';
            foreach ($messages as $msg) {
                if (($msg['role'] ?? '') === 'user') {
                    $userText .= ' '.($msg['content'] ?? '');
                }
            }
            $combined = strtolower($userText.' '.$reply);

            $allProducts = Product::whereNull('deleted_at')->get();
            $matched = [];

            foreach ($allProducts as $p) {
                $nameLower = strtolower($p->name);
                $catLower = strtolower($p->category ?? '');
                $skuLower = strtolower($p->sku ?? '');

                $isMatch = false;
                if (! empty($p->sku) && str_contains($combined, $skuLower)) {
                    $isMatch = true;
                } elseif (str_contains($combined, $nameLower)) {
                    $isMatch = true;
                } elseif ((str_contains($nameLower, 'shirt') || str_contains($catLower, 'shirt') || str_contains($catLower, 'apparel')) && (str_contains($combined, 'shirt') || str_contains($combined, 't-shirt') || str_contains($combined, 'tshirt') || str_contains($combined, 'tee') || str_contains($combined, 'damit'))) {
                    $isMatch = true;
                } elseif ((str_contains($nameLower, 'mug') || str_contains($catLower, 'mug') || str_contains($nameLower, 'cup') || str_contains($nameLower, 'espresso') || str_contains($nameLower, 'esresso') || str_contains($nameLower, 'tumbler')) && (str_contains($combined, 'mug') || str_contains($combined, 'cup') || str_contains($combined, 'espresso') || str_contains($combined, 'tumbler') || str_contains($combined, 'tasa') || str_contains($combined, 'coffee'))) {
                    $isMatch = true;
                } elseif ((str_contains($nameLower, 'pin') || str_contains($catLower, 'pin')) && (str_contains($combined, 'pin') || str_contains($combined, 'badge') || str_contains($combined, 'button'))) {
                    $isMatch = true;
                } elseif ((str_contains($nameLower, 'bag') || str_contains($catLower, 'bag') || str_contains($catLower, 'tote')) && (str_contains($combined, 'bag') || str_contains($combined, 'tote') || str_contains($combined, 'shoulder bag') || str_contains($combined, 'bayong'))) {
                    $isMatch = true;
                } elseif ((str_contains($nameLower, 'sticker') || str_contains($catLower, 'sticker')) && str_contains($combined, 'sticker')) {
                    $isMatch = true;
                } elseif ((str_contains($nameLower, 'calendar') || str_contains($catLower, 'calendar')) && (str_contains($combined, 'calendar') || str_contains($combined, 'kalendaryo'))) {
                    $isMatch = true;
                }

                if ($isMatch) {
                    $matched[] = [
                        'id' => $p->id,
                        'name' => $p->name,
                        'category' => $p->category,
                        'price' => (string) $p->base_price,
                        'sku' => $p->sku,
                        'thumbnail' => $p->thumbnail,
                        'fallback_image' => $p->fallback_image,
                        'has_3d_preview' => (bool) $p->has_3d_preview,
                        'viewer_type' => $p->viewer_type,
                        'stock' => $p->stock_quantity,
                        'customization_addon_price' => $p->customization_addon_price,
                        'max_text_length' => $p->max_text_length,
                    ];
                }
            }

            return array_slice($matched, 0, 5);
        } catch (\Throwable $e) {
            Log::warning('findMentionedProducts failed', ['error' => $e->getMessage()]);

            return [];
        }
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
                    $fullText .= ' '.($msg['content'] ?? '');
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

                        if (! empty($digits) && strlen($digits) >= 3) {
                            $query->orWhereRaw('LOWER(order_number) = ?', [strtolower('RD-'.$digits)])
                                ->orWhere('order_number', 'like', '%-'.$digits);
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
                        'Placed Date: '.($order->placed_at ? $order->placed_at->format('M d, Y') : 'Recently'),
                        "Estimated Delivery: {$order->expected_delivery}",
                        "Total Amount: ₱{$order->total} (Payment: {$order->payment_method}, {$order->payment_status})",
                        "Items in Order: {$itemsDetail}",
                        'MANDATORY INSTRUCTION: The customer provided this exact Order ID. Give them the order tracking update directly and immediately! DO NOT ask them to log in. DO NOT ask for their email address. Explain these details in warm, friendly, natural sentences without markdown asterisks (**) or bullet dashes (-).',
                    ]);
                }
            }
        } catch (\Throwable $e) {
            Log::warning('findMentionedOrderContext failed', ['error' => $e->getMessage()]);
        }

        return null;
    }
}
