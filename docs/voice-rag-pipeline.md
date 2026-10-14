# Voice-Powered RAG AI System — Architecture, Tech Stack & Pipeline

> **Title:** Voice-to-RAG AI Pipeline  
> **Domain:** Conversational AI / Voice Agents / Retrieval-Augmented Generation  
> **Scope:** End-to-end system from speech input to spoken response, covering ASR, embeddings, vector retrieval, LLM reasoning, safety guardrails, and TTS.

---

## 1. Problem Statement

### 1.1 The Challenge

Building a **real-time voice AI assistant** that can answer questions grounded in private/domain-specific knowledge is hard because:

| # | Problem | Impact |
|---|---------|--------|
| 1 | **LLMs hallucinate** — they make up answers when they don't know something | Untrustworthy responses, factual errors |
| 2 | **LLMs have a knowledge cutoff** — they don't know recent or private data | Can't answer questions about your documents |
| 3 | **Speech adds latency** — ASR + LLM + TTS each add 200-800ms | Total latency exceeds 2-3 seconds, breaking natural conversation |
| 4 | **ASR errors propagate** — misheard words become wrong queries | Retrieval fails, LLM gets bad context |
| 5 | **Vector DB queries are slow** — 50-300ms per retrieval | Exceeds the 200ms budget for natural voice flow |
| 6 | **No safety guardrails** — LLMs can output harmful/PII content | Compliance risk, user harm |
| 7 | **Cloud-only isn't always viable** — privacy, offline, cost concerns | Can't deploy in sensitive environments |

### 1.2 What We Need

A system that:
- Listens to natural speech and responds in <1 second
- Grounds every answer in real documents (no hallucination)
- Handles multi-turn conversations with context
- Protects against unsafe output
- Works in the cloud, on-device, or hybrid

---

## 2. Solution Overview

### 2.1 The RAG Approach

**Retrieval-Augmented Generation (RAG)** solves the hallucination + knowledge cutoff problem:

```
Instead of asking the LLM to answer from memory:
  1. RETRIEVE relevant document chunks based on the user's question
  2. AUGMENT the LLM's prompt with those chunks as context
  3. GENERATE an answer grounded in the retrieved evidence
```

### 2.2 The Voice Pipeline

To make RAG work with speech, we wrap it in a voice interface:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        VOICE-TO-RAG PIPELINE                             │
│                                                                          │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌────────┐ │
│  │  Speech   │   │  Query   │   │  RAG     │   │  LLM +   │   │  TTS   │ │
│  │  → Text   │──▶│  Embed   │──▶│  Retrieve│──▶│  Safety  │──▶│  →     │ │
│  │  (ASR)    │   │          │   │  +Rerank │   │  Filter  │   │ Speech │ │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘   └────────┘ │
│       ▲                                                    │            │
│       └────────────────────────────────────────────────────┘            │
│                        (spoken response)                                 │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Key Innovations

| Innovation | What It Solves |
|------------|----------------|
| **Two-pass endpointing** | Triggers RAG on 240ms interim transcript instead of waiting 800ms |
| **Predictive semantic cache** | Pre-fetches likely follow-up chunks → 75% cache hit rate, <1ms retrieval |
| **Direct audio retrieval (SpeechRAG)** | Bypasses ASR entirely — no error propagation |
| **Streaming TTS** | Speaks LLM tokens as they arrive — 110ms first-token-to-speech |
| **Barge-in** | User can interrupt the bot mid-response |
| **Dual-agent architecture** | Slow Thinker pre-fetches in background, Fast Talker serves instantly |

---

## 3. Tech Stack Summary

