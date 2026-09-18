<script lang="ts">
    import QRCode from 'qrcode';
    import { onMount } from 'svelte';
    import { FAQS, GLAZES, MUG_PRICE, PIN_SHAPES } from './catalog';

    const stageModule = import('./ProductStage.svelte');

    let {
        user = false,
        canRegister = true,
        loginUrl = '/login',
        registerUrl = '/register',
        dashboardUrl = '/dashboard',
    }: {
        user?: boolean;
        canRegister?: boolean;
        loginUrl?: string;
        registerUrl?: string;
        dashboardUrl?: string;
    } = $props();

    let menuOpen = $state(false);
    let stage: 'mug' | 'pin' = $state('mug');
    let glazeIdx = $state(0);
    let shapeIdx = $state(0);
    let openFaq: number | null = $state(0);

    const glaze = $derived(GLAZES[glazeIdx]);
    const pinShape = $derived(PIN_SHAPES[shapeIdx]);

    function scrollToStage() {
        document.getElementById('stage')?.scrollIntoView({ behavior: 'smooth' });
    }

    let qrCanvas: HTMLCanvasElement | undefined = $state();

    onMount(() => {
        if (qrCanvas) {
            QRCode.toCanvas(qrCanvas, window.location.origin, {
                width: 168,
                margin: 1,
                color: { dark: '#1A1C1E', light: '#ffffff' },
            }).catch(() => {});
        }
    });
</script>

