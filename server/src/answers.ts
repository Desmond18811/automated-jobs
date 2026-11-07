import crypto from 'node:crypto';
import type { Frame } from 'playwright';
import { getDB, save } from './store.js';
import type { AnswerEntry, Flag } from './types.js';
import { extractFields } from './worker/fields.js';

/**
 * The answer library: answers YOU gave on real forms (or added in the dashboard),
 * reused automatically when the same question comes up again. This is what makes
 * the bot need you less every run.
 */

type AnswerValue = string | string[] | boolean;

/** Minimal shape of a field from worker/fields.ts (options may be strings or objects). */
export interface FieldLike {
  id: string;
  type: string;
  label: string;
  required?: boolean;
  options?: Array<string | { label: string; value?: string; key?: string }>;
}

// Never stored, whatever the question says: secrets and identity numbers.
const NEVER_STORE =
  /password|passcode|\bpin\b|otp|one[- ]time|verification code|social security|\bssn\b|\bnin\b|\bbvn\b|national id|passport (no|number)|driver'?s licen[cs]e (no|number)|bank account|account number|iban|routing|sort code|card number|\bcvv\b|security code/i;

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'do', 'does', 'you', 'your', 'yours', 'of', 'to', 'for', 'in', 'on', 'at', 'and', 'or',
  'please', 'kindly', 'with', 'this', 'that', 'what', 'which', 'if', 'any', 'be', 'have', 'has', 'we', 'our', 'us',
  'required', 'optional', 'select', 'one', 'enter', 'provide', 'tell', 'about'
]);

const optLabel = (o: string | { label: string }) => (typeof o === 'string' ? o : o.label);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function normalizeQuestion(question: string): string {
  return norm(question.replace(/\*/g, '').replace(/\(required\)|\(optional\)/gi, ''));
}

function tokens(key: string): Set<string> {
  return new Set(key.split(' ').filter((t) => t.length > 1 && !STOPWORDS.has(t)));
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size < 3 || tb.size < 3) return 0; // short questions must match exactly
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

const CHOICE_TYPES = new Set(['select', 'radio', 'combobox']);

/** Adapt a saved answer to this field, or return undefined if it doesn't fit. */
function adapt(entry: AnswerEntry, field: FieldLike): AnswerValue | undefined {
  const opts = (field.options || []).map(optLabel);
  const answer = entry.answer;

  if (field.type === 'checkbox') return typeof answer === 'boolean' ? answer : undefined;

  if (field.type === 'checkboxes') {
    const wanted = Array.isArray(answer) ? answer : typeof answer === 'string' ? [answer] : [];
    const matched = wanted
      .map((w) => opts.find((o) => norm(o) === norm(w)))
      .filter((o): o is string => Boolean(o));
    return matched.length === wanted.length && matched.length > 0 ? matched : undefined;
  }

  if (typeof answer !== 'string' || !answer.trim()) return undefined;

  if (CHOICE_TYPES.has(field.type) && opts.length > 0) {
    // The saved answer must be one of THIS form's options, or we let the AI decide.
    return opts.find((o) => norm(o) === norm(answer));
  }

  if (field.type === 'number' && !/^-?\d+(\.\d+)?$/.test(answer.trim())) return undefined;
  return answer;
}

/** Best saved answer for this field, adapted to its options. Exact or very close questions only. */
export function matchAnswer(
  field: FieldLike,
  entries: AnswerEntry[]
): { entry: AnswerEntry; value: AnswerValue } | null {
  const key = normalizeQuestion(field.label || '');
  if (!key || NEVER_STORE.test(key)) return null;

  let best: { entry: AnswerEntry; value: AnswerValue; score: number } | null = null;
  for (const entry of entries) {
    const score = similarity(key, entry.key);
    if (score < 0.85) continue;
    const value = adapt(entry, field);
    if (value === undefined) continue;
    if (!best || score > best.score || (score === best.score && entry.updatedAt > best.entry.updatedAt)) {
      best = { entry, value, score };
    }
  }
  return best ? { entry: best.entry, value: best.value } : null;
}

export function markUsed(ids: string[]): void {
  if (!ids.length) return;
  const db = getDB();
  for (const e of db.answers) if (ids.includes(e.id)) e.uses += 1;
  save();
}

export function listAnswers(): AnswerEntry[] {
  return [...getDB().answers].sort((a, b) => b.uses - a.uses || b.updatedAt.localeCompare(a.updatedAt));
}