| Layer | Technology | Role |
|-------|-----------|------|
| **Speech-to-Text** | NVIDIA Riva ASR / OpenAI Whisper / Picovoice Cheetah | Convert audio → text |
| **Embedding** | OpenAI `text-embedding-3-small` / `all-MiniLM-L6-v2` / `EmbeddingGemma-300M` | Text/audio → vector |
| **Vector DB** | FAISS / Qdrant / Pinecone / Weaviate | Store & search embeddings |
| **Reranking** | `llama-nemotron-rerank-vl-1b-v2` / Cross-encoder | Sharpen retrieval precision |
| **LLM** | GPT-4o-mini / Llama 3.3 70B / Nemotron 3 Nano | Reasoning & answer generation |
| **Safety** | `llama-3.1-nemotron-safety-guard-8b-v3` / NeMo Guardrails | Content filtering & PII detection |
| **Text-to-Speech** | NVIDIA Riva TTS / Picovoice Orca / Edge TTS | Text → spoken audio |
| **Orchestration** | LangGraph / NVIDIA ACE Agent / Custom asyncio | Pipeline coordination |
| **Dialog Management** | Colang (NVIDIA) / LangChain | Multi-turn conversation flow |

---

## 4. Pipeline Stages — Deep Dive

### 4.1 Stage 1: Speech-to-Text (ASR)

**Goal:** Convert spoken audio to text with minimal latency.

| Approach | Latency | Accuracy | Privacy |
|----------|---------|----------|---------|
| Cloud ASR (Whisper, Azure) | 500-800ms | High (WER <10%) | Audio sent to cloud |
| Streaming ASR (Riva) | 240ms interim / 800ms final | High | Audio sent to cloud |
| On-device (Cheetah, Whisper.cpp) | 200-400ms | Medium-High | 100% local |

**Two-pass endpointing (NVIDIA Riva pattern):**
```
Audio stream
    │
    ├── 240ms silence → INTERIM transcript → trigger RAG early
    │
    └── 800ms silence → FINAL transcript (beam LM + punctuation)
                              │
                              ▼
                        Confirm/correct RAG query
```
- Saves ~560ms of perceived latency
- Interim transcript may trigger spurious RAG calls — filtered by dialog manager

### 4.2 Stage 2: Query Embedding

**Goal:** Convert the text query into a vector for semantic search.

| Model | Dimension | Speed | Hosting |
|-------|-----------|-------|---------|
| `text-embedding-3-small` | 1536 | ~200ms | OpenAI API |
| `all-MiniLM-L6-v2` | 384 | ~50ms | Local (Sentence Transformers) |
| `llama-nemotron-embed-vl-1b-v2` | Variable | ~300ms | Local (NVIDIA) |
| `EmbeddingGemma-300M` | 384 | ~100ms | On-device (Picovoice) |

### 4.3 Stage 3: Retrieval (Vector Search)

**Goal:** Find the most relevant document chunks from the vector database.

| Store | Type | Latency | Scale |
|-------|------|---------|-------|
| FAISS (in-memory) | Local ANN | <1ms | Millions of vectors |
| Qdrant | Cloud/self-hosted | 50-300ms | Billions of vectors |
| Pinecone | Managed | 50-200ms | Billions of vectors |
| Weaviate | Open-source | 50-200ms | Billions of vectors |

**Retrieval patterns:**

**Standard:**
```
Query embedding → Vector DB search (top-k=10) → Rerank → Top-3-5 chunks → LLM
```

**VoiceAgentRAG (predictive cache):**
```
┌─────────────────────────────────────────────────┐
│  Slow Thinker (background async)                │
│  1. Predict 3-5 follow-up topics (LLM)         │
│  2. Pre-fetch chunks for each prediction        │
│  3. Populate FAISS semantic cache              │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│  Semantic Cache (in-memory FAISS)               │
│  - <1ms lookup                                  │
│  - 75% hit rate (79% warm)                      │
│  - 316x speedup (110ms → 0.35ms)              │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│  Fast Talker (foreground)                       │
│  1. Check cache → HIT: use cached chunks       │
│  2. MISS: query vector DB → cache results      │
│  3. Generate LLM response                      │
└─────────────────────────────────────────────────┘
```

### 4.4 Stage 4: Reranking

**Goal:** Re-score retrieved chunks to improve precision.

| Model | Improvement | Cost |
|-------|-------------|------|
| `llama-nemotron-rerank-vl-1b-v2` | +6-7% accuracy | ~50-100ms |
| Cross-encoder (MiniLM) | +3-5% accuracy | ~30-50ms |
| ColBERT (late interaction) | +5-8% accuracy | ~50-80ms |