<div id="home" class="landing min-h-screen overflow-x-clip bg-white text-[#1A1C1E]">
    <!-- Slim Apple-style nav -->
    <header class="sticky top-0 z-50 border-b border-black/[0.08] bg-white/80 backdrop-blur-xl">
        <nav class="mx-auto flex h-11 max-w-[1600px] items-center justify-between px-4 sm:px-8 lg:px-12">
            <a href="#home" aria-label="NUYDA ENTERPRISE home" class="opacity-80 transition hover:opacity-100">
                <svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M6 9V7a6 6 0 0 1 12 0v2" />
                    <rect x="4" y="9" width="16" height="11" rx="2" />
                </svg>
            </a>
            <div class="hidden items-center gap-8 text-xs font-normal text-[#1A1C1E]/80 md:flex">
                <a href={registerUrl} class="transition hover:text-[#1A1C1E]">Store</a>
                <a href="#stage" class="transition hover:text-[#1A1C1E]">Mug</a>
                <a href="#stage" class="transition hover:text-[#1A1C1E]">Pin</a>
                <a href="#collections" class="transition hover:text-[#1A1C1E]">Collections</a>
                <a href="#learn" class="transition hover:text-[#1A1C1E]">Learn</a>
                <a href="#faq" class="transition hover:text-[#1A1C1E]">Support</a>
            </div>
            <div class="flex items-center gap-5">
                <button aria-label="Search" class="opacity-80 transition hover:opacity-100">
                    <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
                        <circle cx="11" cy="11" r="7" />
                        <path d="M16.5 16.5 21 21" />
                    </svg>
                </button>
                <a href={user ? dashboardUrl : loginUrl} aria-label="Bag" class="opacity-80 transition hover:opacity-100">
                    <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
                        <path d="M6 8h12l-1 12H7L6 8z" />
                        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
                    </svg>
                </a>
                <button aria-label="Menu" onclick={() => (menuOpen = !menuOpen)} class="opacity-80 transition hover:opacity-100 md:hidden">
                    {#if menuOpen}
                        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
                            <path d="M6 6l12 12M18 6 6 18" />
                        </svg>
                    {:else}
                        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
                            <path d="M4 7h16M4 12h16M4 17h16" />
                        </svg>
                    {/if}
                </button>
            </div>
        </nav>
        {#if menuOpen}
            <div class="border-t border-black/[0.08] bg-white px-6 py-4 md:hidden">
                <div class="flex flex-col text-sm">
                    <a href={registerUrl} onclick={() => (menuOpen = false)} class="border-b border-black/5 py-3">Store</a>
                    <a href="#stage" onclick={() => (menuOpen = false)} class="border-b border-black/5 py-3">Mug</a>
                    <a href="#stage" onclick={() => (menuOpen = false)} class="border-b border-black/5 py-3">Pin</a>
                    <a href="#collections" onclick={() => (menuOpen = false)} class="border-b border-black/5 py-3">Collections</a>
                    <a href="#learn" onclick={() => (menuOpen = false)} class="border-b border-black/5 py-3">Learn</a>
                    <a href="#faq" onclick={() => (menuOpen = false)} class="py-3">Support</a>
                </div>
            </div>
        {/if}
    </header>

    <!-- Hero: mug + pin together in one 3D scene -->
    <section id="stage" class="bg-[#f5f5f7]">
        <div class="mx-auto max-w-[1600px] px-4 pt-8 pb-4 text-center sm:px-8 lg:px-12">
            <p class="text-xs font-semibold tracking-wide text-[#6e6e73]">NUYDA ENTERPRISE</p>
            <h1 class="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
                {stage === 'mug' ? 'Custom Mug.' : 'Button Pin.'}
            </h1>
            <p class="mt-2 text-[15px] text-[#1A1C1E]/80">
                {stage === 'mug' ? `${glaze.name} · 11oz ceramic` : `${pinShape.label} · ${pinShape.desc}`}
            </p>
            <p class="mt-1 text-sm text-[#6e6e73]">From {stage === 'mug' ? MUG_PRICE : pinShape.price}</p>
            <div class="mt-4 flex items-center justify-center gap-6 text-[15px]">
                {#if user}
                    <a href={dashboardUrl} class="rounded-full bg-[#0052CC] px-6 py-2.5 text-white transition hover:bg-[#003D9B]">
                        Customize
                    </a>
                {:else if canRegister}
                    <a href={registerUrl} class="rounded-full bg-[#0052CC] px-6 py-2.5 text-white transition hover:bg-[#003D9B]">
                        Customize
                    </a>
                {/if}
                <a href="#learn" class="text-[#007AFF] hover:underline">
                    Learn more
                    <svg viewBox="0 0 24 24" class="inline h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 6l6 6-6 6" />
                    </svg>
                </a>
            </div>
        </div>

        <div class="relative mx-auto max-w-[1600px] px-4 sm:px-8 lg:px-12">
            <div class="relative">
                <div class="relative h-[420px] sm:h-[480px] lg:h-[540px]">
                    {#await stageModule}
                        <div class="flex h-full items-center justify-center">
                            <div class="h-10 w-10 animate-pulse rounded-full bg-black/10"></div>
                        </div>
                    {:then { default: ProductStage }}
                        <ProductStage product={stage} glaze={glaze.hex} pinShape={pinShape.id} />
                    {/await}
                    <p class="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 text-xs whitespace-nowrap text-[#6e6e73]">
                        Drag to rotate · Flick to spin
                    </p>
                </div>

                <!-- Text-only product list: floating right rail on desktop -->
                <div class="mx-auto mt-8 w-full max-w-md lg:absolute lg:top-1/2 lg:right-0 lg:mt-0 lg:w-[300px] lg:max-w-none lg:-translate-y-1/2">
                    <p class="text-[11px] font-semibold tracking-[0.14em] text-[#6e6e73] uppercase">Products</p>
                    <div class="mt-1 border-t border-black/10">
                        <button
                            onclick={() => (stage = 'mug')}
                            class="group flex w-full items-center gap-4 border-b border-black/10 py-4 text-left"
                        >
                            <span class="w-6 text-xs text-[#6e6e73]">01</span>
                            <span class="flex-1">
                                <span
                                    class="block text-[21px] font-semibold tracking-tight transition {stage === 'mug'
                                        ? 'text-[#0052CC]'
                                        : 'group-hover:translate-x-1'}"
                                >
                                    Mug
                                </span>
                                <span class="block text-[13px] text-[#6e6e73]">From {MUG_PRICE} · 11oz ceramic</span>
                            </span>
                            <span class="rounded-full bg-[#0052CC]/10 px-2.5 py-1 text-[11px] font-semibold text-[#0052CC]">3D</span>
                        </button>
                        <button
                            onclick={() => (stage = 'pin')}
                            class="group flex w-full items-center gap-4 border-b border-black/10 py-4 text-left"
                        >
                            <span class="w-6 text-xs text-[#6e6e73]">02</span>
                            <span class="flex-1">
                                <span
                                    class="block text-[21px] font-semibold tracking-tight transition {stage === 'pin'
                                        ? 'text-[#0052CC]'
                                        : 'group-hover:translate-x-1'}"
                                >
                                    Button Pin
                                </span>
                                <span class="block text-[13px] text-[#6e6e73]">From ₱1.50 · 6 shapes</span>
                            </span>
                            <span class="rounded-full bg-[#0052CC]/10 px-2.5 py-1 text-[11px] font-semibold text-[#0052CC]">3D</span>
                        </button>
                        {#each [
                            { n: '03', name: 'T-Shirt', sub: 'From ₱349 · S–3XL' },
                            { n: '04', name: 'Stickers', sub: 'From ₱49 · Waterproof' },
                            { n: '05', name: 'Tote Bag', sub: 'From ₱199 · 12oz canvas' },
                            { n: '06', name: 'Calendar', sub: 'Custom text · Made to order' },
                        ] as p}
                            <a
                                href={registerUrl}
                                class="group flex w-full items-center gap-4 border-b border-black/10 py-4 text-left"
                            >
                                <span class="w-6 text-xs text-[#6e6e73]">{p.n}</span>
                                <span class="flex-1">
                                    <span class="block text-[21px] font-semibold tracking-tight transition group-hover:translate-x-1">
                                        {p.name}
                                    </span>
                                    <span class="block text-[13px] text-[#6e6e73]">{p.sub}</span>
                                </span>
                                <span class="text-lg text-[#6e6e73] transition group-hover:translate-x-1 group-hover:text-[#0052CC]">›</span>
                            </a>
                        {/each}
                    </div>

                    <!-- Contextual options for the live piece -->
                    {#if stage === 'mug'}
                        <div class="mt-5 flex items-center gap-2.5">
                            {#each GLAZES as g, i}
                                <button
                                    onclick={() => (glazeIdx = i)}
                                    title={g.name}
                                    aria-label={g.name}
                                    class="h-7 w-7 rounded-full border transition {i === glazeIdx
                                        ? 'border-[#0052CC] ring-2 ring-[#0052CC]/30'
                                        : 'border-black/15 hover:border-black/40'}"
                                    style="background-color: {g.hex}"
                                ></button>
                            {/each}
                            <span class="ml-1 text-xs text-[#6e6e73]">{glaze.name}</span>
                        </div>
                    {:else}
                        <div class="mt-5 flex flex-wrap gap-2">
                            {#each PIN_SHAPES as s, i}
                                <button
                                    onclick={() => (shapeIdx = i)}
                                    class="rounded-full px-3.5 py-1.5 text-xs font-medium transition {i === shapeIdx
                                        ? 'bg-[#1A1C1E] text-white'
                                        : 'bg-black/[0.06] hover:bg-black/10'}"
                                >
                                    {s.label}
                                </button>
                            {/each}
                        </div>
                    {/if}
                </div>
            </div>

            <div class="flex items-center justify-center gap-8 pt-1 text-[13px] text-[#1A1C1E]/80">
                {#if user}
                    <a href={dashboardUrl} class="transition hover:text-[#1A1C1E]">▸ Customize these pieces</a>
                {:else if canRegister}
                    <a href={registerUrl} class="transition hover:text-[#1A1C1E]">▸ Customize these pieces</a>
                {/if}
                <a href="#collections" class="transition hover:text-[#1A1C1E]">▸ Compare all products</a>
            </div>

            <div class="flex items-center justify-center gap-2 pt-3 pb-8">
                {#if stage === 'mug'}
                    {#each GLAZES as _, i}
                        <button
                            aria-label={`Glaze ${i + 1}`}
                            onclick={() => (glazeIdx = i)}
                            class="h-2 w-2 rounded-full transition {i === glazeIdx ? 'bg-[#1A1C1E]' : 'bg-black/15 hover:bg-black/30'}"
                        ></button>
                    {/each}
                {:else}
                    {#each PIN_SHAPES as _, i}
                        <button
                            aria-label={`Shape ${i + 1}`}
                            onclick={() => (shapeIdx = i)}
                            class="h-2 w-2 rounded-full transition {i === shapeIdx ? 'bg-[#1A1C1E]' : 'bg-black/15 hover:bg-black/30'}"
                        ></button>
                    {/each}
                    {/if}
                </div>

                <!-- Get-the-app panel: floating left rail on desktop -->
                <div class="mx-auto mt-8 w-full max-w-md lg:absolute lg:top-1/2 lg:left-0 lg:mt-0 lg:w-[220px] lg:max-w-none lg:-translate-y-1/2">
                    <p class="text-[11px] font-semibold tracking-[0.14em] text-[#6e6e73] uppercase">Get the app</p>
                    <div class="mt-2 border-t border-black/10 pt-4">
                        <canvas bind:this={qrCanvas} class="h-36 w-36 rounded-2xl border border-black/10 bg-white p-2 shadow-sm"></canvas>
                        <p class="mt-2 text-xs text-[#6e6e73]">Scan with your phone camera to open this shop on mobile.</p>
                        <div class="mt-4 flex flex-col gap-2">
                            <a
                                href={registerUrl}
                                class="flex items-center gap-3 rounded-xl bg-[#1A1C1E] px-4 py-2.5 text-white transition hover:bg-black"
                            >
                                <svg viewBox="0 0 384 512" class="h-6 w-6 shrink-0" fill="currentColor">
                                    <path
                                        d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"
                                    />
                                </svg>
                                <span>
                                    <span class="block text-[10px] leading-tight opacity-70">Download on the</span>
                                    <span class="block text-[15px] leading-tight font-semibold">App Store</span>
                                </span>
                            </a>
                            <a
                                href={registerUrl}
                                class="flex items-center gap-3 rounded-xl bg-[#1A1C1E] px-4 py-2.5 text-white transition hover:bg-black"
                            >
                                <svg viewBox="0 0 24 24" class="h-6 w-6 shrink-0" fill="currentColor">
                                    <path d="M4 3.5v17c0 .5.5.8 1 .6l9.3-8.1c.3-.3.3-.7 0-1L5 3.9c-.5-.3-1 0-1 .6z" />
                                    <path d="M16.5 10.2 18.5 12l-2 1.8 3.1 1.8c.5.3 1.1-.1 1.1-.7V9.1c0-.6-.6-1-1.1-.7l-3.1 1.8z" opacity=".7" />
                                </svg>
                                <span>
                                    <span class="block text-[10px] leading-tight opacity-70">Get it on</span>
                                    <span class="block text-[15px] leading-tight font-semibold">Google Play</span>
                                </span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
    </section>

    <!-- Learn grid -->
    <section id="learn" class="bg-white">
        <div class="mx-auto max-w-[1600px] px-4 py-16 sm:px-8 lg:px-12">
            <h2 class="text-center text-[28px] font-semibold sm:text-[32px]">
                Learn about <span class="font-normal text-[#6e6e73]">{stage === 'mug' ? 'Custom Mug' : 'Button Pin'}</span>
            </h2>
            <div class="mx-auto mt-10 grid max-w-6xl gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
                {#each [
                    { title: '3D Preview', desc: 'Mug and pin spin together — every angle before you pay.' },
                    { title: 'Glaze Colors', desc: 'Five ceramic finishes, live on the model.' },
                    { title: 'Pin Shapes', desc: 'Six die-cut shapes with metal rim and pin back.' },
                    { title: 'Print Area', desc: 'Full-wrap mug artwork, edge-to-edge pin faces.' },
                    { title: 'Quality', desc: 'Dishwasher-safe gloss. Reprint guarantee included.' },
                    { title: 'Delivery', desc: 'Montalban same-day, nationwide in 2–4 days.' },
                ] as t}
                    <div class="border-t border-black/10 py-6">
                        <h3 class="text-[15px] font-semibold tracking-wide uppercase">{t.title}</h3>
                        <p class="mt-1 text-sm text-[#6e6e73]">{t.desc}</p>
                    </div>
                {/each}
            </div>
        </div>
    </section>

    <!-- All products, one page -->
    <section id="collections" class="bg-white pb-20">
        <div class="mx-auto max-w-[1600px] px-4 sm:px-8 lg:px-12">
            <h2 class="text-center text-[28px] font-semibold sm:text-[32px]">
                Find your style <span class="font-normal text-[#6e6e73]">in six collections.</span>
            </h2>
            <div class="mx-auto mt-10 grid max-w-6xl gap-6 sm:grid-cols-2 md:grid-cols-3">
                <button onclick={scrollToStage} class="group rounded-3xl bg-[#f5f5f7] p-8 text-center transition hover:shadow-xl">
                    <svg viewBox="0 0 24 24" class="mx-auto h-16 w-16 text-[#1A1C1E]" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M5 9h11v9a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9z" />
                        <path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16" />
                    </svg>
                    <h3 class="mt-5 text-xl font-semibold">Mug</h3>
                    <p class="mt-1 text-sm text-[#6e6e73]">From {MUG_PRICE} · 5 glazes · 3D</p>
                    <span class="mt-3 inline-block text-sm text-[#007AFF] group-hover:underline">Explore ›</span>
                </button>
                <button onclick={scrollToStage} class="group rounded-3xl bg-[#f5f5f7] p-8 text-center transition hover:shadow-xl">
                    <svg viewBox="0 0 24 24" class="mx-auto h-16 w-16 text-[#1A1C1E]" fill="none" stroke="currentColor" stroke-width="1">
                        <circle cx="12" cy="10" r="6" />
                        <circle cx="12" cy="10" r="1.5" />
                        <path d="M12 16v4" />
                    </svg>
                    <h3 class="mt-5 text-xl font-semibold">Pin</h3>
                    <p class="mt-1 text-sm text-[#6e6e73]">From ₱1.50 · 6 shapes · 3D</p>
                    <span class="mt-3 inline-block text-sm text-[#007AFF] group-hover:underline">Explore ›</span>
                </button>
                <a href={registerUrl} class="group rounded-3xl bg-[#f5f5f7] p-8 text-center transition hover:shadow-xl">
                    <svg viewBox="0 0 24 24" class="mx-auto h-16 w-16 text-[#1A1C1E]" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M9 4 4 7l-2 5 3 1 1-2v9h12v-9l1 2 3-1-2-5-5-3a3 3 0 0 1-6 0z" />
                    </svg>
                    <h3 class="mt-5 text-xl font-semibold">Shirt</h3>
                    <p class="mt-1 text-sm text-[#6e6e73]">From ₱349 · S–3XL</p>
                    <span class="mt-3 inline-block text-sm text-[#007AFF] group-hover:underline">Shop all ›</span>
                </a>
                <a href={registerUrl} class="group rounded-3xl bg-[#f5f5f7] p-8 text-center transition hover:shadow-xl">
                    <svg viewBox="0 0 24 24" class="mx-auto h-16 w-16 text-[#1A1C1E]" fill="none" stroke="currentColor" stroke-width="1">
                        <rect x="6" y="4" width="12" height="16" rx="2" />
                        <path d="M9 9h6M9 13h6" />
                    </svg>
                    <h3 class="mt-5 text-xl font-semibold">Stickers</h3>
                    <p class="mt-1 text-sm text-[#6e6e73]">From ₱49 · Waterproof</p>
                    <span class="mt-3 inline-block text-sm text-[#007AFF] group-hover:underline">Shop all ›</span>
                </a>
                <a href={registerUrl} class="group rounded-3xl bg-[#f5f5f7] p-8 text-center transition hover:shadow-xl">
                    <svg viewBox="0 0 24 24" class="mx-auto h-16 w-16 text-[#1A1C1E]" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M6 9h12l-1 11H7L6 9z" />
                        <path d="M9 9V7a3 3 0 0 1 6 0v2" />
                    </svg>
                    <h3 class="mt-5 text-xl font-semibold">Tote</h3>
                    <p class="mt-1 text-sm text-[#6e6e73]">From ₱199 · 12oz canvas</p>
                    <span class="mt-3 inline-block text-sm text-[#007AFF] group-hover:underline">Shop all ›</span>
                </a>
                <a href={registerUrl} class="group rounded-3xl bg-[#f5f5f7] p-8 text-center transition hover:shadow-xl">
                    <svg viewBox="0 0 24 24" class="mx-auto h-16 w-16 text-[#1A1C1E]" fill="none" stroke="currentColor" stroke-width="1">
                        <rect x="5" y="6" width="14" height="14" rx="2" />
                        <path d="M5 10.5h14M9 3.5V7M15 3.5V7" />
                    </svg>
                    <h3 class="mt-5 text-xl font-semibold">Calendar</h3>
                    <p class="mt-1 text-sm text-[#6e6e73]">From ₱249 · 12-month</p>
                    <span class="mt-3 inline-block text-sm text-[#007AFF] group-hover:underline">Shop all ›</span>
                </a>
            </div>
        </div>
    </section>

    <!-- FAQ -->
    <section id="faq" class="bg-white pb-20">
        <div class="mx-auto max-w-3xl px-4 sm:px-8">
            <h2 class="text-center text-[28px] font-semibold">Questions, answered.</h2>
            <div class="mt-8 divide-y divide-black/10 border-y border-black/10">
                {#each FAQS as f, i}
                    <div>
                        <button
                            onclick={() => (openFaq = openFaq === i ? null : i)}
                            class="flex w-full items-center justify-between gap-4 py-5 text-left text-[15px] font-medium"
                        >
                            {f.q}
                            <svg
                                viewBox="0 0 24 24"
                                class="h-4 w-4 shrink-0 text-[#6e6e73] transition {openFaq === i ? 'rotate-180' : ''}"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                            >
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </button>
                        {#if openFaq === i}
                            <p class="pb-5 text-sm leading-relaxed text-[#6e6e73]">{f.a}</p>
                        {/if}
                    </div>
                {/each}
            </div>
            <div class="mt-10 rounded-3xl bg-gradient-to-br from-[#0052CC] to-[#003D9B] p-10 text-center text-white">
                <h3 class="text-2xl font-semibold">Ready to create something custom?</h3>
                <p class="mx-auto mt-2 max-w-md text-sm text-white/75">Design your first products in interactive 3D today.</p>
                <div class="mt-6">
                    {#if user}
                        <a href={dashboardUrl} class="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-[#003D9B]">
                            Go to Dashboard
                        </a>
                    {:else if canRegister}
                        <a href={registerUrl} class="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-[#003D9B]">
                            Create free account
                        </a>
                    {/if}
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="bg-[#f5f5f7] text-xs text-[#6e6e73]">
        <div class="mx-auto max-w-[1600px] px-4 py-10 sm:px-8 lg:px-12">
            <p class="border-b border-black/10 pb-4">
                Shop the NUYDA ENTERPRISE online store, visit our Montalban branch, or order in the mobile app.
            </p>
            <div class="grid gap-8 py-6 sm:grid-cols-3">
                <div>
                    <h4 class="font-semibold text-[#1A1C1E]">Shop</h4>
                    <ul class="mt-2 space-y-1.5">
                        <li><a href="#stage" class="hover:underline">Custom Mug</a></li>
                        <li><a href="#stage" class="hover:underline">Button Pin</a></li>
                        <li><a href="#collections" class="hover:underline">Collections</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="font-semibold text-[#1A1C1E]">Company</h4>
                    <ul class="mt-2 space-y-1.5">
                        <li><a href="#learn" class="hover:underline">Learn</a></li>
                        <li><a href="#faq" class="hover:underline">Support</a></li>
                        <li><a href="#home" class="hover:underline">Contact</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="font-semibold text-[#1A1C1E]">Account</h4>
                    <ul class="mt-2 space-y-1.5">
                        {#if user}
                            <li><a href={dashboardUrl} class="hover:underline">Dashboard</a></li>
                        {:else}
                            <li><a href={loginUrl} class="hover:underline">Sign in</a></li>
                            {#if canRegister}
                                <li><a href={registerUrl} class="hover:underline">Create account</a></li>
                            {/if}
                        {/if}
                    </ul>
                </div>
            </div>
            <div class="flex flex-col gap-2 border-t border-black/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p>© 2026 NUYDA ENTERPRISE · Montalban, Rizal. All rights reserved.</p>
                <p class="flex gap-3">
                    <a href="#home" class="hover:underline">Terms of Use</a>
                    <span>|</span>
                    <a href="#home" class="hover:underline">Privacy Policy</a>
                </p>
            </div>
        </div>
    </footer>
</div>