/** Insert or update by normalized question. Returns null when the question must never be stored. */
export function upsertAnswer(input: {
  question: string;
  answer: AnswerValue;
  fieldType?: string;
  options?: string[];
  source: AnswerEntry['source'];
}): AnswerEntry | null {
  const question = input.question.trim().slice(0, 300);
  const key = normalizeQuestion(question);
  if (!key || NEVER_STORE.test(key)) return null;
  if (typeof input.answer === 'string' && !input.answer.trim()) return null;
  if (Array.isArray(input.answer) && input.answer.length === 0) return null;

  const answer = typeof input.answer === 'string' ? input.answer.trim().slice(0, 4000) : input.answer;
  const db = getDB();
  const now = new Date().toISOString();
  const existing = db.answers.find((e) => e.key === key);
  if (existing) {
    existing.answer = answer;
    existing.question = question;
    existing.fieldType = input.fieldType ?? existing.fieldType;
    existing.options = input.options ?? existing.options;
    existing.source = input.source;
    existing.updatedAt = now;
    save();
    return existing;
  }
  const entry: AnswerEntry = {
    id: crypto.randomUUID(),
    question,
    key,
    fieldType: input.fieldType,
    options: input.options,
    answer,
    source: input.source,
    uses: 0,
    createdAt: now,
    updatedAt: now
  };
  db.answers.push(entry);
  save();
  return entry;
}

export function updateAnswer(id: string, patch: { answer?: AnswerValue; question?: string }): AnswerEntry | null {
  const db = getDB();
  const entry = db.answers.find((e) => e.id === id);
  if (!entry) return null;
  if (patch.question !== undefined) {
    const key = normalizeQuestion(patch.question);
    if (!key || NEVER_STORE.test(key)) return null;
    entry.question = patch.question.trim().slice(0, 300);
    entry.key = key;
  }
  if (patch.answer !== undefined) {
    entry.answer = typeof patch.answer === 'string' ? patch.answer.trim().slice(0, 4000) : patch.answer;
  }
  entry.updatedAt = new Date().toISOString();
  save();
  return entry;
}

export function deleteAnswer(id: string): boolean {
  const db = getDB();
  const before = db.answers.length;
  db.answers = db.answers.filter((e) => e.id !== id);
  if (db.answers.length === before) return false;
  save();
  return true;
}

// ---------- capturing answers you typed in the bot's window ----------

/** Reads the current value of one stamped field. Plain-JS string, as the conventions require. */
function readValueScript(id: string): string {
  return `(() => {
    const el = document.querySelector('[data-ja-id="${id}"]');
    if (!el) return null;
    const clean = (s) => String(s || '').replace(/\\s+/g, ' ').trim();
    if (el.tagName === 'SELECT') {
      const o = el.options[el.selectedIndex];
      return o && o.value !== '' ? clean(o.text) : null;
    }
    if (el.type === 'checkbox' || el.type === 'radio') return !!el.checked;
    return clean(el.value) || null;
  })()`;
}

/**
 * After you fill flagged questions in the window and press Submit, store what you entered.
 * Only flagged questions are captured: those are the ones the bot couldn't answer itself.
 */
export async function captureAnswers(frame: Frame, flagged: Flag[]): Promise<number> {
  if (!flagged.length) return 0;
  const wanted = new Set(flagged.map((f) => normalizeQuestion(f.label)));
  let fields: FieldLike[] = [];
  try {
    fields = (await extractFields(frame)) as unknown as FieldLike[];
  } catch {
    return 0;
  }

  let saved = 0;
  for (const field of fields) {
    const key = normalizeQuestion(field.label || '');
    if (!wanted.has(key) || field.type === 'file' || NEVER_STORE.test(key)) continue;

    let answer: AnswerValue | null = null;
    try {
      if (field.type === 'radio' || field.type === 'checkboxes') {
        const picked: string[] = [];
        for (const o of field.options || []) {
          if (typeof o === 'string' || !o.key) continue;
          const checked = await frame.evaluate(readValueScript(o.key));
          if (checked === true) picked.push(o.label);
        }
        answer = field.type === 'radio' ? picked[0] ?? null : picked.length ? picked : null;
      } else {
        const v = await frame.evaluate(readValueScript(field.id));
        answer = typeof v === 'boolean' || typeof v === 'string' ? v : null;
      }
    } catch {
      continue;
    }
    if (answer === null) continue;

    const entry = upsertAnswer({
      question: field.label,
      answer,
      fieldType: field.type,
      options: (field.options || []).map(optLabel),
      source: 'form'
    });
    if (entry) saved++;
  }
  return saved;
}