### 4.5 Stage 5: LLM Reasoning & Generation

**Goal:** Generate a natural, accurate answer grounded in retrieved context.

| Model | Context | Speed | Best For |
|-------|---------|-------|----------|
| `GPT-4o-mini` | 128K | Fast | Cost-effective production |
| `Llama 3.3 70B` (Groq) | 128K | Very fast | Low-latency cloud |
| `nemotron-3-nano-30b-a3b` | 1M | Medium | Long-context reasoning |
| `nemotron-nano-12b-v2-vl` | 128K | Medium | Multimodal (images in docs) |
| `Llama-3.2-1B-Instruct` | 128K | Fast | On-device generation |

**Prompt structure:**
```
System: You are a helpful assistant. Answer ONLY from the context below.
        If the answer is not in the context, say "I don't know."

Context: [retrieved chunk 1]
         [retrieved chunk 2]
         [retrieved chunk 3]

Question: [user's query]

Answer:
```

### 4.6 Stage 6: Safety & Guardrails

**Goal:** Filter unsafe content, detect PII, enforce compliance.

| Layer | Tool | What It Does |
|-------|------|--------------|
| Input filter | NeMo Guardrails / Safety model | Blocks harmful queries before RAG |
| Output filter | `llama-3.1-nemotron-safety-guard-8b-v3` | 23 PII categories, 20+ languages |
| PII detection | Presidio / Scrubbed | Redacts personal data |
| Colang rules | NVIDIA NeMo | Custom domain-specific rules |

### 4.7 Stage 7: Text-to-Speech (TTS)

**Goal:** Convert the LLM's text response to natural spoken audio.

| Engine | First Audio | Quality | Notes |
|--------|-------------|---------|-------|
| Picovoice Orca | 110ms | Good | On-device, streams raw LLM tokens |
| NVIDIA Riva TTS | 200ms | Very good | Cloud, neural voices |
| Edge TTS | 300ms | Good | Free, browser-based |
| ElevenLabs | 500ms | Excellent | Commercial, most natural |

**Streaming TTS pattern (Orca):**
```
LLM generates tokens: "Hello" → " world" → "!"
       │              │           │
       ▼              ▼           ▼
TTS speaks:  "Hello"  " world"  "!"
       │
       ▼
User hears response BEFORE generation completes
```

---

## 5. Architecture Patterns

### 5.1 Cascaded (Traditional)

```
Speech → ASR → Text → Embed → Retrieve → LLM → TTS → Speech
```

| Pros | Cons |
|------|------|
| Simple, modular | ASR errors propagate |
| Each component replaceable | High total latency |
| Easy to debug | Sum of all stage latencies |

### 5.2 End-to-End (Speech-to-Speech)

```
Speech → Audio Embedding → Retrieve → Speech LLM → Speech
```

| Pros | Cons |
|------|------|
| No ASR bottleneck | Harder to debug |
| Lower latency | Less flexible |
| Preserves prosody/tone | Requires specialized models |

### 5.3 Hybrid (NVIDIA ACE Agent)

```
Speech → ASR (streaming, interim transcripts)
         ↓
    Colang Dialog Manager
         ↓
    RAG Plugin (/rag/chat endpoint)
         ↓
    Streaming LLM Response
         ↓
    TTS (streaming, barge-in support)
```

| Feature | Benefit |
|---------|---------|
| Barge-in | User can interrupt bot mid-response |
| Interim transcript mode | RAG triggered on partial transcripts |
| Spurious transcript filter | Ignores false ASR outputs |
| Two-pass EOU | 240ms first pass, 800ms final pass |

### 5.4 On-Device (Picovoice)

```
Mic → Cheetah (STT) → picoLLM (embed + generate) → Orca (TTS) → Speaker
```

| Pros | Cons |
|------|------|
| 100% private — no data leaves device | Limited compute power |
| Works offline | Smaller models = lower quality |
| No API costs | Harder to update models |

### 5.5 Dual-Agent (VoiceAgentRAG)

