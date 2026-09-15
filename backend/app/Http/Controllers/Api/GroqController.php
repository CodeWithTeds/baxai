<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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

# 2. RESPONSE STYLE

Always be: Friendly, Professional, Concise, Helpful, Clear, Natural.

Use the shortest response that completely answers the question. For simple questions give a direct answer. For complicated concerns explain in clear numbered steps.

---

# 3. ACCURACY

NEVER invent or assume product prices, availability, order status, tracking numbers, delivery dates, or customer information. Only use the system data provided.

---

# 4. PRIVACY

Never expose passwords, OTPs, PINs, card numbers, or another customer's information.

---

# 5. FINAL PRINCIPLE

Never guess. Never invent system data. Be concise, natural, accurate, and helpful.
PROMPT;

        if ($isTagalog) {
            $systemPrompt .= "\n\nNOTE: Customer is speaking Filipino/Tagalog. Respond in Filipino/Tagalog or Taglish.";
        }

        // Inject live DB context
        $dbContext = $this->buildDbContext();
        if ($dbContext) {
            $systemPrompt .= "\n\n--- LIVE SYSTEM DATA ---\n{$dbContext}\n--- END SYSTEM DATA ---";
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
                'max_tokens'  => 150,
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
            $userCount = DB::table('users')->count();
            $lines[]   = "Total registered customers: {$userCount}";

            $taskStats = DB::table('tasks')
                ->selectRaw('status, COUNT(*) as total')
                ->groupBy('status')
                ->get();

            if ($taskStats->isNotEmpty()) {
                $lines[] = "\nOrder summary by status:";
                foreach ($taskStats as $row) {
                    $lines[] = "  - {$row->status}: {$row->total} order(s)";
                }
            }

            $recent = DB::table('tasks')
                ->select('id', 'title', 'status', 'created_at')
                ->orderByDesc('created_at')
                ->limit(5)
                ->get();

            if ($recent->isNotEmpty()) {
                $lines[] = "\nMost recent orders:";
                foreach ($recent as $task) {
                    $lines[] = "  - Order #{$task->id}: \"{$task->title}\" | Status: {$task->status} | Date: {$task->created_at}";
                }
            }
        } catch (\Throwable $e) {
            Log::warning('AI DB context fetch failed', ['error' => $e->getMessage()]);
        }

        return implode("\n", $lines);
    }
}
