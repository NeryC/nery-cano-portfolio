# Blog Post Structure — Nery Cano Portfolio

This is the canonical structure for every post under `blog/`. It's derived from `talk-to-my-portfolio.html` (the MCP post), which is the reference implementation. New posts and rewrites of existing ones MUST follow this spec.

The goal: every post reads like the same author, on the same site, with the same rhythm. Visual consistency + narrative consistency = a recognizable publication, not a Medium-feed.

---

## 1 · File and asset conventions

| Item | Rule |
|---|---|
| Filename | `kebab-case-slug.html`. Match the URL slug used in `og:url`. |
| Banner | One SVG in the blog folder named `post_N_<slug>_banner.svg` (where N = post order). Viewport `0 0 1200 630`. Export a parallel PNG (`post_N_<slug>_banner.png`, 2400×1260 retina) for use in social previews where SVG isn't supported. |
| Inline SVG figures | Embedded directly in the HTML (no external file). Wrap in `<div class="figure">…<p class="figure-caption">…</p></div>`. ViewBox is whatever fits the diagram; height ~300–360 for landscape diagrams. |
| Hero font stack | Inter (UI / headings), Source Serif 4 (body), JetBrains Mono (code, labels, metadata). Always load via Google Fonts CDN with `display=swap`. |
| Syntax highlighting | Prism `prism-tomorrow` theme + autoloader, loaded from cdnjs. Same two `<script>` tags in every post's `<body>` close. |

---

## 2 · Required `<head>` meta tags

Every post `<head>` MUST contain:

```html
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{Title} — Nery Cano</title>
<meta name="description" content="{One-sentence summary, ≤155 chars}" />
<meta name="author" content="Nery Alberto Cano Ortigoza" />

<!-- Open Graph -->
<meta property="og:type" content="article" />
<meta property="og:title" content="{Title} — Nery Cano" />
<meta property="og:description" content="{Same as description}" />
<meta property="og:image" content="https://neryc.github.io/nery-cano-portfolio/blog/{banner}.png" />
<meta property="og:url" content="https://neryc.github.io/nery-cano-portfolio/blog/{slug}.html" />
<meta property="article:published_time" content="YYYY-MM-DD" />
<meta property="article:tag" content="{TagOne}" />
<meta property="article:tag" content="{TagTwo}" />
<!-- 2–5 article:tag entries -->

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{Title}" />
<meta name="twitter:description" content="{Same as description}" />
<meta name="twitter:image" content="https://neryc.github.io/nery-cano-portfolio/blog/{banner}.png" />

<!-- Fixed -->
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%E2%9A%A1%3C/text%3E%3C/svg%3E" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Source+Serif+4:wght@400;600;700&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css" />
```