```
┌─────────────────────────────────────────────────────┐
│  Slow Thinker (background)                          │
│  - Predicts 3-5 follow-up topics per turn           │
│  - Pre-fetches chunks into FAISS semantic cache     │
│  - Runs while user listens to current response      │
└─────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────┐
│  Semantic Cache (in-memory FAISS)                   │
│  - Sub-millisecond lookup                           │
│  - 75% hit rate (79% on warm turns)                 │
│  - 316x retrieval speedup (110ms → 0.35ms)        │
└─────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────┐
│  Fast Talker (foreground)                           │
│  - Check cache first (<1ms)                         │
│  - On hit: skip vector DB entirely                  │
│  - On miss: fall back to vector DB, cache results   │
└─────────────────────────────────────────────────────┘
```

---

## 6. Advanced RAG Variants

### 6.1 SpeechRAG (Direct Audio Retrieval — No ASR)

```
Audio Query → Speech Adapter (HuBERT + projection) → Text Embedding Space → Retrieve
                                                                              ↓
Audio Passages ← Speech Retriever ← Vector DB ← Audio Embeddings
```

- Bypasses ASR entirely — no transcription error propagation
- Speech adapter fine-tuned via cosine similarity loss from text embeddings
- Outperforms cascaded ASR→text RAG in high-WER scenarios

### 6.2 WavRAG (Unified Audio+Text)

```
Query (audio or text) → WavRetriever (Qwen2-Audio) → Unified Embedding Space → Hybrid KB
```

- Single embedding space for both audio and text
- Supports: text→audio, audio→text, audio→audio, multimodal→multimodal
- 10x faster than ASR-Text RAG pipelines

### 6.3 Multimodal RAG (Text + Images)

```
Document (text + images) → Multimodal embedding → Vector DB
                                              ↓
Query → Embed → Retrieve → Image description (VL model) → LLM → Answer
```

- `llama-nemotron-embed-vl-1b-v2` embeds text AND images in same space
- `nemotron-nano-12b-v2-vl` describes images in context for the LLM
- +6-7% retrieval accuracy from multimodal reranking

---

## 7. Latency Budget

| Stage | Target | Optimization |
|-------|--------|--------------|
| ASR (first pass) | 240ms | Interim transcripts |
| ASR (final) | 800ms | Beam LM + punctuation |
| Embedding | 50-200ms | Local embedding model |
| Vector DB query | 50-300ms | Semantic cache (<1ms on hit) |
| Reranking | 30-100ms | Lightweight cross-encoder |
| LLM first token | 200-500ms | Streaming, speculative decoding |
| TTS first token | 110-300ms | Stream raw LLM tokens |
| **Total (cache hit)** | **~500-800ms** | VoiceAgentRAG pattern |
| **Total (cache miss)** | **~1-2s** | Standard RAG |

---

## 8. Orchestration Frameworks

| Framework | Pattern | Best For |
|-----------|---------|----------|
| **LangGraph** | Directed graph, node-per-stage | Complex conditional logic |
| **NVIDIA ACE Agent** | Microservices + Colang | Production voice agents |
| **LlamaIndex** | RAG-specific abstractions | Document-heavy RAG |
| **LangChain** | Chain/callback system | Broad ecosystem, prototyping |
| **Custom asyncio** | Dual-agent (Slow + Fast) | Maximum latency control |

---

## 9. Key Design Decisions

| Decision | Options | Recommendation |
|----------|---------|----------------|
| ASR approach | Cloud vs on-device | Cloud for accuracy, on-device for privacy |
| Retrieval strategy | Standard vs predictive cache | Predictive cache for multi-turn voice |
| Audio handling | Cascaded (ASR→text) vs direct audio | Cascaded for flexibility, direct for latency |
| LLM hosting | API (Groq/OpenAI) vs local | API for speed, local for control |
| TTS streaming | Wait-for-full-text vs token-streaming | Token-streaming (Orca pattern) |
| Safety | Post-generation filter vs guardrails | Both — pre-filter input, post-filter output |
| Vector DB | FAISS vs Qdrant vs Pinecone | FAISS for cache, Qdrant for production scale |

