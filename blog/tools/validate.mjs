#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Blog structure sensor. Zero-dependency. Enforces BLOG_STRUCTURE.md invariants
// on every post so a convention becomes a rule that fails on its own.
//
//   node blog/tools/validate.mjs            # validate every post + both indexes
//   node blog/tools/validate.mjs <file>     # validate one file
//
// Exit code 0 = clean, 1 = at least one ERROR. WARNINGS never fail the build.
// Philosophy (from the harness series): computational > inferential, and a
// sensor that lies is worse than no sensor — so every check is deterministic
// and every file runs inside try/catch so a crash is reported, never silent.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath handles Windows drive letters correctly; URL.pathname yields
// "/C:/..." which resolve() then turns into "C:\C:\..." on Windows.
const BLOG = resolve(fileURLToPath(new URL('..', import.meta.url)));   // .../blog
let errors = 0, warnings = 0;
const isES = (rel) => rel.startsWith('es/') || rel.includes('/es/');

function listPosts() {
  const out = [];
  for (const dir of [BLOG, join(BLOG, 'es')]) {
    for (const f of readdirSync(dir)) {
      if (f.endsWith('.html') && f !== 'index.html') out.push(join(dir, f));
    }
  }
  return out;
}

// Generic tag-balance. Honors self-closing "/>" and a void set. Returns the
// leftover open stack (empty = balanced) and any stray-close mismatches.
function balance(html, voidSet) {
  const stack = [], errs = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*?)(\/?)>/g;
  let m;
  while ((m = re.exec(html))) {
    const slash = m[1], t = m[2].toLowerCase(), selfClose = m[4];
    if (slash) {
      if (stack.length && stack[stack.length - 1] === t) stack.pop();
      else if (stack.includes(t)) { for (let k = stack.length - 1; k >= 0; k--) if (stack[k] === t) { stack.splice(k, 1); break; } errs.push(`stray </${t}>`); }
      else errs.push(`unexpected </${t}>`);
    } else if (!selfClose && !voidSet.has(t)) stack.push(t);
  }
  return { stack, errs };
}

const HTML_VOID = new Set(['meta','link','br','img','hr','input','source','col','wbr','area','base','embed','track']);

function strip(html) {   // remove raw-char content so it can't confuse the tag scan
  return html
    .replace(/<pre[\s\S]*?<\/pre>/gi, m => '\n'.repeat((m.match(/\n/g) || []).length))
    .replace(/<script[\s\S]*?<\/script>/gi, m => '\n'.repeat((m.match(/\n/g) || []).length))
    .replace(/<style[\s\S]*?<\/style>/gi, m => '\n'.repeat((m.match(/\n/g) || []).length))
    .replace(/<svg[\s\S]*?<\/svg>/gi, m => '\n'.repeat((m.match(/\n/g) || []).length));
}

