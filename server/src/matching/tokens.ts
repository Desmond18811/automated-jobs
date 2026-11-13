const STOPWORDS = new Set(
  ('a an and are as at be by for from has have in into is it its of on or our that the their this to was were will with you your we us ' +
    'job role position candidate candidates team company work working experience years year about who what which across within ' +
    'responsibilities requirements qualifications skills ability strong good excellent including etc also must should can may ' +
    'apply application please send more other new using use used based well able help helps').split(' '),
);

export function tokenize(text = ''): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .map((t) => t.replace(/^\.+|\.+$/g, ''))
    .filter((t) => t.length > 1 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

export function termFreq(tokens: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of tokens) m.set(t, (m.get(t) ?? 0) + 1);
  return m;
}

export function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [, v] of a) na += v * v;
  for (const [, v] of b) nb += v * v;
  for (const [k, v] of a) dot += v * (b.get(k) ?? 0);
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export function topTerms(text: string, n = 40): string[] {
  return [...termFreq(tokenize(text)).entries()].sort((x, y) => y[1] - x[1]).slice(0, n).map(([t]) => t);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Word-boundary phrase match that works for terms like "c++", "node.js", "ci/cd". */
export function containsTerm(haystack: string, term: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${escapeRe(term.toLowerCase())}($|[^a-z0-9])`, 'i').test(haystack);
}