---

## 10. Example Tech Stack Combinations

### 10.1 Cloud Voice Agent (NVIDIA Stack)
```
NVIDIA Riva ASR → llama-nemotron-embed-vl → Qdrant →
llama-nemotron-rerank → nemotron-3-nano-30b →
llama-3.1-nemotron-safety-guard → NVIDIA Riva TTS
```
**Best for:** Maximum quality, enterprise deployment

### 10.2 On-Device Voice Agent (Picovoice Stack)
```
Cheetah (STT) → EmbeddingGemma-300M → FAISS →
Llama-3.2-1B-Instruct → Orca (TTS)
```
**Best for:** Privacy, offline, zero API cost

### 10.3 Low-Latency Cloud (VoiceAgentRAG)
```
Whisper STT → text-embedding-3-small → FAISS semantic cache →
GPT-4o-mini → Edge TTS
```
**Best for:** Fastest response, cost-effective

### 10.4 Open-Source Full Stack
```
Whisper (STT) → all-MiniLM-L6-v2 → FAISS/Qdrant →
Llama 3.3 70B (Groq) → Edge TTS / Orca
```
**Best for:** Full control, no vendor lock-in

---

## 11. 3D Map Customization (MapLibre GL)

### 11.1 Overview

The admin panel includes a **3D map** for real-time collection tracking, built with MapLibre GL. It supports extruded buildings, terrain, multiple base styles, and a 2D/3D toggle.

### 11.2 Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Map engine | MapLibre GL JS v4.7 | Open-source map rendering (fork of Mapbox GL) |
| 3D buildings | `fill-extrusion` layer | Extrude building footprints with height |
| Terrain | Raster DEM (Terrarium) | Elevation data for 3D terrain |
| Base styles | OpenFreeMap, CARTO, Esri, OSM | Free, keyless vector/raster tiles |
| Markers | Canvas-rendered symbols | Collector locations with custom icons |
| Trails | GeoJSON line layers | Snail-tail tracking history |
| Framework | Vue 3 + Inertia.js | Reactive UI composables |

### 11.3 Architecture