function prose(html) {
  let s = html.slice(html.indexOf('<div class="article-body">'));
  s = s.replace(/<(style|script|svg|pre)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ');
  return s.replace(/\s+/g, ' ');
}

function validatePost(file) {
  // Normalize separators so the es/ detection (isES) works on Windows too,
  // where file paths use "\" and BLOG + "/" would never match.
  const rel = file.replaceAll('\\', '/').replace(BLOG.replaceAll('\\', '/') + '/', '');
  const raw = readFileSync(file);
  const s = raw.toString('utf8');
  const es = isES(rel);
  const E = (msg) => { console.log(`  \x1b[31mERROR\x1b[0m  ${msg}`); errors++; };
  const W = (msg) => { console.log(`  \x1b[33mwarn \x1b[0m  ${msg}`); warnings++; };
  console.log(`\n• ${rel}`);

  // 1. integrity
  if (raw.includes(0)) E(`${raw.filter(b => b === 0).length} NUL byte(s) in file`);
  if (!s.trimEnd().endsWith('</html>')) E('file does not end with </html> (truncated?)');

  // 2. HTML balance
  const hb = balance(strip(s), HTML_VOID);
  if (hb.stack.length) E(`unbalanced HTML, tags left open: ${hb.stack.slice(-4).join(', ')}`);
  if (hb.errs.length) E(`HTML tag mismatch: ${hb.errs.slice(0, 2).join('; ')}`);

  // 3. every <svg> balanced + mpath refs resolve
  (s.match(/<svg[\s\S]*?<\/svg>/gi) || []).forEach((sv, i) => {
    const b = balance(sv, new Set());
    if (b.stack.length || b.errs.length) E(`svg #${i + 1} malformed: ${b.stack.join(',') || b.errs[0]}`);
  });
  const pathIds = new Set([...s.matchAll(/<path\s+id="([^"]+)"/g)].map(m => m[1]));
  for (const r of [...s.matchAll(/<mpath\s+href="#([^"]+)"/g)].map(m => m[1]))
    if (!pathIds.has(r)) E(`<mpath href="#${r}"> has no matching <path id>`);

  // 4. head / meta contract
  const lang = (s.match(/<html lang="([a-z]+)"/) || [])[1];
  if (lang !== (es ? 'es' : 'en')) E(`html lang="${lang}" but should be "${es ? 'es' : 'en'}"`);
  if (!/<title>[^<]+<\/title>/.test(s)) E('missing <title>');
  const og = (s.match(/og:image" content="([^"]+)"/) || [])[1];
  if (!og) E('missing og:image');
  else if (!og.endsWith('.png')) E(`og:image is not a .png (${og.split('/').pop()})`);
  if (!/og:url"/.test(s)) E('missing og:url');
  if (!/twitter:card"/.test(s)) E('missing twitter:card');
  if (!/article:published_time"/.test(s)) W('missing article:published_time');

  // 5. hreflang: exactly 3, en/es consistent, x-default == en
  const hre = Object.fromEntries([...s.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map(m => [m[1], m[2]]));
  if (Object.keys(hre).length !== 3) E(`expected 3 hreflang links, found ${Object.keys(hre).length}`);
  if (hre.en && hre.es) {
    if (hre.en.split('/').pop() !== hre.es.split('/').pop()) E(`hreflang slugs differ: en=${hre.en.split('/').pop()} es=${hre.es.split('/').pop()}`);
    if (hre['x-default'] && hre['x-default'] !== hre.en) E('hreflang x-default != en');
  } else E('hreflang missing en or es');

  // 6. banner + og:image files exist on disk
  const bimg = (s.match(/<img class="banner-img"[^>]*src="([^"]+)"/) || [])[1];
  if (!bimg) E('missing <img class="banner-img">');
  else if (!existsSync(resolve(dirname(file), bimg))) E(`banner img not found: ${bimg}`);
  if (og) { const f = og.split('/blog/').pop(); if (f && !existsSync(join(BLOG, f))) E(`og:image file not found: ${f}`); }

  // 7-9. structure comment, numbered figures (consecutive), callout
  if (!/<!--\s*structure:/.test(s)) W('missing <!-- structure: … --> comment');
  const figs = [...s.matchAll(/Figu(?:re|ra)\s+(\d+)\s*·/g)].map(m => +m[1]);
  if (figs.length === 0) W('no numbered figure caption (Figure N ·)');
  else if (figs.join(',') !== figs.map((_, i) => i + 1).join(',')) E(`figures not consecutive: ${figs.join(',')}`);
  if (!/callout-label/.test(s)) W('no callout');

  // 9b. section spine — opt-in via data-sec markers. A post that carries them
  //     declares a type and must present the required sections in canonical
  //     order. Legacy posts (no data-sec) are grandfathered: not checked here.
  const CANON = ['glossary','definition','problem','anatomy','detail','code','architecture','build','postmortem','different','pattern'];
  const REQ = { guide: ['glossary','definition','problem','anatomy','detail','code','pattern'], build: ['architecture','build','postmortem','different','pattern'] };
  const secs = [...s.matchAll(/data-sec="([^"]+)"/g)].map(m => m[1]);
  if (secs.length) {
    const t = (s.match(/<!--\s*structure:\s*(guide|build)\b/) || [])[1];
    if (!t) E('has data-sec markers but no "<!-- structure: guide|build -->" type declared');
    else {
      const unknown = [...new Set(secs.filter(x => !CANON.includes(x)))];
      if (unknown.length) E(`unknown data-sec value(s): ${unknown.join(', ')}`);
      const known = secs.filter(x => CANON.includes(x));
      for (let i = 1; i < known.length; i++) if (CANON.indexOf(known[i]) < CANON.indexOf(known[i - 1])) { E(`sections out of canonical order: "${known[i]}" appears after "${known[i - 1]}" (see BLOG_STRUCTURE.md §5)`); break; }
      const missing = REQ[t].filter(r => !secs.includes(r));
      if (missing.length) E(`${t} post missing required section(s): ${missing.join(', ')}`);
      if (secs[secs.length - 1] !== 'pattern') E('the last data-sec must be "pattern" (the generalized-pattern closer)');
    }
  }

  // 10-11. quick-links present + Prism scripts
  if (!s.includes('🔗')) W('no quick-links (🔗) block');
  if (!(s.includes('prism-core.min.js') && s.includes('prism-autoloader'))) E('missing Prism scripts before </body>');

  // 12. tags == pills (same set, same order)
  const tags = [...s.matchAll(/article:tag"\s+content="([^"]+)"/g)].map(m => m[1]);
  const pills = [...s.matchAll(/class="tag-pill">([^<]+)</g)].map(m => m[1].trim());
  if (tags.join('|') !== pills.join('|')) E(`article:tag != tag-pills\n           tags:  ${tags.join(', ')}\n           pills: ${pills.join(', ')}`);

  // 13. reduced-motion required when the post animates
  if (/class="loop-token"|<animateMotion|<animateTransform/.test(s) && !/prefers-reduced-motion/.test(s))
    E('has animations but no prefers-reduced-motion rule');

  // 14. relative links resolve (scan stripped HTML so diagram/code text is ignored)
  const d = dirname(file);
  for (const h of new Set([...strip(s).matchAll(/(?:href|src)="(?!https?:|mailto:|data:|#)([^"]+)"/g)].map(m => m[1]))) {
    const t = resolve(d, h);
    if (!(existsSync(t) || existsSync(join(t, 'index.html')))) E(`broken relative link: ${h}`);
  }

  // 15. language residue (heuristic warning) — grammatical markers only
  const p = prose(s);
  const esW = [' pero ', ' también ', ' porque ', ' cuando ', ' desde ', ' aunque '];
  const enW = [' the ', ' with the ', ' however ', ' which ', ' that the ', ' because the '];
  const hits = (es ? enW : esW).filter(w => p.includes(w));
  if (hits.length >= 2) W(`possible ${es ? 'English' : 'Spanish'} residue: ${hits.map(x => x.trim()).join(', ')}`);
}

function validateIndexes(posts) {
  console.log('\n• index cross-check');
  const E = (m) => { console.log(`  \x1b[31mERROR\x1b[0m  ${m}`); errors++; };
  const W = (m) => { console.log(`  \x1b[33mwarn \x1b[0m  ${m}`); warnings++; };
  for (const p of posts) {
    const es = isES(p.replace(BLOG + '/', ''));
    const counterpart = es ? join(BLOG, basename(p)) : join(BLOG, 'es', basename(p));
    if (!existsSync(counterpart)) W(`${basename(p)} has no ${es ? 'EN' : 'ES'} counterpart yet`);
  }
  for (const idx of [join(BLOG, 'index.html'), join(BLOG, 'es', 'index.html')]) {
    if (!existsSync(idx)) { E(`missing ${basename(idx)}`); continue; }
    const s = readFileSync(idx, 'utf8'), d = dirname(idx);
    if (readFileSync(idx).includes(0)) E(`${basename(idx)} has NUL byte(s)`);
    if (!s.trimEnd().endsWith('</html>')) E(`${basename(idx)} does not end with </html> (truncated?)`);
    const ib = balance(strip(s), HTML_VOID);
    if (ib.stack.length) E(`${basename(idx)} unbalanced HTML, tags left open: ${ib.stack.slice(-3).join(', ')}`);
    for (const h of [...s.matchAll(/<a class="article-card" href="([^"]+)"/g)].map(m => m[1]))
      if (!existsSync(resolve(d, h))) E(`${basename(idx)} card links to missing ${h}`);
  }
}

const arg = process.argv[2];
const posts = arg ? [resolve(arg)] : listPosts();
for (const f of posts) {
  try { validatePost(f); }
  catch (e) { console.log(`  \x1b[31mERROR\x1b[0m  sensor crashed on ${basename(f)}: ${e.message}`); errors++; }
}
if (!arg) { try { validateIndexes(posts); } catch (e) { console.log(`  \x1b[31mERROR\x1b[0m  index check crashed: ${e.message}`); errors++; } }

console.log(`\n${'─'.repeat(60)}`);
console.log(`Checked ${posts.length} file(s) · ${errors} error(s) · ${warnings} warning(s)`);
process.exitCode = errors ? 1 : 0;
