// Audita los posts publicados con el detector determinista de avoid-ai-writing.
// Extrae SOLO la prosa: descarta <style>, <script>, <svg>, <pre>/<code>, y atributos.
const fs = require('fs');
const path = require('path');
const DET = process.env.AAW_DETECTOR || path.join(process.env.HOME || process.env.USERPROFILE, '.claude', 'skills', 'avoid-ai-writing', 'detector', 'patterns.js');
const AIDetector = require(DET);

function prose(html) {
  let s = html;
  s = s.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  s = s.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  s = s.replace(/<svg[\s\S]*?<\/svg>/gi, ' ');
  s = s.replace(/<pre[\s\S]*?<\/pre>/gi, ' ');   // bloques de código: el skill dice no tocarlos
  s = s.replace(/<head[\s\S]*?<\/head>/gi, ' '); // meta tags
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');
  s = s.replace(/<[^>]+>/g, ' ');
  s = s.replace(/&mdash;/g, '—').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
  return s.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

const files = process.argv.slice(2);
const api = Object.keys(AIDetector);
console.log('API del detector:', api.join(', '), '\n');

for (const f of files) {
  const text = prose(fs.readFileSync(f, 'utf8'));
  const r = AIDetector.analyzeText(text);
  const words = text.split(/\s+/).length;
  const emdash = (text.match(/—/g) || []).length;
  console.log('='.repeat(72));
  console.log(path.basename(path.dirname(f)) + '/' + path.basename(f));
  console.log(`  palabras: ${words}   score: ${r.score ?? r.normalizedScore ?? '?'}   issues: ${(r.issues||[]).length}`);
  console.log(`  em dashes: ${emdash}  (skill: máx ${Math.max(1, Math.round(words/1000))} = 1 por 1.000 palabras)`);
  const byType = {};
  for (const i of (r.issues || [])) byType[i.type] = (byType[i.type] || []).concat([i.text]);
  const rows = Object.entries(byType).sort((a,b) => b[1].length - a[1].length);
  for (const [t, hits] of rows) {
    const sample = [...new Set(hits)].slice(0, 3).map(h => JSON.stringify(String(h).slice(0, 46))).join(', ');
    console.log(`   ${String(hits.length).padStart(3)}x  ${t.padEnd(30)} ${sample}`);
  }
  console.log('');
}