The OG image MUST be the PNG export of the banner (LinkedIn / Twitter cards don't render SVG reliably).

---

## 3 · The CSS block

Every post embeds the same `<style>` block (~220 lines). Copy it verbatim from any existing post. The CSS defines:

- A dark palette with named CSS custom properties (`--accent`, `--accent-glow`, `--bg-deep`, etc.)
- Typography: 19px Source Serif 4 body, 44px Inter ExtraBold H1, 26px H2, 21px H3
- Reading column: `max-width: 760px`, centered, 24px gutters
- **Wide layout + fluid type (≥1240px viewport).** Do NOT widen the column at a fixed font size: the reading column is already at ~91 characters per line at 19px, which is the ceiling. Instead, **scale the type with the viewport** so the column grows in proportion and the measure stays between 91 and 96 characters. Four steps: `20px/920px`, `21.5px/1000px`, `23px/1090px`, `25px/1200px` at `1240 / 1600 / 2000 / 2400px`. Everything inside `.article` is sized in `em` so it follows (metadata, captions, callouts, bug-rows, code). Only grid-based `.figure` blocks, `<pre>` and `<table>` **full-bleed**, and only to **1.3× the column** (`1200 → 1580px`, capped at `94vw`): wider than that and the block visually detaches from the text it belongs to. The **banner does NOT bleed** — it sits directly under the byline and a 700px width jump between them reads as broken. Figures whose only child is an `<svg>` do NOT bleed either: a fixed `viewBox` just scales the diagram without adding information (`.figure:has(> svg)` opts out). Below 1240px nothing changes. Never center prose children with `margin-left:auto`: element-qualified rules like `h1.article-title{margin:...}` outrank `.article > *` and the layout desyncs.
- Code blocks: `#1a1f2e` background, glow-cyan inline tokens with subtle border
- Responsive: at `max-width: 600px`, H1 drops to 32px, body to 17px
- Component classes for figures, callouts, bug-rows, tag pills, footer CTA

When adding NEW components, append to the existing style block — don't fragment the styling into multiple `<style>` tags or external sheets.

---

## 4 · Canonical body skeleton

```html
<body>
  <nav class="header-nav">
    <a href="../">← Portfolio</a>
    <a href="./">All writing</a>
  </nav>

  <article class="article">
    <!-- A · TOP MATTER -->
    <div class="article-meta">{Date} · {N} min read</div>
    <h1 class="article-title">{Title}</h1>
    <p class="article-subtitle">{Lede in one sentence — italic deck under the headline.}</p>
    <div class="byline">
      <div>
        <div class="byline-name">Nery Cano</div>
        <div class="byline-meta">Senior Full-Stack Engineer · AI/LLM Systems · github.com/NeryC</div>
      </div>
    </div>
    <img class="banner-img" src="{banner}.png" alt="{Title}" />

    <!-- B · ARTICLE BODY -->
    <div class="article-body">
      <!-- See section 5 for the canonical order of sections inside .article-body -->
    </div>

    <!-- C · CLOSING MATTER -->
    <div class="tag-pills">
      <span class="tag-pill">{Tag 1}</span>
      <span class="tag-pill">{Tag 2}</span>
      <!-- 3–6 tag-pill entries; should match the article:tag meta -->
    </div>

    <div class="footer-cta">
      <h3>About this project</h3>
      <p>The full source code, README, and live demo:</p>
      <div class="links">
        <a href="{github_url}">💻 {github_slug} ↗</a>
        <a href="{live_demo_url}">🔗 Live demo ↗</a>
        <!-- Optional: MCP endpoint, API doc, etc. -->
      </div>
      <h3 style="margin-top:24px;">About the author</h3>
      <p>I'm Nery Cano, a senior full-stack engineer based in Paraguay, building production AI systems on Anthropic Claude + Next.js + Vercel AI SDK v6. Open to remote senior / staff / AI engineering roles.</p>
      <div class="links">
        <a href="../">Portfolio ↗</a>
        <a href="https://github.com/NeryC">GitHub ↗</a>
        <a href="https://www.linkedin.com/in/nery-cano-dev/">LinkedIn ↗</a>
        <a href="mailto:nalbertoc132@gmail.com">Email ↗</a>
      </div>
    </div>
  </article>

  <footer class="site-footer">
    © 2026 Nery Cano · Built with Next.js in mind · Shipped as plain HTML because it's 200ms faster
  </footer>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
</body>
```

Always include `<nav class="header-nav">` at the top and `<footer class="site-footer">` at the bottom. Always include the Prism `<script>` tags right before `</body>` so code highlighting works.

---

## 5 · Canonical article-body section order

The body of every technical post moves through the same arc. Skip a section if it genuinely doesn't apply, but never reorder them.

| # | Section | Purpose | Heading style |
|---|---|---|---|
| 1 | **Lede paragraph** | One italic `<em>` paragraph restating the deck. Same as the subtitle, lightly rephrased. | No heading |
| 2 | **Hook** | 2–4 short paragraphs setting up the problem. Concrete, ideally with a snippet of code or an error message. End with a line that promises a payoff. | No heading |
| 3 | **Quick links** | A single paragraph with `🔗 **github.com/NeryC/repo**` · live demo · any other canonical URL. Use this twice — once at top of body, once near the very end. | No heading |
| 4 | `<hr />` separator | | |
| 5 | **TL;DR / "What it is, in one paragraph"** | One paragraph summarizing the whole project for readers who'll bounce in 10 seconds. | `<h2>What it is, in one paragraph</h2>` (or a similar phrasing — see "voice" below) |
| 6 | **Architecture figure** | Inline SVG diagram showing how the components fit together. ALWAYS include a `<p class="figure-caption">Figure 1 · <strong>Big picture.</strong> {one-sentence explanation}</p>`. | — |
| 7 | **Background / "What is X and why"** | If the project uses a non-obvious technology (MCP, RAG, SSE, ToolLoopAgent…), spend 2–4 paragraphs explaining the concept before the implementation. Add a second figure (Figure 2 · {Concept handshake/flow}) if helpful. | `<h2>What's {X}, and why use it for this?</h2>` |
| 8 | **Deep implementation sections** | One H2 per major architectural layer. Mix prose, code blocks, and inline `<code>` references. Include a `<div class="callout">` highlighting any reusable PATTERN that came out of this section. | `<h2>The {component}: {one-line scope}</h2>` |
| 9 | **Postmortem section** ("The X bugs that broke production" / "The X decisions I'd defend in any review" / "The X surprises") | Use `bug-row` structured entries when the post has a postmortem story. Otherwise an H2 + numbered list of decisions. | `<h2>The {N} bugs that broke production</h2>` or similar |
| 10 | **Callout: Takeaway** | A `<div class="callout">` after the postmortem with a one-paragraph generalized lesson. | — |
| 11 | **UX polish / Tests / Data layer / CI** (optional) | Smaller H2 sections for the "and here's how the rest of it works" material. Use when the project is large enough to warrant them. | `<h2>{Topic}</h2>` |
| 12 | **What I'd do differently** | Ordered list (`<ol>`) of 2–3 things. Be honest. Each item one short paragraph. | `<h2>What I'd do differently</h2>` |
| 13 | **The pattern, generalized** | A few paragraphs answering "if someone else has a different problem, when does this pattern apply?" End with the final quick-links block (mirrors section 3). | `<h2>The pattern, generalized</h2>` |

Use `<hr />` separators between top-level groups. The reference post uses them between: hook ↔ TL;DR, TL;DR ↔ MCP background, background ↔ implementation, implementation ↔ postmortem, postmortem ↔ closing.

---

## 6 · Component reference

### `<div class="figure">…<p class="figure-caption">…</p></div>`

Inline SVG (preferred) or raster image, with a caption underneath.

- Caption format: **`Figure N · <strong>{Short title}.</strong> {Explanation in one sentence.}`** Always numbered. Bold the short title. Italics are reserved for `<em>` emphasis inside the explanation.
- SVG conventions: use the existing palette tokens (`#7DD3FC`, `#2E75B6`, `#94A3B8`, `#F1F5F9`) and the same font stack as the rest of the page. Background of figure cards: `linear-gradient(#122845, #0E1F3A)` with `rgba(148,163,184,0.3)` stroke.

### Animated figures

Animate a figure only when the idea **is** a motion: a loop, a sequence, a before/after, a thing that flows. Never animate decoration. A static diagram that explains the point is better than a moving one that distracts from it.

Rules:

- **SMIL or CSS inside the inline `<svg>`.** No JS, no libraries. The posts ship as static HTML.
- **Loop slowly.** 3-6 second cycles. Anything faster pulls the eye off the prose.
- **The figure must read correctly frozen.** If a reader screenshots it, or `prefers-reduced-motion` kills the animation, the diagram still has to make its point. Test by deleting the `<animate>` tags.
- **Always honor reduced motion.** Wrap every animation:

```css
@media (prefers-reduced-motion: reduce) {
  .figure svg * { animation: none !important; }
  .figure svg animate,
  .figure svg animateMotion,
  .figure svg animateTransform { display: none; }
}
```

- **One animated figure per two static ones**, roughly. A post where everything moves is a post nobody reads.

Good candidates: a control loop with a token traveling the path; a sequence that reveals stages in order; a counter that ticks from the before-number to the after-number; a diff that crossfades. Bad candidates: pulsing borders, floating icons, anything that loops under a paragraph the reader is still reading.

Caption an animated figure the same way as a static one, and say what moves: `Figure 3 · **The steering loop.** The sensor's output travels back into the agent's context — watch the token.`

### `<div class="callout"><div class="callout-label">Label</div><p>…</p></div>`

Use callouts sparingly — once or twice per post — to spotlight a reusable insight or warning.

- Common labels: `Pattern`, `Takeaway`, `Warning`, `Pattern · Sampling` (multi-part labels join with `·`).
- The body is 1 paragraph, maximum 3 sentences.

Required CSS (copy verbatim from `talk-to-my-portfolio.html`):

```css
.callout {
  margin: 32px 0;
  padding: 18px 22px;
  border-radius: 10px;
  background: rgba(46,117,182,0.10);
  border: 1px solid rgba(46,117,182,0.30);
  border-left: 3px solid var(--accent-glow);
}
.callout-label {
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--accent-glow);
  margin-bottom: 6px;
}
.callout p { margin: 6px 0; font-size: 17px; color: var(--text); }
```

### `<div class="bug-row">…</div>`

For postmortem-style structured failures (or "decisions" / "edge cases" / "surprises" — repurpose the row for any list-of-named-items pattern).

```html
<div class="bug-row">
  <div class="bug-num">BUG 1</div>
  <div>
    <div class="bug-title"><code>ERROR_NAME</code>: short headline</div>
    <div class="bug-desc">2–4 sentences explaining the problem and the fix. Use inline <code>code</code> liberally.</div>
  </div>
</div>
```

Required CSS (copy verbatim from `talk-to-my-portfolio.html`):

```css
.bug-row {
  display: flex;
  gap: 14px;
  align-items: baseline;
  padding: 16px 0;
  border-bottom: 1px solid var(--border);
}
.bug-num {
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  letter-spacing: 2px;
  color: var(--accent-glow);
  flex-shrink: 0;
  width: 48px;
}
.bug-title { color: var(--text-strong); font-weight: 600; font-family: "Inter", system-ui, sans-serif; font-size: 17px; }
.bug-desc { color: var(--muted); font-size: 16px; line-height: 1.55; margin-top: 4px; }
```

And the figure styles:

```css
.figure {
  margin: 40px -8px;
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(18,40,69,0.45), rgba(14,31,58,0.35));
}
.figure svg { display: block; width: 100%; height: auto; }
.figure-caption {
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  color: var(--muted);
  margin-top: 18px;
  text-align: center;
}
.figure-caption strong {
  color: var(--accent-glow);
  letter-spacing: 1.4px;
}
```

Add to the mobile `@media (max-width: 600px)` block:

```css
.figure { margin: 32px -8px; padding: 16px; }
```

Followed by a fenced code block showing the fix (when applicable).

### Code blocks

- Use `<pre><code class="language-{lang}">…</code></pre>`. Prism's autoloader picks up the language automatically. Common languages: `ts`, `tsx`, `typescript`, `bash`, `json`, `sql`.
- For BEFORE/AFTER diffs inside a bug-row, use two consecutive `<pre>` blocks rather than one combined diff.
- Keep blocks under ~25 lines. If longer, split with a sentence in between.

### Quick-links line

```html
<p>🔗 <strong>github.com/NeryC/repo-name</strong> · <a href="{live_url}">live demo</a> · <a href="{optional_extra}">{extra label}</a></p>
```

Use exactly this format. It appears twice per post: after the hook (before the first `<hr />`) and right before the closing `</div>` of `article-body`.

---

## 7 · Voice and tone

The author voice is: **senior engineer writing for other senior engineers in a working notebook**. Specifically:

- **First-person, past tense for narrative; present tense for explanation.** "I shipped X. The pattern that emerged is Y." Not "I will ship X" or "We shipped X."
- **Concrete > abstract.** Always name the file, the function, the SDK version, the actual error. Replace "a library" with `pdfjs-dist`. Replace "a serverless platform" with "Vercel Hobby plan with a 10s function cap."
- **Numbers in headlines.** "9 tools, 4 resources, 3 prompts" beats "many tools and resources." "The six bugs that broke production" beats "Some production issues."
- **No emoji as decoration.** Use them only as anchors: 🔗 for link blocks, sometimes 💡 inside a callout, ❌/✅ if comparing. Never in headings or prose.
- **Em-dashes (`—`): at most one per 1,000 words.** They read as an AI tell when they stack up. Prefer a comma, a period, parentheses, or two sentences. Count them before publishing (`grep -o "—" post.html | wc -l`). This rule supersedes earlier drafts of this spec, which encouraged them; the posts written under that guidance ran 10x over budget.
- **Inline `<code>` for everything that's a literal symbol** in the codebase: function names, types, error messages, URL paths, env var names, npm packages.
- **Italics** (`<em>`) for emphasis on a regular word, and for the opening lede. Not for code or technical names.
- **Headings end without punctuation** unless they're a question or an embedded code reference.
- **Avoid AI-blogspeak:** no "delve into," no "in today's fast-paced world," no "let's explore." No emoji-bulleted lists at the top of a section. No "Conclusion" heading; use "What I learned" or "What I'd do differently."
- **No negative parallelism.** "It's not X, it's Y" and "The problem was never X. It was Y" are the single most recognizable LLM sentence shape. State the positive claim directly.
- **No hollow intensifiers.** Cut `genuinely`, `truly`, `really`, `actually`, `literally`, and their Spanish equivalents (`de verdad`, `realmente`, `literalmente`). If the fact needs an intensifier, the fact is too weak.
- **Bold sparingly.** One bolded phrase per major section, or none. If it deserves bold, restructure the sentence to lead with it.
- **Watch the structural tics:** "That's the whole thing," "This is where it gets interesting," "the one that mattered," "what changed is." One per post, maximum. They are voice when rare and filler when repeated.
- **Vary the rhythm.** Uniform paragraph length and 15-25 word sentences everywhere is a detector signal. Mix short with long. Fragments are allowed.
- **British vs American spelling:** American (`color`, `optimize`, `behavior`).

### Sensor, not vibes

Before publishing, run the deterministic detector from the `avoid-ai-writing` skill against the post's prose:

```bash
node ~/.claude/skills/avoid-ai-writing/detector/patterns.js   # engine
# or use blog/tools/audit.js, which strips <style>/<script>/<svg>/<pre> first
```

A score above 10/100 means fix it before shipping. Two carve-outs, both verified against this blog: **low type-token ratio** fires on every post here because the vocabulary is narrow by design (the same six technical nouns recur), and the word **`harness`** sits on the skill's Tier 2 list while being the subject of two posts. Neither is a defect. Everything else is.

---

## 8 · Code-snippet etiquette

- Keep snippets self-contained where possible. Show imports at the top of the first snippet that uses them.
- Mark intentional omissions with `// ...` not `…`.
- For BEFORE/AFTER fixes, label them in a leading comment line (`// BEFORE — wrong`, `// AFTER — Turbopack inlines at build time`). Don't use a diff syntax unless you're showing the actual diff output.
- Don't put unneeded comments inside the snippet. Trust the reader.

---

## 9 · Quality checklist (run before publishing)

Before committing a new post or a rewrite:

- [ ] All section headings follow the canonical order (TL;DR → figure → background → implementation → postmortem → takeaway → polish/tests → would-do-differently → generalized pattern)
- [ ] At least ONE inline SVG figure with a numbered caption
- [ ] At least ONE `<div class="callout">` for the post's key reusable insight
- [ ] Postmortem section uses `bug-row` structure if the story has named individual failures/decisions
- [ ] Lede paragraph in italics matches the article subtitle
- [ ] Quick-links line appears twice (top of body, before the closing `</div>`)
- [ ] Banner exists as BOTH `.svg` (source) and `.png` (OG image)
- [ ] OG/Twitter meta uses the `.png`
- [ ] Tag pills match the `<meta property="article:tag">` entries
- [ ] No leftover Lorem Ipsum, no commented-out scaffolding, no TODO markers
- [ ] Prism `<script>` tags present right before `</body>`
- [ ] All inline `<code>` references are to real symbols (no fictional function names)

---

## 10 · When the structure should bend

The structure is a default, not a contract. Bend it when:

- The post is a **short pattern note** (≤ 5 min read). Skip Background, Postmortem, and "What I'd do differently." Keep TL;DR + Implementation + Generalized pattern.
- The post is a **postmortem-only** piece (the bugs ARE the story). Skip Background, condense Implementation. Lead with the postmortem after the hook.
- The post is an **opinion / pattern essay** (no specific project). Skip Architecture figure and Postmortem. Use the structure: Hook → Pattern → Why it's better → Caveats → Generalized.

Document the deviation in a one-line `<!-- structure: pattern-essay -->` comment after `<article class="article">` so future-you knows why this post breaks the mold.

---

## 11 · Reference implementation

The canonical example is **`talk-to-my-portfolio.html`** (May 17, 2026). When in doubt about a microdecision — exact caption phrasing, when to use a callout vs a blockquote, how to space code blocks — open that file and copy the pattern.