```
┌─────────────────────────────────────────────────────┐
│  Vue 3 Component (CollectionTracking/Index.vue)      │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ useMap3D    │  │ useMapStyle  │  │ useMarkers │  │
│  │ composable  │  │ composable   │  │ composable │  │
│  └──────┬──────┘  └──────┬───────┘  └─────┬──────┘  │
│         │                │                │          │
│         ▼                ▼                ▼          │
│  ┌─────────────────────────────────────────────┐    │
│  │           MapLibre GL Map Instance           │    │
│  │                                              │    │
│  │  Base Style (raster or vector)               │    │
│  │  + 3D Buildings (fill-extrusion)            │    │
│  │  + Terrain (raster-dem)                     │    │
│  │  + Sky (v4+ only)                           │    │
│  │  + Markers (canvas symbols)                 │    │
│  │  + Trails (GeoJSON lines)                   │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### 11.4 Customization Options

| Feature | How to Customize | Code Location |
|---------|-----------------|---------------|
| Base map style | Switch between satellite, streets, dark, light, terrain, 3D vector | `useMap3D.getBaseStyle()` |
| Building height | Adjust `fill-extrusion-height` and `fill-extrusion-base` | `add3DEffects()` in `useMap3D.ts` |
| Terrain exaggeration | Set `exaggeration` value (0 = off, 1.2 = default) | `map.setTerrain({ exaggeration })` |
| Building opacity | Adjust `fill-extrusion-opacity` (0.0-1.0) | Layer paint properties |
| Sky color | Set `sky-color` and `horizon-color` | `map.setSky()` (v4+ only) |
| Camera pitch | 2D (0°) vs 3D (60-65°) | `map.easeTo({ pitch })` |
| Max pitch | Limit tilt (default 85°) | `new Map({ maxPitch: 85 })` |
| Marker icons | Custom canvas-rendered symbols | `updateCollectorMarkers()` |
| Trail styling | Line color, width, opacity | GeoJSON line layer paint |
| 2D/3D toggle | UI pill button + pitch animation | `is3D` ref + `easeTo()` |

### 11.5 Key Implementation Details

**3D Effects Helper (`useMap3D.ts`):**
```ts
export function add3DEffects(map: Map, opts?: { exaggeration?: number }): void {
  // 1. Terrain
  map.addSource('terrain-dem', {
    type: 'raster-dem',
    tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
    encoding: 'terrarium',
    tileSize: 256,
    maxzoom: 15
  })
  map.setTerrain({ source: 'terrain-dem', exaggeration: opts?.exaggeration ?? 0 })

  // 2. 3D Buildings
  map.addLayer({
    id: '3d-buildings',
    source: 'openmaptiles',
    'source-layer': 'building',
    type: 'fill-extrusion',
    minzoom: 14,
    paint: {
      'fill-extrusion-color': '#aab',
      'fill-extrusion-height': ['get', 'render_height'],
      'fill-extrusion-base': ['get', 'render_min_height'],
      'fill-extrusion-opacity': 0.6
    }
  })

  // 3. Sky (v4+)
  map.setSky({ 'sky-color': '#199EF3', 'horizon-color': '#ffffff' })
}
```

**2D/3D Toggle:**
```ts
function toggle3D() {
  is3D.value = !is3D.value
  if (is3D.value) {
    map.easeTo({ pitch: 65, bearing: -15, duration: 800 })
    map.setTerrain({ source: 'terrain-dem', exaggeration: 1.2 })
    map.setLayoutProperty('3d-buildings', 'visibility', 'visible')
  } else {
    map.easeTo({ pitch: 0, bearing: 0, duration: 800 })
    map.setTerrain(null)
    map.setLayoutProperty('3d-buildings', 'visibility', 'none')
  }
}
```

**Style Switching (preserves markers/trails):**
```ts
function switchMapStyle(styleKey: string) {
  map.setStyle(getBaseStyle(styleKey))
  map.once('style.load', () => {
    if (isVectorStyle(styleKey)) add3DEffects(map)
    updateCollectorMarkers()
    reAddTrails()
  })
}
```

### 11.6 Customization Guide

**To add a new base style:**
1. Add entry to `getBaseStyle()` in `useMap3D.ts`
2. If vector style, ensure it has a `building` source-layer
3. Add to style switcher UI in `Index.vue`

**To change building appearance:**
- Edit `fill-extrusion-color` (hex color)
- Edit `fill-extrusion-opacity` (0.0-1.0)
- Edit `minzoom` to control when buildings appear

**To enable/disable terrain:**
- Call `map.setTerrain({ source: 'terrain-dem', exaggeration: 1.2 })` to enable
- Call `map.setTerrain(null)` to disable

**To customize markers:**
- Modify canvas rendering in `updateCollectorMarkers()`
- Change symbol layer paint properties (color, size, opacity)

**To customize trails:**
- Modify GeoJSON line layer paint (color, width, dash pattern)
- Trail data comes from `/superadmin/tracking/trail/{id}` endpoint

### 11.7 Performance Considerations

| Concern | Mitigation |
|---------|------------|
| Terrain doubles tile requests | Default `exaggeration: 0` (buildings only), terrain opt-in |
| Style switch wipes custom layers | Always re-add via `style.load` event |
| Raster styles can't extrude | `add3DEffects` no-ops; UI disables 3D toggle |
| DEM CORS issues | Use AWS Terrarium (CORS-open, free) |
| v3→v4 breaking changes | `map.addImage` signature + CSS path changes |

---

## 12. Summary

| Aspect | Approach |
|--------|----------|
| **Problem** | LLMs hallucinate + can't access private data + speech adds latency |
| **Solution** | RAG grounds LLM in real documents; voice pipeline wraps it end-to-end |
| **Key tech** | ASR + Embeddings + Vector DB + Reranker + LLM + Safety + TTS |
| **Latency** | 500-800ms (cache hit) to 1-2s (cache miss) |
| **Innovation** | Predictive cache, two-pass ASR, streaming TTS, barge-in |
| **Deployment** | Cloud, on-device, or hybrid |
